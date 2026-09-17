import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  discoverByGenre,
  discoverMovies,
  discoverTv,
  getMovieDetails,
  getGenreList,
  getTvPopular,
  getTrendingTv,
  getTopRatedTv,
  getTvAiringToday,
  getTvOnTheAir,
  getMovieNowPlaying,
  getMovieUpcoming,
  getTvDetails,
  discoverPopularThisYear,
  getTvSeasonDetail,
  getPersonDetail,
  getPersonCombinedCredits,
  getMovieCredits,
  getTvCredits,
  getTvGenreList,
  getTmdbLanguages,
} from '../services/tmdbService.js';

const IMG_W342 = process.env.IMG_W342 || 'https://image.tmdb.org/t/p/w342';
const IMG_W1280 = process.env.IMG_W1280 || 'https://image.tmdb.org/t/p/w1280';

function mapMovie(m) {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster_path: m.poster_path ? `${IMG_W342}${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG_W1280}${m.backdrop_path}` : null,
    vote_average: m.vote_average,
    genre_ids: m.genre_ids,
    release_date: m.release_date,
    original_language: m.original_language || null,
    media_type: 'movie',
  };
}

function mapCastMember(c) {
  return {
    id: c.id,
    name: c.name,
    character: c.character,
    profile_path: c.profile_path ? `${IMG_W342}${c.profile_path}` : null,
    order: c.order,
  };
}

