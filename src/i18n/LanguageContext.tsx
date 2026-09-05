import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {getLanguage, saveLanguage} from '../services/language';
import {
  DEFAULT_LANG,
  getDictionary,
  resolveLanguage,
  translate,
  translateTitle,
  TranslationKey,
} from './index';

type Vars = Record<string, string | number>;

type LanguageContextValue = {
  language: string;
  ready: boolean;
  setAppLanguage: (code: string) => Promise<void>;
  t: (key: TranslationKey, vars?: Vars) => string;
  tt: (englishTitle: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANG,
  ready: false,
  setAppLanguage: async () => undefined,
  t: key => String(key),
  tt: title => title,
});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLanguage()
      .then(code => {
        setLanguage(resolveLanguage(code));
      })
      .finally(() => setReady(true));
  }, []);

  const setAppLanguage = useCallback(async (code: string) => {
    const next = resolveLanguage(code);
    await saveLanguage(next);
    setLanguage(next);
  }, []);

  const dict = useMemo(() => getDictionary(language), [language]);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => translate(dict, key, vars),
    [dict],
  );

  const tt = useCallback(
    (englishTitle: string) => translateTitle(dict, englishTitle),
    [dict],
  );

  const value = useMemo(
    () => ({language, ready, setAppLanguage, t, tt}),
    [language, ready, setAppLanguage, t, tt],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export const useT = () => useLanguage().t;
