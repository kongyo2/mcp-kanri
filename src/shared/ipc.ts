import type { McpServer, McpServerInput } from './schema.js';

/** preload からレンダラへ公開する API。型は preload と renderer で共有する。 */
export interface KanriApi {
  list: () => Promise<McpServer[]>;
  create: (input: McpServerInput) => Promise<McpServer>;
  update: (id: string, input: McpServerInput) => Promise<McpServer>;
  remove: (id: string) => Promise<void>;
  getStorePath: () => Promise<string>;
}

export const IPC_CHANNELS = {
  list: 'kanri:list',
  create: 'kanri:create',
  update: 'kanri:update',
  remove: 'kanri:remove',
  getStorePath: 'kanri:get-store-path',
} as const;
