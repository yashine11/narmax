// ─── Stream Service ───────────────────────────────────────────────────────────
// 5 fixed streaming sources:
//   1. Server 1 → cinextream.cc   (Fast HD)
//   2. Server 2 → moviesapi.to    (HD)
//   3. Server 3 → vaplayer.ru     (Mirror)
//   4. Server 4 → vidsrc-embed.ru (Backup)
//   5. Server 5 → vidsrc.sbs      (No Ads)
// ──────────────────────────────────────────────────────────────────────────────

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

function withThemeAndTime(url, resumeAt) {
  // moviesapi.to supports ?t=seconds and ?theme=hex
  const at = ensureResumeAt(resumeAt);
  let result = `${url}?theme=e50914`;
  if (at) result += `&t=${at}`;
  return result;
}

function withResumeParam(url, resumeAt) {
  const at = ensureResumeAt(resumeAt);
  if (!at) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}resumeAt=${at}`;
}

function withVidsrcSbsParams(url, resumeAt) {
  const at = ensureResumeAt(resumeAt);
  let result = `${url}?color=e50914`;
  if (at) result += `&t=${at}`;
  return result;
}

// ─── MOVIE SOURCES ─────────────────────────────────────────────────────────────
function labeledMovie(tmdbId, options = {}) {
  const tmdb = normalizeTmdbId(tmdbId);
  if (!tmdb) return [];
  const imdb = normalizeImdbId(options.imdbId);
  const resumeAt = options.resumeAt;
  const vaplayerId = imdb || tmdb;

  const vidsrcParams = new URLSearchParams({
    autoplay: '1',
    autonext: '1',
    subtitles: '1',
    ds_lang: options.dsLang || 'en',
  });
  if (imdb) vidsrcParams.set('imdb', imdb);
  else vidsrcParams.set('tmdb', tmdb);

  return [
    // 1. Server 1 — Cinextream (Fast HD)
    {
      id: 'cinextream',
      label: 'Server 1',
      badge: 'Fast HD',
      url: `https://cinextream.cc/api/embed/movie/${tmdb}?color=e50914`,
    },
    // 2. Server 2 — MoviesAPI (HD)
    {
      id: 'moviesapi_main',
      label: 'Server 2',
      badge: 'HD',
      url: withThemeAndTime(`https://moviesapi.to/movie/${tmdb}`, resumeAt),
    },
    // 3. Server 3 — VaPlayer (Mirror)
    {
      id: 'vaplayer_ru',
      label: 'Server 3',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/movie/${vaplayerId}`, resumeAt),
    },
    // 4. Server 4 — VidSrc Embed (Backup)
    {
      id: 'vidsrc_embed_ru',
      label: 'Server 4',
      badge: 'Backup',
      url: withResumeParam(
        `https://vidsrc-embed.ru/embed/movie?${vidsrcParams.toString()}`,
        resumeAt
      ),
    },
    // 5. Server 5 — VidSrc SBS (No Ads)
    {
      id: 'vidsrc_sbs',
      label: 'Server 5',
      badge: 'No Ads',
      url: withVidsrcSbsParams(`https://vidsrc.sbs/embed/movie/${tmdb}`, resumeAt),
    },
  ];
}

// ─── TV SOURCES ────────────────────────────────────────────────────────────────
function labeledTv(tmdbId, season, episode, options = {}) {
  const tmdb = normalizeTmdbId(tmdbId);
  if (!tmdb) return [];
  const s = Math.max(1, Number(season) || 1);
  const e = Math.max(1, Number(episode) || 1);
  const imdb = normalizeImdbId(options.imdbId);
  const resumeAt = options.resumeAt;
  const vaplayerId = imdb || tmdb;

  const vidsrcParams = new URLSearchParams({
    season: String(s),
    episode: String(e),
    autoplay: '1',
    autonext: '1',
    subtitles: '1',
    ds_lang: options.dsLang || 'en',
  });
  if (imdb) vidsrcParams.set('imdb', imdb);
  else vidsrcParams.set('tmdb', tmdb);

  return [
    // 1. Server 1 — Cinextream (Fast HD)
    {
      id: 'cinextream',
      label: 'Server 1',
      badge: 'Fast HD',
      url: `https://cinextream.cc/api/embed/tv/${tmdb}/${s}/${e}?color=e50914`,
    },
    // 2. Server 2 — MoviesAPI (HD)
    {
      id: 'moviesapi_main',
      label: 'Server 2',
      badge: 'HD',
      url: withThemeAndTime(`https://moviesapi.to/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    // 3. Server 3 — VaPlayer (Mirror)
    {
      id: 'vaplayer_ru',
      label: 'Server 3',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/tv/${vaplayerId}/${s}/${e}`, resumeAt),
    },
    // 4. Server 4 — VidSrc Embed (Backup)
    {
      id: 'vidsrc_embed_ru',
      label: 'Server 4',
      badge: 'Backup',
      url: withResumeParam(
        `https://vidsrc-embed.ru/embed/tv?${vidsrcParams.toString()}`,
        resumeAt
      ),
    },
    // 5. Server 5 — VidSrc SBS (No Ads)
    {
      id: 'vidsrc_sbs',
      label: 'Server 5',
      badge: 'No Ads',
      url: withVidsrcSbsParams(`https://vidsrc.sbs/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
  ];
}

// ─── EXPORTS ───────────────────────────────────────────────────────────────────
export function getLabeledSourcesForMovie(tmdbId, options = {}) {
  return labeledMovie(tmdbId, options);
}

export function getLabeledSourcesForTv(tmdbTvId, season = 1, episode = 1, options = {}) {
  return labeledTv(tmdbTvId, season, episode, options);
}

/** @deprecated */
export function getEmbedUrlsForMovie(tmdbId, options = {}) {
  return labeledMovie(tmdbId, options).map((s) => s.url);
}

/** @deprecated */
export function getEmbedUrlsForTv(tmdbTvId, season = 1, episode = 1, options = {}) {
  return labeledTv(tmdbTvId, season, episode, options).map((s) => s.url);
}
