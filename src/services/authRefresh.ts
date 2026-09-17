import axios from 'axios';

import ENV from '../env';
import {getToken, isTokenExpired, saveSession} from './session';

/**
 * Sessions must only end when the devotee taps Logout, so a stored token is
 * swapped for a fresh one instead of forcing a login. A bare axios client is
 * used here because apiService's interceptor is what calls into this module.
 */
const refreshClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.TIMEOUT,
  headers: {'Content-Type': 'application/json'},
});

let inFlight: Promise<string | null> | null = null;

const requestRefresh = async (token: string): Promise<string | null> => {
  try {
    const response = await refreshClient.post('/auth/refresh', {token});
    const data = response?.data?.data ?? {};
    if (!data.token) {
      return null;
    }
    await saveSession(data.token, data.user || undefined);
    return data.token as string;
  } catch (error: any) {
    // Only a rejected token means the session is really over. Network trouble
    // must leave the stored token alone so the devotee stays signed in.
    if (error?.response?.status === 401) {
      return null;
    }
    return token;
  }
};

/** Swap the stored token for a new one. Returns null when the server says no. */
export const refreshAuthToken = async (): Promise<string | null> => {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const token = await getToken();
    if (!token) {
      return null;
    }
    return requestRefresh(token);
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const expiresSoon = (token: string) => {
  try {
    const part = token.split('.')[1];
    if (!part) {
      return false;
    }
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const atobFn = (globalThis as any).atob as
      | ((value: string) => string)
      | undefined;
    if (!atobFn) {
      return false;
    }
    const payload = JSON.parse(atobFn(padded));
    if (!payload?.exp) {
      return false;
    }
    return payload.exp * 1000 - Date.now() < REFRESH_WINDOW_MS;
  } catch {
    return false;
  }
};

/**
 * Called on launch and whenever the app comes back to the foreground so an
 * active devotee's token keeps rolling forward and never lapses.
 */
export const ensureFreshToken = async () => {
  const token = await getToken();
  if (!token) {
    return;
  }
  if (isTokenExpired(token) || expiresSoon(token)) {
    await refreshAuthToken();
  }
};
