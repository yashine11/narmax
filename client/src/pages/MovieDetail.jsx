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
    <div>
      <Helmet>
        <title>{`${movie.title} — NARMAX`}</title>
        <meta name="description" content={movie.overview ? movie.overview.slice(0, 160) : `Watch ${movie.title} on NARMAX`} />
      </Helmet>
      <div
        className="relative min-h-[48vh] flex items-end"
        style={{
          backgroundImage: movie.backdrop_path ? `url(${movie.backdrop_path})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-12 flex flex-col md:flex-row gap-8 w-full">
          <div className="shrink-0 w-48 sm:w-56 mx-auto md:mx-0">
            {movie.poster_path ? (
              <img src={movie.poster_path} alt="" className="rounded-lg shadow-card w-full" loading="lazy" />
            ) : (
              <div className="aspect-[2/3] bg-zinc-800 rounded-lg" />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-black mb-2">{movie.title}</h1>
            <p className="text-zinc-200 font-semibold mb-2">
              <span className="text-narmax-red">{movie.vote_average?.toFixed(1)}</span>
              <span className="text-zinc-500"> |</span> {movie.release_date?.slice(0, 4)}
            </p>
            <p className="text-zinc-300 max-w-2xl mb-6">{movie.overview}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                to={`${base}/watch/${id}`}
                className="bg-narmax-red hover:bg-red-700 px-8 py-3 rounded font-bold transition"
              >
                Watch Now
              </Link>
              <button
                type="button"
                onClick={toggleList}
                className="bg-white/10 border border-white/30 px-8 py-3 rounded font-semibold hover:bg-white/20 transition"
              >
                {inList ? 'In My List' : 'Add to My List'}
              </button>
            </div>
            {movie.trailer?.youtube && (
              <div className="mt-8 max-w-3xl">
                <h3 className="font-bold mb-2">Trailer</h3>
                <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
                  <iframe title="trailer" src={movie.trailer.youtube} className="w-full h-full" allowFullScreen />
                </div>
              </div>
            )}
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

