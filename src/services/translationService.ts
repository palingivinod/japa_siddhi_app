import axios from 'axios';

export interface MultiLangTranslationResult {
  title: string;
  message: string;
}

/**
 * Translates text from English to a target language code (e.g. te, hi, ta, kn)
 * using Google's translation engine with automatic fallback.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'en',
): Promise<string> {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return '';
  }
  if (targetLang === sourceLang) {
    return trimmed;
  }

  // Primary: Google Translate Engine
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sourceLang,
    )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(
      trimmed,
    )}`;
    const res = await axios.get(url, {timeout: 8000});
    if (Array.isArray(res.data) && Array.isArray(res.data[0])) {
      const translated = res.data[0]
        .map((chunk: any) => (Array.isArray(chunk) ? chunk[0] : ''))
        .filter(Boolean)
        .join('');
      if (translated && translated.trim()) {
        return translated.trim();
      }
    }
  } catch (err) {
    // Fall back to secondary translation engine
  }

  // Secondary Fallback: MyMemory Translation API
  try {
    const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed,
    )}&langpair=${encodeURIComponent(sourceLang)}|${encodeURIComponent(
      targetLang,
    )}`;
    const res = await axios.get(fallbackUrl, {timeout: 8000});
    const translated = res.data?.responseData?.translatedText;
    if (translated && typeof translated === 'string' && translated.trim()) {
      return translated.trim();
    }
  } catch (err) {
    // Return original if all fallbacks fail
  }

  return trimmed;
}

/**
 * Translates notification title & message from English into all supported target languages.
 */
export async function autoTranslateNotification(
  englishTitle: string,
  englishMessage: string,
  targetLanguages: string[] = ['te', 'hi', 'ta', 'kn'],
): Promise<Record<string, MultiLangTranslationResult>> {
  const results: Record<string, MultiLangTranslationResult> = {
    en: {
      title: englishTitle.trim(),
      message: englishMessage.trim(),
    },
  };

  const tasks = targetLanguages.map(async lang => {
    if (lang === 'en') return;
    const [title, message] = await Promise.all([
      translateText(englishTitle, lang, 'en'),
      translateText(englishMessage, lang, 'en'),
    ]);
    results[lang] = {
      title: title || englishTitle,
      message: message || englishMessage,
    };
  });

  await Promise.all(tasks);
  return results;
}
