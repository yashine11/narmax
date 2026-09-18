import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserByOAuth,
  createOAuthUser,
  linkOAuthToUser,
} from '../models/userModel.js';
import { validateEmail } from '../utils/emailValidator.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'narmax-dev-secret-change-in-production-min-32-chars-long',
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

function getRedirectBase(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (host.includes('localhost')) {
    return 'http://localhost:5000';
  }
  if (host && !host.includes('haae5wvrj')) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${host}`;
  }
  return process.env.BACKEND_URL || 'https://narmax-backend.vercel.app';
}

function parseStateOrigin(state) {
  let origin = 'https://narmax.vercel.app';
  if (!state) return origin;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (
      parsed?.origin &&
      (parsed.origin.includes('localhost') ||
        parsed.origin.includes('vercel.app') ||
        parsed.origin.includes('narmax'))
    ) {
      origin = parsed.origin;
    }
  } catch (_e) {}
  return origin;
}

async function generateUniqueUsername(preferredName, email) {
  let base = (preferredName || email.split('@')[0] || 'user')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 20);
  if (!base || base.length < 3) {
    base = `user_${Date.now().toString().slice(-5)}`;
  }
  let candidate = base;
  let counter = 1;
  while (await findUserByUsername(candidate)) {
    candidate = `${base.slice(0, 14)}_${counter++}`;
  }
  return candidate;
}

export async function register(_req, res) {
  return res.status(403).json({
    message: 'Manual registration is disabled. Please sign up using verified Google or Discord login.',
  });
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await findUserByEmail(email);
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Login failed' });
  }
}

// ---------------------------------------------------------------------------
// Google OAuth Flow
// ---------------------------------------------------------------------------

export async function googleRedirect(req, res) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: 'Google Client ID not configured on server' });
    }
    const callbackBase = getRedirectBase(req);
    const redirectUri = `${callbackBase}/api/auth/google/callback`;

    const state = Buffer.from(
      JSON.stringify({
        origin: req.query.origin || 'https://narmax.vercel.app',
        ts: Date.now(),
      })
    ).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (e) {
    console.error('googleRedirect error:', e);
    return res.status(500).json({ message: 'Failed to initiate Google authentication' });
  }
}

export async function googleCallback(req, res) {
  const origin = parseStateOrigin(req.query.state);
  const code = req.query.code;
  if (!code) {
    const errMsg = req.query.error_description || req.query.error || 'Google login was cancelled';
    return res.redirect(`${origin}/auth/callback?error=${encodeURIComponent(errMsg)}`);
  }

  try {
    const callbackBase = getRedirectBase(req);
    const redirectUri = `${callbackBase}/api/auth/google/callback`;

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get Google token');
    }

    // 2. Fetch Google profile info
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile || !profile.email) {
      throw new Error('Google did not return an email address');
    }

    const { sub: googleId, email, name, picture } = profile;

    // 3. Find or create user in DB
    let user = await findUserByOAuth('google', googleId);

    if (!user) {
      // Check if user already exists with this email
      const existing = await findUserByEmail(email);
      if (existing) {
        user = await linkOAuthToUser(existing.id, {
          oauthProvider: 'google',
          oauthId: googleId,
          avatar: existing.avatar?.includes('default-avatar') ? picture : existing.avatar,
        });
      } else {
        const username = await generateUniqueUsername(name, email);
        user = await createOAuthUser({
          username,
          email,
          avatar: picture || '/uploads/default-avatar.svg',
          oauthProvider: 'google',
          oauthId: googleId,
        });
      }
    }

    // 4. Issue JWT and redirect to frontend
    const token = signToken(user);
    return res.redirect(`${origin}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('googleCallback error:', e);
    return res.redirect(`${origin}/auth/callback?error=${encodeURIComponent(e.message || 'Google login failed')}`);
  }
}

// ---------------------------------------------------------------------------
// Discord OAuth Flow
// ---------------------------------------------------------------------------

export async function discordRedirect(req, res) {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: 'Discord Client ID not configured on server' });
    }
    const callbackBase = getRedirectBase(req);
    const redirectUri = `${callbackBase}/api/auth/discord/callback`;

    const state = Buffer.from(
      JSON.stringify({
        origin: req.query.origin || 'https://narmax.vercel.app',
        ts: Date.now(),
      })
    ).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
      state,
    });

    return res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  } catch (e) {
    console.error('discordRedirect error:', e);
    return res.status(500).json({ message: 'Failed to initiate Discord authentication' });
  }
}

export async function discordCallback(req, res) {
  const origin = parseStateOrigin(req.query.state);
  const code = req.query.code;
  if (!code) {
    const errMsg = req.query.error_description || req.query.error || 'Discord login was cancelled';
    return res.redirect(`${origin}/auth/callback?error=${encodeURIComponent(errMsg)}`);
  }

  try {
    const callbackBase = getRedirectBase(req);
    const redirectUri = `${callbackBase}/api/auth/discord/callback`;

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get Discord token');
    }

    // 2. Fetch Discord user info
    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await profileRes.json();

    if (!discordUser || !discordUser.email) {
      throw new Error('Discord account does not have a verified email address.');
    }

    const { id: discordId, email, username: discordUsername, avatar: avatarHash } = discordUser;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    // 3. Find or create user in DB
    let user = await findUserByOAuth('discord', discordId);

    if (!user) {
      const existing = await findUserByEmail(email);
      if (existing) {
        user = await linkOAuthToUser(existing.id, {
          oauthProvider: 'discord',
          oauthId: discordId,
          avatar: existing.avatar?.includes('default-avatar') ? avatarUrl : existing.avatar,
        });
      } else {
        const username = await generateUniqueUsername(discordUsername, email);
        user = await createOAuthUser({
          username,
          email,
          avatar: avatarUrl,
          oauthProvider: 'discord',
          oauthId: discordId,
        });
      }
    }

    // 4. Issue JWT and redirect to frontend
    const token = signToken(user);
    return res.redirect(`${origin}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('discordCallback error:', e);
    return res.redirect(`${origin}/auth/callback?error=${encodeURIComponent(e.message || 'Discord login failed')}`);
  }
}
