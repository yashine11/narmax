import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const { user } = useAuth();
  const [map, setMap] = useState({});

  const refresh = useCallback(async () => {
    if (!user) {
      setMap({});
      return;
    }
    try {
      const { data } = await api.get('/api/user/progress');
      const next = {};
      (data.progress || []).forEach((p) => {
        const key = `${p.media_type || 'movie'}:${p.tmdb_id}`;
        next[key] = {
          progress_percent: p.progress_percent,
          completed: !!p.completed,
        };
      });
      setMap(next);
    } catch {
      setMap({});
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getProgress = useCallback(
    (tmdbId, mediaType = 'movie') => {
      const key = `${mediaType}:${tmdbId}`;
      return map[key] || null;
    },
    [map]
  );

  const value = useMemo(() => ({ map, refresh, getProgress }), [map, refresh, getProgress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) return { map: {}, refresh: () => {}, getProgress: () => null };
  return ctx;
}
