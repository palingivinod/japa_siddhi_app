import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'app_language';

export const APP_LANGUAGES = [
  {code: 'en', name: 'English', nativeName: 'English'},
  {code: 'te', name: 'Telugu', nativeName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41'},
  {code: 'hi', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940'},
  {code: 'kn', name: 'Kannada', nativeName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1'},
  {code: 'ta', name: 'Tamil', nativeName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD'},
  {code: 'ml', name: 'Malayalam', nativeName: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02'},
  {code: 'mr', name: 'Marathi', nativeName: '\u092E\u0930\u093E\u0920\u0940'},
  {code: 'bn', name: 'Bengali', nativeName: '\u09AC\u09BE\u0982\u09B2\u09BE'},
  {code: 'or', name: 'Odia', nativeName: '\u0B13\u0B21\u0B3C\u0B3F\u0B06'},
];

export const saveLanguage = async (code: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
};

export const getLanguage = async () => AsyncStorage.getItem(LANGUAGE_KEY);
