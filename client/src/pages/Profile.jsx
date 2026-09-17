import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const PREF_KEY = 'narmax:watch-preferences';

function defaultPrefs() {
  return {
    autoplay: true,
    autoNext: true,
    subtitles: false,
    preferredLanguage: 'en',
  };
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [likedCast, setLikedCast] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('settings'); // settings, lists

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setPrefs({ ...defaultPrefs(), ...parsed });
    } catch {
      setPrefs(defaultPrefs());
    }
  }, []);

  const profileInitials = useMemo(() => String(user?.username || 'N').slice(0, 1).toUpperCase(), [user?.username]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/cast/liked').then((r) => setLikedCast(r.data.cast || []));
    api.get('/api/user/favorites').then((r) => setFavorites(r.data.favorites || []));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusyProfile(true);
    try {
      const fd = new FormData();
      if (username && username !== user.username) fd.append('username', username);
      const file = event.target.avatar?.files?.[0];
      if (file) fd.append('avatar', file);
      await api.patch('/api/user/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password confirmation does not match');
      return;
    }

    setBusyPassword(true);
    try {
      await api.post('/api/user/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setBusyPassword(false);
    }
  };

  const savePreferences = (nextPrefs) => {
    setPrefs(nextPrefs);
    window.localStorage.setItem(PREF_KEY, JSON.stringify(nextPrefs));
  };

  const removeFavorite = async (id) => {
    try {
      await api.delete(`/api/user/favorites/${id}`);
      setFavorites(favorites.filter(f => f.id !== id));
      toast.success('Removed from list');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const unlikeCast = async (castId) => {
    try {
      await api.post('/api/cast/toggle', { cast_id: castId, name: 'dummy' });
      setLikedCast(likedCast.filter(c => c.cast_id !== castId));
      toast.success('Unfollowed actor');
    } catch {
      toast.error('Failed to unfollow');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">My Profile</h1>
        </div>
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
          <button
            onClick={() => setActiveTab('settings')}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'settings' ? 'bg-narmax-cyan text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'lists' ? 'bg-narmax-cyan text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            My Library
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-5">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-24 w-24 rounded-2xl border border-cyan-300/30 object-cover shadow-2xl" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-300/30 bg-[#03045e]/55 text-3xl font-black text-cyan-100">
                  {profileInitials}
                </div>
              )}
              <div>
                <p className="text-2xl font-black text-white">{user.username}</p>
                <p className="text-sm text-zinc-400">{user.email}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Display Name</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cyan-100 outline-none transition focus:border-narmax-cyan focus:bg-white/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Update Avatar</label>
                <input name="avatar" type="file" accept="image/*" className="w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-white/20" />
              </div>

              <button
                type="submit"
                disabled={busyProfile}
                className="w-full rounded-xl bg-narmax-cyan py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {busyProfile ? 'Updating...' : 'Save Profile Changes'}
              </button>
            </form>
          </section>

          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="text-2xl font-black text-white">Security</h2>
            <p className="mt-1 text-sm text-zinc-400">Manage your password and account security.</p>

            <form onSubmit={savePassword} className="mt-8 space-y-4">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cyan-100 outline-none transition focus:border-narmax-cyan"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cyan-100 outline-none transition focus:border-narmax-cyan"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-cyan-100 outline-none transition focus:border-narmax-cyan"
              />

              <button
                type="submit"
                disabled={busyPassword}
                className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {busyPassword ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </section>
          
          <section className="glass-panel lg:col-span-2 rounded-3xl p-6 sm:p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black text-white">Playback</h2>
                <p className="mt-1 text-sm text-zinc-400">Configure your viewing experience.</p>
                
                <div className="mt-6 space-y-3">
                  {[
                    { key: 'autoplay', label: 'Autoplay titles' },
                    { key: 'autoNext', label: 'Auto next episode' },
                    { key: 'subtitles', label: 'Default subtitles' },
                  ].map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:bg-white/5">
                      <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={!!prefs[item.key]}
                        onChange={(e) => savePreferences({ ...prefs, [item.key]: e.target.checked })}
                        className="h-5 w-5 accent-narmax-cyan"
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-white">Kids Control</h2>
                <p className="mt-1 text-sm text-zinc-400">Safe environment for family members.</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Mode</p>
                    <div className="mt-3 flex gap-3">
                       <Link to="/kids" className="flex-1 rounded-lg bg-cyan-400/20 py-2.5 text-center text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/30">Enter Kids Space</Link>
                       <Link to="/kids/browse" className="flex-1 rounded-lg bg-white/5 py-2.5 text-center text-xs font-bold text-zinc-300 transition hover:bg-white/10">Kids Catalog</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black text-white">My List</h2>
                <p className="mt-1 text-sm text-zinc-400">Movies and shows you've saved for later.</p>
              </div>
              <p className="text-xs font-bold text-zinc-500">{favorites.length} Titles</p>
            </div>
            
            {favorites.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {favorites.map((fav) => (
                  <div key={fav.id} className="group relative">
                    <Link to={fav.media_type === 'tv' ? `/tv/${fav.tmdb_id}` : `/movie/${fav.tmdb_id}`} className="block aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
                       <img src={fav.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110 group-hover:brightness-110" />
                    </Link>
                    <button 
                      onClick={() => removeFavorite(fav.id)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-narmax-red"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.518.149.022a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 13a.75.75 0 0 0 .75-.75V7.75a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75Z" clipRule="evenodd" /></svg>
                    </button>
                    <p className="mt-2 line-clamp-1 text-xs font-bold text-zinc-100">{fav.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/5 bg-white/[0.02] py-20 text-center">
                 <p className="text-zinc-500 text-sm">Your list is empty. Discover and save content to see it here.</p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black text-white">My Cast</h2>
                <p className="mt-1 text-sm text-zinc-400">Actors and creators you follow.</p>
              </div>
              <p className="text-xs font-bold text-zinc-500">{likedCast.length} Actors</p>
            </div>
            
            {likedCast.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {likedCast.map((cast) => (
                  <div key={cast.id} className="group relative">
                    <Link to={`/person/${cast.cast_id}`} className="block aspect-square overflow-hidden rounded-full border-2 border-white/10 bg-zinc-900 transition hover:border-narmax-cyan">
                       <img src={cast.profile_path ? `https://image.tmdb.org/t/p/w185${cast.profile_path}` : '/uploads/default-avatar.svg'} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    </Link>
                    <button 
                      onClick={() => unlikeCast(cast.cast_id)}
                      className="absolute right-2 top-0 rounded-full bg-black/80 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-narmax-red"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9c-.405-.351-.878-.833-1.346-1.464C3.959 12.05 3.5 10.96 3.5 9.5 3.5 7.015 5.515 5 8 5c1.115 0 2.13.406 2.913 1.082C11.696 5.406 12.712 5 13.826 5c2.485 0 4.5 2.015 4.5 4.5 0 1.46-.459 2.55-1.038 3.32-.469.632-.94 1.114-1.347 1.465a22.047 22.047 0 0 1-2.582 1.9 20.75 20.75 0 0 1-1.162.683l-.019.01-.005.002a.75.75 0 0 1-.708 0Z" /></svg>
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
                 <p className="text-zinc-500 text-sm">You haven't followed any actors yet.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
