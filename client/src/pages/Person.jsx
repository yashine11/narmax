import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function Person() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api
      .get(`/api/tmdb/person/${id}`)
      .then((r) => setP(r.data))
      .catch(() => toast.error('Failed to load actor'))
      .finally(() => setLoading(false));

    if (user) {
      api.get(`/api/cast/status`, { params: { cast_id: id } })
        .then(r => setIsLiked(r.data.liked))
        .catch(() => {});
    }
  }, [id, user]);

  const toggleLike = async () => {
    if (!user) return toast.error('Sign in to follow actors');
    setToggling(true);
    try {
      const { data } = await api.post('/api/cast/toggle', {
        cast_id: id,
        name: p.name,
        profile_path: p.profile_path ? p.profile_path.replace('https://image.tmdb.org/t/p/w185', '') : null
      });
      setIsLiked(data.action === 'added');
      toast.success(data.action === 'added' ? `Following ${p.name}` : `Unfollowed ${p.name}`);
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setToggling(false);
    }
  };

  if (loading || !p) {
    return <div className="min-h-screen skeleton bg-zinc-900 animate-pulse" />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="shrink-0 w-48 sm:w-56 mx-auto md:mx-0">
          {p.profile_path ? (
            <img src={p.profile_path} alt="" className="rounded-xl shadow-card w-full" loading="lazy" />
          ) : (
            <div className="aspect-[2/3] bg-zinc-800 rounded-xl" />
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h1 className="text-4xl font-black">{p.name}</h1>
            <button
              onClick={toggleLike}
              disabled={toggling}
              className={`flex items-center gap-2 rounded-full border px-5 py-1.5 text-xs font-black uppercase tracking-widest transition ${
                isLiked 
                  ? 'border-narmax-cyan bg-narmax-cyan text-black hover:bg-transparent hover:text-white' 
                  : 'border-white/20 bg-white/5 text-white hover:border-white/40'
              }`}
            >
              {isLiked ? (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9c-.405-.351-.878-.833-1.346-1.464C3.959 12.05 3.5 10.96 3.5 9.5 3.5 7.015 5.515 5 8 5c1.115 0 2.13.406 2.913 1.082C11.696 5.406 12.712 5 13.826 5c2.485 0 4.5 2.015 4.5 4.5 0 1.46-.459 2.55-1.038 3.32-.469.632-.94 1.114-1.347 1.465a22.047 22.047 0 0 1-2.582 1.9 20.75 20.75 0 0 1-1.162.683l-.019.01-.005.002a.75.75 0 0 1-.708 0Z" /></svg>
                  Following
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12.5 5.5c0 1.381-1.119 2.5-2.5 2.5s-2.5-1.119-2.5-2.5 1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5zM4 16v-1c0-2.209 1.791-4 4-4h4c2.209 0 4 1.791 4 4v1" /></svg>
                  Follow
                </>
              )}
            </button>
          </div>
          {p.birthday && <p className="text-zinc-400 text-sm mb-2">Born {p.birthday}</p>}
          {p.place_of_birth && <p className="text-zinc-500 text-sm mb-4">{p.place_of_birth}</p>}
          <p className="text-zinc-300 text-sm leading-relaxed max-w-3xl whitespace-pre-line">{p.biography || 'No biography available.'}</p>
        </div>
      </div>

      {p.movies?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {p.movies.map((m) => (
              <Link key={`m-${m.id}`} to={`/movie/${m.id}`} className="group">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/10 group-hover:ring-narmax-red/50 transition mb-2">
                  {m.poster_path ? (
                    <img src={m.poster_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600 p-2 text-center">{m.title}</div>
                  )}
                </div>
                <p className="text-xs font-semibold line-clamp-2 group-hover:text-narmax-red">{m.title}</p>
                {m.character && <p className="text-[10px] text-zinc-500 line-clamp-1">{m.character}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {p.tv?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">TV</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {p.tv.map((t) => (
              <Link key={`t-${t.id}`} to={`/tv/${t.id}`} className="group">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-white/10 group-hover:ring-narmax-red/50 transition mb-2">
                  {t.poster_path ? (
                    <img src={t.poster_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600 p-2 text-center">{t.title}</div>
                  )}
                </div>
                <p className="text-xs font-semibold line-clamp-2 group-hover:text-narmax-red">{t.title}</p>
                {t.character && <p className="text-[10px] text-zinc-500 line-clamp-1">{t.character}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
