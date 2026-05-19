import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ko from './ko.json';

// Persist language preference
const savedLang = localStorage.getItem('carelink_lang') || 'ko';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    lng: savedLang,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('carelink_lang', lng);
});

export default i18n;
