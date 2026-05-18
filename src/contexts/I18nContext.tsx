/**
 * Internationalization (i18n) Context
 * 
 * Provides dynamic multi-language support with:
 * - Browser language auto-detection
 * - User preference persistence
 * - Database-driven language packs
 * - RTL support for Arabic
 * - Fallback to English
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
};

interface I18nContextType {
  language: string;
  direction: 'ltr' | 'rtl';
  setLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
  languages: SupportedLanguage[];
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'routeace_language';

function detectBrowserLanguage(): string {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  const supported = ['en', 'fr', 'ar', 'pt', 'es', 'zh', 'hi', 'de'];
  return supported.includes(browserLang) ? browserLang : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || detectBrowserLanguage();
  });

  // Fetch supported languages
  const { data: languages = [] } = useQuery({
    queryKey: ['supported-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supported_languages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map((l: any) => ({
        code: l.code,
        name: l.name,
        nativeName: l.native_name,
        direction: l.direction as 'ltr' | 'rtl',
        isActive: l.is_active,
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  // Fetch language pack for current language
  const { data: translations = {}, isLoading } = useQuery({
    queryKey: ['language-pack', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_packs')
        .select('namespace, key, value')
        .eq('language_code', language);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        map[`${row.namespace}.${row.key}`] = row.value;
        map[row.key] = row.value; // also accessible without namespace prefix
      });
      return map;
    },
    staleTime: 1000 * 60 * 15, // 15 min cache
  });

  const direction = languages.find(l => l.code === language)?.direction || 'ltr';

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[`common.${key}`] || translations[key] || fallback || key;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t, languages, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Return a safe default when used outside provider
    return {
      language: 'en',
      direction: 'ltr' as const,
      setLanguage: () => {},
      t: (key: string, fallback?: string) => fallback || key,
      languages: [],
      isLoading: false,
    };
  }
  return context;
}
