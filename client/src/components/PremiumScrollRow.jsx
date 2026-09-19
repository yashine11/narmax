import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';
import MovieGridCard from './MovieGridCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import toast from 'react-hot-toast';

export default function PremiumScrollRow({
  title,
  subtitle,
  movies,
  kind = 'movie',
  favoriteIds,
  onToggleListItem,
  showListBtn,
}) {
  const railRef = useRef(null);
  const { user } = useAuth();
  const { getProgress } = useProgress();
  const { cardStyle } = usePreferences() || {};
  const isLandscape = cardStyle === 'backdrops';
  const [favTmdb, setFavTmdb] = useState(new Set());
  const useExternalFavorites = favoriteIds instanceof Set;
  const resolvedFavorites = useExternalFavorites ? favoriteIds : favTmdb;
  const showMyListButton = showListBtn ?? !!user;

  useEffect(() => {
    if (useExternalFavorites) return undefined;
    if (!user || !showMyListButton) {
      setFavTmdb(new Set());
      return undefined;
    }
    api
      .get('/api/user/favorites')
      .then((response) => {
        const next = new Set();
        (response.data.favorites || []).forEach((favorite) => {
          const tmdbId = favorite.tmdb_id;
          if (!tmdbId) return;
          if (kind === 'tv' && favorite.media_type === 'tv') next.add(tmdbId);
          if (kind === 'movie' && favorite.media_type !== 'tv') next.add(tmdbId);
        });
        setFavTmdb(next);
      })
      .catch(() => {});
    return undefined;
  }, [kind, showMyListButton, useExternalFavorites, user]);

  const toggleList = async (movie) => {
    if (onToggleListItem) {
      onToggleListItem(movie);
      return;
    }
    if (!user) {
      toast.error('Sign in to use My List');
      return;
    }

    try {
      if (favTmdb.has(movie.id)) {
        const { data: status } = await api.get('/api/user/favorite-status', {
          params: { tmdbId: movie.id, ...(kind === 'tv' ? { type: 'tv' } : {}) },
        });
        if (status.movieId) await api.delete(`/api/user/favorites/${status.movieId}`);
        setFavTmdb((prev) => {
          const next = new Set(prev);
          next.delete(movie.id);
          return next;
        });
        toast.success('Removed from My List');
      } else {
        await api.post('/api/user/favorites', {
          tmdbId: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          ...(kind === 'tv' ? { media_type: 'tv' } : {}),
        });
        setFavTmdb((prev) => new Set(prev).add(movie.id));
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  const scroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: direction * 720, behavior: 'smooth' });
  };

  if (!movies?.length) return null;

  return (
    <section className="mb-12 sm:mb-16">
      <div className="mx-auto mb-5 flex max-w-[1920px] items-end justify-between gap-4 px-4 sm:px-10">
        <div>
          <h2 className="text-[1.35rem] font-black tracking-tight text-white sm:text-[1.72rem]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1920px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-12 bg-gradient-to-r from-black to-transparent sm:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-12 bg-gradient-to-l from-black to-transparent sm:block" />
        <div
          ref={railRef}
          className="premium-row-scroll row-scroll mx-auto flex max-w-[1920px] gap-3 overflow-x-auto px-4 pb-4 sm:gap-4 sm:px-10"
          style={{ paddingTop: '5rem', paddingBottom: '5rem', marginTop: '-5rem', marginBottom: '-5rem', overflowY: 'visible' }}
        >
          {movies.map((movie, index) => {
            const mediaType = kind === 'tv' ? 'tv' : 'movie';
            const progress = getProgress(movie.id, mediaType);
            const baseBadges = [];
            if (/trending/i.test(title) && index < 10) baseBadges.push(`Top ${index + 1}`);
            if (/upcoming|release/i.test(title) && index < 8) baseBadges.push('Recently Added');
            if (/watched/i.test(title)) baseBadges.push('Watch Now');
            if (kind === 'tv' && index % 5 === 0) baseBadges.push('New Episode');
            if (baseBadges.length === 0) baseBadges.push(index < 6 ? 'Trending' : 'Watch Now');
            const cardMovie =
              Array.isArray(movie?.badges) && movie.badges.length > 0
                ? movie
                : { ...movie, rank: index + 1, badges: baseBadges.slice(0, 2) };
            return (
              <div
                key={`${movie.id}-${title}`}
                className={`group/item relative z-[1] shrink-0 snap-start transition-all hover:z-[99] ${
                  isLandscape
                    ? 'w-[280px] sm:w-[340px] md:w-[380px] lg:w-[420px]'
                    : 'w-[152px] sm:w-[176px] md:w-[192px]'
                }`}
              >
                <MovieGridCard
                  movie={cardMovie}
                  kind={kind}
                  progress={progress?.progress_percent}
                  completed={progress?.completed}
                  showListBtn={showMyListButton}
                  inList={resolvedFavorites.has(movie.id)}
                  onToggleList={toggleList}
                  enablePreview
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
