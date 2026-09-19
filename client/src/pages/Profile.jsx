import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, loading, refreshUser, logout } = useAuth();
  const { uiSize, setUiSize, cardStyle, setCardStyle } = usePreferences();

  // Profile fields
  const [username, setUsername] = useState(user?.username || '');
  const [busyProfile, setBusyProfile] = useState(false);

  // Kids PIN
  const [kidsPin, setKidsPin] = useState('');
  const [kidsConfirm, setKidsConfirm] = useState('');
  const [busyKids, setBusyKids] = useState(false);

  // Library
  const [likedCast, setLikedCast] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'lists', 'actors'

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/cast/liked').then((r) => setLikedCast(r.data.cast || [])).catch(() => {});
    api.get('/api/user/favorites').then((r) => setFavorites(r.data.favorites || [])).catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const saveProfile = async (event) => {
    event.preventDefault();
    const clean = username.trim();
    if (!clean) {
      toast.error('Name cannot be empty');
      return;
    }
    if (clean === user.username) {
      toast('No changes to save');
      return;
    }
    setBusyProfile(true);
    try {
      const fd = new FormData();
      fd.append('username', clean);
      await api.patch('/api/user/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyProfile(false);
    }
  };

  const saveKidsPin = async (e) => {
    e.preventDefault();
    if (!kidsPin || kidsPin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }
    if (kidsPin !== kidsConfirm) {
      toast.error('PIN confirmation does not match');
      return;
    }
    setBusyKids(true);
    try {
      await api.post('/api/user/kids-pin', { pin: kidsPin });
      setKidsPin('');
      setKidsConfirm('');
      toast.success('Kids PIN updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PIN');
    } finally {
      setBusyKids(false);
    }
  };

  const removeFavorite = async (id) => {
    try {
      await api.delete(`/api/user/favorites/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Removed from list');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const unlikeCast = async (castId) => {
    try {
      await api.post('/api/cast/toggle', { cast_id: castId, name: 'dummy' });
      setLikedCast((prev) => prev.filter((c) => c.cast_id !== castId));
      toast.success('Unfollowed actor');
    } catch {
      toast.error('Failed to unfollow');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-28 sm:px-8">
      {/* Top Header */}
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-narmax-cyan">Account &amp; Preferences</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Settings &amp; Profile</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:px-5 sm:text-sm ${
              activeTab === 'settings' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:px-5 sm:text-sm ${
              activeTab === 'lists' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            My List ({favorites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actors')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:px-5 sm:text-sm ${
              activeTab === 'actors' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Liked Actors ({likedCast.length})
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* ─── GENERAL ─── */}
            <section className="glass-panel rounded-3xl p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-narmax-cyan">General</p>
                <h2 className="mt-1 text-2xl font-black text-white">Interface Preferences</h2>
                <p className="mt-1 text-xs text-zinc-400">Your everyday preferences for how NARMAX works.</p>
              </div>

              <div className="space-y-6">
                {/* Interface Size */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-white">Interface size</p>
                    <p className="text-xs text-zinc-400">Scale the whole interface up or down for comfort.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { key: 'small', label: 'A', sub: 'Small', fontClass: 'text-sm' },
                      { key: 'normal', label: 'A', sub: 'Normal', fontClass: 'text-base' },
                      { key: 'large', label: 'A', sub: 'Large', fontClass: 'text-xl' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setUiSize(opt.key)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition ${
                          uiSize === opt.key
                            ? 'border-narmax-red bg-narmax-red/15 text-white shadow-[0_0_16px_rgba(229,9,20,0.3)] ring-1 ring-narmax-red'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span className={`font-black ${opt.fontClass}`}>{opt.label}</span>
                        <span className="text-[11px] font-semibold">{opt.sub}</span>
                        {uiSize === opt.key && (
                          <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-narmax-red" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Style */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-white">Card style</p>
                    <p className="text-xs text-zinc-400">Show titles as tall posters or wide backdrops.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        key: 'posters',
                        label: 'Posters',
                        desc: 'Vertical (2:3)',
                        icon: (
                          <div className="h-6 w-4 rounded border-2 border-current bg-current/20" />
                        ),
                      },
                      {
                        key: 'backdrops',
                        label: 'Backdrops',
                        desc: 'Landscape (16:9)',
                        icon: (
                          <div className="h-4 w-7 rounded border-2 border-current bg-current/20" />
                        ),
                      },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setCardStyle(opt.key)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition ${
                          cardStyle === opt.key
                            ? 'border-narmax-red bg-narmax-red/15 text-white shadow-[0_0_16px_rgba(229,9,20,0.3)] ring-1 ring-narmax-red'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {opt.icon}
                        <div className="text-center">
                          <p className="text-xs font-bold">{opt.label}</p>
                          <p className="text-[10px] text-zinc-400">{opt.desc}</p>
                        </div>
                        {cardStyle === opt.key && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-narmax-red" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ─── ACCOUNT ─── */}
            <section className="glass-panel rounded-3xl p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-narmax-cyan">Account</p>
                <h2 className="mt-1 text-2xl font-black text-white">Profile Details</h2>
                <p className="mt-1 text-xs text-zinc-400">Your profile information and library shortcuts.</p>
              </div>

              <form onSubmit={saveProfile} className="space-y-5">
                {/* Photo & Identity Display */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <img
                    src={user.avatar || '/uploads/default-avatar.svg'}
                    alt={user.username}
                    className="h-16 w-16 rounded-2xl border-2 border-white/15 object-cover shadow-xl"
                  />
                  <div>
                    <p className="text-base font-black text-white">{user.username}</p>
                    <p className="text-xs text-zinc-400">{user.email || 'Connected Account'}</p>
                    <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                      {user.role === 'admin' ? 'Administrator' : 'Member'}
                    </span>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Change Your Name
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-narmax-red focus:bg-white/10"
                    placeholder="Enter your name"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busyProfile || username.trim() === user.username}
                  className="w-full rounded-xl bg-narmax-red py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busyProfile ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </form>

              {/* Quick Shortcuts */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Library &amp; Activity</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('lists')}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-center transition hover:border-white/20 hover:bg-white/10"
                  >
                    <span className="text-lg font-black text-white">{favorites.length}</span>
                    <span className="text-[11px] font-semibold text-zinc-300">My List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('actors')}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-center transition hover:border-white/20 hover:bg-white/10"
                  >
                    <span className="text-lg font-black text-white">{likedCast.length}</span>
                    <span className="text-[11px] font-semibold text-zinc-300">Liked Actors</span>
                  </button>

                  <Link
                    to="/kids"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-center transition hover:border-white/20 hover:bg-white/10"
                  >
                    <span className="text-lg font-black text-cyan-300">👶</span>
                    <span className="text-[11px] font-semibold text-zinc-300">Kids Mode</span>
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* ─── KIDS PASSWORD PROTECTION ─── */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <div className="max-w-xl">
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-narmax-cyan">Kids Protection</p>
                <h2 className="mt-1 text-2xl font-black text-white">Change Kids Password</h2>
                <p className="mt-1 text-xs text-zinc-400">Set or change the PIN required for Kids space access.</p>
              </div>

              <form onSubmit={saveKidsPin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-zinc-300">New Kids PIN</label>
                  <input
                    type="password"
                    placeholder="Min 4 characters"
                    value={kidsPin}
                    onChange={(e) => setKidsPin(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-narmax-red focus:bg-white/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-zinc-300">Confirm Kids PIN</label>
                  <input
                    type="password"
                    placeholder="Confirm PIN"
                    value={kidsConfirm}
                    onChange={(e) => setKidsConfirm(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-narmax-red focus:bg-white/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyKids}
                  className="rounded-xl bg-white/10 px-6 py-2.5 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  {busyKids ? 'Updating PIN...' : 'Update Kids Password'}
                </button>
              </form>
            </div>
          </section>

          {/* Sign Out */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 hover:text-white"
            >
              Sign Out of NARMAX
            </button>
          </div>
        </div>
      ) : activeTab === 'lists' ? (
        /* ─── MY LIST TAB ─── */
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">My List</h2>
              <p className="mt-1 text-sm text-zinc-400">Movies and shows you have saved for later.</p>
            </div>
            <p className="text-xs font-bold text-zinc-500">{favorites.length} Titles</p>
          </div>

          {favorites.length > 0 ? (
            <div className={`grid gap-4 ${
              cardStyle === 'backdrops'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}>
              {favorites.map((fav) => (
                <div key={fav.id} className="group relative">
                  <Link
                    to={fav.media_type === 'tv' ? `/tv/${fav.tmdb_id}` : `/movie/${fav.tmdb_id}`}
                    className={`block overflow-hidden rounded-xl bg-zinc-900 border border-white/10 ${
                      cardStyle === 'backdrops' ? 'aspect-video' : 'aspect-[2/3]'
                    }`}
                  >
                    <img
                      src={fav.image}
                      alt={fav.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFavorite(fav.id)}
                    title="Remove from list"
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-narmax-red"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.518.149.022a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 13a.75.75 0 0 0 .75-.75V7.75a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <p className="mt-2 line-clamp-1 text-xs font-bold text-zinc-100">{fav.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] py-20 text-center">
              <p className="text-sm text-zinc-500">Your list is empty. Discover and save content to see it here.</p>
            </div>
          )}
        </section>
      ) : (
        /* ─── LIKED ACTORS TAB ─── */
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Liked Actors</h2>
              <p className="mt-1 text-sm text-zinc-400">Actors and creators you follow.</p>
            </div>
            <p className="text-xs font-bold text-zinc-500">{likedCast.length} Actors</p>
          </div>

          {likedCast.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {likedCast.map((cast) => (
                <div key={cast.id} className="group relative">
                  <Link
                    to={`/person/${cast.cast_id}`}
                    className="block aspect-square overflow-hidden rounded-full border-2 border-white/10 bg-zinc-900 transition hover:border-narmax-cyan"
                  >
                    <img
                      src={cast.profile_path ? `https://image.tmdb.org/t/p/w185${cast.profile_path}` : '/uploads/default-avatar.svg'}
                      alt={cast.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => unlikeCast(cast.cast_id)}
                    title="Unfollow actor"
                    className="absolute right-2 top-0 rounded-full bg-black/80 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-narmax-red"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9c-.405-.351-.878-.833-1.346-1.464C3.959 12.05 3.5 10.96 3.5 9.5 3.5 7.015 5.515 5 8 5c1.115 0 2.13.406 2.913 1.082C11.696 5.406 12.712 5 13.826 5c2.485 0 4.5 2.015 4.5 4.5 0 1.46-.459 2.55-1.038 3.32-.469.632-.94 1.114-1.347 1.465a22.047 22.047 0 0 1-2.582 1.9 20.75 20.75 0 0 1-1.162.683l-.019.01-.005.002a.75.75 0 0 1-.708 0Z" />
                    </svg>
                  </button>
                  <div className="mt-3 text-center">
                    <p className="line-clamp-1 text-sm font-bold text-zinc-100">{cast.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">Actor</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] py-20 text-center">
              <p className="text-sm text-zinc-500">You haven't followed any actors yet.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
