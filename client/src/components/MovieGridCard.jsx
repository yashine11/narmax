import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const previewCache = new Map();

function previewKey(kind, id) {
  return `${kind}:${id}`;
}

function daysSince(dateValue) {
  const date = new Date(String(dateValue || ''));
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildBadges(movie, kind) {
  if (Array.isArray(movie?.badges) && movie.badges.length > 0) {
    return movie.badges.filter(Boolean).slice(0, 2);
  }

  const next = [];
  if (Number(movie?.rank) > 0 && Number(movie.rank) <= 10) {
    next.push(`Top ${Number(movie.rank)}`);
  }

  const since = daysSince(movie?.release_date || movie?.first_air_date);
  if (since <= 45 && kind === 'tv') {
    next.push('New Episode');
  } else if (since <= 75) {
    next.push('Recently Added');
  }

  if (Number(movie?.vote_average || 0) >= 8) {
    next.push('Trending');
  }

  if (next.length === 0) {
    next.push('Watch Now');
  }

  return Array.from(new Set(next)).slice(0, 2);
}

function CircleBtn({ children, onClick, title, className = '' }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(event);
      }}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/55 text-xs text-white transition hover:bg-white/20 ${className}`}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 5.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export default function MovieGridCard({
  movie,
  kind = 'movie',
  progress,
  completed,
  onPlay,
  onToggleList,
  inList: inListProp,
  showListBtn: showListBtnProp,
  layout = 'portrait',
  enablePreview = true,
}) {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [trailerKey, setTrailerKey] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [internalInList, setInternalInList] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(() => {
    try { return sessionStorage.getItem('narmax:preview-muted') !== 'false'; } catch { return true; }
  });
  // 'left' | 'right' | 'center' — computed on hover
  const [edgeAlign, setEdgeAlign] = useState('center');
  const cardRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const previewTimerRef = useRef(null);

  const isLandscape = layout === 'landscape';
  const href = kind === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;
  const watchHref = kind === 'tv' ? `/watch/${movie.id}?type=tv&season=1&episode=1` : `/watch/${movie.id}`;
  const score = Number.isFinite(movie.vote_average) ? movie.vote_average.toFixed(1) : null;
  
  const baseImage = movie.poster_path || movie.backdrop_path;
  const hoverImage = movie.backdrop_path || movie.poster_path;
  
  const badges = useMemo(() => buildBadges(movie, kind), [kind, movie]);

  // Sync internal state with prop if provided
  useEffect(() => {
    if (inListProp !== undefined) {
      setInternalInList(inListProp);
    }
  }, [inListProp]);

  // Initial check for favorite status if not provided and user is logged in
  useEffect(() => {
    if (user && inListProp === undefined && hovered) {
       api.get('/api/user/favorite-status', { params: { tmdbId: movie.id } })
         .then(r => setInternalInList(!!r.data.movieId))
         .catch(() => {});
    }
  }, [user, movie.id, inListProp, hovered]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const mediaLabel = useMemo(() => (kind === 'tv' ? 'Series' : 'Movie'), [kind]);
  const yearLabel = String(movie.release_date || movie.first_air_date || '').slice(0, 4);

  const getPreviewEmbed = (key, muted) => {
    if (!key) return '';
    const muteParam = muted ? 1 : 0;
    return `https://www.youtube.com/embed/${key}?autoplay=1&mute=${muteParam}&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${key}`;
  };

  const previewUrl = trailerKey ? getPreviewEmbed(trailerKey, previewMuted) : '';

  const fetchPreview = async () => {
    const key = previewKey(kind, movie.id);
    if (previewCache.has(key)) {
      setTrailerKey(previewCache.get(key));
      return;
    }
    try {
      setFetchingPreview(true);
      const { data } = await api.get(`/api/tmdb/preview/${kind}/${movie.id}`);
      const tKey = data?.trailer_key || '';
      previewCache.set(key, tKey);
      setTrailerKey(tKey);
    } catch {
      previewCache.set(key, '');
      setTrailerKey('');
    } finally {
      setFetchingPreview(false);
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !previewMuted;
    setPreviewMuted(next);
    try { sessionStorage.setItem('narmax:preview-muted', String(next)); } catch {}
  };

  const handleToggleList = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onToggleList) {
      onToggleList(movie);
      return;
    }

    if (!user) {
      toast.error('Sign in to use My List');
      return;
    }

    try {
      if (internalInList) {
        const { data: status } = await api.get('/api/user/favorite-status', { params: { tmdbId: movie.id } });
        if (status.movieId) {
          await api.delete(`/api/user/favorites/${status.movieId}`);
          setInternalInList(false);
          toast.success('Removed from My List');
        }
      } else {
        await api.post('/api/user/favorites', {
          tmdbId: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          media_type: kind
        });
        setInternalInList(true);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  const isTouchDevice = () => {
    try { return window.matchMedia('(hover: none), (pointer: coarse)').matches; } catch { return false; }
  };

  const onEnter = () => {
    // Skip hover expansion entirely on touch/mobile
    if (isTouchDevice()) return;

    // Detect if this card is near the left or right edge of the viewport
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 80; // px threshold from screen edge
      if (rect.left < margin) {
        setEdgeAlign('left');
      } else if (vw - rect.right < margin) {
        setEdgeAlign('right');
      } else {
        setEdgeAlign('center');
      }
    }

    setHovered(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(true);
    }, 250);

    if (!enablePreview) return;
    previewTimerRef.current = setTimeout(async () => {
      await fetchPreview();
      setShowPreview(true);
    }, 600);
  };

  const onLeave = () => {
    setHovered(false);
    setControlsVisible(false);
    setShowPreview(false);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  };

  const showListBtn = showListBtnProp !== undefined ? showListBtnProp : !!user;

  return (
    <div
      ref={cardRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`group relative z-10 transition-all duration-300 hover:z-[100] ${
        isLandscape ? 'aspect-video' : 'aspect-[2/3]'
      }`}
    >
      {/* Base Card (Static) */}
      <Link
        to={href}
        className={`block h-full w-full overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 transition-all duration-300 ${
          completed ? 'opacity-70' : ''
        }`}
      >
        {baseImage ? (
          <img src={isLandscape ? hoverImage : baseImage} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-[10px] text-zinc-500">{movie.title}</div>
        )}
        
        {completed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
             <div className="rounded-full bg-narmax-cyan/90 p-1.5 text-black shadow-lg">
                <CheckIcon />
             </div>
          </div>
        )}
        
        {!completed && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div className="h-full bg-narmax-red" style={{ width: `${progress}%` }} />
          </div>
        )}
      </Link>

      {/* Expanded Hover Card */}
      <div
        className={`pointer-events-none absolute top-1/2 z-[999] w-[140%] -translate-y-1/2 overflow-visible rounded-2xl bg-[#0a0a0a] shadow-[0_30px_100px_rgba(0,0,0,0.9)] ring-1 ring-white/20 transition-all duration-400 ease-out sm:w-[180%] ${
          hovered ? 'pointer-events-auto scale-100 opacity-100' : 'scale-75 opacity-0'
        } ${
          edgeAlign === 'left'
            ? 'left-0'
            : edgeAlign === 'right'
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
        }`}
        style={{
          transformOrigin: edgeAlign === 'left' ? 'left center' : edgeAlign === 'right' ? 'right center' : 'center center',
          willChange: 'transform',
        }}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl">
          {showPreview && previewUrl ? (
            <div className="absolute inset-0 z-[5]">
              <iframe
                key={`${trailerKey}-${previewMuted}`}
                title="preview"
                src={previewUrl}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
            </div>
          ) : (
            <img src={hoverImage} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          
          <Link to={href} className="absolute inset-0 z-[6]" />

          {/* Mute toggle positioned above the Link (z-[6]) */}
          {showPreview && previewUrl && (
            <button
              type="button"
              onClick={toggleMute}
              title={previewMuted ? 'Unmute preview' : 'Mute preview'}
              className="absolute bottom-3 right-3 z-[10] flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white transition hover:bg-black/80"
            >
              {previewMuted ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l2 2L21 18.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              )}
            </button>
          )}
        </div>


        <div
          className={`flex flex-col gap-3 p-4 transition-all duration-300 ${
            controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link
                to={watchHref}
                onClick={(e) => { e.stopPropagation(); onPlay?.(movie); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-6 w-6"><path d="M8 5v14l11-7z"/></svg>
              </Link>
              {showListBtn && (
                <CircleBtn onClick={handleToggleList} title={internalInList ? 'In My List' : 'Add to My List'} className="h-10 w-10">
                  {internalInList ? <CheckIcon /> : <PlusIcon />}
                </CircleBtn>
              )}
            </div>
            {score && (
              <div className="text-sm font-bold text-green-400">{Math.round(score * 10)}% Match</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="text-white">{yearLabel}</span>
            <span className="rounded border border-white/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white">HD</span>
            <span className="text-zinc-400">{mediaLabel}</span>
            {badges.slice(0, 1).map((b) => (
              <span key={b} className="text-narmax-cyan">{b}</span>
            ))}
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">
            {movie.overview}
          </p>
        </div>
      </div>
    </div>
  );
}
