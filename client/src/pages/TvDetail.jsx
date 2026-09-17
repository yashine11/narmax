import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Helmet } from 'react-helmet-async';
import ThreadedComments from '../components/ThreadedComments.jsx';
import toast from 'react-hot-toast';

export default function TvDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [show, setShow] = useState(null);
  const [comments, setComments] = useState([]);
  const [movieId, setMovieId] = useState(null);
  const [inList, setInList] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [seasonNum, setSeasonNum] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [epLoading, setEpLoading] = useState(false);

  const loadComments = useCallback(() => {
    api
      .get(`/api/comments/tmdb/${id}`, { params: { type: 'tv' } })
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
      .get(`/api/tmdb/tv/${id}`)
      .then((r) => {
        if (!cancelled) {
          setShow(r.data);
          const list = r.data.seasons || [];
          const firstReal = list.find((s) => (s.episode_count ?? 0) > 0) || list[0];
          if (firstReal) setSeasonNum(firstReal.season_number);
        }
      })
      .catch(() => toast.error('Failed to load show'))
      .finally(() => !cancelled && setLoading(false));

    loadComments();

    if (user) {
      api
        .get('/api/user/favorite-status', { params: { tmdbId: id, type: 'tv' } })
        .then((r) => {
          if (!cancelled) setInList(!!r.data.inList);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [id, user, loadComments]);

  useEffect(() => {
    if (!show) return;
    setEpLoading(true);
    api
      .get(`/api/tmdb/tv/${id}/season/${seasonNum}`)
      .then((r) => setEpisodes(r.data.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setEpLoading(false));
  }, [id, seasonNum, show]);

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
          title: show.title,
          overview: show.overview,
          poster_path: show.poster_path,
          vote_average: show.vote_average,
          media_type: 'tv',
        });
        setInList(true);
        const st = await api.get('/api/user/favorite-status', { params: { tmdbId: id, type: 'tv' } });
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
        title: show.title,
        overview: show.overview,
        poster_path: show.poster_path,
        vote_average: show.vote_average,
        media_type: 'tv',
        content: text.trim(),
      });
      setText('');
      loadComments();
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post');
    }
  };

  if (loading || !show) {
    return <div className="min-h-screen skeleton bg-zinc-900 animate-pulse" />;
  }

  const movieMeta = {
    title: show.title,
    overview: show.overview,
    poster_path: show.poster_path,
    vote_average: show.vote_average,
    media_type: 'tv',
  };

  const seasons = show.seasons || [];

  return (
    <div>
      <Helmet>
        <title>{`${show.title} — NARMAX`}</title>
        <meta name="description" content={show.overview ? show.overview.slice(0, 160) : `Watch ${show.title} on NARMAX`} />
      </Helmet>
      <div
        className="relative min-h-[48vh] flex items-end"
        style={{
          backgroundImage: show.backdrop_path ? `url(${show.backdrop_path})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-12 flex flex-col md:flex-row gap-8 w-full">
          <div className="shrink-0 w-48 sm:w-56 mx-auto md:mx-0">
            {show.poster_path ? (
              <img src={show.poster_path} alt="" className="rounded-lg shadow-card w-full" loading="lazy" />
            ) : (
              <div className="aspect-[2/3] bg-zinc-800 rounded-lg" />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-black mb-2">{show.title}</h1>
            <p className="text-zinc-200 font-semibold mb-2">
              <span className="text-narmax-red">{show.vote_average?.toFixed(1)}</span>
              <span className="text-zinc-500"> |</span> {show.release_date?.slice(0, 4)}
              {show.number_of_seasons != null && (
                <span className="text-zinc-400"> | {show.number_of_seasons} seasons</span>
              )}
            </p>
            <p className="text-zinc-300 max-w-2xl mb-6">{show.overview}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a
                href="#episodes"
                className="bg-narmax-red hover:bg-red-700 px-8 py-3 rounded font-bold transition shadow-lg shadow-red-900/20"
              >
                Browse episodes
              </a>
              <button
                type="button"
                onClick={toggleList}
                className="bg-white/10 border border-white/30 px-8 py-3 rounded font-semibold hover:bg-white/20 transition"
              >
                {inList ? 'In My List' : 'Add to My List'}
              </button>
            </div>
            {show.trailer?.youtube && (
              <div className="mt-8 max-w-3xl">
                <h3 className="font-bold mb-2">Trailer</h3>
                <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
                  <iframe title="trailer" src={show.trailer.youtube} className="w-full h-full" allowFullScreen />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {show.cast?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10 border-t border-zinc-900">
          <h2 className="text-xl font-bold mb-4">Cast</h2>
          <div className="flex gap-4 overflow-x-auto row-scroll pb-2">
            {show.cast.map((c) => (
              <Link key={`${c.id}-${c.character}`} to={`/person/${c.id}`} className="shrink-0 w-28 text-center group">
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

      <section id="episodes" className="max-w-6xl mx-auto px-4 sm:px-8 py-10 border-t border-zinc-900 scroll-mt-24">
        <h2 className="text-2xl font-black mb-2">Episodes</h2>
        <p className="text-sm text-zinc-500 mb-6">Pick a season, then choose an episode to play.</p>

        {seasons.length === 0 ? (
          <p className="text-zinc-500 text-sm">Season information is not available for this title.</p>
        ) : (
          <>
            <div className="mb-4 sm:hidden">
              <label htmlFor="season-select" className="sr-only">
                Season
              </label>
              <select
                id="season-select"
                value={seasonNum}
                onChange={(e) => setSeasonNum(Number(e.target.value))}
                className="w-full max-w-md bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-sm font-medium focus:border-narmax-red outline-none"
              >
                {seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                    {s.episode_count != null ? ` | ${s.episode_count} eps` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 mb-6">
              {seasons.map((s) => (
                <button
                  key={s.season_number}
                  type="button"
                  onClick={() => setSeasonNum(s.season_number)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition shadow-sm ${
                    seasonNum === s.season_number
                      ? 'bg-narmax-red border-narmax-red text-white shadow-red-900/25'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  {s.name || `Season ${s.season_number}`}
                  {s.episode_count != null ? ` (${s.episode_count})` : ''}
                </button>
              ))}
            </div>
            {epLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 skeleton rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {episodes.map((ep) => (
                  <li
                    key={ep.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 transition shadow-sm hover:shadow-md"
                  >
                    <div className="shrink-0 w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-white/5">
                      {ep.still_path ? (
                        <img src={ep.still_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">{ep.episode_number}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-narmax-red">E{ep.episode_number}</span>
                        <h3 className="font-bold text-white">{ep.name}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-3 mb-3">{ep.overview || 'No description.'}</p>
                      <Link
                        to={`/watch/${id}?type=tv&season=${seasonNum}&episode=${ep.episode_number}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg border border-white/20 transition"
                      >
                        Play episode
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

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
          mediaType="tv"
          movieMeta={movieMeta}
          onRefresh={loadComments}
        />
      </section>
    </div>
  );
}

