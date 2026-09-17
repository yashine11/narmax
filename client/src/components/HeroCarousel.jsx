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

  return (
    <section className="relative h-[50vh] min-h-[340px] w-full overflow-hidden bg-black sm:h-[74vh] sm:min-h-[460px]">
      <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? 'opacity-70' : 'opacity-100'}`}>
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
          <img src={slide.backdrop_path} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/22" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(86,207,225,0.14),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(30,64,175,0.18),transparent_28%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col justify-end px-4 pb-10 sm:px-12 sm:pb-18">
        <div className="max-w-3xl animate-rise-fade">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-200">
            <span className="h-1.5 w-1.5 rounded-full bg-narmax-cyan" />
            {subtitle}
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight drop-shadow-[0_12px_42px_rgba(0,0,0,0.72)] sm:mt-4 sm:text-4xl lg:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-3 hidden max-w-2xl text-sm leading-relaxed text-zinc-200 sm:block sm:text-lg">{slide.overview}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7 sm:gap-3">
            <Link
              to={`/watch/${slide.id}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-100 px-5 py-2.5 text-sm font-bold text-[#041230] shadow-[0_12px_30px_rgba(86,207,225,0.28)] transition hover:scale-[1.02] hover:bg-white sm:px-8 sm:py-3 sm:text-base"
            >
              ▶ Play
            </Link>
            <Link
              to={`/movie/${slide.id}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-cyan-300/30 bg-[#03045e]/55 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-[#1e40af]/55 sm:px-8 sm:py-3"
            >
              More Info
            </Link>
            {slide.vote_average != null && (
              <span className="hidden rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-zinc-200 sm:inline">
                Rating {slide.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <div className="absolute bottom-8 right-4 flex gap-2 sm:bottom-10 sm:right-12">
              <button type="button" aria-label="Previous slide" onClick={() => go(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition hover:bg-white/10 hover:border-cyan-400/40">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button" aria-label="Next slide" onClick={() => go(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition hover:bg-white/10 hover:border-cyan-400/40">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="mt-8 flex gap-1">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Slide ${index + 1}`}
                  onClick={() => {
                    setTransitioning(true);
                    setActive(index);
                  }}
                  className={`h-1 rounded-full transition-all ${
                    index === active ? 'w-9 bg-narmax-red' : 'w-2 bg-zinc-500 hover:bg-zinc-400'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

