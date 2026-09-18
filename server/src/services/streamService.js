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
  const vaplayerId = imdb || tmdb;

  return [
    // 1. VidLink - Fast 4K/1080p, custom NARMAX cyan theme, multi-audio (Turkish/Hindi/English/Spanish/French)
    {
      id: 'vidlink',
      label: 'Server 1 (Ultra HD)',
      badge: '4K • Multi-Audio',
      url: withResumeParam(
        `https://vidlink.pro/movie/${tmdb}?primaryColor=56cfe1&secondaryColor=18181b&iconColor=ffffff`,
        resumeAt
      ),
    },
    // 2. MultiEmbed - Unrivaled coverage for Turkish Diziler, Indian / Bollywood, and World cinema
    {
      id: 'multiembed',
      label: 'Server 2 (Turkish & World)',
      badge: 'Turkish & World',
      url: withResumeParam(
        `https://multiembed.mov/?video_id=${tmdb}&tmdb=1${imdb ? `&imdb=${imdb}` : ''}`,
        resumeAt
      ),
    },
    // 3. SmashyStream - Complete Anime & Bollywood catalog with 5 internal mirrors
    {
      id: 'smashystream',
      label: 'Server 3 (Anime & Indian)',
      badge: 'Anime & Indian',
      url: withResumeParam(`https://embed.smashystream.com/playere.php?tmdb=${tmdb}`, resumeAt),
    },
    // 4. VidSrc To - Top global streaming provider
    {
      id: 'vidsrc_to',
      label: 'Server 4 (VidSrc Fast)',
      badge: 'Fast HD',
      url: withResumeParam(`https://vidsrc.to/embed/movie/${tmdb}`, resumeAt),
    },
    // 5. 2Embed - Deep archive for Asian and Turkish dramas
    {
      id: 'two_embed',
      label: 'Server 5 (2Embed)',
      badge: 'Global Archive',
      url: withResumeParam(`https://www.2embed.cc/embed/${tmdb}`, resumeAt),
    },
    // 6. VaPlayer (Existing European / Russian mirror)
    {
      id: 'vaplayer_ru',
      label: 'Server 6 (VaPlayer)',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/movie/${vaplayerId}`, resumeAt),
    },
    // 7. MoviesAPI (Existing Backup)
    {
      id: 'moviesapi_to',
      label: 'Server 7 (MoviesAPI)',
      badge: 'Backup',
      url: withResumeParam(`https://moviesapi.to/embed/movie/${tmdb}`, resumeAt),
    },
    // 8. VidSrc CC (Existing Backup)
    {
      id: 'vidsrc_cc',
      label: 'Server 8 (VidSrc CC)',
      badge: 'Backup',
      url: withResumeParam(`https://vidsrc.cc/v2/embed/movie/${tmdb}`, resumeAt),
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
  const vaplayerId = imdb || tmdb;

  return [
    // 1. VidLink - Fast 4K/1080p, custom NARMAX cyan theme, multi-audio
    {
      id: 'vidlink',
      label: 'Server 1 (Ultra HD)',
      badge: '4K • Multi-Audio',
      url: withResumeParam(
        `https://vidlink.pro/tv/${tmdb}/${s}/${e}?primaryColor=56cfe1&secondaryColor=18181b&iconColor=ffffff`,
        resumeAt
      ),
    },
    // 2. MultiEmbed - Unrivaled coverage for Turkish Diziler, Indian series, and World television
    {
      id: 'multiembed',
      label: 'Server 2 (Turkish & World)',
      badge: 'Turkish & World',
      url: withResumeParam(
        `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${s}&e=${e}${imdb ? `&imdb=${imdb}` : ''}`,
        resumeAt
      ),
    },
    // 3. SmashyStream - Complete Anime & Bollywood series catalog with 5 internal mirrors
    {
      id: 'smashystream',
      label: 'Server 3 (Anime & Indian)',
      badge: 'Anime & Indian',
      url: withResumeParam(
        `https://embed.smashystream.com/playere.php?tmdb=${tmdb}&season=${s}&episode=${e}`,
        resumeAt
      ),
    },
    // 4. VidSrc To - Top global streaming provider
    {
      id: 'vidsrc_to',
      label: 'Server 4 (VidSrc Fast)',
      badge: 'Fast HD',
      url: withResumeParam(`https://vidsrc.to/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    // 5. 2Embed - Deep archive for Asian and Turkish dramas
    {
      id: 'two_embed',
      label: 'Server 5 (2Embed)',
      badge: 'Global Archive',
      url: withResumeParam(`https://www.2embed.cc/embedtv/${tmdb}&s=${s}&e=${e}`, resumeAt),
    },
    // 6. VaPlayer (Existing European / Russian mirror)
    {
      id: 'vaplayer_ru',
      label: 'Server 6 (VaPlayer)',
      badge: 'Mirror',
      url: withResumeParam(`https://vaplayer.ru/embed/tv/${vaplayerId}/${s}/${e}`, resumeAt),
    },
    // 7. MoviesAPI (Existing Backup)
    {
      id: 'moviesapi_to',
      label: 'Server 7 (MoviesAPI)',
      badge: 'Backup',
      url: withResumeParam(`https://moviesapi.to/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
    },
    // 8. VidSrc CC (Existing Backup)
    {
      id: 'vidsrc_cc',
      label: 'Server 8 (VidSrc CC)',
      badge: 'Backup',
      url: withResumeParam(`https://vidsrc.cc/v2/embed/tv/${tmdb}/${s}/${e}`, resumeAt),
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
