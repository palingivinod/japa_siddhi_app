import axios from 'axios';

import ENV from '../env';
import {decodeJwtPayload, getToken, saveSession} from './session';

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

/**
 * A refresh either produces a new token, is definitively refused by the server,
 * or could not be completed at all. The three cases must stay separate: only a
 * refusal means the session is over. Treating "could not reach the server" as a
 * refusal is what used to sign devotees out during a restart or a flaky network.
 */
export type RefreshResult =
  | {status: 'refreshed'; token: string}
  | {status: 'refused'}
  | {status: 'unavailable'};

const REFUSED: RefreshResult = {status: 'refused'};
const UNAVAILABLE: RefreshResult = {status: 'unavailable'};

let inFlight: Promise<RefreshResult> | null = null;

const requestRefresh = async (token: string): Promise<RefreshResult> => {
  try {
    const response = await refreshClient.post('/auth/refresh', {token});
    const data = response?.data?.data ?? {};
    if (!data.token) {
      return UNAVAILABLE;
    }
    await saveSession(data.token, data.user || undefined);
    return {status: 'refreshed', token: String(data.token)};
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);

    // 401 is the only answer that means "this token is dead". A timeout, an
    // offline device, a cold start, a 404 from an older deploy or any 5xx must
    // leave the stored token exactly where it is.
    if (status === 401) {
      return REFUSED;
    }
    return UNAVAILABLE;
  }
};

/** Swap the stored token for a new one, reporting which of the three happened. */
export const refreshAuthToken = async (): Promise<RefreshResult> => {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    const token = await getToken();
    if (!token) {
      // Nothing to refresh. Not a refusal, so no session is torn down here.
      return UNAVAILABLE;
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

/** True when the token still verifies but is inside its last week of life. */
const expiresSoon = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 - Date.now() < REFRESH_WINDOW_MS;
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
  const payload = decodeJwtPayload(token);
  const expired = Boolean(payload?.exp) && payload!.exp! * 1000 <= Date.now();
  if (expired || expiresSoon(token)) {
    await refreshAuthToken();
  }
};
