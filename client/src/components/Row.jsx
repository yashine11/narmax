import { useRef } from 'react';
import MovieGridCard from './MovieGridCard.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';

export default function Row({ title, movies, kind = 'movie' }) {
  const { getProgress } = useProgress();
  const { cardStyle } = usePreferences() || {};
  const isLandscape = cardStyle === 'backdrops';
  const railRef = useRef(null);

  if (!movies?.length) return null;

  const scroll = (direction) => {
    if (!railRef.current) return;
    const distance = isLandscape ? 900 : 700;
    railRef.current.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  return (
    <section className="mb-8 sm:mb-12">
      <div className="mx-auto mb-4 flex max-w-[1920px] items-center justify-between gap-4 px-6 sm:px-12 md:px-16">
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/15 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/15 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="premium-row-scroll row-scroll mx-auto flex max-w-[1920px] gap-3 overflow-x-auto px-4 sm:gap-4 sm:px-10"
        style={{
          paddingTop: isLandscape ? '6.5rem' : '5rem',
          paddingBottom: isLandscape ? '7rem' : '5rem',
          marginTop: isLandscape ? '-6.5rem' : '-5rem',
          marginBottom: isLandscape ? '-7rem' : '-5rem',
          overflowY: 'visible',
        }}
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
                kind={mediaType}
                progress={progress?.progress_percent}
                completed={progress?.completed}
                enablePreview
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
