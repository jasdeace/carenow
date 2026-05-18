import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ko from './ko.json';

const LANG_KEY = 'carelink_lang';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
  },
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// Restore the saved language (AsyncStorage is async, so this happens post-init)
AsyncStorage.getItem(LANG_KEY).then((lng) => {
  if (lng && lng !== i18n.language) i18n.changeLanguage(lng);
});

i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANG_KEY, lng);
});

export default i18n;
