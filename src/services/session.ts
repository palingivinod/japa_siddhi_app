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

export const clearSession = async () => {
  memoryUser = null;
  notify(null);
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
