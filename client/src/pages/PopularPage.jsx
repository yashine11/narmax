import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../api/client.js';
import PremiumScrollRow from '../components/PremiumScrollRow.jsx';

const TABS = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'anime', label: 'Anime' },
];

export default function PopularPage() {
  const [section, setSection] = useState('movie');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState({ trending: [], mostWatched: [], highestRated: [] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api
      .get('/api/tmdb/popular-hub', { params: { section }, timeout: 35000 })
      .then((response) => {
        if (cancelled) return;
        setRows({
          trending: response.data.trending || [],
          mostWatched: response.data.mostWatched || [],
          highestRated: response.data.highestRated || [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setRows({ trending: [], mostWatched: [], highestRated: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const mediaKind = useMemo(() => (section === 'tv' ? 'tv' : 'movie'), [section]);

  return (
    <div className="min-h-screen bg-black pt-20 pb-32 sm:pt-24">
      <Helmet>
        <title>New &amp; Popular — NARMAX</title>
        <meta name="description" content="Discover what's trending now, most watched, and highest rated entertainment on NARMAX." />
      </Helmet>
      <div className="mx-auto max-w-[1920px] px-4 sm:px-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Popular</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Trending, Watched, Rated</h1>
        </div>

        <div className="glass-panel mb-8 flex flex-wrap gap-2 rounded-2xl p-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSection(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                section === tab.key
                  ? 'bg-cyan-100 text-[#041230] shadow-[0_10px_24px_rgba(86,207,225,0.25)]'
                  : 'bg-[#03045e]/40 text-zinc-200 hover:bg-[#1e40af]/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-56 rounded-2xl skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-10 text-center text-zinc-400">
            Could not load popular content right now.
          </div>
        ) : (
          <>
            <PremiumScrollRow
              title="Trending Right Now"
              subtitle="Hot titles people are discovering today."
              movies={rows.trending}
              kind={mediaKind}
            />
            <PremiumScrollRow
              title="Most Watched"
              subtitle="The most-viewed picks this week."
              movies={rows.mostWatched}
              kind={mediaKind}
            />
            <PremiumScrollRow
              title="Highest Rated"
              subtitle="Top audience-rated picks worth watching."
              movies={rows.highestRated}
              kind={mediaKind}
            />
          </>
        )}
      </div>
    </div>
  );
}
