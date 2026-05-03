import { app } from 'electron';
import { DEFAULT_LOCALE, isLocale, resolveLocale, type Locale } from '../shared/i18n.js';

/**
 * main プロセス側の現在ロケール。renderer から `kanri.setLocale(...)` で更新される。
 * 起動直後の初期値は OS のロケール (`app.getLocale()`) から推測する。
 */

let current: Locale | null = null;

function detectInitialLocale(): Locale {
  try {
    return resolveLocale(app.getLocale());
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getMainLocale(): Locale {
  if (current !== null) return current;
  current = detectInitialLocale();
  return current;
}

export function setMainLocale(next: unknown): void {
  if (isLocale(next)) {
    current = next;
  }
}
