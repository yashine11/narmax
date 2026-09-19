import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const UI_SIZE_KEY = 'narmax:ui-size';
const CARD_STYLE_KEY = 'narmax:card-style';

function applyUiSize(size) {
  const root = document.documentElement;
  root.classList.remove('ui-small', 'ui-normal', 'ui-large');
  root.classList.add(`ui-${size}`);
  localStorage.setItem(UI_SIZE_KEY, size);
}

export function initUiPrefs() {
  const size = localStorage.getItem(UI_SIZE_KEY) || 'normal';
  applyUiSize(size);
}

export default function SettingsDrawer({ open, onClose }) {
  const { user, logout, refreshUser } = useAuth();
  const drawerRef = useRef(null);

  // General prefs
  const [uiSize, setUiSize] = useState(() => localStorage.getItem(UI_SIZE_KEY) || 'normal');
  const [cardStyle, setCardStyle] = useState(() => localStorage.getItem(CARD_STYLE_KEY) || 'posters');

  // Account
  const [username, setUsername] = useState(user?.username || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [busyProfile, setBusyProfile] = useState(false);

  // Kids password
  const [kidsPin, setKidsPin] = useState('');
  const [kidsConfirm, setKidsConfirm] = useState('');
  const [busyKids, setBusyKids] = useState(false);

  // Sync username if user changes
  useEffect(() => {
    if (user) setUsername(user.username || '');
  }, [user]);

  // Trap focus / close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleUiSize = (size) => {
    setUiSize(size);
    applyUiSize(size);
  };

  const handleCardStyle = (style) => {
    setCardStyle(style);
    localStorage.setItem(CARD_STYLE_KEY, style);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!user) return;
    setBusyProfile(true);
    try {
      const fd = new FormData();
      if (username && username !== user.username) fd.append('username', username);
      if (avatarFile) fd.append('avatar', avatarFile);
      if ([...fd.keys()].length === 0) { toast('No changes to save'); setBusyProfile(false); return; }
      await api.patch('/api/user/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyProfile(false);
    }
  };

  const saveKidsPin = async () => {
    if (!kidsPin || kidsPin.length < 4) { toast.error('PIN must be at least 4 characters'); return; }
    if (kidsPin !== kidsConfirm) { toast.error('PINs do not match'); return; }
    setBusyKids(true);
    try {
      await api.post('/api/user/kids-pin', { pin: kidsPin });
      setKidsPin('');
      setKidsConfirm('');
      toast.success('Kids PIN updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PIN');
    } finally {
      setBusyKids(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-[301] flex w-full max-w-sm flex-col bg-zinc-950 shadow-[−4px_0_40px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            {user && (
              <img
                src={avatarPreview || user.avatar}
                alt=""
                className="h-9 w-9 rounded-full border border-white/15 object-cover"
              />
            )}
            <div>
              <p className="text-sm font-black text-white">{user?.username || 'Guest'}</p>
              <p className="text-[10px] text-zinc-500">{user?.email || ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">

          {/* ─── GENERAL ─── */}
          <section>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">General</p>
            <p className="text-xs text-zinc-400 mb-5">Your everyday preferences for how NARMAX works.</p>

            {/* Interface Size */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold text-zinc-300">Interface Size</p>
              <p className="mb-3 text-[11px] text-zinc-500">Scale the whole interface up or down for comfort.</p>
              <div className="flex gap-2">
                {[
                  { key: 'small', label: 'A', sub: 'Small', size: 'text-sm' },
                  { key: 'normal', label: 'A', sub: 'Normal', size: 'text-base' },
                  { key: 'large', label: 'A', sub: 'Large', size: 'text-xl' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleUiSize(opt.key)}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl border py-3 transition ${
                      uiSize === opt.key
                        ? 'border-narmax-red bg-narmax-red/15 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className={`font-black ${opt.size}`}>{opt.label}</span>
                    <span className="text-[10px] font-semibold">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Style */}
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-300">Card Style</p>
              <p className="mb-3 text-[11px] text-zinc-500">Show titles as tall posters or wide backdrops.</p>
              <div className="flex gap-2">
                {[
                  { key: 'posters', label: 'Posters', icon: '▭' },
                  { key: 'backdrops', label: 'Backdrops', icon: '▬' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleCardStyle(opt.key)}
                    className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 transition ${
                      cardStyle === opt.key
                        ? 'border-narmax-red bg-narmax-red/15 text-white'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="h-px bg-white/10" />

          {/* ─── ACCOUNT ─── */}
          {user && (
            <section>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Account</p>

              {/* Avatar Upload */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold text-zinc-300">Profile Photo</p>
                <div className="flex items-center gap-4">
                  <img
                    src={avatarPreview || user.avatar}
                    alt=""
                    className="h-16 w-16 rounded-2xl border border-white/15 object-cover"
                  />
                  <label className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white">
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
              </div>

              {/* Display Name */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold text-zinc-300">Display Name</p>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-narmax-red focus:bg-white/10"
                  placeholder="Your display name"
                />
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={busyProfile}
                className="w-full rounded-xl bg-narmax-red py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50 mb-6"
              >
                {busyProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>

              {/* Kids PIN */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                <p className="mb-1 text-xs font-bold text-zinc-300">Kids Password / PIN</p>
                <p className="mb-3 text-[11px] text-zinc-500">Protect the Kids space with a PIN.</p>
                <input
                  type="password"
                  value={kidsPin}
                  onChange={(e) => setKidsPin(e.target.value)}
                  placeholder="New PIN (min 4 chars)"
                  className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-narmax-red"
                />
                <input
                  type="password"
                  value={kidsConfirm}
                  onChange={(e) => setKidsConfirm(e.target.value)}
                  placeholder="Confirm PIN"
                  className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-narmax-red"
                />
                <button
                  type="button"
                  onClick={saveKidsPin}
                  disabled={busyKids}
                  className="w-full rounded-xl border border-white/15 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {busyKids ? 'Saving...' : 'Update Kids PIN'}
                </button>
              </div>

              {/* Quick Links */}
              <div className="space-y-2">
                <Link
                  to="/my-list"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.07]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-narmax-red shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-200">My List</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 text-zinc-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/profile"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.07]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-narmax-red shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-200">Liked Actors</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 text-zinc-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  to="/kids"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.07]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-narmax-red shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-200">Kids Mode</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 text-zinc-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 p-4">
          {user ? (
            <button
              type="button"
              onClick={() => { onClose(); logout(); }}
              className="w-full rounded-xl border border-white/15 py-3 text-sm font-bold text-zinc-300 transition hover:bg-red-900/30 hover:border-narmax-red hover:text-white"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="block w-full rounded-xl bg-narmax-red py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
