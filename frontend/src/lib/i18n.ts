// src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import de from '../locales/de.json'
import zh from '../locales/zh.json'
import ar from '../locales/ar.json'
import hi from '../locales/hi.json'
import pt from '../locales/pt.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'zh', label: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', dir: 'ltr' },
] as const

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      ar: { translation: ar },
      hi: { translation: hi },
      pt: { translation: pt },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'rarediag_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  })

// Apply document direction on language change
i18n.on('languageChanged', (lng) => {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === lng)
  document.documentElement.dir = lang?.dir ?? 'ltr'
  document.documentElement.lang = lng
})

export default i18n
