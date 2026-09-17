import { useRef } from 'react';
import MovieGridCard from './MovieGridCard.jsx';
import { useProgress } from '../context/ProgressContext.jsx';

export default function Row({ title, movies, kind = 'movie' }) {
  const { getProgress } = useProgress();
  const railRef = useRef(null);

  if (!movies?.length) return null;

  const scroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: direction * 700, behavior: 'smooth' });
  };

  return (
    <section className="mb-4 sm:mb-6">
      <div className="mx-auto mb-4 flex max-w-[1920px] items-end justify-between gap-4 px-4 sm:px-8">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

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
            <div key={`${movie.id}-${title}`} className="group/item relative z-[1] w-[152px] shrink-0 snap-start transition-all hover:z-[99] sm:w-[176px] md:w-[192px]">
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
