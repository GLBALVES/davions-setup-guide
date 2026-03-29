import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/email-pt.json';
import en from './locales/email-en.json';
import es from './locales/email-es.json';

const languageMap: Record<string, string> = {
  'Português': 'pt',
  'Inglês': 'en',
  'English': 'en',
  'Espanhol': 'es',
  'Español': 'es',
};

export const getI18nLanguage = (idiomaIA: string): string => {
  return languageMap[idiomaIA] || 'pt';
};

// Create a separate i18n instance for the email module
const emailI18n = i18n.createInstance();

emailI18n.use(initReactI18next).init({
  resources: { pt: { email: pt }, en: { email: en }, es: { email: es } },
  defaultNS: 'email',
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
});

export default emailI18n;