export async function homeFeed(req, res) {
  try {
    const [trending, popular, topRated, genres] = await Promise.all([
      getTrendingMovies(1),
      getPopularMovies(1),
      getTopRatedMovies(1),
      getGenreList(),
    ]);

    const genreRows = genres.genres || [];
    const categorySamples = await Promise.all(
      genreRows.slice(0, 8).map(async (g) => {
        const d = await discoverByGenre(g.id, 1);
        return {
          genre: { id: g.id, name: g.name },
          results: (d.results || []).slice(0, 12).map(mapMovie),
        };
      })
    );

    return res.json({
      trending: (trending.results || []).map(mapMovie),
      popular: (popular.results || []).map(mapMovie),
      topRated: (topRated.results || []).map(mapMovie),
      genres: genreRows,
      categories: categorySamples,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load catalog' });
  }
}

export async function movieDetails(req, res) {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ message: 'Invalid id' });
    const data = await getMovieDetails(tmdbId);
    const trailer = findTrailer(data.videos?.results || []);

    let castList = data.credits?.cast;
    if (!castList?.length) {
      try {
        const cr = await getMovieCredits(tmdbId);
        castList = cr.cast || [];
      } catch (e) {
        console.warn('movie credits fallback:', e.message);
        castList = [];
      }
    }
    const cast = (castList || []).slice(0, 16).map(mapCastMember);

    const crewList = data.credits?.crew || [];
    const directors = crewList.filter((c) => c.job === 'Director').map((c) => c.name);
    const writers = crewList
      .filter((c) => ['Writer', 'Screenplay', 'Story'].includes(c.job))
      .map((c) => c.name)
      .slice(0, 3);

    return res.json({
      id: data.id,
      title: data.title,
      overview: data.overview,
      runtime: data.runtime,
      release_date: data.release_date,
      imdb_id: data.imdb_id || null,
      vote_average: data.vote_average,
      vote_count: data.vote_count || 0,
      genres: data.genres,
      status: data.status || null,
      budget: data.budget || 0,
      revenue: data.revenue || 0,
      production_companies: (data.production_companies || []).slice(0, 4).map((p) => p.name),
      original_language: data.original_language || null,
      poster_path: data.poster_path ? `${IMG_W342}${data.poster_path}` : null,
      backdrop_path: data.backdrop_path ? `${IMG_W1280}${data.backdrop_path}` : null,
      trailer: trailer
        ? { key: trailer.key, name: trailer.name, youtube: `https://www.youtube.com/embed/${trailer.key}` }
        : null,
      cast,
      directors,
      writers,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load movie' });
  }
}

export async function tvShows(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const data = await getTvPopular(page);
    const mapTv = (t) => ({
      id: t.id,
      title: t.name,
      overview: t.overview,
      poster_path: t.poster_path ? `${IMG_W342}${t.poster_path}` : null,
      backdrop_path: t.backdrop_path ? `${IMG_W1280}${t.backdrop_path}` : null,
      vote_average: t.vote_average,
      release_date: t.first_air_date,
      media_type: 'tv',
    });
    return res.json({
      page: data.page,
      results: (data.results || []).map(mapTv),
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load TV shows' });
  }
}

export async function tvBrowse(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const genre = req.query.genre ? Number(req.query.genre) : null;
    const language = String(req.query.language || '').trim().toLowerCase();
    const year = req.query.year ? Number(req.query.year) : null;
    const rating = req.query.rating ? Number(req.query.rating) : null;
    const special = String(req.query.special || '').trim();

    let discoverParams = { page, genreId: genre, language, year, rating };

    // Special collection mapping for TV
    if (special === 'trending') {
      discoverParams.sortBy = 'popularity.desc';
    } else if (special === 'toprated') {
      discoverParams.sortBy = 'vote_average.desc';
      discoverParams.voteCountGte = 500;
    } else if (special === 'family') {
      discoverParams.genreIds = [10751, 10762, 16];
    } else if (special === 'anime') {
      discoverParams.genreId = 16;
      discoverParams.language = 'ja';
    } else if (special === 'recent') {
      discoverParams.sortBy = 'first_air_date.desc';
    } else if (special === 'netflix') {
      discoverParams.withKeywords = '256183';
    } else if (special === 'award' || special === 'oscar') {
      discoverParams.withKeywords = '236688,236689';
    }

    const data = await discoverTv(discoverParams);
    const rows = (data.results || []).map(mapTvRow);

    return res.json({
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: rows,
    });
  } catch (e) {
    console.error('tvBrowse:', e);
    return res.status(502).json({ message: e.message || 'Failed to load TV catalog' });
  }
}

export async function newReleases(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const data = await getMovieNowPlaying(page);
    return res.json({
      page: data.page,
      results: (data.results || []).map(mapMovie),
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load new releases' });
  }
}

export async function animeBrowse(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const genre = req.query.genre ? Number(req.query.genre) : null;
    const language = String(req.query.language || '').trim().toLowerCase();
    const year = req.query.year ? Number(req.query.year) : null;
    const rating = req.query.rating ? Number(req.query.rating) : null;
    const special = String(req.query.special || '').trim();

    const genreIds = genre && genre > 0 && genre !== 16 ? [16, genre] : [16];
    let discoverParams = { page, genreIds, language, year, rating };

    // Special collection mapping for Anime
    if (special === 'trending') {
      discoverParams.sortBy = 'popularity.desc';
    } else if (special === 'toprated') {
      discoverParams.sortBy = 'vote_average.desc';
      discoverParams.voteCountGte = 200;
    } else if (special === 'recent') {
      discoverParams.sortBy = 'primary_release_date.desc';
    } else if (special === 'anime') {
      // Anime Classics — Japanese only, pre-2018
      discoverParams.language = 'ja';
    } else if (special === 'award') {
      discoverParams.withKeywords = '236688,236689';
    }

    const data = await discoverMovies(discoverParams);
    let rows = (data.results || []).map(mapMovie);

    // Post-filter: classics = older titles
    if (special === 'anime') {
      rows = rows.filter((r) => {
        const y = Number(String(r.release_date || '').slice(0, 4));
        return y > 0 && y <= 2018;
      });
    }

    return res.json({
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: rows,
    });
  } catch (e) {
    console.error('animeBrowse:', e);
    return res.status(502).json({ message: e.message || 'Failed to load anime' });
  }
}

export async function languages(req, res) {
  try {
    const list = await getTmdbLanguages();
    const rows = (list || [])
      .filter((item) => item?.iso_639_1)
      .map((item) => ({
        value: String(item.iso_639_1).toLowerCase(),
        label: item.english_name || item.name || String(item.iso_639_1).toUpperCase(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return res.json({ languages: rows });
  } catch (e) {
    console.error('languages:', e);
    return res.status(502).json({ message: e.message || 'Failed to load languages' });
  }
}

function mapPopularSectionPayload(raw, mapper) {
  return (raw?.results || []).slice(0, 24).map(mapper);
}

export async function popularHub(req, res) {
  try {
    const section = String(req.query.section || 'movie').toLowerCase();

    if (section === 'tv') {
      const [trending, watched, rated] = await Promise.all([
        getTrendingTv(1),
        getTvPopular(1),
        getTopRatedTv(1),
      ]);
      return res.json({
        section: 'tv',
        trending: mapPopularSectionPayload(trending, mapTvRow),
        mostWatched: mapPopularSectionPayload(watched, mapTvRow),
        highestRated: mapPopularSectionPayload(rated, mapTvRow),
      });
    }

    if (section === 'anime') {
      const [trending, watched, rated] = await Promise.all([
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'popularity.desc' }),
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'vote_count.desc', rating: 6 }),
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'vote_average.desc', rating: 7, voteCountGte: 200 }),
      ]);
      return res.json({
        section: 'anime',
        trending: mapPopularSectionPayload(trending, mapMovie),
        mostWatched: mapPopularSectionPayload(watched, mapMovie),
        highestRated: mapPopularSectionPayload(rated, mapMovie),
      });
    }

    const [trending, watched, rated] = await Promise.all([
      getTrendingMovies(1),
      getPopularMovies(1),
      getTopRatedMovies(1),
    ]);
    return res.json({
      section: 'movie',
      trending: mapPopularSectionPayload(trending, mapMovie),
      mostWatched: mapPopularSectionPayload(watched, mapMovie),
      highestRated: mapPopularSectionPayload(rated, mapMovie),
    });
  } catch (e) {
    console.error('popularHub:', e);
    return res.status(502).json({ message: e.message || 'Failed popular hub' });
  }
}

