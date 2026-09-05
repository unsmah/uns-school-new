/**
 * UNS SCHOOL — Multilingual Context Provider & Hook
 * Persists UI language preference to localStorage.
 * Automatically synchronizes document `dir` attribute for Arabic RTL support.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, type AppLanguage, type TextDirection } from './translations';

interface I18nContextValue {
  language: AppLanguage;
  direction: TextDirection;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'unsschool_ui_lang';

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage;
      if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
        return saved;
      }
    } catch {
      // LocalStorage access fallback
    }
    return 'en';
  });

  const direction: TextDirection = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage errors
    }
  }, [language, direction]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
