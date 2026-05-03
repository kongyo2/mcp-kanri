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

/**
 * renderer 起動の最初期に main プロセスへロケールを通知し、その後の IPC レスポンス
 * (例: `kanri.list()` 由来のスキーマ不一致エラー) も同じ言語で返るようにする。
 *
 * I18nProvider 内の useEffect だけだと、子コンポーネント (App) の useEffect が
 * 先に走って `kanri.list()` を投げてしまい、起動直後の破損ストア検出時に
 * エラーメッセージが OS ロケールで返ってくるレースが起きる。`createRoot.render()`
 * を呼ぶ前にこの関数を呼んで、初回 IPC より前に locale 設定を main へ送る。
 */
export function bootstrapInitialLocale(): Locale {
  const locale = detectInitialLocale();
  // setLocale ハンドラ自体は同期的に変数を書き換えるだけなので、IPC キューに
  // 先に積まれていれば後続の list/get-store-path より先に処理される。
  void kanri.setLocale(locale);
  return locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface ProviderProps {
  readonly children: React.ReactNode;
  /** `bootstrapInitialLocale()` の結果を渡すと、provider と main が同じ初期値で揃う。 */
  readonly initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: ProviderProps): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectInitialLocale());

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

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error('useI18n must be used within <I18nProvider>');
  }
  return ctx;
}
