import {Request} from 'express';

import environment from '../config/environment';

/**
 * Turn a stored `/uploads/...` path into an absolute HTTPS URL for admin apps
 * and email links. Avoids double-prefixing if the value is already absolute.
 */
export const absoluteMediaUrl = (
  req: Request | null | undefined,
  relativeOrAbsolute?: string | null,
): string | null => {
  const raw = String(relativeOrAbsolute || '').trim();
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const configured = String(
    (environment as any).PUBLIC_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      '',
  )
    .trim()
    .replace(/\/+$/, '');

  let origin = configured;
  if (!origin && req) {
    const xfProto = String(req.get('x-forwarded-proto') || '')
      .split(',')[0]
      .trim();
    const protocol = xfProto || req.protocol || 'https';
    const host = String(req.get('host') || '').trim();
    if (host) {
      origin = `${protocol}://${host}`;
    }
  }
  if (!origin) {
    origin = 'https://japasiddhi.onrender.com';
  }

  // Force https for public Render host (proxy may report http).
  if (/japasiddhi\.onrender\.com/i.test(origin)) {
    origin = origin.replace(/^http:\/\//i, 'https://');
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${path}`;
};

export default absoluteMediaUrl;
