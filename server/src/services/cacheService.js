import NodeCache from 'node-cache';

const tmdbCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

export function getCache(key) {
  return tmdbCache.get(key);
}

export function setCache(key, value, ttlSeconds) {
  if (ttlSeconds != null) {
    return tmdbCache.set(key, value, ttlSeconds);
  }
  return tmdbCache.set(key, value);
}

export function deleteCache(key) {
  return tmdbCache.del(key);
}

export function delCachePattern(prefix) {
  const keys = tmdbCache.keys().filter((k) => String(k).startsWith(prefix));
  tmdbCache.del(keys);
}
