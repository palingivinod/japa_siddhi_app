/** Shareable Samuhika mantra deep links for admin → devotees. */

// Render hosts the open-in-app landing page (same pattern as /book and /ms).
export const SAMUHIKA_MANTRA_WEB_BASE =
  'https://japasiddhi.onrender.com/samuhika/mantra';

export const buildSamuhikaMantraAppLink = (mantraId: number | string) => {
  const id = Number(mantraId) || 0;
  if (!id) {
    return '';
  }
  return `japasiddhi://samuhika/mantra/${id}`;
};

export const buildSamuhikaMantraWebLink = (mantraId: number | string) => {
  const id = Number(mantraId) || 0;
  if (!id) {
    return '';
  }
  return `${SAMUHIKA_MANTRA_WEB_BASE}/${id}`;
};

/** Parse japasiddhi://samuhika/mantra/123 or https://…/samuhika/mantra/123 */
export const parseSamuhikaMantraDeepLink = (
  url: string,
): {mantraId: number} | null => {
  const raw = String(url || '').trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(
    /(?:japasiddhi:\/\/samuhika\/mantra\/|https?:\/\/[^/]+\/samuhika\/mantra\/)(\d+)/i,
  );
  if (!match) {
    return null;
  }
  const mantraId = Number(match[1]);
  return Number.isFinite(mantraId) && mantraId > 0 ? {mantraId} : null;
};

export const isSamuhikaMantraDeepLink = (url: string) =>
  Boolean(parseSamuhikaMantraDeepLink(url));
