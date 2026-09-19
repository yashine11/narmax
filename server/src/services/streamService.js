// ─── Stream Service ───────────────────────────────────────────────────────────
// Builds embed URLs for all 8 streaming sources.
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

  return [
    {
      id: 'vidlink',
      label: 'Server 1 (Ultra HD)',
      badge: '4K • Multi-Audio',
      url: withResumeParam(
        `https://vidlink.pro/movie/${tmdb}?primaryColor=56cfe1&secondaryColor=18181b&iconColor=ffffff`,
        resumeAt
      ),
    },
    {
      id: 'multiembed',
      label: 'Server 2 (Turkish & World)',
      badge: 'Turkish & World',
      url: withResumeParam(
        `https://multiembed.mov/?video_id=${tmdb}&tmdb=1${imdb ? `&imdb=${imdb}` : ''}`,
        resumeAt
      ),
    },
    {
      id: 'smashystream',
      label: 'Server 3 (Anime & Indian)',
      badge: 'Anime & Indian',
      url: withResumeParam(`https://embed.smashystream.com/playere.php?tmdb=${tmdb}`, resumeAt),
    },
    {
      id: 'vidsrc_to',
      label: 'Server 4 (VidSrc Fast)',
      badge: 'Fast HD',
      url: withResumeParam(`https://vidsrc.to/embed/movie/${tmdb}`, resumeAt),
    },
    {
      id: 'two_embed',
      label: 'Server 5 (2Embed)',
      badge: 'Global Archive',
      url: withResumeParam(`https://www.2embed.cc/embed/${tmdb}`, resumeAt),
    },
    {
      id: 'vaplayer_ru',
      label: 'Server 6 (VaPlayer)',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/movie/${vaplayerId}`, resumeAt),
    },
    {
      id: 'moviesapi_to',
      label: 'Server 7 (MoviesAPI)',
      badge: 'Backup',
      url: withResumeParam(`https://moviesapi.to/embed/movie/${tmdb}`, resumeAt),
    },
    {
      id: 'vidsrc_cc',
      label: 'Server 8 (VidSrc CC)',
      badge: 'Backup',
      url: withResumeParam(`https://vidsrc.cc/v2/embed/movie/${tmdb}`, resumeAt),
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

  return [
    {
      id: 'vidlink',
      label: 'Server 1 (Ultra HD)',
      badge: '4K • Multi-Audio',
      url: withResumeParam(
        `https://vidlink.pro/tv/${tmdb}/${s}/${e}?primaryColor=56cfe1&secondaryColor=18181b&iconColor=ffffff`,
        resumeAt
      ),
    },
    {
      id: 'multiembed',
      label: 'Server 2 (Turkish & World)',
      badge: 'Turkish & World',
      url: withResumeParam(
        `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${s}&e=${e}${imdb ? `&imdb=${imdb}` : ''}`,
        resumeAt
      ),
    },
    {
      id: 'smashystream',
      label: 'Server 3 (Anime & Indian)',
      badge: 'Anime & Indian',
      url: withResumeParam(
        `https://embed.smashystream.com/playere.php?tmdb=${tmdb}&season=${s}&episode=${e}`,
        resumeAt
      ),
    },
    {
      id: 'vidsrc_to',
      label: 'Server 4 (VidSrc Fast)',
      badge: 'Fast HD',
      url: withResumeParam(`https://vidsrc.to/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    {
      id: 'two_embed',
      label: 'Server 5 (2Embed)',
      badge: 'Global Archive',
      url: withResumeParam(`https://www.2embed.cc/embedtv/${tmdb}&s=${s}&e=${e}`, resumeAt),
    },
    {
      id: 'vaplayer_ru',
      label: 'Server 6 (VaPlayer)',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/tv/${vaplayerId}/${s}/${e}`, resumeAt),
    },
    {
      id: 'moviesapi_to',
      label: 'Server 7 (MoviesAPI)',
      badge: 'Backup',
      url: withResumeParam(`https://moviesapi.to/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    {
      id: 'vidsrc_cc',
      label: 'Server 8 (VidSrc CC)',
      badge: 'Backup',
      url: withResumeParam(`https://vidsrc.cc/v2/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
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