export async function newsHub(req, res) {
  try {
    const section = String(req.query.section || 'movie').toLowerCase();

    if (section === 'tv') {
      const [newsPicks, trendingTrailers, upcoming] = await Promise.all([
        getTrendingTv(1),
        getTopRatedTv(1),
        getTvAiringToday(1),
      ]);
      return res.json({
        section: 'tv',
        newsPicks: mapPopularSectionPayload(newsPicks, mapTvRow),
        trendingTrailers: mapPopularSectionPayload(trendingTrailers, mapTvRow),
        upcomingReleases: mapPopularSectionPayload(upcoming, mapTvRow),
      });
    }

    if (section === 'anime') {
      const [newsPicks, trendingTrailers, upcoming] = await Promise.all([
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'popularity.desc' }),
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'vote_average.desc', rating: 7, voteCountGte: 100 }),
        discoverMovies({ page: 1, genreIds: [16], sortBy: 'release_date.desc' }),
      ]);
      return res.json({
        section: 'anime',
        newsPicks: mapPopularSectionPayload(newsPicks, mapMovie),
        trendingTrailers: mapPopularSectionPayload(trendingTrailers, mapMovie),
        upcomingReleases: mapPopularSectionPayload(upcoming, mapMovie),
      });
    }

    const [newsPicks, trendingTrailers, upcoming] = await Promise.all([
      getTrendingMovies(1),
      getMovieNowPlaying(1),
      getMovieUpcoming(1),
    ]);
    return res.json({
      section: 'movie',
      newsPicks: mapPopularSectionPayload(newsPicks, mapMovie),
      trendingTrailers: mapPopularSectionPayload(trendingTrailers, mapMovie),
      upcomingReleases: mapPopularSectionPayload(upcoming, mapMovie),
    });
  } catch (e) {
    console.error('newsHub:', e);
    return res.status(502).json({ message: e.message || 'Failed news hub' });
  }
}

