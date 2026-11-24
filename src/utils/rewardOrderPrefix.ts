/**
 * Mirrors backend rewardOrderPrefix — used in admin to preview / edit order IDs.
 */

const STOP = new Set([
  'A',
  'AN',
  'THE',
  'OF',
  'AND',
  'OR',
  'FOR',
  'WITH',
  'FROM',
  'IN',
  'ON',
  'TO',
  'BY',
]);

const RESERVED = new Set([
  'BL',
  'RK',
  'HB',
  'BP',
  'PB',
  'SK',
  'GM',
  'MSC',
  'MS',
  'RM',
  'TM',
  'PM',
  'SW',
  'KM',
  'SM',
  'GA',
  'YA',
  'RW',
  'NH',
  'AD',
]);

const lettersOnly = (value: string) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

export const normalizeOrderPrefix = (raw: string): string => {
  const letters = lettersOnly(raw);
  return letters.slice(0, 3);
};

export const codeFromRewardName = (rewardName: string): string => {
  const words = String(rewardName || '')
    .replace(/[()[\],./\\-]+/g, ' ')
    .split(/\s+/)
    .map(lettersOnly)
    .filter(w => w.length > 0 && !STOP.has(w));

  let code = words.map(w => w[0]).join('').slice(0, 3);
  if (code.length < 2) {
    const compact = lettersOnly(rewardName);
    code = (code + compact).slice(0, 3);
  }
  if (code.length < 2) {
    code = (code + 'RW').slice(0, 2);
  }

  if (RESERVED.has(code) || RESERVED.has(code.slice(0, 2))) {
    const compact = lettersOnly(rewardName);
    const alt = `${code[0] || 'R'}${compact.slice(1, 3) || 'X'}`.slice(0, 3);
    if (alt.length >= 2 && !RESERVED.has(alt) && !RESERVED.has(alt.slice(0, 2))) {
      return alt;
    }
    return `R${code.slice(0, 2)}`.slice(0, 3);
  }
  return code;
};

export const rewardOrderPrefix = (rewardName: string): string => {
  const lower = String(rewardName || '')
    .trim()
    .toLowerCase();
  if (!lower) {
    return 'RW';
  }

  if (
    lower.includes('baanalingam') ||
    lower.includes('banalingam') ||
    lower.includes('bana lingam') ||
    (lower.includes('narmada') && lower.includes('ling'))
  ) {
    return 'BL';
  }

  const isSreeChakra =
    lower.includes('sree chakra') ||
    lower.includes('sri chakra') ||
    lower.includes('sri chakram') ||
    lower.includes('sri yantra') ||
    lower.includes('maha meru') ||
    (lower.includes('yantra') && !lower.includes('shiv'));
  if (
    isSreeChakra ||
    ((lower.includes('marakata') || lower.includes('marakatha')) &&
      (lower.includes('chakra') || lower.includes('jade')))
  ) {
    return 'MSC';
  }

  if (
    ((lower.includes('marakata') || lower.includes('marakatha')) &&
      (lower.includes('shiv') || lower.includes('ling'))) ||
    (lower.includes('aventurine') &&
      (lower.includes('shiv') || lower.includes('ling')))
  ) {
    return 'MS';
  }

  if (lower.includes('rudraksh')) return 'RM';
  if (lower.includes('tulasi') || lower.includes('tulsi')) return 'TM';
  if (
    lower.includes('pasupu') ||
    lower.includes('turmeric') ||
    lower.includes('haldi')
  ) {
    return 'PM';
  }
  if (
    lower.includes('sandal') ||
    lower.includes('chandan') ||
    lower.includes('chandana')
  ) {
    return 'SW';
  }
  if (lower.includes('karungali') || lower.includes('ebony')) return 'KM';
  if (
    lower.includes('spatik') ||
    lower.includes('sphatik') ||
    lower.includes('crystal')
  ) {
    return 'SM';
  }
  if (lower.includes('green agate') || lower.includes('green hakik')) {
    return 'GA';
  }
  if (lower.includes('yellow agate') || lower.includes('yellow hakik')) {
    return 'YA';
  }
  if (
    lower === 'spiritual reward' ||
    lower.includes('spiritual offering') ||
    lower.includes('spiritual product')
  ) {
    return 'RW';
  }

  return codeFromRewardName(rewardName);
};

export const resolveRewardOrderPrefix = (reward: {
  name?: string;
  orderPrefix?: string | null;
}): string => {
  const stored = normalizeOrderPrefix(String(reward.orderPrefix || ''));
  if (stored.length >= 2) {
    return stored;
  }
  return rewardOrderPrefix(String(reward.name || ''));
};

export default rewardOrderPrefix;
