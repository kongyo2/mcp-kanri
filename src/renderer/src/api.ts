import type { KanriApi } from '../../shared/ipc';

declare global {
  interface Window {
    kanri: KanriApi;
  }
}

export const kanri: KanriApi = window.kanri;