export async function mediaPreview(req, res) {
  try {
    const mediaType = req.params.mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ message: 'Invalid id' });

    const detail = mediaType === 'tv' ? await getTvDetails(tmdbId) : await getMovieDetails(tmdbId);
    const trailer = findTrailer(detail.videos?.results || []);
    const key = trailer?.key || null;
    const previewEmbed = key
      ? `https://www.youtube.com/embed/${key}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${key}`
      : null;

    return res.json({
      tmdb_id: tmdbId,
      media_type: mediaType,
      preview_embed: previewEmbed,
      trailer_key: key,
    });
  } catch (e) {
    console.error('mediaPreview:', e);
    return res.status(502).json({ message: e.message || 'Failed preview' });
  }
}

export async function tvDetails(req, res) {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ message: 'Invalid id' });
    const data = await getTvDetails(tmdbId);
    const trailer = findTrailer(data.videos?.results || []);

    let castList = data.credits?.cast;
    if (!castList?.length) {
      try {
        const cr = await getTvCredits(tmdbId);
        castList = cr.cast || [];
      } catch (e) {
        console.warn('tv credits fallback:', e.message);
        castList = [];
      }
    }
    const cast = (castList || []).slice(0, 16).map(mapCastMember);
    const seasons = (data.seasons || [])
      .filter((s) => s.season_number != null && (s.episode_count ?? 0) > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        poster_path: s.poster_path ? `${IMG_W342}${s.poster_path}` : null,
        air_date: s.air_date,
      }));

    const crewList = data.credits?.crew || [];
  const creators = (data.created_by || []).map((c) => c.name);
  const directors = crewList.filter((c) => c.job === 'Director').map((c) => c.name).slice(0, 3);
  const writers = crewList
    .filter((c) => ['Writer', 'Screenplay', 'Story', 'Creator'].includes(c.job))
    .map((c) => c.name)
    .slice(0, 3);

  return res.json({
      id: data.id,
      title: data.name,
      overview: data.overview,
      runtime: data.episode_run_time?.[0],
      release_date: data.first_air_date,
      imdb_id: data.external_ids?.imdb_id || null,
      vote_average: data.vote_average,
      vote_count: data.vote_count || 0,
      genres: data.genres,
      status: data.status || null,
      production_companies: (data.production_companies || []).slice(0, 4).map((p) => p.name),
      original_language: data.original_language || null,
      poster_path: data.poster_path ? `${IMG_W342}${data.poster_path}` : null,
      backdrop_path: data.backdrop_path ? `${IMG_W1280}${data.backdrop_path}` : null,
      trailer: trailer
        ? { key: trailer.key, name: trailer.name, youtube: `https://www.youtube.com/embed/${trailer.key}` }
        : null,
      media_type: 'tv',
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      seasons,
      cast,
      directors,
      writers,
      creators,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed to load show' });
  }
}

function slideFromDiscoverRow(m) {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview || '',
    backdrop_path: m.backdrop_path ? `${IMG_W1280}${m.backdrop_path}` : null,
    poster_path: m.poster_path ? `${IMG_W342}${m.poster_path}` : null,
    vote_average: m.vote_average,
    trailer_key: null,
    trailer_embed_bg: null,
  };
}

const HERO_FALLBACK_SLIDE = {
  id: 550,
  title: 'NARMAX',
  overview: 'Your home for movies and series.',
  backdrop_path: `${IMG_W1280}/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg`,
  poster_path: `${IMG_W342}/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg`,
  vote_average: 8.8,
  trailer_key: null,
  trailer_embed_bg: null,
};

