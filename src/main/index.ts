import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { IPC_CHANNELS } from '../shared/ipc.js';
import { McpServerInputSchema } from '../shared/schema.js';
import { translate } from '../shared/i18n.js';
import { getMainLocale, setMainLocale } from './locale.js';
import {
  createServer as createServerImpl,
  getStorePath,
  listServers,
  removeServer,
  updateServer as updateServerImpl,
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 880,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: translate(getMainLocale(), 'app.title'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('app.kongyo2.mcp-kanri');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.list, async () => {
    return listServers();
  });
  ipcMain.handle(IPC_CHANNELS.create, async (_event, payload: unknown) => {
    const input = McpServerInputSchema.parse(payload);
    return createServerImpl(input);
  });
  ipcMain.handle(IPC_CHANNELS.update, async (_event, id: string, payload: unknown) => {
    const input = McpServerInputSchema.parse(payload);
    return updateServerImpl(id, input);
  });
  ipcMain.handle(IPC_CHANNELS.remove, async (_event, id: string) => {
    await removeServer(id);
  });
  ipcMain.handle(IPC_CHANNELS.getStorePath, () => getStorePath());
  ipcMain.handle(IPC_CHANNELS.setLocale, (_event, locale: unknown) => {
    setMainLocale(locale);
  });
}
