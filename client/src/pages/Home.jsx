import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';
import HeroCarousel from '../components/HeroCarousel.jsx';
import MovieGridCard from '../components/MovieGridCard.jsx';
import Row from '../components/Row.jsx';
import SkeletonHome from '../components/SkeletonHome.jsx';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { Helmet } from 'react-helmet-async';
import AdSlot from '../components/AdSlot.jsx';

function ContinueWatchingRow({ items }) {
  const railRef = useRef(null);

  const scroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: direction * 700, behavior: 'smooth' });
  };

  if (!items?.length) return null;

  return (
    <section className="mb-10 sm:mb-14">
      <div className="mx-auto mb-4 flex max-w-[1920px] items-end justify-between gap-4 px-4 sm:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">For you</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Continue Watching</h2>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white transition hover:border-cyan-400/40 hover:bg-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white transition hover:border-cyan-400/40 hover:bg-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="row-scroll mx-auto flex max-w-[1920px] gap-3 overflow-x-auto px-4 pb-3 sm:gap-4 sm:px-8"
        style={{ paddingTop: '5rem', paddingBottom: '5rem', marginTop: '-5rem', marginBottom: '-5rem', overflowY: 'visible' }}
      >
        {items.map((item) => {
          const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
          const progressPercent = Math.max(0, Math.min(100, Math.round(Number(item.progress_percent || 0))));
          const remainingPercent = Math.max(0, 100 - progressPercent);
          return (
            <div key={`${mediaType}:${item.id}`} className="relative z-[1] w-[152px] shrink-0 snap-start transition-all hover:z-[99] sm:w-[176px] md:w-[192px]">
              <MovieGridCard
                movie={{ ...item, badges: ['Continue Watching'] }}
                kind={mediaType}
                progress={item.progress_percent}
                completed={item.completed}
              />
              <div className="mt-2 flex items-center justify-between px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                <span>{mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                <span>{remainingPercent}% left</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);

  useEffect(() => {
    api
      .get('/api/tmdb/home')
      .then((r) => setData(r.data))
      .catch((e) => {
        setErr(e.response?.data?.message || 'Failed to load');
        toast.error('Could not load catalog');
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setContinueWatching([]);
      return;
    }
    api
      .get('/api/user/history')
      .then((response) => {
        const unique = new Set();
        const rows = (response.data.history || [])
          .filter((item) => item?.tmdb_id && Number(item.progress_percent || 0) > 0 && !item.completed)
          .sort((a, b) => String(b.watched_at || '').localeCompare(String(a.watched_at || '')))
          .filter((item) => {
            const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
            const key = `${mediaType}:${item.tmdb_id}`;
            if (unique.has(key)) return false;
            unique.add(key);
            return true;
          })
          .slice(0, 18)
          .map((item) => ({
            id: item.tmdb_id,
            title: item.title || 'Untitled',
            poster_path: item.image || null,
            backdrop_path: null,
            vote_average: item.rating ?? null,
            media_type: item.media_type === 'tv' ? 'tv' : 'movie',
            progress_percent: Number(item.progress_percent || 0),
            completed: !!item.completed,
          }));
        setContinueWatching(rows);
      })
      .catch(() => setContinueWatching([]));
  }, [user]);

  const hasContinueWatching = continueWatching.length > 0;

  if (err && !data) {
    return <div className="min-h-[50vh] flex items-center justify-center px-4 text-zinc-400">{err}</div>;
  }

  if (!data) return <SkeletonHome />;

  return (
    <div>
      <Helmet>
        <title>NARMAX — Stream Movies &amp; TV Shows</title>
        <meta name="description" content="Stream popular movies, trending TV series, and anime with an immersive cinematic streaming experience on NARMAX." />
      </Helmet>
      <HeroCarousel />
      <div className="relative z-10 space-y-4 pt-12 pb-20 sm:pt-16">
        <div className="mx-auto max-w-[1920px] px-4 pb-6 sm:px-8">
          <AdSlot 
            format="homeHero" 
            slotId="home-hero-ad" 
            className="!border-solid !border-white/10 bg-gradient-to-r from-black/80 via-white/[0.05] to-black/80 shadow-[0_8px_40px_rgba(0,0,0,0.8)] backdrop-blur-md" 
          />
        </div>

        {hasContinueWatching && <ContinueWatchingRow items={continueWatching} />}
        <Row title="Trending Now" movies={data.trending} large />
        <Row title="Editor's Radar" movies={data.popular} />
        
        <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-8">
          <AdSlot format="infeed" slotId="home-infeed-1" />
        </div>

        <Row title="Top Rated" movies={data.topRated} />
        {data.categories?.map((cat, idx) => (
          <div key={cat.genre.id}>
            <Row title={cat.genre.name} movies={cat.results} />
            {idx === 2 && (
              <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-8">
                <AdSlot format="infeed" slotId="home-infeed-2" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
