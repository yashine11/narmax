import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Helmet } from 'react-helmet-async';
import ThreadedComments from '../components/ThreadedComments.jsx';
import toast from 'react-hot-toast';

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const outlet = useOutletContext();
  const kids = outlet?.kids === true;
  const base = kids ? '/kids' : '';

  const [movie, setMovie] = useState(null);
  const [comments, setComments] = useState([]);
  const [movieId, setMovieId] = useState(null);
  const [inList, setInList] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(() => {
    api
      .get(`/api/comments/tmdb/${id}`)
      .then((r) => {
        setComments(r.data.comments || []);
        setMovieId(r.data.movieId);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/tmdb/movie/${id}`)
      .then((r) => {
        if (!cancelled) setMovie(r.data);
      })
      .catch(() => toast.error('Failed to load title'))
      .finally(() => !cancelled && setLoading(false));

    loadComments();

    if (user) {
      api
        .get('/api/user/favorite-status', { params: { tmdbId: id } })
        .then((r) => {
          if (!cancelled) setInList(!!r.data.inList);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [id, user, loadComments]);

  const toggleList = async () => {
    if (!user) {
      toast.error('Sign in to use My List');
      return;
    }
    try {
      if (inList && movieId) {
        await api.delete(`/api/user/favorites/${movieId}`);
        setInList(false);
        toast.success('Removed from My List');
      } else {
        await api.post('/api/user/favorites', {
          tmdbId: Number(id),
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
        });
        setInList(true);
        const st = await api.get('/api/user/favorite-status', { params: { tmdbId: id } });
        setMovieId(st.data.movieId);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to comment');
      return;
    }
    if (!text.trim()) return;
    try {
      await api.post('/api/comments', {
        tmdbId: Number(id),
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        content: text.trim(),
      });
      setText('');
      loadComments();
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post');
    }
  };

  if (loading || !movie) {
    return <div className="min-h-screen skeleton bg-zinc-900 animate-pulse" />;
  }

  const movieMeta = {
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    vote_average: movie.vote_average,
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Helmet>
        <title>{`${movie.title} — NARMAX`}</title>
        <meta name="description" content={movie.overview ? movie.overview.slice(0, 160) : `Watch ${movie.title} on NARMAX`} />
      </Helmet>

      {/* Hero Banner */}
      <div className="relative min-h-[60vh] lg:min-h-[70vh] flex items-end pb-12 pt-28 overflow-hidden">
        {movie.backdrop_path && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${movie.backdrop_path})` }}
          />
        )}
        <div className="cine-vignette-hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />

        <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Left: Title, Badges, Overview, Play */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                <span className="bg-[#f5c518] text-black px-2.5 py-0.5 rounded font-black tracking-wider">
                  IMDb {movie.vote_average?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded backdrop-blur">
                  {movie.release_date?.slice(0, 4) || 'Movie'}
                </span>
                {movie.runtime && (
                  <span className="text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded backdrop-blur">
                    {movie.runtime} min
                  </span>
                )}
                <span className="border border-white/20 text-zinc-300 px-2 py-0.5 rounded text-[11px]">
                  HD
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md">
                {movie.title}
              </h1>

              {movie.genres?.length > 0 && (
                <p className="text-xs text-zinc-400 font-medium">
                  {movie.genres.map((g) => g.name).join(' • ')}
                </p>
              )}

              <p className="text-sm sm:text-base text-zinc-300 max-w-3xl line-clamp-3 leading-relaxed drop-shadow">
                {movie.overview}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  to={`${base}/watch/${id}`}
                  className="cine-play-pill text-sm sm:text-base"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Now
                </Link>

                <button
                  type="button"
                  onClick={toggleList}
                  className={`cine-icon-circle ${inList ? 'border-narmax-red text-narmax-red' : ''}`}
                  title={inList ? 'Remove from My List' : 'Add to My List'}
                >
                  {inList ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Movie Information Card */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3 text-xs">
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase border-b border-white/10 pb-2">
                Movie Information
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-zinc-400">
                <span className="font-semibold text-zinc-500">Status</span>
                <span className="text-white font-medium">{movie.status || 'Released'}</span>

                <span className="font-semibold text-zinc-500">Release Date</span>
                <span className="text-white font-medium">{movie.release_date || 'N/A'}</span>

                <span className="font-semibold text-zinc-500">Duration</span>
                <span className="text-white font-medium">{movie.runtime ? `${movie.runtime} minutes` : 'N/A'}</span>

                <span className="font-semibold text-zinc-500">Language</span>
                <span className="text-white font-medium uppercase">{movie.original_language || 'EN'}</span>

                {movie.production_companies?.length > 0 && (
                  <>
                    <span className="font-semibold text-zinc-500">Production</span>
                    <span className="text-white font-medium line-clamp-1">{movie.production_companies[0].name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {movie.cast?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10 border-t border-zinc-900">
          <h2 className="text-xl font-bold mb-4">Cast</h2>
          <div className="flex gap-4 overflow-x-auto row-scroll pb-2">
            {movie.cast.map((c) => (
              <Link
                key={`${c.id}-${c.character}`}
                to={`/person/${c.id}`}
                className="shrink-0 w-28 text-center group"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-narmax-red/60 transition">
                  {c.profile_path ? (
                    <img src={c.profile_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">?</div>
                  )}
                </div>
                <p className="text-xs font-semibold line-clamp-2 group-hover:text-narmax-red transition">{c.name}</p>
                <p className="text-[10px] text-zinc-500 line-clamp-1">{c.character}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-zinc-900">
        <h2 className="text-xl font-bold mb-4">Discussion</h2>
        {user && (
          <form onSubmit={postComment} className="mb-8">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm focus:border-narmax-red outline-none"
              placeholder="Share your thoughts..."
            />
            <button type="submit" className="mt-2 bg-narmax-red px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition">
              Post
            </button>
          </form>
        )}
        <ThreadedComments
          flatComments={comments}
          user={user}
          tmdbId={id}
          mediaType="movie"
          movieMeta={movieMeta}
          onRefresh={loadComments}
        />
      </section>
    </div>
  );
}

