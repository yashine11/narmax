import dns from 'dns/promises';

// Known disposable / temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'throwawaymail.com', 'getairmail.com',
  'dispostable.com', 'trashmail.com', 'fakemailgenerator.com', 'temp-mail.org',
  'generator.email', 'mohmal.com', 'crazymailing.com', 'armyspy.com',
  'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'rhyta.com', 'superrito.com', 'teleworm.us', 'tinemail.com', 'nada.ltd',
  'inboxbear.com', 'burnermail.io', 'dropmail.me', 'internxt.com',
  'emailfake.com', 'mytemp.email', 'tempail.com', 'tmpmail.org',
  'tmpmail.net', 'disposablemail.com', 'throwawaymailaddress.com',
  'trashmail.net', 'trashmail.me', 'fakeinbox.com', 'mailcatch.com',
  'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  'spambog.com', 'maildrop.cc', 'getnada.com', 'abv.bg.fake'
]);

// Obvious keyboard smash or fake local parts
const FAKE_LOCAL_PATTERNS = [
  /^test$/i,
  /^testing$/i,
  /^fake$/i,
  /^dummy$/i,
  /^sample$/i,
  /^asdf+$/i,
  /^qwer+$/i,
  /^zxcv+$/i,
  /^1234+$/i,
  /^(.)\1{4,}$/i // same character repeated 5+ times like aaaaa@
];

/**
 * Validates an email address strictly against format, fake patterns,
 * disposable domains, and live DNS MX records.
 * 
 * @param {string} email
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
export async function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email address is required' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic RFC 5322 regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return { valid: false, message: 'Please enter a valid email format (e.g. name@domain.com)' };
  }

  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) {
    return { valid: false, message: 'Invalid email address' };
  }

  // 1. Disallow purely numeric usernames (e.g. "1234@gmail.com", "998822@...")
  if (/^\d+$/.test(localPart)) {
    return { 
      valid: false, 
      message: 'Email username cannot be made entirely of numbers. Please use a real personal email.' 
    };
  }

  // 2. Local part length
  if (localPart.length < 3) {
    return { valid: false, message: 'Email username is too short (minimum 3 characters).' };
  }

  // 3. Provider-specific rules
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Gmail usernames must be 6-30 characters (letters, numbers, periods)
    const cleanLocal = localPart.replace(/\./g, '');
    if (cleanLocal.length < 6) {
      return { 
        valid: false, 
        message: 'Gmail addresses require a username of at least 6 characters.' 
      };
    }
  }

  // 4. Check for obvious fake username patterns (asdf, test, repeated chars)
  for (const pattern of FAKE_LOCAL_PATTERNS) {
    if (pattern.test(localPart)) {
      return { 
        valid: false, 
        message: 'This email address appears to be fake or disposable.' 
      };
    }
  }

  // 5. Check disposable domain blacklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { 
      valid: false, 
      message: 'Disposable/temporary email addresses are not permitted. Please use a real email provider.' 
    };
  }

  // 6. Live DNS MX Record Verification (verifies domain actually has an active mail server)
  try {
    // 2.5 second timeout on DNS lookup so registration never hangs
    const resolvePromise = dns.resolveMx(domain);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS_TIMEOUT')), 2500)
    );

    const mxRecords = await Promise.race([resolvePromise, timeoutPromise]);
    if (!mxRecords || mxRecords.length === 0) {
      return { 
        valid: false, 
        message: `The domain "@${domain}" has no mail servers configured to receive email.` 
      };
    }
  } catch (err) {
    if (err.message === 'DNS_TIMEOUT') {
      // If DNS times out, allow valid format through rather than blocking legitimate user
      console.warn(`[validateEmail] DNS check timed out for domain: ${domain}`);
    } else if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'EREFUSED') {
      return { 
        valid: false, 
        message: `The email domain "@${domain}" does not exist.` 
      };
    } else {
      console.warn(`[validateEmail] DNS error for ${domain}:`, err.message);
    }
  }

  return { valid: true };
}