export async function heroSlides(req, res) {
  const year = Number(req.query.year) || new Date().getFullYear();
  let pool = [];

  try {
    const discover = await discoverPopularThisYear(year, 1);
    pool = discover.results || [];
  } catch (e) {
    console.warn('hero discover year failed:', e.message);
  }

  if (!pool.length) {
    try {
      pool = (await getTrendingMovies(1)).results || [];
    } catch (e) {
      console.warn('hero trending failed:', e.message);
    }
  }
  if (!pool.length) {
    try {
      pool = (await getPopularMovies(1)).results || [];
    } catch (e) {
      console.warn('hero popular failed:', e.message);
    }
  }

  const slides = [];
  for (const m of pool.slice(0, 12)) {
    if (slides.length >= 8) break;
    try {
      const d = await getMovieDetails(m.id);
      const trailer = findTrailer(d.videos?.results || []);
      const key = trailer?.key;
      slides.push({
        id: d.id,
        title: d.title,
        overview: d.overview || '',
        backdrop_path: d.backdrop_path ? `${IMG_W1280}${d.backdrop_path}` : null,
        poster_path: d.poster_path ? `${IMG_W342}${d.poster_path}` : null,
        vote_average: d.vote_average,
        trailer_key: key || null,
        trailer_embed_bg: key
          ? `https://www.youtube.com/embed/${key}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${key}`
          : null,
      });
    } catch {
      slides.push(slideFromDiscoverRow(m));
    }
  }

  if (!slides.length) {
    slides.push(HERO_FALLBACK_SLIDE);
  }

  return res.json({ year, slides });
}

function mapTvRow(t) {
  return {
    id: t.id,
    title: t.name || t.original_name || 'Untitled series',
    overview: t.overview || '',
    poster_path: t.poster_path ? `${IMG_W342}${t.poster_path}` : null,
    backdrop_path: t.backdrop_path ? `${IMG_W1280}${t.backdrop_path}` : null,
    vote_average: t.vote_average ?? null,
    genre_ids: t.genre_ids || [],
    release_date: t.first_air_date,
    first_air_date: t.first_air_date,
    media_type: 'tv',
    original_language: t.original_language || null,
  };
}

function findTrailer(videos = []) {
  const JUNK_PATTERN = /clip|featurette|behind.the.scenes|b-roll|bts|short|reel|tiktok|fan.made|fan.edit|amv|recap|reaction|deleted|bloopers|extended/i;
  const clean = (videos || []).filter(
    (v) => v.site === 'YouTube' && !JUNK_PATTERN.test(v.name || '')
  );

  // Priority 1: type=Trailer AND name contains 'Official Trailer'
  const officialTrailer = clean.find(
    (v) => v.type === 'Trailer' && /official\s+trailer/i.test(v.name || '')
  );
  if (officialTrailer) return officialTrailer;

  // Priority 2: Any type=Trailer
  const anyTrailer = clean.find((v) => v.type === 'Trailer');
  if (anyTrailer) return anyTrailer;

  // Priority 3: Official Teaser
  const officialTeaser = clean.find(
    (v) => v.type === 'Teaser' && /official/i.test(v.name || '')
  );
  if (officialTeaser) return officialTeaser;

  // Priority 4: Any Teaser
  return clean.find((v) => v.type === 'Teaser') || null;
}

