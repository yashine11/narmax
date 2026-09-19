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
    <div className="min-h-screen bg-[#09090b] text-white">
      <Helmet>
        <title>{`${show.title} — NARMAX`}</title>
        <meta name="description" content={show.overview ? show.overview.slice(0, 160) : `Watch ${show.title} on NARMAX`} />
      </Helmet>

      {/* Hero Banner */}
      <div className="relative min-h-[60vh] lg:min-h-[70vh] flex items-end pb-12 pt-28 overflow-hidden">
        {show.backdrop_path && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${show.backdrop_path})` }}
          />
        )}
        <div className="cine-vignette-hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />

        <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Left: Title, Metadata, Action Buttons */}
            <div className="lg:col-span-2 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                <span className="bg-[#f5c518] text-black px-2.5 py-0.5 rounded font-black tracking-wider">
                  IMDb {show.vote_average?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded backdrop-blur">
                  {show.release_date?.slice(0, 4) || show.first_air_date?.slice(0, 4) || 'TV'}
                </span>
                {show.number_of_seasons != null && (
                  <span className="text-zinc-300 bg-white/10 px-2.5 py-0.5 rounded backdrop-blur">
                    {show.number_of_seasons} Season{show.number_of_seasons > 1 ? 's' : ''}
                  </span>
                )}
                <span className="border border-white/20 text-zinc-300 px-2 py-0.5 rounded text-[11px]">
                  HD
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md">
                {show.title}
              </h1>

              {/* Genres */}
              {show.genres?.length > 0 && (
                <p className="text-xs text-zinc-400 font-medium">
                  {show.genres.map((g) => g.name).join(' • ')}
                </p>
              )}

              {/* Overview */}
              <p className="text-sm sm:text-base text-zinc-300 max-w-3xl line-clamp-3 leading-relaxed drop-shadow">
                {show.overview}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  to={`/watch/${id}?type=tv&season=${seasonNum}&episode=1`}
                  className="cine-play-pill text-sm sm:text-base"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play S{seasonNum} E1
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

                <a
                  href="#episodes"
                  className="cine-icon-circle"
                  title="Browse Episodes"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: Cinejoy Series Information Card */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3 text-xs">
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase border-b border-white/10 pb-2">
                Series Information
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-zinc-400">
                <span className="font-semibold text-zinc-500">Status</span>
                <span className="text-white font-medium">{show.status || 'Ongoing'}</span>

                <span className="font-semibold text-zinc-500">Original Language</span>
                <span className="text-white font-medium uppercase">{show.original_language || 'EN'}</span>

                <span className="font-semibold text-zinc-500">First Aired</span>
                <span className="text-white font-medium">{show.first_air_date || show.release_date || 'N/A'}</span>

                <span className="font-semibold text-zinc-500">Total Seasons</span>
                <span className="text-white font-medium">{show.number_of_seasons || seasons.length || 1}</span>

                <span className="font-semibold text-zinc-500">Total Episodes</span>
                <span className="text-white font-medium">{show.number_of_episodes || 'Multiple'}</span>

                {show.networks?.length > 0 && (
                  <>
                    <span className="font-semibold text-zinc-500">Network</span>
                    <span className="text-white font-medium">{show.networks.map((n) => n.name).join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      {show.cast?.length > 0 && (
        <section className="max-w-[1920px] mx-auto px-4 sm:px-8 py-8 border-t border-white/5">
          <h2 className="text-lg font-black text-white mb-4 tracking-tight">Top Cast</h2>
          <div className="flex gap-4 overflow-x-auto row-scroll pb-2">
            {show.cast.map((c) => (
              <Link key={`${c.id}-${c.character}`} to={`/person/${c.id}`} className="shrink-0 w-24 sm:w-28 text-center group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-narmax-red transition">
                  {c.profile_path ? (
                    <img src={c.profile_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">?</div>
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-narmax-red transition">{c.name}</p>
                <p className="text-[10px] text-zinc-500 line-clamp-1">{c.character}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Episodes Section */}
      <section id="episodes" className="max-w-[1920px] mx-auto px-4 sm:px-8 py-8 border-t border-white/5 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Episodes</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Select a season and tap an episode to start streaming</p>
          </div>

          {/* Season Pills */}
          {seasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {seasons.map((s) => (
                <button
                  key={s.season_number}
                  type="button"
                  onClick={() => setSeasonNum(s.season_number)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                    seasonNum === s.season_number
                      ? 'bg-narmax-red border-narmax-red text-white shadow-md shadow-red-900/40'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {s.name || `Season ${s.season_number}`}
                  {s.episode_count != null ? ` (${s.episode_count})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {seasons.length === 0 ? (
          <p className="text-zinc-500 text-sm">Season information is not available for this title.</p>
        ) : epLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          /* 16:9 Landscape Episode Cards matching Cinejoy */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                to={`/watch/${id}?type=tv&season=${seasonNum}&episode=${ep.episode_number}`}
                className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/70 border border-white/10 hover:border-white/30 transition shadow hover:shadow-lg"
              >
                {/* 16:9 Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
                  {ep.still_path ? (
                    <img
                      src={ep.still_path}
                      alt={ep.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm font-bold">
                      Episode {ep.episode_number}
                    </div>
                  )}

                  {/* Top-left Episode Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-white font-black text-[11px] px-2 py-0.5 rounded">
                    {String(ep.episode_number).padStart(2, '0')}
                  </div>

                  {/* Bottom-right Runtime */}
                  {ep.runtime && (
                    <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-zinc-300 font-semibold text-[10px] px-2 py-0.5 rounded">
                      {ep.runtime}m
                    </div>
                  )}

                  {/* Play Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Episode Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-narmax-red transition line-clamp-1">
                      {ep.episode_number}. {ep.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                      {ep.overview || 'No synopsis available.'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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

