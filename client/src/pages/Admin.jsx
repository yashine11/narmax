import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'dash', label: 'Dashboard' },
  { id: 'movies', label: 'Movies' },
  { id: 'users', label: 'Users' },
  { id: 'comments', label: 'Comments' },
  { id: 'kids', label: 'Kids code' },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dash');
  const [dash, setDash] = useState(null);
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    category: '',
    video_url: '',
    rating: 0,
    tmdb_id: '',
    media_type: 'movie',
  });
  const [editingId, setEditingId] = useState(null);
  const [kidsCode, setKidsCode] = useState('');
  const refreshDash = () =>
    api.get('/api/admin/dashboard').then((r) => setDash(r.data)).catch(() => {});

  const refreshMovies = () =>
    api.get('/api/admin/movies').then((r) => setMovies(r.data.movies || [])).catch(() => toast.error('Load movies failed'));

  const refreshUsers = () =>
    api.get('/api/admin/users').then((r) => setUsers(r.data.users || [])).catch(() => toast.error('Load users failed'));

  const refreshComments = () =>
    api.get('/api/admin/comments').then((r) => setComments(r.data.comments || [])).catch(() => toast.error('Load comments failed'));

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (tab === 'dash') refreshDash();
    if (tab === 'movies') refreshMovies();
    if (tab === 'users') refreshUsers();
    if (tab === 'comments') refreshComments();
  }, [tab, user]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const submitMovie = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(movieForm).forEach(([k, v]) => {
      if (v !== '' && v != null) fd.append(k, v);
    });
    const file = e.target.poster?.files?.[0];
    if (file) fd.append('poster', file);
    try {
      if (editingId) {
        await api.patch(`/api/admin/movies/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Movie updated');
      } else {
        await api.post('/api/admin/movies', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Movie created');
      }
      setMovieForm({
        title: '',
        description: '',
        category: '',
        video_url: '',
        rating: 0,
        tmdb_id: '',
        media_type: 'movie',
      });
      setEditingId(null);
      e.target.reset();
      refreshMovies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const editMovie = (m) => {
    setEditingId(m.id);
    setMovieForm({
      title: m.title,
      description: m.description || '',
      category: m.category || '',
      video_url: m.video_url || '',
      rating: m.rating || 0,
      tmdb_id: m.tmdb_id || '',
      media_type: m.media_type || 'movie',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMovie = async (id) => {
    if (!confirm('Delete this movie?')) return;
    try {
      await api.delete(`/api/admin/movies/${id}`);
      toast.success('Deleted');
      refreshMovies();
    } catch {
      toast.error('Delete failed');
    }
  };

  const patchUser = async (id, payload) => {
    try {
      const fd = new FormData();
      if (payload.username) fd.append('username', payload.username);
      if (payload.email) fd.append('email', payload.email);
      if (payload.role) fd.append('role', payload.role);
      if (payload.password) fd.append('password', payload.password);
      await api.patch(`/api/admin/users/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('User updated');
      refreshUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete user?')) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success('User removed');
      refreshUsers();
    } catch {
      toast.error('Delete failed');
    }
  };

  const deleteComment = async (id) => {
    if (!confirm('Delete comment?')) return;
    try {
      await api.delete(`/api/admin/comments/${id}`);
      toast.success('Removed');
      refreshComments();
    } catch {
      toast.error('Failed');
    }
  };

  const saveKidsCode = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/kids-code', { code: kidsCode });
      setKidsCode('');
      toast.success('Kids code updated');
    } catch {
      toast.error('Failed to set code');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Admin</h1>
      <p className="text-zinc-500 text-sm mb-8">Manage catalog, users, and moderation.</p>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-800 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.id ? 'bg-narmax-red' : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dash' && dash && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Users', dash.users],
            ['Movies', dash.movies],
            ['Comments', dash.comments],
            ['Favorites', dash.favorites],
          ].map(([label, n]) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <p className="text-zinc-500 text-sm">{label}</p>
              <p className="text-3xl font-black mt-2">{n}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'movies' && (
        <div className="space-y-10">
          <form onSubmit={submitMovie} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
            <h2 className="font-bold text-lg">{editingId ? `Edit movie #${editingId}` : 'Add movie'}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Title"
                value={movieForm.title}
                onChange={(e) => setMovieForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2"
              />
              <input
                placeholder="Category"
                value={movieForm.category}
                onChange={(e) => setMovieForm((f) => ({ ...f, category: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2"
              />
              <input
                placeholder="TMDB id (optional)"
                value={movieForm.tmdb_id}
                onChange={(e) => setMovieForm((f) => ({ ...f, tmdb_id: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2"
              />
              <select
                value={movieForm.media_type}
                onChange={(e) => setMovieForm((f) => ({ ...f, media_type: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2"
              >
                <option value="movie">movie</option>
                <option value="tv">tv</option>
              </select>
              <input
                type="number"
                step="0.1"
                placeholder="Rating"
                value={movieForm.rating}
                onChange={(e) => setMovieForm((f) => ({ ...f, rating: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2"
              />
              <input
                placeholder="Video URL / embed"
                value={movieForm.video_url}
                onChange={(e) => setMovieForm((f) => ({ ...f, video_url: e.target.value }))}
                className="bg-black border border-zinc-700 rounded px-3 py-2 sm:col-span-2"
              />
            </div>
            <textarea
              placeholder="Description"
              value={movieForm.description}
              onChange={(e) => setMovieForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
            />
            <input name="poster" type="file" accept="image/*" className="text-sm text-zinc-400" />
            <div className="flex gap-2">
              <button type="submit" className="bg-narmax-red px-6 py-2 rounded font-bold">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setMovieForm({
                      title: '',
                      description: '',
                      category: '',
                      video_url: '',
                      rating: 0,
                      tmdb_id: '',
                      media_type: 'movie',
                    });
                  }}
                  className="bg-zinc-800 px-4 py-2 rounded"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">TMDB</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {movies.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-800">
                    <td className="p-3">{m.id}</td>
                    <td className="p-3 max-w-[200px] truncate">{m.title}</td>
                    <td className="p-3">{m.media_type}</td>
                    <td className="p-3">{m.tmdb_id ?? '—'}</td>
                    <td className="p-3 flex gap-2">
                      <button type="button" className="text-blue-400" onClick={() => editMovie(m)}>
                        Edit
                      </button>
                      <button type="button" className="text-red-400" onClick={() => deleteMovie(m.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-x-auto border border-zinc-800 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-800">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select
                      defaultValue={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      className="bg-black border border-zinc-700 rounded px-2 py-1"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <button type="button" className="text-red-400" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'comments' && (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">
                  #{c.id} · {c.username} · {c.movie_title}
                </p>
                <p className="text-sm mt-2 whitespace-pre-wrap">{c.content}</p>
              </div>
              <button type="button" className="text-red-400 shrink-0 h-fit" onClick={() => deleteComment(c.id)}>
                Remove
              </button>
            </li>
          ))}
          {!comments.length && <li className="text-zinc-500">No comments.</li>}
        </ul>
      )}

      {tab === 'kids' && (
        <form onSubmit={saveKidsCode} className="max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="font-bold">Set kids access code</h2>
          <p className="text-zinc-500 text-sm">Bcrypt-hashed on the server. Minimum 4 characters.</p>
          <input
            type="password"
            value={kidsCode}
            onChange={(e) => setKidsCode(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded px-3 py-2"
            placeholder="New code"
          />
          <button type="submit" className="bg-narmax-red px-6 py-2 rounded font-bold">
            Save code
          </button>
        </form>
      )}
    </div>
  );
}
