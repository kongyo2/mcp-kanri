import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type KanriApi } from '../shared/ipc.js';
import type { McpServerInput } from '../shared/schema.js';
import type { Locale } from '../shared/i18n.js';

const api: KanriApi = {
  list: () => ipcRenderer.invoke(IPC_CHANNELS.list),
  create: (input: McpServerInput) => ipcRenderer.invoke(IPC_CHANNELS.create, input),
  update: (id: string, input: McpServerInput) => ipcRenderer.invoke(IPC_CHANNELS.update, id, input),
  remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.remove, id),
  getStorePath: () => ipcRenderer.invoke(IPC_CHANNELS.getStorePath),
  setLocale: (locale: Locale) => ipcRenderer.invoke(IPC_CHANNELS.setLocale, locale),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('kanri', api);
  } catch (error) {
    console.error('[preload] failed to expose api', error);
  }
} else {
  // contextIsolation: false fallback (本アプリでは使用しない想定)
  (window as unknown as { kanri: KanriApi }).kanri = api;
}
