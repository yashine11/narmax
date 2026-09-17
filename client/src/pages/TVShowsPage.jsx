import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import api from '../api/client.js';
import MovieGridCard from '../components/MovieGridCard.jsx';
import CatalogFilters from '../components/CatalogFilters.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';
import { FILTER_ALL, buildLanguageOptions, buildYearOptions, createFilters } from '../lib/catalogFilters.js';

const PAGE_SIZE = 20;
const LOAD_STEP = 10;

export default function TVShowsPage() {
  const { user } = useAuth();
  const { getProgress } = useProgress();
  const [genres, setGenres] = useState([]);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState(() => createFilters());
  const [languageOptions, setLanguageOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favTmdb, setFavTmdb] = useState(new Set());
  const requestRef = useRef(0);

  useEffect(() => {
    api.get('/api/tmdb/tv/genres').then((response) => setGenres(response.data.genres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get('/api/tmdb/languages')
      .then((response) => setLanguageOptions(response.data.languages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setFavTmdb(new Set());
      return;
    }

    api
      .get('/api/user/favorites')
      .then((response) => {
        const next = new Set();
        (response.data.favorites || []).forEach((favorite) => {
          if (favorite.tmdb_id && favorite.media_type === 'tv') {
            next.add(favorite.tmdb_id);
          }
        });
        setFavTmdb(next);
      })
      .catch(() => {});
  }, [user]);

  const buildParams = useCallback(
    (targetPage) => {
      const params = { page: targetPage };
      if (filters.genre !== FILTER_ALL) params.genre = filters.genre;
      if (filters.year !== FILTER_ALL) params.year = filters.year;
      if (filters.rating !== FILTER_ALL) params.rating = filters.rating;
      if (filters.language !== FILTER_ALL) params.language = filters.language;
      if (filters.special !== FILTER_ALL) params.special = filters.special;
      return params;
    },
    [filters]
  );

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setLoadingMore(false);

    api
      .get('/api/tmdb/tv/browse', { params: buildParams(1) })
      .then((response) => {
        if (requestRef.current !== requestId) return;
        const nextResults = response.data.results || [];
        setResults(nextResults);
        setTotalPages(response.data.total_pages || 1);
        setTotalResults(response.data.total_results || nextResults.length);
        setPage(1);
        setVisibleCount(Math.min(PAGE_SIZE, nextResults.length));
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        toast.error('Failed to load TV shows');
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [buildParams]);

  const loadMore = useCallback(() => {
    if (visibleCount < results.length) {
      setVisibleCount((current) => Math.min(results.length, current + LOAD_STEP));
      return;
    }

    const nextPage = page + 1;
    if (nextPage > totalPages || loadingMore) return;

    setLoadingMore(true);
    api
      .get('/api/tmdb/tv/browse', { params: buildParams(nextPage) })
      .then((response) => {
        const nextResults = response.data.results || [];
        setResults((current) => {
          const merged = [...current, ...nextResults];
          setVisibleCount((currentVisible) => Math.min(merged.length, currentVisible + LOAD_STEP));
          return merged;
        });
        setTotalPages(response.data.total_pages || totalPages);
        setTotalResults(response.data.total_results || totalResults);
        setPage(nextPage);
      })
      .catch(() => toast.error('Could not load more'))
      .finally(() => setLoadingMore(false));
  }, [buildParams, loadingMore, page, results.length, totalPages, totalResults, visibleCount]);

  const toggleList = useCallback(
    async (show) => {
      if (!user) {
        toast.error('Sign in to use My List');
        return;
      }

      try {
        if (favTmdb.has(show.id)) {
          const { data: status } = await api.get('/api/user/favorite-status', {
            params: { tmdbId: show.id, type: 'tv' },
          });
          if (status.movieId) {
            await api.delete(`/api/user/favorites/${status.movieId}`);
          }
          setFavTmdb((prev) => {
            const next = new Set(prev);
            next.delete(show.id);
            return next;
          });
          toast.success('Removed from My List');
          return;
        }

        await api.post('/api/user/favorites', {
          tmdbId: show.id,
          title: show.title,
          overview: show.overview,
          poster_path: show.poster_path,
          vote_average: show.vote_average,
          media_type: 'tv',
        });
        setFavTmdb((prev) => new Set(prev).add(show.id));
        toast.success('Added to My List');
      } catch {
        toast.error('Could not update list');
      }
    },
    [favTmdb, user]
  );

  const visibleResults = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const yearOptions = useMemo(() => buildYearOptions(results), [results]);
  const resolvedLanguageOptions = useMemo(() => {
    if (languageOptions.length > 0) {
      return [{ value: FILTER_ALL, label: 'Any language' }, ...languageOptions];
    }
    return buildLanguageOptions(results);
  }, [languageOptions, results]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-black pt-20 pb-32 sm:pt-24">
      <Helmet>
        <title>TV Shows — NARMAX</title>
        <meta name="description" content="Watch trending, popular, and top rated TV series on NARMAX." />
      </Helmet>
      <div className="mx-auto max-w-[1920px] px-4 sm:px-8">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Series</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-white tracking-tight">TV Shows</h1>
        </div>

        <CatalogFilters
          title="TV filters"
          genres={genres}
          filters={filters}
          onChange={handleFilterChange}
          yearOptions={yearOptions}
          languageOptions={resolvedLanguageOptions}
          count={totalResults || visibleResults.length}
        />

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-6 2xl:grid-cols-7">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] skeleton rounded-[1rem]" />
              ))}
            </div>
          ) : visibleResults.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-6 2xl:grid-cols-7">
                {visibleResults.map((show) => {
                  const progress = getProgress(show.id, 'tv');
                  return (
                    <MovieGridCard
                      key={show.id}
                      movie={show}
                      kind="tv"
                      progress={progress?.progress_percent}
                      completed={progress?.completed}
                      showListBtn={!!user}
                      inList={favTmdb.has(show.id)}
                      onToggleList={toggleList}
                    />
                  );
                })}
              </div>

              {(visibleCount < results.length || page < totalPages) && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-cyan-300/25 bg-[#03045e]/50 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-[#1e40af]/45 disabled:opacity-70"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[1.4rem] border border-cyan-300/15 bg-[#05060d]/90 px-6 py-10 text-center text-zinc-300">
              No TV shows match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
