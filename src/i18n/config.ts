import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enErrors from '@/locales/en/errors.json';
import enAbout from '@/locales/en/about.json';
import enFeatures from '@/locales/en/features.json';
import enPricing from '@/locales/en/pricing.json';
import enContact from '@/locales/en/contact.json';
import enHelp from '@/locales/en/help.json';
import enToasts from '@/locales/en/toasts.json';
import enAdmin from '@/locales/en/admin.json';
import enAisetup from '@/locales/en/aisetup.json';
import enDocumentation from '@/locales/en/documentation.json';
import enLegal from '@/locales/en/legal.json';

import esCommon from '@/locales/es/common.json';
import esAuth from '@/locales/es/auth.json';
import esDashboard from '@/locales/es/dashboard.json';
import esErrors from '@/locales/es/errors.json';
import esAbout from '@/locales/es/about.json';
import esFeatures from '@/locales/es/features.json';
import esPricing from '@/locales/es/pricing.json';
import esContact from '@/locales/es/contact.json';
import esHelp from '@/locales/es/help.json';
import esToasts from '@/locales/es/toasts.json';
import esAdmin from '@/locales/es/admin.json';
import esAisetup from '@/locales/es/aisetup.json';
import esDocumentation from '@/locales/es/documentation.json';
import esLegal from '@/locales/es/legal.json';

import faCommon from '@/locales/fa/common.json';
import faAuth from '@/locales/fa/auth.json';
import faDashboard from '@/locales/fa/dashboard.json';
import faErrors from '@/locales/fa/errors.json';
import faAbout from '@/locales/fa/about.json';
import faFeatures from '@/locales/fa/features.json';
import faPricing from '@/locales/fa/pricing.json';
import faContact from '@/locales/fa/contact.json';
import faHelp from '@/locales/fa/help.json';
import faToasts from '@/locales/fa/toasts.json';
import faAdmin from '@/locales/fa/admin.json';
import faAisetup from '@/locales/fa/aisetup.json';
import faDocumentation from '@/locales/fa/documentation.json';
import faLegal from '@/locales/fa/legal.json';

export const supportedLanguages = ['en', 'es', 'fa'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      dashboard: enDashboard,
      errors: enErrors,
      about: enAbout,
      features: enFeatures,
      pricing: enPricing,
      contact: enContact,
      help: enHelp,
      toasts: enToasts,
      admin: enAdmin,
      aisetup: enAisetup,
      documentation: enDocumentation,
      legal: enLegal,
    },
    es: {
      common: esCommon,
      auth: esAuth,
      dashboard: esDashboard,
      errors: esErrors,
      about: esAbout,
      features: esFeatures,
      pricing: esPricing,
      contact: esContact,
      help: esHelp,
      toasts: esToasts,
      admin: esAdmin,
      aisetup: esAisetup,
      documentation: esDocumentation,
      legal: esLegal,
    },
    fa: {
      common: faCommon,
      auth: faAuth,
      dashboard: faDashboard,
      errors: faErrors,
      about: faAbout,
      features: faFeatures,
      pricing: faPricing,
      contact: faContact,
      help: faHelp,
      toasts: faToasts,
      admin: faAdmin,
      aisetup: faAisetup,
      documentation: faDocumentation,
      legal: faLegal,
    },
  },
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'dashboard', 'errors', 'about', 'features', 'pricing', 'contact', 'help', 'toasts', 'admin', 'aisetup', 'documentation', 'legal'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
