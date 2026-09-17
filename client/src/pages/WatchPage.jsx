import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useProgress } from '../context/ProgressContext.jsx';

const WATCHED_THRESHOLD = 90;
const PROGRESS_SAVE_DELTA = 2;
const DEFAULT_MOVIE_RUNTIME_MIN = 110;
const DEFAULT_EPISODE_RUNTIME_MIN = 45;
const SOURCE_READY_TIMEOUT_MS = 14000;
const ALLOWED_PLAYER_ORIGINS = new Set([
  'https://moviesapi.to',
  'https://vidsrc.cc',
  'https://vaplayer.ru',
  'https://vidsrc-embed.ru',
]);

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function clampSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.floor(number));
}

function formatDuration(seconds) {
  const total = clampSeconds(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function isAllowedPlayerOrigin(origin = '') {
  if (!origin || origin === 'null') return false;
  if (ALLOWED_PLAYER_ORIGINS.has(origin)) return true;
  return origin.endsWith('.vidsrc.cc');
}

function normalizePlayerEvent(payload) {
  let raw = payload;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || raw.type !== 'PLAYER_EVENT' || typeof raw.data !== 'object') {
    return null;
  }

  const data = raw.data || {};
  const info = data.player_info || {};
  const sourceStatus = String(data.player_status || data.event || '').toLowerCase();

  let status = 'idle';
  if (sourceStatus === 'playing' || sourceStatus === 'play' || sourceStatus === 'time' || sourceStatus === 'timeupdate') {
    status = 'playing';
  } else if (sourceStatus === 'paused' || sourceStatus === 'pause') {
    status = 'paused';
  } else if (sourceStatus === 'completed' || sourceStatus === 'complete' || sourceStatus === 'ended' || sourceStatus === 'end') {
    status = 'completed';
  } else if (sourceStatus === 'seeked' || sourceStatus === 'seek') {
    status = 'seeked';
  } else if (sourceStatus === 'error' || sourceStatus === 'failed') {
    status = 'error';
  }

  return {
    status,
    currentTime: Number(data.player_progress ?? data.currentTime ?? data.progress ?? 0),
    duration: Number(data.player_duration ?? data.duration ?? 0),
    qualityLabel:
      typeof data.quality === 'string'
        ? data.quality
        : data.quality?.label
          ? String(data.quality.label)
          : null,
    mediaType: String(info.mediaType || data.mediaType || '').toLowerCase() || null,
    season: Number(info.season ?? data.season ?? 0) || null,
    episode: Number(info.episode ?? data.episode ?? 0) || null,
  };
}

function getResumeStorageKey({ type, id, season, episode }) {
  if (type === 'tv') {
    return `narmax:resume:tv:${id}:s${season}:e${episode}`;
  }
  return `narmax:resume:movie:${id}`;
}

function readLocalResumeSeconds(key) {
  if (!key || typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(key);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return clampSeconds(parsed?.seconds);
  } catch {
    return clampSeconds(raw);
  }
}

function writeLocalResumeSeconds(key, seconds, duration) {
  if (!key || typeof window === 'undefined') return;
  if (!seconds || seconds < 1) return;
  window.localStorage.setItem(
    key,
    JSON.stringify({
      seconds: clampSeconds(seconds),
      duration: clampSeconds(duration),
      updatedAt: Date.now(),
    })
  );
}

function clearLocalResume(key) {
  if (!key || typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

function EpisodeNavButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export default function WatchPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') === 'tv' ? 'tv' : 'movie';
  const season = Math.max(1, Number(params.get('season')) || 1);
  const episode = Math.max(1, Number(params.get('episode')) || 1);
  const { user } = useAuth();
  const { refresh: refreshProgress, getProgress } = useProgress();
  const outlet = useOutletContext();
  const kids = outlet?.kids === true;

  const iframeRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const watchPercentRef = useRef(0);
  const savedPercentRef = useRef(0);
  const savingRef = useRef(false);
  const autoAdvanceRef = useRef(false);

  const [sources, setSources] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [switching, setSwitching] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('idle');
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerQuality, setPlayerQuality] = useState('');
  const [meta, setMeta] = useState(null);
  const [watchPercent, setWatchPercent] = useState(0);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);

  const base = kids ? '/kids' : '';
  const backTo = type === 'tv' ? `${base}/tv/${id}` : `${base}/movie/${id}`;
  const activeSource = sources[activeIdx];
  const src = activeSource?.url || '';

  const resumeStorageKey = useMemo(
    () => getResumeStorageKey({ type, id, season, episode }),
    [episode, id, season, type]
  );

  useEffect(() => {
    watchPercentRef.current = watchPercent;
  }, [watchPercent]);

  const runtimeMinutes = useMemo(() => {
    const value = Number(meta?.runtime);
    if (Number.isFinite(value) && value > 0) return value;
    return type === 'tv' ? DEFAULT_EPISODE_RUNTIME_MIN : DEFAULT_MOVIE_RUNTIME_MIN;
  }, [meta?.runtime, type]);

  const saveProgress = useCallback(
    async (nextPercent, force = false) => {
      if (!user || !meta) return;
      const normalized = clampPercent(nextPercent);
      const completed = normalized >= WATCHED_THRESHOLD;
      if (!force && !completed && Math.abs(normalized - savedPercentRef.current) < PROGRESS_SAVE_DELTA) {
        return;
      }
      if (savingRef.current) return;

      savingRef.current = true;
      try {
        await api.post('/api/user/history', {
          tmdbId: Number(id),
          title: meta.title,
          overview: meta.overview,
          poster_path: meta.poster_path,
          vote_average: meta.vote_average,
          media_type: type,
          progress_percent: normalized,
          completed,
        });
        savedPercentRef.current = completed ? 100 : normalized;
        if (completed) {
          setWatchPercent(100);
          watchPercentRef.current = 100;
          clearLocalResume(resumeStorageKey);
        }
        refreshProgress();
      } catch {
        /* ignore */
      } finally {
        savingRef.current = false;
      }
    },
    [id, meta, refreshProgress, resumeStorageKey, type, user]
  );

  useEffect(() => {
    const path = type === 'tv' ? `/api/tmdb/tv/${id}` : `/api/tmdb/movie/${id}`;
    api
      .get(path)
      .then((response) => setMeta(response.data))
      .catch(() => {});
  }, [id, type]);

  useEffect(() => {
    if (type !== 'tv') {
      setSeasonEpisodes([]);
      return;
    }
    api
      .get(`/api/tmdb/tv/${id}/season/${season}`)
      .then((response) => setSeasonEpisodes(response.data.episodes || []))
      .catch(() => setSeasonEpisodes([]));
  }, [id, season, type]);

  useEffect(() => {
    const progress = getProgress(Number(id), type);
    const backendPercent = progress?.completed ? 100 : clampPercent(progress?.progress_percent || 0);
    const baselinePercent = type === 'tv' ? 0 : backendPercent;
    const localSeconds = readLocalResumeSeconds(resumeStorageKey);
    const fallbackDuration = Math.max(60, runtimeMinutes * 60);
    const localPercent = localSeconds > 0 ? clampPercent((localSeconds / fallbackDuration) * 100) : 0;

    const initialPercent = Math.max(baselinePercent, localPercent);
    setWatchPercent(initialPercent);
    watchPercentRef.current = initialPercent;
    savedPercentRef.current = backendPercent;
    setPlayerSeconds(localSeconds);
    setPlayerDuration(fallbackDuration);
  }, [getProgress, id, resumeStorageKey, runtimeMinutes, type]);

  const loadSources = useCallback(() => {
    setPlayerReady(false);
    setSwitching(true);

    let preferredLanguage = 'en';
    try {
      const savedPrefs = JSON.parse(window.localStorage.getItem('narmax:watch-preferences') || '{}');
      if (savedPrefs?.preferredLanguage) {
        preferredLanguage = String(savedPrefs.preferredLanguage).toLowerCase();
      }
    } catch {
      preferredLanguage = 'en';
    }

    const fallbackDuration = Math.max(60, runtimeMinutes * 60);
    const percentResume =
      watchPercentRef.current >= WATCHED_THRESHOLD ? 0 : clampSeconds((watchPercentRef.current / 100) * fallbackDuration);
    const localResume = readLocalResumeSeconds(resumeStorageKey);
    const resumeAt = Math.max(localResume, percentResume);

    api
      .get('/api/stream/embed', {
        params: {
          tmdbId: id,
          type,
          season,
          episode,
          imdbId: meta?.imdb_id || undefined,
          resumeAt: resumeAt > 0 ? resumeAt : undefined,
          ds_lang: preferredLanguage,
        },
      })
      .then((response) => {
        const nextSources = response.data.sources || [];
        setSources(nextSources);
        setActiveIdx(0);
        if (nextSources.length === 0) {
          setSwitching(false);
          toast.error('No playable sources found');
        }
      })
      .catch(() => {
        setSources([]);
        setSwitching(false);
        toast.error('Could not resolve player');
      });
  }, [episode, id, meta?.imdb_id, resumeStorageKey, runtimeMinutes, season, type]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const pickSource = useCallback(
    (nextIndex) => {
      if (nextIndex === activeIdx || nextIndex < 0 || nextIndex >= sources.length) return;
      setSwitching(true);
      setPlayerReady(false);
      setPlayerStatus('idle');
      setActiveIdx(nextIndex);
    },
    [activeIdx, sources.length]
  );

  const tryNextSource = useCallback(() => {
    if (activeIdx < sources.length - 1) {
      pickSource(activeIdx + 1);
      return;
    }
    toast.error('No more sources available');
  }, [activeIdx, pickSource, sources.length]);

  useEffect(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (!src || playerReady || sources.length < 2) return undefined;

    fallbackTimerRef.current = setTimeout(() => {
      if (!playerReady) {
        tryNextSource();
      }
    }, SOURCE_READY_TIMEOUT_MS);

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [playerReady, sources.length, src, tryNextSource]);

  const sortedSeasons = useMemo(() => {
    if (type !== 'tv') return [];
    return [...(meta?.seasons || [])]
      .filter((item) => (item?.episode_count || 0) > 0)
      .sort((a, b) => Number(a.season_number) - Number(b.season_number));
  }, [meta?.seasons, type]);

  const currentSeasonIndex = useMemo(
    () => sortedSeasons.findIndex((item) => Number(item.season_number) === season),
    [season, sortedSeasons]
  );

  const episodeNumbers = useMemo(
    () =>
      (seasonEpisodes || [])
        .map((item) => Number(item.episode_number))
        .filter((number) => Number.isFinite(number) && number > 0)
        .sort((a, b) => a - b),
    [seasonEpisodes]
  );

  const maxCurrentEpisode = useMemo(() => {
    if (episodeNumbers.length > 0) return episodeNumbers[episodeNumbers.length - 1];
    const seasonMeta = sortedSeasons[currentSeasonIndex];
    return Math.max(1, Number(seasonMeta?.episode_count) || 1);
  }, [currentSeasonIndex, episodeNumbers, sortedSeasons]);

  const previousEpisodeTarget = useMemo(() => {
    if (type !== 'tv') return null;
    if (episode > 1) return { season, episode: episode - 1 };
    if (currentSeasonIndex <= 0) return null;
    const previousSeason = sortedSeasons[currentSeasonIndex - 1];
    const previousCount = Math.max(1, Number(previousSeason?.episode_count) || 1);
    return { season: Number(previousSeason.season_number), episode: previousCount };
  }, [currentSeasonIndex, episode, season, sortedSeasons, type]);

  const nextEpisodeTarget = useMemo(() => {
    if (type !== 'tv') return null;
    if (episode < maxCurrentEpisode) return { season, episode: episode + 1 };
    if (currentSeasonIndex < 0 || currentSeasonIndex >= sortedSeasons.length - 1) return null;
    const nextSeason = sortedSeasons[currentSeasonIndex + 1];
    return { season: Number(nextSeason.season_number), episode: 1 };
  }, [currentSeasonIndex, episode, maxCurrentEpisode, season, sortedSeasons, type]);

  const navigateToEpisode = useCallback(
    (target) => {
      if (!target) return;
      setSwitching(true);
      setPlayerReady(false);
      setPlayerStatus('idle');
      autoAdvanceRef.current = false;
      navigate(`/watch/${id}?type=tv&season=${target.season}&episode=${target.episode}`);
    },
    [id, navigate]
  );

  useEffect(() => {
    autoAdvanceRef.current = false;
  }, [episode, id, season, type]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!isAllowedPlayerOrigin(event.origin)) return;
      const parsed = normalizePlayerEvent(event.data);
      if (!parsed) return;

      if (parsed.mediaType && parsed.mediaType !== type) return;
      if (type === 'tv') {
        if (parsed.season && Number(parsed.season) !== season) return;
        if (parsed.episode && Number(parsed.episode) !== episode) return;
      }

      setPlayerReady(true);
      setSwitching(false);
      setPlayerStatus(parsed.status);

      if (parsed.qualityLabel) setPlayerQuality(parsed.qualityLabel);

      const currentSeconds = clampSeconds(parsed.currentTime);
      const eventDuration = clampSeconds(parsed.duration);
      if (eventDuration > 0) {
        setPlayerDuration(eventDuration);
      }
      if (currentSeconds >= 0) {
        setPlayerSeconds(currentSeconds);
        writeLocalResumeSeconds(resumeStorageKey, currentSeconds, eventDuration || Math.max(60, runtimeMinutes * 60));
      }

      const durationBase = eventDuration > 0 ? eventDuration : Math.max(60, runtimeMinutes * 60);
      const nextPercent = durationBase > 0 ? clampPercent((currentSeconds / durationBase) * 100) : watchPercentRef.current;
      const roundedPercent = Math.round(nextPercent);
      if (roundedPercent >= watchPercentRef.current || parsed.status === 'seeked' || parsed.status === 'completed') {
        setWatchPercent(roundedPercent);
        watchPercentRef.current = roundedPercent;
      }

      const shouldForceSave = parsed.status === 'paused' || parsed.status === 'seeked' || parsed.status === 'completed';
      if (parsed.status !== 'error') {
        saveProgress(nextPercent, shouldForceSave);
      }

      if (parsed.status === 'completed') {
        clearLocalResume(resumeStorageKey);
        if (type === 'tv' && nextEpisodeTarget && !autoAdvanceRef.current) {
          autoAdvanceRef.current = true;
          setTimeout(() => navigateToEpisode(nextEpisodeTarget), 700);
        }
      }

      if (parsed.status === 'error') {
        tryNextSource();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    episode,
    navigateToEpisode,
    nextEpisodeTarget,
    resumeStorageKey,
    runtimeMinutes,
    saveProgress,
    season,
    tryNextSource,
    type,
  ]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      saveProgress(watchPercentRef.current, true);
    };
  }, [saveProgress]);

  const handleIframeLoad = useCallback(() => {
    setPlayerReady(true);
    setSwitching(false);
  }, []);

  const remainingSeconds = useMemo(() => {
    const base = playerDuration > 0 ? playerDuration : Math.max(60, runtimeMinutes * 60);
    return Math.max(0, base - playerSeconds);
  }, [playerDuration, playerSeconds, runtimeMinutes]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-4 border-b border-white/5 bg-gradient-to-b from-black/95 to-black/35 px-4 sm:px-6">
          <Link to={backTo} className="text-sm text-zinc-400 transition hover:text-white">
            Back
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-bold sm:text-base">{meta?.title || 'Watch'}</h1>
            {type === 'tv' && <p className="text-[11px] text-zinc-500 sm:text-xs">S{season} | E{episode}</p>}
          </div>
          <div className="w-14 sm:w-20" />
        </div>
      </header>

      <div className="mx-auto max-w-[1920px] px-3 pb-10 pt-16 sm:px-6 sm:pt-20">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.65)]">
              {src ? (
                <iframe
                  ref={iframeRef}
                  key={src}
                  title="player"
                  src={src}
                  className="h-[62vh] min-h-[420px] w-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  onLoad={handleIframeLoad}
                />
              ) : (
                <div className="flex h-[62vh] min-h-[420px] items-center justify-center text-sm text-zinc-500">Loading player...</div>
              )}

              {(switching || (src && !playerReady)) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300">
                    {switching ? 'Switching source' : 'Preparing player'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="flex h-2 w-2 rounded-full bg-narmax-cyan animate-pulse" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-narmax-cyan">Live Connection</p>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100">{activeSource?.label || 'Streaming Source'}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {sources.map((source, index) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => pickSource(index)}
                        className={`group relative overflow-hidden rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
                          index === activeIdx
                            ? 'border-narmax-cyan bg-narmax-cyan/10 text-narmax-cyan'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/30 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {index === activeIdx && <span className="absolute inset-0 bg-narmax-cyan/5 animate-pulse" />}
                        <span className="relative z-10">{source.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {type === 'tv' && (
                  <div className="flex flex-wrap items-center gap-3 py-4 border-y border-white/5">
                    <button
                      onClick={() => navigateToEpisode(previousEpisodeTarget)}
                      disabled={!previousEpisodeTarget}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold transition hover:bg-white/10 disabled:opacity-30"
                    >
                       <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:-translate-x-1"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                       Previous
                    </button>
                    <button
                      onClick={() => navigateToEpisode(nextEpisodeTarget)}
                      disabled={!nextEpisodeTarget}
                      className="group flex items-center gap-3 rounded-xl border border-narmax-cyan/30 bg-narmax-cyan/5 px-6 py-2.5 text-xs font-bold text-narmax-cyan transition hover:bg-narmax-cyan/10 disabled:opacity-30"
                    >
                       Next Episode
                       <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:translate-x-1"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <span>Watch progress</span>
                    <span>{Math.round(watchPercent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-narmax-red transition-all duration-500" style={{ width: `${watchPercent}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>
                      Position: <span className="text-zinc-300">{formatDuration(playerSeconds)}</span>
                    </span>
                    <span>
                      Remaining: <span className="text-zinc-300">{formatDuration(remainingSeconds)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <p>Use the embedded player controls directly for play, pause, seek, volume, subtitles, and quality.</p>
                  <button type="button" onClick={tryNextSource} className="font-semibold text-zinc-300 transition hover:text-white">
                    Try next source
                  </button>
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}
