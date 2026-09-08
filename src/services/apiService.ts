import axios from 'axios';
import ENV from '../env';
import {clearSession, getToken, setTokenListener} from './session';
import {resetToLogin} from '../navigation/navigationRef';

const apiService = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const applyAuthHeader = (token: string | null) => {
  if (token) {
    apiService.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiService.defaults.headers.common.Authorization;
  }
};

setTokenListener(applyAuthHeader);

apiService.interceptors.request.use(
  async config => {
    const token = await getToken();
    if (token) {
      applyAuthHeader(token);
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    return config;
  },
  error => Promise.reject(error),
);

apiService.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const isAuthError =
      status === 401 ||
      message === 'Authorization token missing.' ||
      message === 'Invalid token.';

    const url = String(error?.config?.url || '');
    const isPublicAuth =
      url.includes('/auth/register') ||
      url.includes('/auth/signin') ||
      url.includes('/auth/login') ||
      url.includes('/auth/phone') ||
      url.includes('/auth/dev-login') ||
      url.includes('/auth/otp');

    if (isAuthError && !isPublicAuth) {
      await clearSession();
      resetToLogin();
    }

    return Promise.reject(error);
  },
);

export const getApiError = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const isAuthError = (error: any) => {
  const status = error?.response?.status;
  const message =
    typeof error === 'string'
      ? error
      : error?.response?.data?.message || error?.message || '';
  const text = String(message).toLowerCase();
  return (
    status === 401 ||
    text.includes('authorization token') ||
    text.includes('invalid token') ||
    text.includes('please login again')
  );
};

export default apiService;
