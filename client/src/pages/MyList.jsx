import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function MyList() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get('/api/user/favorites')
      .then((r) => setItems(r.data.favorites || []))
      .catch(() => toast.error('Could not load list'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-[1920px]">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-narmax-cyan">Your Collection</p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">My List</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 text-6xl opacity-30">📋</div>
            <h2 className="mb-2 text-xl font-black text-white">Your list is empty</h2>
            <p className="max-w-sm text-sm text-zinc-500">Browse movies and TV shows, then hit the + button to save them here.</p>
            <Link to="/" className="mt-8 rounded-xl bg-narmax-cyan px-6 py-3 text-sm font-bold text-black transition hover:bg-cyan-300">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((m) => {
              const href =
                m.media_type === 'tv' && m.tmdb_id
                  ? `/tv/${m.tmdb_id}`
                  : m.tmdb_id
                    ? `/movie/${m.tmdb_id}`
                    : '#';
              const poster = m.image || m.poster_path;
              return (
                <Link
                  key={m.id}
                  to={href}
                  className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 shadow-lg ring-1 ring-white/10 transition hover:ring-narmax-cyan/50"
                >
                  {poster ? (
                    <img src={poster} alt={m.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-zinc-500">
                      {m.title}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <p className="truncate text-xs font-bold text-white">{m.title}</p>
                    {m.media_type && (
                      <p className="text-[10px] text-narmax-cyan uppercase tracking-wider">{m.media_type === 'tv' ? 'Series' : 'Movie'}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
