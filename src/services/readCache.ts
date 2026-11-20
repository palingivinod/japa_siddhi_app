/**
 * Short-lived in-memory cache for READ-ONLY screen data.
 * Never use for japa save / count / chant POST-PUT paths.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export const getReadCache = <T>(key: string): T | null => {
  const hit = store.get(key);
  if (!hit) {
    return null;
  }
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
};

export const setReadCache = <T>(key: string, value: T, ttlMs: number) => {
  const ttl = Math.max(0, Number(ttlMs) || 0);
  if (!ttl) {
    return;
  }
  store.set(key, {value, expiresAt: Date.now() + ttl});
};

export const clearReadCache = (keyPrefix?: string) => {
  if (!keyPrefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  }
};

/** Display lists (challenges, banners, community catalog). Not japa counts. */
export const READ_TTL_MS = 45_000;
