// ─── Stream Service ───────────────────────────────────────────────────────────
// 4 streaming sources:
//   1. Main Server  → moviesapi.to    (primary, correct embed format)
//   2. Server 2     → vaplayer.ru     (original main server)
//   3. Server 3     → vidsrc-embed.ru (original backup 3)
//   4. Server 4     → cinextream.cc   (Vidstack / ArtPlayer Fast HD)
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
    // 1. Main Server — moviesapi.to (correct format: /movie/$id)
    {
      id: 'moviesapi_main',
      label: 'Main Server',
      badge: 'HD',
      url: withThemeAndTime(`https://moviesapi.to/movie/${tmdb}`, resumeAt),
    },
    // 2. Server 2 — VaPlayer (original main server)
    {
      id: 'vaplayer_ru',
      label: 'Server 2',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/movie/${vaplayerId}`, resumeAt),
    },
    // 3. Server 3 — VidSrc Embed (original backup 3)
    {
      id: 'vidsrc_embed_ru',
      label: 'Server 3',
      badge: 'Backup',
      url: withResumeParam(
        `https://vidsrc-embed.ru/embed/movie?${vidsrcParams.toString()}`,
        resumeAt
      ),
    },
    // 4. Server 4 — Cinextream (Vidstack / ArtPlayer, Fast HD)
    {
      id: 'cinextream',
      label: 'Server 4',
      badge: 'Fast HD',
      url: `https://cinextream.cc/api/embed/movie/${tmdb}?color=e50914`,
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
    // 1. Main Server — moviesapi.to (correct format: /tv/$id/$s/$e)
    {
      id: 'moviesapi_main',
      label: 'Main Server',
      badge: 'HD',
      url: withThemeAndTime(`https://moviesapi.to/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    // 2. Server 2 — VaPlayer (original main server)
    {
      id: 'vaplayer_ru',
      label: 'Server 2',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/tv/${vaplayerId}/${s}/${e}`, resumeAt),
    },
    // 3. Server 3 — VidSrc Embed (original backup 3)
    {
      id: 'vidsrc_embed_ru',
      label: 'Server 3',
      badge: 'Backup',
      url: withResumeParam(
        `https://vidsrc-embed.ru/embed/tv?${vidsrcParams.toString()}`,
        resumeAt
      ),
    },
    // 4. Server 4 — Cinextream (Vidstack / ArtPlayer, Fast HD)
    {
      id: 'cinextream',
      label: 'Server 4',
      badge: 'Fast HD',
      url: `https://cinextream.cc/api/embed/tv/${tmdb}/${s}/${e}?color=e50914`,
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
