import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  isLocale,
  resolveLocale,
  translate,
  type Locale,
  type MessageKey,
} from '../../shared/i18n';
import { kanri } from './api';

const STORAGE_KEY = 'mcp-kanri.locale';

interface I18nContextValue {
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
  readonly t: (key: MessageKey | string, params?: Record<string, string | number>) => string;
}

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null && isLocale(stored)) return stored;
  } catch {
    // localStorage がブロックされている場合は無視して navigator から推測する
  }
  return resolveLocale(window.navigator.language);
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface ProviderProps {
  readonly children: React.ReactNode;
}

export function I18nProvider({ children }: ProviderProps): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  // 初期ロケールを main プロセスに通知し、storage.ts のエラーメッセージも
  // renderer と同じ言語で返るようにする。
  useEffect(() => {
    void kanri.setLocale(locale);
  }, [locale]);

  // <html lang="..."> を locale に追従させる (アクセシビリティ / フォント選択向け)。
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale): void => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存できなくても致命ではない
    }
  }, []);

  const t = useCallback(
    (key: MessageKey | string, params?: Record<string, string | number>): string =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error('useI18n must be used within <I18nProvider>');
  }
  return ctx;
}
