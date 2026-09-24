import { deleteCache, getCache, setCache } from './cacheService.js';

const BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

function buildUrl(path, params = {}) {
  const u = new URL(BASE + path);
  u.searchParams.set('api_key', API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  return u.toString();
}

async function fetchTmdb(path, params = {}, options = {}) {
  const {
    cacheKey,
    ttl = 300,
    forceRefresh = false,
    validate,
  } = options;

  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not configured');
  }
  const key = cacheKey || `tmdb:${path}:${JSON.stringify(params)}`;
  if (!forceRefresh) {
    const hit = getCache(key);
    if (hit !== undefined) {
      if (!validate || validate(hit)) {
        return hit;
      }
      deleteCache(key);
    }
  }

  const res = await fetch(buildUrl(path, params), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (validate && !validate(data)) {
    deleteCache(key);
    throw new Error(`TMDB returned an empty payload for ${path}`);
  }
  setCache(key, data, ttl);
  return data;
}

export async function getTrendingMovies(page = 1) {
  return fetchTmdb('/trending/movie/day', { page }, { cacheKey: `trending:${page}` });
}

export async function getPopularMovies(page = 1) {
  return fetchTmdb('/movie/popular', { page }, { cacheKey: `popular:${page}` });
}

export async function getTopRatedMovies(page = 1) {
  return fetchTmdb('/movie/top_rated', { page }, { cacheKey: `toprated:${page}` });
}

export async function discoverMovies(
  {
    page = 1,
    genreId,
    genreIds,
    language,
    year,
    rating,
    sortBy = 'popularity.desc',
    voteCountGte,
    withKeywords,
    withWatchProviders,
    watchRegion = 'US',
    withCompanies,
  } = {}
) {
  const mergedGenres = new Set();
  if (genreId) mergedGenres.add(Number(genreId));
  if (Array.isArray(genreIds)) {
    genreIds.forEach((id) => {
      const n = Number(id);
      if (n > 0) mergedGenres.add(n);
    });
  }

  const withGenres = mergedGenres.size > 0 ? Array.from(mergedGenres).join(',') : undefined;
  const normalizedLanguage = String(language || '').trim().toLowerCase() || undefined;
  const parsedYear = Number(year);
  const parsedRating = Number(rating);
  const parsedVoteCount = Number(voteCountGte);

  const params = {
    page,
    sort_by: sortBy,
    include_adult: 'false',
    ...(withGenres ? { with_genres: withGenres } : {}),
    ...(withKeywords ? { with_keywords: withKeywords } : {}),
    ...(withWatchProviders ? { with_watch_providers: withWatchProviders, watch_region: watchRegion } : {}),
    ...(withCompanies ? { with_companies: withCompanies } : {}),
    ...(normalizedLanguage ? { with_original_language: normalizedLanguage } : {}),
    ...(parsedYear >= 1900 ? { primary_release_year: parsedYear } : {}),
    ...(parsedRating >= 1 ? { 'vote_average.gte': parsedRating } : {}),
    ...(parsedVoteCount > 0 ? { 'vote_count.gte': parsedVoteCount } : {}),
  };

  const cacheKey = `discover:movie:${JSON.stringify(params)}`;
  return fetchTmdb('/discover/movie', params, { cacheKey, ttl: 300 });
}

export async function discoverByGenre(genreId, page = 1) {
  return discoverMovies({ genreId, page });
}

export async function discoverTvByGenre(genreId, page = 1) {
  return fetchTmdb(
    '/discover/tv',
    {
      page,
      with_genres: genreId,
      sort_by: 'popularity.desc',
      include_adult: 'false',
    },
    { cacheKey: `discover:tv:${genreId}:${page}` }
  );
}

export async function discoverTv(
  {
    page = 1,
    genreId,
    genreIds,
    language,
    year,
    rating,
    sortBy = 'popularity.desc',
    voteCountGte,
    withKeywords,
    withNetworks,
    withWatchProviders,
    watchRegion = 'US',
    withCompanies,
  } = {}
) {
  const mergedGenres = new Set();
  if (genreId) mergedGenres.add(Number(genreId));
  if (Array.isArray(genreIds)) {
    genreIds.forEach((id) => {
      const n = Number(id);
      if (n > 0) mergedGenres.add(n);
    });
  }

  const withGenres = mergedGenres.size > 0 ? Array.from(mergedGenres).join(',') : undefined;
  const normalizedLanguage = String(language || '').trim().toLowerCase() || undefined;
  const parsedYear = Number(year);
  const parsedRating = Number(rating);
  const parsedVoteCount = Number(voteCountGte);
  const params = {
    page,
    sort_by: sortBy,
    include_adult: 'false',
    ...(withGenres ? { with_genres: withGenres } : {}),
    ...(withKeywords ? { with_keywords: withKeywords } : {}),
    ...(withNetworks ? { with_networks: withNetworks } : {}),
    ...(withWatchProviders ? { with_watch_providers: withWatchProviders, watch_region: watchRegion } : {}),
    ...(withCompanies ? { with_companies: withCompanies } : {}),
    ...(normalizedLanguage ? { with_original_language: normalizedLanguage } : {}),
    ...(parsedYear >= 1900 ? { first_air_date_year: parsedYear } : {}),
    ...(parsedRating >= 1 ? { 'vote_average.gte': parsedRating } : {}),
    ...(parsedVoteCount > 0 ? { 'vote_count.gte': parsedVoteCount } : {}),
  };

  const cacheKey = `discover:tv:${JSON.stringify(params)}`;
  return fetchTmdb('/discover/tv', params, { cacheKey, ttl: 300 });
}

export async function discoverKids(page = 1) {
  return fetchTmdb(
    '/discover/movie',
    {
      page,
      certification_country: 'US',
      certification_lte: 'G',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_genres: '16,10751',
    },
    { cacheKey: `kids:${page}`, ttl: 600 }
  );
}

export async function searchMovies(query, page = 1, options = {}) {
  if (!query || !query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
  const language = options.language || 'en-US';
  const key = `search:${query.toLowerCase()}:${page}:${language}`;
  return fetchTmdb('/search/movie', { query: query.trim(), page, include_adult: 'false', language }, { cacheKey: key, ttl: 120 });
}

export async function searchMulti(query, page = 1, options = {}) {
  if (!query || !query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
  const language = options.language || 'en-US';
  const key = `search:multi:${query.toLowerCase()}:${page}:${language}`;
  return fetchTmdb('/search/multi', { query: query.trim(), page, include_adult: 'false', language }, { cacheKey: key, ttl: 120 });
}

export async function searchKeywords(query, page = 1, options = {}) {
  if (!query || !query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
  const language = options.language || 'en-US';
  const key = `search:keyword:${query.toLowerCase()}:${page}:${language}`;
  return fetchTmdb('/search/keyword', { query: query.trim(), page, language }, { cacheKey: key, ttl: 300 });
}

export async function discoverMovieByKeyword(keywordId, page = 1) {
  return fetchTmdb(
    '/discover/movie',
    {
      page,
      with_keywords: keywordId,
      sort_by: 'popularity.desc',
      include_adult: 'false',
    },
    { cacheKey: `discover:movie:keyword:${keywordId}:${page}`, ttl: 300 }
  );
}

export async function discoverTvByKeyword(keywordId, page = 1) {
  return fetchTmdb(
    '/discover/tv',
    {
      page,
      with_keywords: keywordId,
      sort_by: 'popularity.desc',
      include_adult: 'false',
    },
    { cacheKey: `discover:tv:keyword:${keywordId}:${page}`, ttl: 300 }
  );
}

export async function getMovieDetails(tmdbId) {
  return fetchTmdb(`/movie/${tmdbId}`, { append_to_response: 'videos,credits' }, { cacheKey: `movie:${tmdbId}`, ttl: 600 });
}

export async function getMovieCredits(tmdbId) {
  return fetchTmdb(`/movie/${tmdbId}/credits`, {}, { cacheKey: `moviecredits:${tmdbId}`, ttl: 600 });
}

export async function getGenreList() {
  return fetchTmdb('/genre/movie/list', {}, { cacheKey: 'genres:list', ttl: 86400 });
}

export async function getTmdbLanguages() {
  return fetchTmdb('/configuration/languages', {}, { cacheKey: 'tmdb:languages', ttl: 86400 });
}

export async function getTvGenreList() {
  return fetchTmdb('/genre/tv/list', {}, { cacheKey: 'tv:genres:list', ttl: 86400 });
}

function hasPageResults(data) {
  return Array.isArray(data?.results) && data.results.length > 0;
}

export async function getTvPopular(page = 1, options = {}) {
  return fetchTmdb('/tv/popular', { page }, {
    cacheKey: `tmdb:tv:popular:${page}`,
    ttl: 300,
    forceRefresh: options.forceRefresh,
    validate: hasPageResults,
  });
}

export async function getTrendingTv(page = 1, options = {}) {
  return fetchTmdb('/trending/tv/day', { page }, {
    cacheKey: `tmdb:tv:trending:${page}`,
    ttl: 300,
    forceRefresh: options.forceRefresh,
    validate: hasPageResults,
  });
}

export async function getTopRatedTv(page = 1, options = {}) {
  return fetchTmdb('/tv/top_rated', { page }, {
    cacheKey: `tmdb:tv:top-rated:${page}`,
    ttl: 300,
    forceRefresh: options.forceRefresh,
    validate: hasPageResults,
  });
}

export async function getTvAiringToday(page = 1, options = {}) {
  return fetchTmdb('/tv/airing_today', { page }, {
    cacheKey: `tmdb:tv:airing-today:${page}`,
    ttl: 300,
    forceRefresh: options.forceRefresh,
    validate: hasPageResults,
  });
}

export async function getTvOnTheAir(page = 1, options = {}) {
  return fetchTmdb('/tv/on_the_air', { page }, {
    cacheKey: `tmdb:tv:on-the-air:${page}`,
    ttl: 300,
    forceRefresh: options.forceRefresh,
    validate: hasPageResults,
  });
}

export async function getMovieNowPlaying(page = 1) {
  return fetchTmdb('/movie/now_playing', { page }, { cacheKey: `nowplaying:${page}` });
}

export async function getMovieUpcoming(page = 1) {
  return fetchTmdb('/movie/upcoming', { page }, { cacheKey: `upcoming:${page}`, ttl: 600 });
}

export async function getTvDetails(tmdbId) {
  return fetchTmdb(
    `/tv/${tmdbId}`,
    { append_to_response: 'videos,credits,external_ids' },
    { cacheKey: `tvdetail:${tmdbId}`, ttl: 600 }
  );
}

export async function getTvCredits(tmdbId) {
  return fetchTmdb(`/tv/${tmdbId}/credits`, {}, { cacheKey: `tvcredits:${tmdbId}`, ttl: 600 });
}

export async function discoverPopularThisYear(year, page = 1) {
  return fetchTmdb(
    '/discover/movie',
    {
      primary_release_year: year,
      sort_by: 'popularity.desc',
      page,
      include_adult: 'false',
    },
    { cacheKey: `discover:year:${year}:${page}`, ttl: 600 }
  );
}

export async function getTvSeasonDetail(tvId, seasonNumber) {
  return fetchTmdb(`/tv/${tvId}/season/${seasonNumber}`, {}, { cacheKey: `tvseason:${tvId}:${seasonNumber}`, ttl: 600 });
}

export async function getPersonDetail(personId) {
  return fetchTmdb(`/person/${personId}`, {}, { cacheKey: `person:${personId}`, ttl: 3600 });
}

export async function getPersonCombinedCredits(personId) {
  return fetchTmdb(`/person/${personId}/combined_credits`, {}, { cacheKey: `personcredits:${personId}`, ttl: 1800 });
}
