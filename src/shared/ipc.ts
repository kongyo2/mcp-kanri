import type { McpServer, McpServerInput } from './schema.js';
import type { Locale } from './i18n.js';

/** preload からレンダラへ公開する API。型は preload と renderer で共有する。 */
export interface KanriApi {
  list: () => Promise<McpServer[]>;
  create: (input: McpServerInput) => Promise<McpServer>;
  update: (id: string, input: McpServerInput) => Promise<McpServer>;
  remove: (id: string) => Promise<void>;
  getStorePath: () => Promise<string>;
  /**
   * main プロセス側のエラーメッセージ翻訳ロケールを切り替える。
   * renderer の言語切替と同期させる用途。
   */
  setLocale: (locale: Locale) => Promise<void>;
}

export const IPC_CHANNELS = {
  list: 'kanri:list',
  create: 'kanri:create',
  update: 'kanri:update',
  remove: 'kanri:remove',
  getStorePath: 'kanri:get-store-path',
  setLocale: 'kanri:set-locale',
} as const;
