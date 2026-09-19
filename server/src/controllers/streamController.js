import { getLabeledSourcesForMovie, getLabeledSourcesForTv } from '../services/streamService.js';

export function embedUrls(req, res) {
  const tmdbId = Number(req.query.tmdbId);
  const imdbId = String(req.query.imdbId || '').trim();
  const type = req.query.type === 'tv' ? 'tv' : 'movie';
  const season = Number(req.query.season) || 1;
  const episode = Number(req.query.episode) || 1;
  const resumeAt = Number(req.query.resumeAt) || 0;
  const dsLang = String(req.query.ds_lang || req.query.dsLang || 'en').trim().toLowerCase();

  if (!tmdbId) {
    return res.status(400).json({ message: 'tmdbId is required' });
  }

  const sourceOptions = { imdbId, resumeAt, dsLang };

  const sources =
    type === 'tv'
      ? getLabeledSourcesForTv(tmdbId, season, episode, sourceOptions)
      : getLabeledSourcesForMovie(tmdbId, sourceOptions);

  return res.json({
    tmdbId,
    imdbId: imdbId || null,
    type,
    season: type === 'tv' ? season : null,
    episode: type === 'tv' ? episode : null,
    sources,
  });
}
