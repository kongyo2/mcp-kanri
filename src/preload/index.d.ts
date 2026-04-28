import type { KanriApi } from '../shared/ipc.js';

declare global {
  interface Window {
    kanri: KanriApi;
  }
}

export {};
