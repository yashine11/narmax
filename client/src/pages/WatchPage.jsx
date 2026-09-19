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
  'https://vaplayer.ru',
  'https://vidsrc-embed.ru',
  'https://cinextream.cc',
  'https://cinextream.net',
  'https://vidsrc.sbs',
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
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  let data = raw;
  let info = {};
  if (raw.type === 'PLAYER_EVENT' && typeof raw.data === 'object' && raw.data !== null) {
    data = raw.data;
    info = data.player_info || {};
  } else if (!raw.event && !raw.type) {
    return null;
  }

  const sourceStatus = String(data.player_status || data.event || raw.event || '').toLowerCase();

  let status = 'idle';
  if (sourceStatus === 'playing' || sourceStatus === 'play' || sourceStatus === 'time' || sourceStatus === 'timeupdate') {
    status = 'playing';
  } else if (sourceStatus === 'paused' || sourceStatus === 'pause') {
    status = 'paused';
  } else if (
    sourceStatus === 'completed' ||
    sourceStatus === 'complete' ||
    sourceStatus === 'ended' ||
    sourceStatus === 'end' ||
    sourceStatus === 'video_ended'
  ) {
    status = 'completed';
  } else if (sourceStatus === 'seeked' || sourceStatus === 'seek') {
    status = 'seeked';
  } else if (sourceStatus === 'error' || sourceStatus === 'failed' || sourceStatus === 'player_error') {
    status = 'error';
  }

  return {
    status,
    currentTime: Number(data.player_progress ?? data.currentTime ?? data.progress ?? data.time ?? raw.time ?? 0),
    duration: Number(data.player_duration ?? data.duration ?? raw.duration ?? 0),
    qualityLabel:
      typeof data.quality === 'string'
        ? data.quality
        : data.quality?.label
          ? String(data.quality.label)
          : null,
    mediaType: String(info.mediaType || data.mediaType || '').toLowerCase() || null,
    season: Number(info.season ?? data.season ?? raw.season ?? 0) || null,
    episode: Number(info.episode ?? data.episode ?? raw.episode ?? 0) || null,
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

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const watchPercentRef = useRef(0);
  const savedPercentRef = useRef(0);
  const savingRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const controlsTimeoutRef = useRef(null);

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

  // Episode Panel states
  const [selectedSeason, setSelectedSeason] = useState(season);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Ad Shield & Cloak state
  const [adShield, setAdShield] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('narmax:ad-shield') !== 'false';
  });
  const [cloakShieldActive, setCloakShieldActive] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Theater Mode state (persisted)
  const [theaterMode, setTheaterMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('narmax:theater-mode') === 'true';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Sync selectedSeason when URL param changes
  useEffect(() => {
    setSelectedSeason(season);
  }, [season]);

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
          title: meta.title || meta.name,
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

  // Fetch episodes for selected season
  useEffect(() => {
    if (type !== 'tv') {
      setSeasonEpisodes([]);
      return;
    }
    setLoadingEpisodes(true);
    api
      .get(`/api/tmdb/tv/${id}/season/${selectedSeason}`)
      .then((response) => setSeasonEpisodes(response.data.episodes || []))
      .catch(() => setSeasonEpisodes([]))
      .finally(() => setLoadingEpisodes(false));
  }, [id, selectedSeason, type]);

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
    setCloakShieldActive(true);

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
      setCloakShieldActive(true);
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

  const reloadCurrentSource = useCallback(() => {
    if (!activeSource) return;
    setSwitching(true);
    setPlayerReady(false);
    setCloakShieldActive(true);
    const current = activeIdx;
    setActiveIdx(-1);
    setTimeout(() => setActiveIdx(current), 100);
    toast.success('Reloading stream...');
  }, [activeIdx, activeSource]);

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

  const episodeNumbers = useMemo(() => {
    if (seasonEpisodes.length > 0) {
      return seasonEpisodes
        .map((item) => Number(item.episode_number))
        .filter((number) => Number.isFinite(number) && number > 0)
        .sort((a, b) => a - b);
    }
    return [];
  }, [seasonEpisodes]);

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
      setCloakShieldActive(true);
      autoAdvanceRef.current = false;
      navigate(`/watch/${id}?type=tv&season=${target.season}&episode=${target.episode}`);
    },
    [id, navigate]
  );

  useEffect(() => {
    autoAdvanceRef.current = false;
  }, [episode, id, season, type]);

  // postMessage listener from underlying players
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

  // Blur & Focus anti-popunder safeguard
  useEffect(() => {
    if (!adShield) return;
    const handleBlur = () => {
      window.focus();
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [adShield]);

  // Keyboard shortcuts (Theater mode 't', Fullscreen 'f')
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTheaterMode((prev) => {
          const next = !prev;
          window.localStorage.setItem('narmax:theater-mode', String(next));
          toast(next ? 'Theater Mode ON' : 'Theater Mode OFF', { icon: '🎬', duration: 1500 });
          return next;
        });
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheater = useCallback(() => {
    setTheaterMode((prev) => {
      const next = !prev;
      window.localStorage.setItem('narmax:theater-mode', String(next));
      toast(next ? 'Theater Mode ON' : 'Theater Mode OFF', { icon: '🎬', duration: 1500 });
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleAdShield = useCallback(() => {
    setAdShield((prev) => {
      const next = !prev;
      window.localStorage.setItem('narmax:ad-shield', String(next));
      if (next) {
        toast.success('Ad Shield Active: Popups & redirects blocked');
      } else {
        toast('Ad Shield Paused: Direct source access', { icon: '⚠️' });
      }
      return next;
    });
  }, []);

  const handleIframeLoad = useCallback(() => {
    setPlayerReady(true);
    setSwitching(false);
  }, []);

  // Controls auto-hide on hover over player
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  }, []);

  const handleCloakClick = useCallback(() => {
    setCloakShieldActive(false);
  }, []);

  const remainingSeconds = useMemo(() => {
    const base = playerDuration > 0 ? playerDuration : Math.max(60, runtimeMinutes * 60);
    return Math.max(0, base - playerSeconds);
  }, [playerDuration, playerSeconds, runtimeMinutes]);

  const currentEpisodeDetails = useMemo(() => {
    if (type !== 'tv') return null;
    return seasonEpisodes.find((e) => Number(e.episode_number) === episode) || null;
  }, [episode, seasonEpisodes, type]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-narmax-red selection:text-white">
      {/* Top Header */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between border-b border-white/5 bg-gradient-to-b from-black/95 to-black/40 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to={backTo}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clipRule="evenodd" />
              </svg>
              <span>Back</span>
            </Link>
          </div>

          <div className="min-w-0 max-w-[60%] text-center">
            <h1 className="truncate text-sm font-bold text-white sm:text-base">{meta?.title || meta?.name || 'Watch'}</h1>
            {type === 'tv' && (
              <p className="truncate text-[11px] text-zinc-400 sm:text-xs">
                Season {season} • Episode {episode} {currentEpisodeDetails?.name ? `— "${currentEpisodeDetails.name}"` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Theater toggle in header */}
            <button
              type="button"
              onClick={toggleTheater}
              className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition md:flex ${
                theaterMode
                  ? 'border-narmax-cyan/40 bg-narmax-cyan/15 text-narmax-cyan'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Theater Mode (t)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 14H5V6h14v12Z" />
              </svg>
              <span>Theater</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`pt-16 sm:pt-20 pb-16 transition-all duration-300 ${
          theaterMode ? 'w-full px-0 sm:px-2' : 'mx-auto max-w-[1920px] px-3 sm:px-6'
        }`}
      >
        {/* Layout Grid: If TV and not in theater mode, 2 columns on desktop */}
        <div className={`grid gap-6 ${!theaterMode && type === 'tv' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Main Player Area */}
          <div className={!theaterMode && type === 'tv' ? 'lg:col-span-8 xl:col-span-9' : 'w-full'}>
            {/* Player Container / Frame with Cloak and Shields */}
            <div
              ref={playerContainerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`group relative overflow-hidden bg-black transition-all duration-500 ${
                theaterMode
                  ? 'h-[74vh] sm:h-[82vh] xl:h-[86vh] w-full rounded-none sm:rounded-[1.6rem] border-y sm:border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.85)]'
                  : 'h-[60vh] min-h-[380px] sm:h-[66vh] xl:h-[72vh] w-full rounded-[1.6rem] border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.65)]'
              }`}
            >
              {/* The Embed Player Iframe with Sandboxing Shield */}
              {src ? (
                <iframe
                  ref={iframeRef}
                  key={src}
                  title="player"
                  src={src}
                  className="h-full w-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  onLoad={handleIframeLoad}
                  sandbox={
                    adShield
                      ? 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock'
                      : undefined
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
                    <span>Resolving player stream...</span>
                  </div>
                </div>
              )}

              {/* Cloak Protection Shield Layer: Absorb Malicious Popups */}
              {cloakShieldActive && playerReady && !switching && (
                <div
                  onClick={handleCloakClick}
                  className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center bg-black/35 backdrop-blur-[2px] transition-all duration-300 hover:bg-black/20"
                >
                  <div className="group/btn flex items-center gap-3 rounded-2xl border border-white/20 bg-black/80 px-6 py-3.5 shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:border-narmax-cyan hover:shadow-[0_0_30px_rgba(86,207,225,0.3)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-narmax-red text-white shadow-lg transition-transform group-hover/btn:scale-110">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Click to Control & Play</p>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-narmax-cyan">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-narmax-cyan animate-ping" />
                        Cloaked & Popups Blocked
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading / Source Switching Overlay */}
              {(switching || (src && !playerReady)) && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300">
                    {switching ? 'Connecting to source...' : 'Preparing player'}
                  </p>
                  <span className="text-[11px] text-zinc-500">Ad Shield protected</span>
                </div>
              )}

              {/* Floating Frame Controls Overlay (Top Bar inside player) */}
              <div
                className={`absolute inset-x-0 top-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${
                  showControls || cloakShieldActive || switching ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Left: Shield Status Badge & Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAdShield}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md transition-all ${
                      adShield
                        ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'border-amber-500/40 bg-amber-950/60 text-amber-400'
                    }`}
                    title="Toggle Anti-Ad Cloak Shield"
                  >
                    <span className={`h-2 w-2 rounded-full ${adShield ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{adShield ? '🛡️ Shield: Active' : 'Shield: Off'}</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] text-zinc-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-narmax-cyan animate-ping" />
                    <span>{activeSource?.label || 'Source'}</span>
                  </div>
                </div>

                {/* Right: Frame Control Buttons (Reload, Theater, Fullscreen) */}
                <div className="flex items-center gap-1.5">
                  {/* Reload stream button */}
                  <button
                    type="button"
                    onClick={reloadCurrentSource}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                    title="Reload Stream"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.75a.75.75 0 0 0-.75.75v4.482a.75.75 0 0 0 1.5 0v-2.062l.53.53a7 7 0 0 0 11.758-3.176.75.75 0 0 0-1.476-.329Zm-10.624-2.848a5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5H16.25a.75.75 0 0 0 .75-.75V2.689a.75.75 0 0 0-1.5 0v2.062l-.53-.53A7 7 0 0 0 3.212 7.397a.75.75 0 0 0 1.476.329Z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Theater mode button (YouTube-style) */}
                  <button
                    type="button"
                    onClick={toggleTheater}
                    className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold backdrop-blur-md transition ${
                      theaterMode
                        ? 'border-narmax-cyan/50 bg-narmax-cyan/20 text-narmax-cyan shadow-[0_0_15px_rgba(86,207,225,0.25)]'
                        : 'border-white/10 bg-black/60 text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Theater Mode (t)"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 14H5V6h14v12Z" />
                    </svg>
                    <span className="hidden sm:inline">Theater</span>
                  </button>

                  {/* Fullscreen button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                    title="Fullscreen (f)"
                  >
                    {isFullscreen ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M3.25 4a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H5.56l2.97 2.97a.75.75 0 0 1-1.06 1.06L4.5 5.81v1.94a.75.75 0 0 1-1.25 0V4Zm12.75 0a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V6.56l-2.97 2.97a.75.75 0 0 1-1.06-1.06l2.97-2.97h-1.94a.75.75 0 0 1 0-1.5h3.75ZM4 16.75a.75.75 0 0 1-.75-.75v-3.75a.75.75 0 0 1 1.5 0v1.94l2.97-2.97a.75.75 0 0 1 1.06 1.06L5.81 15.25h1.94a.75.75 0 0 1 0 1.5H4Zm12.75 0a.75.75 0 0 1-.75.75h-3.75a.75.75 0 0 1 0-1.5h1.94l-2.97-2.97a.75.75 0 1 1 1.06-1.06l2.97 2.97v-1.94a.75.75 0 0 1 1.5 0v3.75Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M3.25 7.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5H4.75V11a.75.75 0 0 1-1.5 0V7.75Zm13.5 0a.75.75 0 0 1 0 1.5h-1.75V11a.75.75 0 0 1-1.5 0V7.75a.75.75 0 0 1 .75-.75h2.5ZM4.75 12.25a.75.75 0 0 1 1.5 0V14h1.75a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75v-2.5Zm10.5 0a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-1.75Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Under-Player Unified Control Bar */}
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.02] p-4 sm:p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-6">
                {/* Title & Metadata Row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {meta?.title || meta?.name || 'Watch'}
                    </h2>
                    {type === 'tv' ? (
                      <p className="text-xs font-medium text-zinc-400 mt-1">
                        Season {season} • Episode {episode}
                        {currentEpisodeDetails?.name && (
                          <span className="text-zinc-200"> — "{currentEpisodeDetails.name}"</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 mt-1">
                        {meta?.release_date ? meta.release_date.slice(0, 4) : ''}
                        {meta?.runtime ? ` • ${meta.runtime} min` : ''}
                        {meta?.vote_average ? ` • ⭐ ${meta.vote_average.toFixed(1)}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Anti-ad badge indicator */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Ads & Popups Cloaked
                    </span>
                  </div>
                </div>

                {/* Streaming Source Selector Bar */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-narmax-cyan animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-narmax-cyan">
                        Select Streaming Source
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500">Click if stream buffers</span>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {sources.map((source, index) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => pickSource(index)}
                        className={`group relative overflow-hidden rounded-xl border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                          index === activeIdx
                            ? 'border-narmax-cyan bg-narmax-cyan/15 text-narmax-cyan shadow-[0_0_15px_rgba(86,207,225,0.25)]'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/30 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {index === activeIdx && <span className="absolute inset-0 bg-narmax-cyan/5 animate-pulse" />}
                        <span className="relative z-10 flex items-center gap-2">
                          <span>{source.label}</span>
                          {source.badge && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium tracking-normal ${
                                index === activeIdx
                                  ? 'bg-narmax-cyan/20 text-narmax-cyan'
                                  : 'bg-white/10 text-zinc-300'
                              }`}
                            >
                              {source.badge}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* TV Previous / Next Episode Navigation */}
                {type === 'tv' && (
                  <div className="flex flex-wrap items-center gap-3 py-3 border-y border-white/5">
                    <button
                      onClick={() => navigateToEpisode(previousEpisodeTarget)}
                      disabled={!previousEpisodeTarget}
                      className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold transition hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:-translate-x-1">
                        <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                      </svg>
                      <span>Previous Episode</span>
                    </button>
                    <button
                      onClick={() => navigateToEpisode(nextEpisodeTarget)}
                      disabled={!nextEpisodeTarget}
                      className="group flex items-center gap-2 rounded-xl border border-narmax-cyan/30 bg-narmax-cyan/10 px-5 py-2 text-xs font-bold text-narmax-cyan transition hover:bg-narmax-cyan/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span>Next Episode</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition group-hover:translate-x-1">
                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Watch Progress Bar */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <span>Watch Progress</span>
                    <span>{Math.round(watchPercent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-narmax-red transition-all duration-500"
                      style={{ width: `${watchPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400">
                    <span>
                      Position: <span className="text-zinc-200">{formatDuration(playerSeconds)}</span>
                    </span>
                    <span>
                      Remaining: <span className="text-zinc-200">{formatDuration(remainingSeconds)}</span>
                    </span>
                  </div>
                </div>

                {/* Overview synopsis if available */}
                {meta?.overview && (
                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Synopsis</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-4xl">{meta.overview}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Episode Panel (TV Shows & Anime) */}
          {type === 'tv' && (
            <div className={theaterMode ? 'w-full mt-6' : 'lg:col-span-4 xl:col-span-3'}>
              <div className="sticky top-20 rounded-[1.4rem] border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl">
                {/* Episode Panel Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-narmax-red" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Episodes</h3>
                  </div>

                  {/* Season Dropdown Selector */}
                  {sortedSeasons.length > 0 && (
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="rounded-lg border border-white/15 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white outline-none transition focus:border-narmax-cyan"
                    >
                      {sortedSeasons.map((s) => (
                        <option key={s.id || s.season_number} value={s.season_number}>
                          Season {s.season_number} ({s.episode_count} eps)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Episodes List with Thumbnails */}
                <div
                  className={`episode-scroll overflow-y-auto mt-3 pr-1 space-y-2.5 ${
                    theaterMode ? 'max-h-[480px]' : 'max-h-[64vh] min-h-[360px]'
                  }`}
                >
                  {loadingEpisodes ? (
                    <div className="flex h-40 items-center justify-center text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border border-narmax-cyan border-t-transparent" />
                        <span>Loading episodes...</span>
                      </div>
                    </div>
                  ) : seasonEpisodes.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-xs text-zinc-500">
                      No episodes found for this season.
                    </div>
                  ) : (
                    seasonEpisodes.map((ep) => {
                      const isCurrent =
                        Number(selectedSeason) === Number(season) &&
                        Number(ep.episode_number) === Number(episode);

                      return (
                        <div
                          key={ep.id || ep.episode_number}
                          onClick={() =>
                            navigateToEpisode({
                              season: selectedSeason,
                              episode: ep.episode_number,
                            })
                          }
                          className={`group flex cursor-pointer gap-3 rounded-xl border p-2 transition-all duration-200 ${
                            isCurrent
                              ? 'border-narmax-cyan bg-narmax-cyan/10 shadow-[0_0_15px_rgba(86,207,225,0.15)]'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          {/* Episode Thumbnail Still */}
                          <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                            {ep.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] text-zinc-500">
                                E{ep.episode_number}
                              </div>
                            )}

                            {/* Playing Wave or Play Icon Overlay */}
                            {isCurrent ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                                <div className="flex items-end gap-1 h-4">
                                  <span className="w-1 bg-narmax-cyan rounded-full wave-bar-1" />
                                  <span className="w-1 bg-narmax-cyan rounded-full wave-bar-2" />
                                  <span className="w-1 bg-narmax-cyan rounded-full wave-bar-3" />
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}

                            {/* Runtime badge */}
                            {ep.runtime && (
                              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold text-zinc-300">
                                {ep.runtime}m
                              </span>
                            )}
                          </div>

                          {/* Episode Text Details */}
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-extrabold uppercase ${
                                  isCurrent ? 'text-narmax-cyan' : 'text-zinc-500 group-hover:text-zinc-300'
                                }`}
                              >
                                EP {ep.episode_number}
                              </span>
                              {isCurrent && (
                                <span className="rounded bg-narmax-cyan/20 px-1 py-0.2 text-[8px] font-bold text-narmax-cyan">
                                  PLAYING
                                </span>
                              )}
                            </div>
                            <h4
                              className={`truncate text-xs font-semibold ${
                                isCurrent ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                              }`}
                            >
                              {ep.name || `Episode ${ep.episode_number}`}
                            </h4>
                            {ep.overview && (
                              <p className="line-clamp-1 text-[11px] text-zinc-500 mt-0.5">
                                {ep.overview}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
