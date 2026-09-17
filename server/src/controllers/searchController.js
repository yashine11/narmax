import {
  discoverMovieByKeyword,
  discoverMovies,
  discoverTv,
  discoverTvByKeyword,
  getGenreList,
  getPersonCombinedCredits,
  getPopularMovies,
  getTvGenreList,
  searchMulti,
  searchMovies,
  searchKeywords,
  getMovieDetails,
} from '../services/tmdbService.js';

const IMG_W342 = process.env.IMG_W342 || 'https://image.tmdb.org/t/p/w342';
const IMG_W1280 = process.env.IMG_W1280 || 'https://image.tmdb.org/t/p/w1280';

function normalize(text) {
  if (!text) return '';
  let res = String(text)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647');

  return res
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function buildSearchBlob(item, actorName) {
  return normalize(
    [
      item?.title,
      item?.name,
      item?.original_title,
      item?.original_name,
      item?.overview,
      actorName || '',
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function mapMedia(item, forcedType = null, options = {}) {
  const mediaType =
    forcedType ||
    (item?.media_type === 'tv' ? 'tv' : item?.media_type === 'movie' ? 'movie' : item?.name ? 'tv' : 'movie');
  const title =
    mediaType === 'tv'
      ? item?.name || item?.title || item?.original_name || item?.original_title || 'Untitled'
      : item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
  const releaseDate =
    mediaType === 'tv' ? item?.first_air_date || item?.release_date : item?.release_date || item?.first_air_date;

  return {
    id: item?.id,
    title,
    overview: item?.overview || '',
    poster_path: item?.poster_path ? `${IMG_W342}${item.poster_path}` : null,
    backdrop_path: item?.backdrop_path ? `${IMG_W1280}${item.backdrop_path}` : null,
    vote_average: item?.vote_average ?? null,
    genre_ids: Array.isArray(item?.genre_ids) ? item.genre_ids : [],
    release_date: releaseDate || null,
    media_type: mediaType,
    original_language: item?.original_language || null,
    popularity: Number(item?.popularity || 0),
    _blob: buildSearchBlob(item, options.actorName),
    _source: options.source || 'base',
  };
}

function mapMovie(item) {
  return mapMedia(item, 'movie');
}

function stripInternal(item) {
  const { _blob, _source, popularity, ...safe } = item;
  return safe;
}

function dedupeByMedia(items) {
  const map = new Map();
  for (const item of items || []) {
    if (!item?.id || !item?.title) continue;
    const key = `${item.media_type}:${item.id}`;
    const current = map.get(key);
    if (!current || (item.popularity || 0) > (current.popularity || 0)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function editDistance(a, b, maxDistance = 2) {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    let minInRow = dp[0];
    for (let j = 1; j <= b.length; j += 1) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) dp[j] = prev;
      else dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      prev = temp;
      if (dp[j] < minInRow) minInRow = dp[j];
    }
    if (minInRow > maxDistance) return maxDistance + 1;
  }
  return dp[b.length];
}

function fuzzyTitleBonus(title, query) {
  const t = normalize(title);
  const q = normalize(query);
  if (!t || !q) return 0;
  if (t === q) return 240;
  if (t.startsWith(q)) return 170;
  if (t.includes(q)) return 120;
  const words = t.split(' ').filter(Boolean);
  for (const word of words) {
    if (word.length < 4 || q.length < 4) continue;
    const dist = editDistance(word, q, 2);
    if (dist <= 1) return 90;
    if (dist === 2) return 48;
  }
  return 0;
}

function scoreSearchResult(item, queryText) {
  const query = normalize(queryText);
  const title = normalize(item?.title);
  const blob = normalize(item?._blob || '');
  const popularity = Number(item?.popularity || 0);
  const terms = query.split(/\s+/).filter(Boolean);

  let score = popularity;
  score += fuzzyTitleBonus(title, query);
  if (blob.includes(query)) score += 42;
  if (terms.length > 1 && terms.every((term) => blob.includes(term))) score += 68;
  if (item?._source === 'actor') score += 32;
  if (item?._source === 'genre') score += 26;
  return score;
}

function applyFilters(items, { genreId, language, year, rating }) {
  const normalizedLang = String(language || '').trim().toLowerCase();
  const selectedYear = Number(year);
  const selectedRating = Number(rating);
  return (items || []).filter((item) => {
    if (genreId && !(item.genre_ids || []).some((id) => Number(id) === genreId)) return false;
    if (normalizedLang && String(item.original_language || '').toLowerCase() !== normalizedLang) return false;
    if (selectedYear >= 1900) {
      const itemYear = Number(String(item.release_date || '').slice(0, 4));
      if (itemYear !== selectedYear) return false;
    }
    if (selectedRating >= 1 && Number(item.vote_average || 0) < selectedRating) return false;
    return true;
  });
}

async function keywordExpandedRows(query) {
  const keywordResults = await searchKeywords(query, 1);
  const keywordIds = (keywordResults.results || [])
    .slice(0, 4)
    .map((keyword) => Number(keyword?.id))
    .filter(Boolean);
  if (!keywordIds.length) return [];

  const payloads = await Promise.all(
    keywordIds.flatMap((keywordId) => [discoverMovieByKeyword(keywordId, 1), discoverTvByKeyword(keywordId, 1)])
  );

  return payloads.flatMap((payload, index) => {
    const forcedType = index % 2 === 0 ? 'movie' : 'tv';
    return (payload?.results || []).slice(0, 12).map((item) => mapMedia(item, forcedType, { source: 'keyword' }));
  });
}

async function genreExpandedRows(query) {
  const q = normalize(query);
  const [movieGenres, tvGenres] = await Promise.all([getGenreList(), getTvGenreList()]);
  const movieMatches = (movieGenres.genres || []).filter((genre) => normalize(genre.name).includes(q) || q.includes(normalize(genre.name)));
  const tvMatches = (tvGenres.genres || []).filter((genre) => normalize(genre.name).includes(q) || q.includes(normalize(genre.name)));
  if (movieMatches.length === 0 && tvMatches.length === 0) return [];

  const requests = [
    ...movieMatches.slice(0, 2).map((genre) => discoverMovies({ genreId: genre.id, page: 1 })),
    ...tvMatches.slice(0, 2).map((genre) => discoverTv({ genreId: genre.id, page: 1 })),
  ];
  const payloads = await Promise.all(requests);
  const rows = [];

  payloads.forEach((payload, index) => {
    const isMoviePayload = index < movieMatches.slice(0, 2).length;
    const forcedType = isMoviePayload ? 'movie' : 'tv';
    rows.push(...(payload?.results || []).slice(0, 16).map((item) => mapMedia(item, forcedType, { source: 'genre' })));
  });

  return rows;
}

async function actorExpandedRows(query, multiResults = []) {
  const q = normalize(query);
  const candidates = (multiResults || [])
    .filter((item) => item?.media_type === 'person' && normalize(item?.name).includes(q))
    .slice(0, 3);
  if (candidates.length === 0) return [];

  const creditsPayloads = await Promise.all(
    candidates.map(async (person) => {
      try {
        const credits = await getPersonCombinedCredits(person.id);
        return { personName: person.name, credits: credits.cast || [] };
      } catch {
        return { personName: person.name, credits: [] };
      }
    })
  );

  const rows = [];
  creditsPayloads.forEach(({ personName, credits }) => {
    const sorted = [...credits]
      .filter((item) => item?.media_type === 'movie' || item?.media_type === 'tv')
      .sort((a, b) => Number(b?.popularity || 0) - Number(a?.popularity || 0))
      .slice(0, 20);
    sorted.forEach((credit) => {
      rows.push(mapMedia(credit, credit.media_type, { source: 'actor', actorName: personName }));
    });
  });
  return rows;
}

export async function search(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    const page = Number(req.query.page) || 1;
    const genreId = req.query.genre ? Number(req.query.genre) : null;
    const language = String(req.query.language || '').trim();
    const year = req.query.year ? Number(req.query.year) : null;
    const rating = req.query.rating ? Number(req.query.rating) : null;
    const special = String(req.query.special || '').trim();
    const hasBrowseFilters = Boolean(genreId || language || year || rating || special);

    if (!q) {
      if (hasBrowseFilters) {
        let discoverParams = { page, genreId, language, year, rating };
        
        // Special mapping logic
        if (special === 'family') {
          discoverParams.genreIds = [10751, 16, 10762];
        } else if (special === 'oscar') {
          discoverParams.withKeywords = '292418'; // Oscar Winner
        } else if (special === 'toprated') {
          discoverParams.sortBy = 'vote_average.desc';
          discoverParams.voteCountGte = 1000;
        } else if (special === 'award') {
          discoverParams.withKeywords = '236688,236689,222622'; // Award winning, best picture, bafta
        } else if (special === 'anime') {
          discoverParams.genreId = 16;
          discoverParams.language = 'ja';
          // Filter classics on client or here
        } else if (special === 'marvel_dc') {
          discoverParams.withKeywords = '180547,849'; // Marvel and DC
        } else if (special === 'netflix') {
          discoverParams.withKeywords = '256183'; // Netflix keyword for movies
        } else if (special === 'recent') {
          discoverParams.sortBy = 'primary_release_date.desc';
        }
        
        const data = await discoverMovies(discoverParams);
        let rows = (data.results || []).map(mapMovie);
        
        // Secondary pass for manual filtering
        if (special === 'trending') {
          rows = rows.filter(r => Number(r.popularity || 0) > 50);
        } else if (special === 'anime') {
           // Limit to older anime for "Classics"
           rows = rows.filter(r => {
             const y = Number(String(r.release_date || '').slice(0, 4));
             return y > 0 && y <= 2018;
           });
        }

        rows = applyFilters(rows, { genreId, language, year, rating });

        return res.json({
          page: data.page,
          total_pages: data.total_pages,
          total_results: data.total_results,
          results: rows.map(stripInternal),
          mode: 'genre',
        });
      }

      const data = await getPopularMovies(page);
      const rows = applyFilters((data.results || []).map(mapMovie), { genreId: null, language, year, rating, special: null });
      return res.json({
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
        results: rows.map(stripInternal),
        mode: 'browse',
      });
    }

    const isArabic = containsArabic(q);
    const queryNorm = normalize(q);

    const multi = await searchMulti(q, page, { language: isArabic ? 'ar-SA' : 'en-US' });
    let rows = dedupeByMedia(
      (multi.results || [])
        .filter((item) => item?.media_type === 'movie' || item?.media_type === 'tv')
        .map((item) => mapMedia(item, item.media_type, { source: 'multi' }))
    );

    if (page === 1) {
      const expansions = await Promise.allSettled([
        keywordExpandedRows(q),
        genreExpandedRows(q),
        actorExpandedRows(q, multi.results || []),
      ]);

      expansions.forEach((entry) => {
        if (entry.status === 'fulfilled' && Array.isArray(entry.value)) {
          rows = dedupeByMedia([...rows, ...entry.value]);
        }
      });
    }

    rows = applyFilters(rows, { genreId, language, year, rating }).sort(
      (a, b) => scoreSearchResult(b, queryNorm) - scoreSearchResult(a, queryNorm)
    );

    return res.json({
      page: multi.page,
      total_pages: multi.total_pages,
      total_results: rows.length,
      results: rows.map(stripInternal),
      mode: 'search',
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Search failed' });
  }
}

export async function suggest(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ results: [] });
    }

    const data = await searchMulti(q, 1);
    const queryNorm = normalize(q);
    const mediaRows = dedupeByMedia(
      (data.results || [])
        .filter((item) => item?.media_type === 'movie' || item?.media_type === 'tv')
        .map((item) => mapMedia(item, item.media_type, { source: 'multi' }))
    )
      .sort((a, b) => scoreSearchResult(b, queryNorm) - scoreSearchResult(a, queryNorm))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        media_type: item.media_type,
        poster_path: item.poster_path,
      }));

    const personRows = (data.results || [])
      .filter((item) => item?.media_type === 'person')
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.name,
        media_type: 'person',
        poster_path: item.profile_path ? `${IMG_W342}${item.profile_path}` : null,
      }));

    const merged = [...mediaRows, ...personRows].slice(0, 10);
    if (merged.length > 0) return res.json({ results: merged });

    const fallback = await searchMovies(q, 1);
    const movieRows = (fallback.results || []).slice(0, 8).map((movie) => ({
      id: movie.id,
      title: movie.title,
      media_type: 'movie',
      poster_path: movie.poster_path ? `${IMG_W342}${movie.poster_path}` : null,
    }));
    return res.json({ results: movieRows });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Suggestions failed' });
  }
}

export async function genres(req, res) {
  try {
    const data = await getGenreList();
    return res.json({ genres: data.genres || [] });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed genres' });
  }
}