function sanitizeTvRows(items) {
  const seen = new Set();
  return (items || [])
    .map(mapTvRow)
    .filter((item) => {
      if (!item?.id || !item.title) return false;
      if (!item.poster_path && !item.backdrop_path) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

async function safeTvResults(label, fetcher, forceRefresh = false) {
  try {
    const data = await fetcher(1, { forceRefresh });
    return sanitizeTvRows(data?.results || []);
  } catch (e) {
    console.warn(`TMDB ${label}:`, e.message || e);
    return [];
  }
}

export async function tvSections(req, res) {
  const forceRefresh = req.query.refresh === '1';
  const sectionDefs = [
    ['trending', 'trending/tv/day', getTrendingTv],
    ['popular', 'tv/popular', getTvPopular],
    ['topRated', 'tv/top_rated', getTopRatedTv],
    ['airingToday', 'tv/airing_today', getTvAiringToday],
    ['onTheAir', 'tv/on_the_air', getTvOnTheAir],
  ];
  const slice = (arr, n = 18) => (arr || []).slice(0, n);

  try {
    const sections = Object.fromEntries(
      await Promise.all(
        sectionDefs.map(async ([key, label, fetcher]) => [key, await safeTvResults(label, fetcher, forceRefresh)])
      )
    );

    if (!forceRefresh) {
      const missingKeys = sectionDefs
        .map(([key]) => key)
        .filter((key) => sections[key].length === 0);

      if (missingKeys.length) {
        const refreshed = await Promise.all(
          sectionDefs
            .filter(([key]) => missingKeys.includes(key))
            .map(async ([key, label, fetcher]) => [key, await safeTvResults(`${label} (refresh)`, fetcher, true)])
        );

        refreshed.forEach(([key, items]) => {
          sections[key] = items;
        });
      }
    }

    const missingSections = sectionDefs
      .map(([key]) => key)
      .filter((key) => sections[key].length === 0);

    return res.json({
      trending: slice(sections.trending),
      popular: slice(sections.popular),
      topRated: slice(sections.topRated),
      airingToday: slice(sections.airingToday),
      onTheAir: slice(sections.onTheAir),
      meta: {
        missingSections,
        hasCoreContent: ['trending', 'popular', 'topRated'].some((key) => sections[key].length > 0),
        refreshed: forceRefresh || missingSections.length < sectionDefs.length,
      },
    });
  } catch (e) {
    console.error('tvSections:', e);
    return res.json({
      trending: [],
      popular: [],
      topRated: [],
      airingToday: [],
      onTheAir: [],
      meta: {
        missingSections: ['trending', 'popular', 'topRated', 'airingToday', 'onTheAir'],
        hasCoreContent: false,
        refreshed: forceRefresh,
      },
    });
  }
}

export async function tvGenres(req, res) {
  try {
    const data = await getTvGenreList();
    return res.json({ genres: data.genres || [] });
  } catch (e) {
    console.error('tvGenres:', e);
    return res.status(502).json({ message: e.message || 'Failed TV genres' });
  }
}

export async function tvSeason(req, res) {
  try {
    const tvId = Number(req.params.tmdbId);
    const sn = Number(req.params.seasonNumber);
    if (!tvId || sn < 0) return res.status(400).json({ message: 'Invalid params' });
    const data = await getTvSeasonDetail(tvId, sn);
    const episodes = (data.episodes || []).map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      still_path: ep.still_path ? `${IMG_W342}${ep.still_path}` : null,
      runtime: ep.runtime,
      air_date: ep.air_date,
      vote_average: ep.vote_average,
    }));
    return res.json({
      season_number: data.season_number,
      name: data.name,
      overview: data.overview,
      poster_path: data.poster_path ? `${IMG_W342}${data.poster_path}` : null,
      air_date: data.air_date,
      episodes,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed season' });
  }
}

export async function personDetail(req, res) {
  try {
    const personId = Number(req.params.personId);
    if (!personId) return res.status(400).json({ message: 'Invalid id' });
    const [p, credits] = await Promise.all([getPersonDetail(personId), getPersonCombinedCredits(personId)]);
    const cast = credits.cast || [];
    const movies = cast
      .filter((c) => c.media_type === 'movie')
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        title: c.title,
        character: c.character,
        poster_path: c.poster_path ? `${IMG_W342}${c.poster_path}` : null,
        release_date: c.release_date,
        vote_average: c.vote_average,
        media_type: 'movie',
      }));
    const tv = cast
      .filter((c) => c.media_type === 'tv')
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        title: c.name,
        character: c.character,
        poster_path: c.poster_path ? `${IMG_W342}${c.poster_path}` : null,
        release_date: c.first_air_date,
        vote_average: c.vote_average,
        media_type: 'tv',
      }));
    return res.json({
      id: p.id,
      name: p.name,
      biography: p.biography,
      birthday: p.birthday,
      place_of_birth: p.place_of_birth,
      profile_path: p.profile_path ? `${IMG_W342}${p.profile_path}` : null,
      movies,
      tv,
    });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ message: e.message || 'Failed person' });
  }
}
