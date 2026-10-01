export type SupportedLang = 'en' | 'te' | 'hi' | 'ta' | 'kn';

export interface MantraTranslation {
  name?: string;
  deity?: string;
  sanskrit?: string;
  transliteration?: string;
}

export interface ChallengeTranslation {
  title?: string;
  description?: string;
  mantra?: string;
}

export interface NotificationTranslation {
  title?: string;
  message?: string;
}

export const parseTranslationsMap = <T>(raw: any): Record<string, T> => {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'object') {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

/**
 * Resolves localized Mantra fields based on active app language.
 */
export const getLocalizedMantra = (
  mantra: any,
  lang: string = 'en',
): {
  name: string;
  deity: string;
  sanskrit: string;
  transliteration: string;
} => {
  if (!mantra) {
    return {name: '', deity: '', sanskrit: '', transliteration: ''};
  }
  const translations = parseTranslationsMap<MantraTranslation>(
    mantra.translations,
  );
  const userTrans = translations[lang] || {};
  const enTrans = translations['en'] || {};

  const name =
    userTrans.name ||
    enTrans.name ||
    mantra.mantraName ||
    mantra.name ||
    '';

  const deity =
    userTrans.deity ||
    enTrans.deity ||
    mantra.deityName ||
    mantra.subtitle ||
    '';

  const sanskrit =
    userTrans.sanskrit ||
    enTrans.sanskrit ||
    mantra.sanskritText ||
    name;

  const transliteration =
    userTrans.transliteration ||
    enTrans.transliteration ||
    mantra.transliteration ||
    name;

  return {name, deity, sanskrit, transliteration};
};

/**
 * Resolves localized Challenge fields based on active app language.
 */
export const getLocalizedChallenge = (
  challenge: any,
  lang: string = 'en',
): {
  title: string;
  description: string;
  mantra: string;
} => {
  if (!challenge) {
    return {title: '', description: '', mantra: ''};
  }
  const translations = parseTranslationsMap<ChallengeTranslation>(
    challenge.translations,
  );
  const userTrans = translations[lang] || {};
  const enTrans = translations['en'] || {};

  const title =
    userTrans.title ||
    enTrans.title ||
    challenge.title ||
    challenge.name ||
    '';

  const description =
    userTrans.description ||
    enTrans.description ||
    challenge.description ||
    challenge.detail ||
    '';

  const mantra =
    userTrans.mantra ||
    enTrans.mantra ||
    challenge.mantra ||
    '';

  return {title, description, mantra};
};

/**
 * Resolves localized Notification fields based on active app language.
 */
export const getLocalizedNotification = (
  notification: any,
  lang: string = 'en',
): {
  title: string;
  message: string;
} => {
  if (!notification) {
    return {title: '', message: ''};
  }
  const translations = parseTranslationsMap<NotificationTranslation>(
    notification.translations || notification.extraData?.translations,
  );
  const userTrans = translations[lang] || {};
  const enTrans = translations['en'] || {};

  const title =
    userTrans.title ||
    enTrans.title ||
    notification.title ||
    '';

  const message =
    userTrans.message ||
    enTrans.message ||
    notification.message ||
    notification.body ||
    '';

  return {title, message};
};
