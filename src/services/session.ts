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

export const clearSession = async () => {
  memoryUser = null;
  notify(null);
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
