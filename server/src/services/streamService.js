function normalizeTmdbId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : '';
}

function normalizeImdbId(imdbId) {
  const value = String(imdbId || '').trim();
  return /^tt\d+$/i.test(value) ? value.toLowerCase() : '';
}

function ensureResumeAt(resumeAt) {
  const seconds = Number(resumeAt);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

function withResumeParam(url, resumeAt) {
  const at = ensureResumeAt(resumeAt);
  if (!at) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}resumeAt=${at}`;
}

function labeledMovie(tmdbId, options = {}) {
  const tmdb = normalizeTmdbId(tmdbId);
  if (!tmdb) return [];
  const imdb = normalizeImdbId(options.imdbId);
  const resumeAt = options.resumeAt;

  const vidsrcEmbedMovieParams = new URLSearchParams({
    autoplay: '1',
    autonext: '1',
    subtitles: '1',
    ds_lang: options.dsLang || 'en',
  });
  if (imdb) vidsrcEmbedMovieParams.set('imdb', imdb);
  else vidsrcEmbedMovieParams.set('tmdb', tmdb);

  const vaplayerId = imdb || tmdb;
  return [
    { id: 'vaplayer_ru', label: 'Main Server', url: withResumeParam(`https://vaplayer.ru/embed/movie/${vaplayerId}`, resumeAt) },
    { id: 'vidsrc_cc', label: 'Backup 1', url: withResumeParam(`https://vidsrc.cc/v2/embed/movie/${tmdb}`, resumeAt) },
    { id: 'moviesapi_to', label: 'Backup 2', url: withResumeParam(`https://moviesapi.to/embed/movie/${tmdb}`, resumeAt) },
    {
      id: 'vidsrc_embed_ru',
      label: 'Backup 3',
      url: withResumeParam(`https://vidsrc-embed.ru/embed/movie?${vidsrcEmbedMovieParams.toString()}`, resumeAt),
    },
  ];
}

function labeledTv(tmdbId, season, episode, options = {}) {
  const tmdb = normalizeTmdbId(tmdbId);
  if (!tmdb) return [];
  const s = Math.max(1, Number(season) || 1);
  const e = Math.max(1, Number(episode) || 1);
  const imdb = normalizeImdbId(options.imdbId);
  const resumeAt = options.resumeAt;

  const vidsrcEmbedTvParams = new URLSearchParams({
    season: String(s),
    episode: String(e),
    autoplay: '1',
    autonext: '1',
    subtitles: '1',
    ds_lang: options.dsLang || 'en',
  });
  if (imdb) vidsrcEmbedTvParams.set('imdb', imdb);
  else vidsrcEmbedTvParams.set('tmdb', tmdb);

  const vaplayerId = imdb || tmdb;
  return [
    { id: 'vaplayer_ru', label: 'Main Server', url: withResumeParam(`https://vaplayer.ru/embed/tv/${vaplayerId}/${s}/${e}`, resumeAt) },
    { id: 'vidsrc_cc', label: 'Backup 1', url: withResumeParam(`https://vidsrc.cc/v2/embed/tv/${tmdb}/${s}/${e}`, resumeAt) },
    { id: 'moviesapi_to', label: 'Backup 2', url: withResumeParam(`https://moviesapi.to/embed/tv/${tmdb}/${s}/${e}`, resumeAt) },
    {
      id: 'vidsrc_embed_ru',
      label: 'Backup 3',
      url: withResumeParam(`https://vidsrc-embed.ru/embed/tv?${vidsrcEmbedTvParams.toString()}`, resumeAt),
    },
  ];
}

/** @deprecated use getLabeledSourcesForMovie */
export function getEmbedUrlsForMovie(tmdbId, options = {}) {
  return labeledMovie(tmdbId, options).map((source) => source.url);
}

/** @deprecated use getLabeledSourcesForTv */
export function getEmbedUrlsForTv(tmdbTvId, season = 1, episode = 1, options = {}) {
  return labeledTv(tmdbTvId, season, episode, options).map((source) => source.url);
}

export function getLabeledSourcesForMovie(tmdbId, options = {}) {
  return labeledMovie(tmdbId, options);
}

export function getLabeledSourcesForTv(tmdbTvId, season = 1, episode = 1, options = {}) {
  return labeledTv(tmdbTvId, season, episode, options);
}
