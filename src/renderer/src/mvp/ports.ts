import { kanri } from '../api';
import { DEFAULT_LOCALE, isLocale, resolveLocale, type Locale } from '../../../shared/i18n';
import type { KanriApi } from '../../../shared/ipc';

interface ClipboardPort {
  writeText: (text: string) => Promise<void>;
}

export interface TimerPort {
  start: (ms: number, fn: () => void) => number;
  cancel: (handle: number) => void;
}

interface DocumentPort {
  setTitle: (title: string) => void;
  setLang: (lang: string) => void;
  captureFocus: () => void;
  restoreFocus: () => void;
}

export interface FocusAnchor {
  capture: () => void;
  restore: () => void;
}

const FOCUS_FALLBACK_ATTRIBUTE = 'data-focus-fallback';

function afterNextPaint(fn: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      fn();
    });
    return;
  }
  setTimeout(fn, 0);
}

export function createFocusAnchor(
  doc: Document,
  schedule: (fn: () => void) => void = afterNextPaint,
): FocusAnchor {
  let anchor: HTMLElement | null = null;
  return {
    capture: () => {
      const active = doc.activeElement;
      anchor = active instanceof HTMLElement ? active : null;
    },
    restore: () => {
      const target = anchor;
      anchor = null;
      if (target === null) return;
      schedule(() => {
        if (target.isConnected) {
          target.focus();
          return;
        }
        const fallback = doc.querySelector(`[${FOCUS_FALLBACK_ATTRIBUTE}]`);
        if (fallback instanceof HTMLElement) fallback.focus();
      });
    },
  };
}

interface PreferencesPort {
  readLocale: () => Locale | null;
  writeLocale: (locale: Locale) => void;
}

interface LoggerPort {
  warn: (message: string, detail?: unknown) => void;
  error: (message: string, detail?: unknown) => void;
}

export interface Ports {
  readonly api: KanriApi;
  readonly clipboard: ClipboardPort;
  readonly timers: TimerPort;
  readonly document: DocumentPort;
  readonly preferences: PreferencesPort;
  readonly logger: LoggerPort;
}

const LOCALE_STORAGE_KEY = 'mcp-kanri.locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored !== null && isLocale(stored)) return stored;
  } catch {}
  return resolveLocale(window.navigator.language);
}

export function createBrowserPorts(api: KanriApi = kanri): Ports {
  const focusAnchor = createFocusAnchor(document);
  return {
    api,
    clipboard: {
      writeText: (text) => navigator.clipboard.writeText(text),
    },
    timers: {
      start: (ms, fn) => window.setTimeout(fn, ms),
      cancel: (handle) => {
        window.clearTimeout(handle);
      },
    },
    document: {
      setTitle: (title) => {
        document.title = title;
      },
      setLang: (lang) => {
        document.documentElement.lang = lang;
      },
      captureFocus: focusAnchor.capture,
      restoreFocus: focusAnchor.restore,
    },
    preferences: {
      readLocale: detectInitialLocale,
      writeLocale: (locale) => {
        try {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch {}
      },
    },
    logger: {
      warn: (message, detail) => {
        console.warn(message, detail);
      },
      error: (message, detail) => {
        console.error(message, detail);
      },
    },
  };
}
