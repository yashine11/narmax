import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

const FALLBACK_SLIDES = [
  {
    id: 550,
    title: 'NARMAX',
    overview: 'A cinematic destination for movies and series.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    trailer_embed_bg: null,
    vote_average: 8.8,
    release_date: null,
  },
];

function slidesFromMovies(movies) {
  return (movies || []).slice(0, 8).map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview || '',
    backdrop_path: movie.backdrop_path || null,
    trailer_embed_bg: null,
    vote_average: movie.vote_average,
    release_date: movie.release_date || null,
  }));
}

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const commit = (list) => {
      if (cancelled) return;
      setSlides(list?.length ? list : FALLBACK_SLIDES);
      setLoading(false);
    };

    (async () => {
      try {
        const response = await api.get('/api/tmdb/hero');
        const nextSlides = response.data.slides || [];
        if (nextSlides.length > 0) {
          commit(nextSlides);
          return;
        }
      } catch {
        /* fallback below */
      }

      try {
        const fallbackResponse = await api.get('/api/tmdb/home');
        commit(slidesFromMovies(fallbackResponse.data.trending));
      } catch {
        commit(FALLBACK_SLIDES);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const slide = slides[active];
  const subtitle = useMemo(() => {
    if (!slide) return 'Now streaming';
    const year = String(slide.release_date || '').slice(0, 4);
    if (year) return `Now streaming | ${year}`;
    return 'Now streaming';
  }, [slide]);

  const go = useCallback(
    (direction) => {
      if (slides.length < 2) return;
      setTransitioning(true);
      setActive((current) => (current + direction + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => go(1), 11000);
    return () => clearInterval(timer);
  }, [go, slides.length]);

  useEffect(() => {
    if (!transitioning) return undefined;
    const timer = setTimeout(() => setTransitioning(false), 500);
    return () => clearTimeout(timer);
  }, [transitioning]);

  if (loading) {
    return (
      <section className="relative h-[50vh] min-h-[340px] w-full overflow-hidden bg-zinc-950 sm:h-[74vh] sm:min-h-[460px]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-zinc-900 via-zinc-950 to-black" />
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black to-transparent" />
        <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col justify-end px-4 pb-10 sm:px-12 sm:pb-20">
          <div className="mb-4 h-3 w-24 rounded bg-zinc-800" />
          <div className="mb-4 h-10 w-2/3 rounded bg-zinc-800 sm:h-14" />
          <div className="mb-8 hidden max-w-2xl space-y-2 sm:block">
            <div className="h-3 w-full rounded bg-zinc-800/90" />
            <div className="h-3 w-5/6 rounded bg-zinc-800/90" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-28 rounded-md bg-zinc-800 sm:h-12 sm:w-32" />
            <div className="h-11 w-32 rounded-md bg-zinc-800/70 sm:h-12 sm:w-40" />
          </div>
        </div>
      </section>
    );
  }

  if (!slide) return null;

  const year = String(slide.release_date || '').slice(0, 4);
  const rating = slide.vote_average ? Number(slide.vote_average).toFixed(1) : null;

  return (
    <section className="relative min-h-[600px] w-full overflow-hidden bg-[#09090b] sm:h-[82vh] sm:min-h-[580px]">
      {/* Background Backdrop */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${transitioning ? 'opacity-50' : 'opacity-100'}`}>
        {slide.trailer_embed_bg ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <iframe
              title="hero-video"
              src={slide.trailer_embed_bg}
              className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
              allow="autoplay; encrypted-media; fullscreen"
              style={{ border: 0, objectFit: 'cover' }}
            />
          </div>
        ) : (
          <img
            src={slide.backdrop_path}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
      </div>

      {/* Cinejoy Cinematic Vignette Overlays */}
      <div className="cine-vignette-hero pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col justify-end px-6 pb-12 sm:px-12 sm:pb-16 md:px-16">
        <div className="max-w-2xl animate-rise-fade">
          {/* Main Title */}
          <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)] sm:text-5xl lg:text-6xl">
            {slide.title}
          </h1>

          {/* Meta Details Row */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold sm:text-sm">
            {rating && (
              <span className="flex items-center gap-1 text-white">
                <span className="text-amber-400">★</span> {rating}/10
              </span>
            )}
            {year && (
              <span className="text-zinc-400">
                • {year}
              </span>
            )}
            <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-200">
              HD
            </span>
          </div>

          {/* Overview Description */}
          {slide.overview && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-300 drop-shadow sm:line-clamp-4 sm:text-base">
              {slide.overview}
            </p>
          )}

          {/* Action Buttons: ▶ Play (Pill), + (Circle), ⓘ (Circle) */}
          <div className="mt-6 flex items-center gap-3">
            <Link
              to={`/watch/${slide.id}`}
              className="cine-play-pill"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </Link>

            <Link
              to={`/my-list`}
              className="cine-icon-circle"
              title="Add to My List"
              aria-label="Add to List"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Link>

            <Link
              to={`/movie/${slide.id}`}
              className="cine-icon-circle"
              title="More Details"
              aria-label="More Details"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Bottom-Right Pagination Dots Indicator */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 right-6 flex items-center gap-1.5 sm:bottom-12 sm:right-12">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => {
                  setTransitioning(true);
                  setActive(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === active
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

