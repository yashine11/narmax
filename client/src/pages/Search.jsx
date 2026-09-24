import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import MovieGridCard from '../components/MovieGridCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { Fragment } from 'react';
import AdSlot from '../components/AdSlot.jsx';

function mediaKey(item) {
  const mediaType = item?.media_type === 'tv' ? 'tv' : 'movie';
  return `${mediaType}:${item?.id}`;
}

export default function Search() {
  const { user } = useAuth();
  const { getProgress } = useProgress();
  const { cardStyle } = usePreferences() || {};
  const isLandscape = cardStyle === 'backdrops';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = String(params.get('q') || '').trim();
  const provider = String(params.get('provider') || '').trim();
  const typeParam = String(params.get('type') || 'all').trim();

  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favItems, setFavItems] = useState(new Set());

  useEffect(() => {
    if (!user) {
      setFavItems(new Set());
      return;
    }

    api
      .get('/api/user/favorites')
      .then((response) => {
        const next = new Set();
        (response.data.favorites || []).forEach((favorite) => {
          if (!favorite?.tmdb_id) return;
          const mediaType = favorite.media_type === 'tv' ? 'tv' : 'movie';
          next.add(`${mediaType}:${favorite.tmdb_id}`);
        });
        setFavItems(next);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (q === '@admin#riablo@Sphinx/portal') {
      navigate('/login?portal=riablo-sphinx', { replace: true });
      return;
    }
    if (!q && !provider) {
      setResults([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setLoadingMore(false);
    setPage(1);
    api
      .get('/api/search', {
        params: {
          q: q || undefined,
          provider: provider || undefined,
          type: typeParam !== 'all' ? typeParam : undefined,
          page: 1,
        },
      })
      .then((response) => {
        setResults(response.data.results || []);
        setTotalPages(response.data.total_pages || 1);
      })
      .catch(() => toast.error('Search failed'))
      .finally(() => setLoading(false));
  }, [q, provider, typeParam]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    if (next > totalPages || loadingMore) return;

    setLoadingMore(true);
    api
      .get('/api/search', {
        params: {
          q: q || undefined,
          provider: provider || undefined,
          type: typeParam !== 'all' ? typeParam : undefined,
          page: next,
        },
      })
      .then((response) => {
        setResults((prev) => [...prev, ...(response.data.results || [])]);
        setPage(next);
      })
      .catch(() => toast.error('Could not load more'))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, page, q, provider, typeParam, totalPages]);

  const handleTypeChange = (newType) => {
    const nextParams = {};
    if (provider) nextParams.provider = provider;
    if (q) nextParams.q = q;
    if (newType !== 'all') nextParams.type = newType;
    setParams(nextParams);
  };

  const toggleList = useCallback(
    async (item) => {
      if (!user) {
        toast.error('Sign in to use My List');
        return;
      }

      const mediaType = item?.media_type === 'tv' ? 'tv' : 'movie';
      const key = `${mediaType}:${item.id}`;

      try {
        if (favItems.has(key)) {
          const { data: status } = await api.get('/api/user/favorite-status', {
            params: { tmdbId: item.id, ...(mediaType === 'tv' ? { type: 'tv' } : {}) },
          });
          if (status.movieId) {
            await api.delete(`/api/user/favorites/${status.movieId}`);
          }
          setFavItems((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          toast.success('Removed from My List');
          return;
        }

        await api.post('/api/user/favorites', {
          tmdbId: item.id,
          title: item.title,
          overview: item.overview,
          poster_path: item.poster_path,
          vote_average: item.vote_average,
          ...(mediaType === 'tv' ? { media_type: 'tv' } : {}),
        });
        setFavItems((prev) => new Set(prev).add(key));
        toast.success('Added to My List');
      } catch {
        toast.error('Could not update list');
      }
    },
    [favItems, user]
  );

  const resultLabel = useMemo(() => {
    if (loading) return 'Searching...';
    if (results.length === 0) return 'No matches found';
    return `${results.length} results`;
  }, [loading, results.length]);

  const pageTitle = provider
    ? `${provider.toUpperCase()} ${typeParam !== 'all' ? `(${typeParam})` : ''} — NARMAX`
    : q
    ? `Search: "${q}" — NARMAX`
    : 'Search Catalog — NARMAX';

  return (
    <div className="mx-auto max-w-[1920px] px-4 pt-20 pb-32 sm:px-8 sm:pt-24">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Search thousands of movies, TV shows, anime, and entertainment on NARMAX." />
      </Helmet>
      <div className="glass-panel mb-6 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h1 className="text-3xl font-black tracking-tight text-white">Search &amp; Browse</h1>
        {provider ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-300">
              Provider Hub: <span className="font-extrabold text-narmax-cyan uppercase">{provider}</span>
            </span>
            {typeParam && typeParam !== 'all' && (
              <span className="rounded-md border border-narmax-cyan/30 bg-narmax-cyan/15 px-2 py-0.5 text-xs font-bold text-narmax-cyan capitalize">
                {typeParam === 'tv' ? 'TV Series' : typeParam}
              </span>
            )}
          </div>
        ) : q ? (
          <p className="mt-2 text-sm text-zinc-300">
            Showing all related results for <span className="font-semibold text-white">"{q}"</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Type in the top search bar to discover movies, TV shows, cast, and related matches.</p>
        )}

        {/* Quick Category Filter Switcher Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: '✨ All' },
            { id: 'movie', label: '🎬 Movies' },
            { id: 'tv', label: '📺 TV Series' },
            { id: 'anime', label: '⛩️ Anime' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                typeParam === tab.id
                  ? 'border border-narmax-cyan bg-narmax-cyan/20 text-narmax-cyan shadow-[0_0_12px_rgba(86,207,225,0.3)] scale-105'
                  : 'border border-white/10 bg-black/40 text-zinc-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto inline-flex rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
            {resultLabel}
          </span>
        </div>
      </div>

      {loading ? (
        <div className={`grid gap-4 ${
          isLandscape
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
        }`}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className={`${isLandscape ? 'aspect-video' : 'aspect-[2/3]'} skeleton rounded-xl`} />
          ))}
        </div>
      ) : (
        <>
          {results.length > 0 ? (
            <div className={`grid gap-4 ${
              isLandscape
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}>
              {results.map((item, index) => {
                const mediaType = item?.media_type === 'tv' ? 'tv' : 'movie';
                const progress = getProgress(item.id, mediaType);
                return (
                  <Fragment key={`${mediaType}-${item.id}`}>
                    <MovieGridCard
                      movie={item}
                      kind={mediaType}
                      progress={progress?.progress_percent}
                      completed={progress?.completed}
                      showListBtn={!!user}
                      inList={favItems.has(mediaKey(item))}
                      onToggleList={toggleList}
                      layout="portrait"
                    />
                    {index > 0 && index % 11 === 0 && (
                      <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 xl:col-span-6 py-4">
                        <AdSlot format="infeed" slotId={`search-inline-${index}`} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-6 py-16 text-center text-zinc-400">
              <p className="text-lg font-medium text-zinc-300">No results found</p>
              <p className="mt-1 text-sm">Try searching for something else or use different filters.</p>
            </div>
          )}

          {page < totalPages && (
            <div className="mt-16 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-cyan-300/20 bg-[#03045e]/45 px-8 py-3.5 text-sm font-bold text-white transition hover:border-cyan-300/40 hover:bg-[#1e40af]/45 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingMore ? 'Loading matches...' : 'Discover more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
