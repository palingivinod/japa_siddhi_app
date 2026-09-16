import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

let memoryToken: string | null = null;
let memoryUser: any = null;
let onTokenChange: ((token: string | null) => void) | null = null;

export const setTokenListener = (listener: (token: string | null) => void) => {
  onTokenChange = listener;
  listener(memoryToken);
};

const notify = (token: string | null) => {
  memoryToken = token;
  onTokenChange?.(token);
};

const decodeJwtPayload = (token: string): {exp?: number} | null => {
  try {
    const part = token.split('.')[1];
    if (!part) {
      return null;
    }
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const atobFn = (globalThis as any).atob as
      | ((value: string) => string)
      | undefined;
    const json = atobFn
      ? atobFn(padded)
      : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/** True when JWT has an exp claim that is already past (with small skew). */
export const isTokenExpired = (token: string | null | undefined) => {
  if (!token) {
    return true;
  }
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 <= Date.now() + 5000;
};

export const saveSession = async (token: string, user?: unknown) => {
  notify(token);
  memoryUser = user ?? memoryUser;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getToken = async () => {
  if (memoryToken) {
    return memoryToken;
  }
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  notify(memoryToken);
  return memoryToken;
};

export const getStoredUser = async () => {
  if (memoryUser) {
    return memoryUser;
  }
  const raw = await AsyncStorage.getItem(USER_KEY);
  memoryUser = raw ? JSON.parse(raw) : null;
  return memoryUser;
};

/** Id of the signed-in devotee, or 0 when nobody is signed in. */
export const getSessionUserId = async (): Promise<number> => {
  const user = await getStoredUser();
  return Number(user?.id ?? user?.userId ?? 0) || 0;
};

/**
 * Local caches must be stored per devotee. A shared key would show one
 * devotee's japa progress and addresses to whoever signs in next.
 */
export const userScopedKey = async (base: string) => {
  const id = await getSessionUserId();
  return `${base}:${id || 'guest'}`;
};

export const updateStoredUser = async (patch: Record<string, unknown>) => {
  const current = (await getStoredUser()) || {};
  memoryUser = {...current, ...patch};
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(memoryUser));
  return memoryUser;
};

export const hydrateSession = async () => {
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  const raw = await AsyncStorage.getItem(USER_KEY);
  memoryUser = raw ? JSON.parse(raw) : null;
  notify(memoryToken);
  return {token: memoryToken, user: memoryUser};
};

/** Hydrate and drop expired tokens so login/auth gates stay consistent. */
export const getValidSession = async () => {
  const session = await hydrateSession();
  if (!session.token || isTokenExpired(session.token)) {
    if (session.token) {
      await clearSession();
    }
    return {token: null as string | null, user: null};
  }
  return session;
};

/**
 * Credentials written by the older redux auth thunk. Nothing reads them now,
 * but leaving them behind would let a previous account be restored.
 */
const ORPHAN_AUTH_KEYS = ['JWT_TOKEN', 'USER', 'FIREBASE_TOKEN'];

export const clearSession = async () => {
  const scopedKeys = await Promise.all([
    userScopedKey('japa_goal_drafts'),
    userScopedKey('saved_delivery_addresses'),
  ]);
  memoryUser = null;
  notify(null);
  const keys = [
    TOKEN_KEY,
    USER_KEY,
    ...ORPHAN_AUTH_KEYS,
    // Shared keys from before caches were scoped per devotee.
    'japa_goal_drafts',
    'japa_goal_draft',
    'saved_delivery_addresses',
    ...scopedKeys,
  ];
  // AsyncStorage v3 renamed multiRemove to removeMany; fall back per key so a
  // failed sign-out never blocks login or account creation.
  try {
    const storage = AsyncStorage as unknown as {
      removeMany?: (items: string[]) => Promise<void>;
      multiRemove?: (items: string[]) => Promise<void>;
    };
    if (typeof storage.removeMany === 'function') {
      await storage.removeMany(keys);
      return;
    }
    if (typeof storage.multiRemove === 'function') {
      await storage.multiRemove(keys);
      return;
    }
  } catch {
    // Fall through to removing them one by one.
  }
  for (const key of keys) {
    await AsyncStorage.removeItem(key).catch(() => undefined);
  }
};
