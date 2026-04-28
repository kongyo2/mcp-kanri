import { z } from 'zod';

/**
 * MCP サーバ登録スキーマ。
 *
 * mcp-router / mcpm.sh の `STDIOServerConfig` / `RemoteServerConfig` を参考に、
 * トランスポート種別で discriminated union として表現する。
 *
 * - stdio  : ローカルプロセス起動 (`command` + `args` + `env`)
 * - http   : Streamable HTTP リモートサーバ (`url` + `headers`)
 * - sse    : Server-Sent Events リモートサーバ (`url` + `headers`)
 */

const NameSchema = z
  .string()
  .min(1, 'name は必須です')
  .max(64, 'name は 64 文字以内で指定してください')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    'name は英数字 / _ / - / . のみ使用できます (先頭は英数字)',
  );

const KeyValueRecord = z.record(z.string(), z.string());

const StdioServerSchema = z.object({
  id: z.string(),
  name: NameSchema,
  description: z.string().optional().default(''),
  transport: z.literal('stdio'),
  command: z.string().min(1, 'command は必須です'),
  args: z.array(z.string()).default([]),
  env: KeyValueRecord.default({}),
  scope: z.enum(['local', 'project', 'user']).default('user'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const HttpServerSchema = z.object({
  id: z.string(),
  name: NameSchema,
  description: z.string().optional().default(''),
  transport: z.literal('http'),
  url: z.string().url('URL の形式が正しくありません'),
  headers: KeyValueRecord.default({}),
  scope: z.enum(['local', 'project', 'user']).default('user'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const SseServerSchema = z.object({
  id: z.string(),
  name: NameSchema,
  description: z.string().optional().default(''),
  transport: z.literal('sse'),
  url: z.string().url('URL の形式が正しくありません'),
  headers: KeyValueRecord.default({}),
  scope: z.enum(['local', 'project', 'user']).default('user'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const McpServerSchema = z.discriminatedUnion('transport', [
  StdioServerSchema,
  HttpServerSchema,
  SseServerSchema,
]);

export type StdioServer = z.infer<typeof StdioServerSchema>;
export type HttpServer = z.infer<typeof HttpServerSchema>;
export type SseServer = z.infer<typeof SseServerSchema>;
export type McpServer = z.infer<typeof McpServerSchema>;
export type Transport = McpServer['transport'];
export type Scope = McpServer['scope'];

/**
 * 編集フォームから受け取る入力 (id / createdAt / updatedAt は呼び出し側で付与する)。
 */
export const McpServerInputSchema = z.discriminatedUnion('transport', [
  StdioServerSchema.omit({ id: true, createdAt: true, updatedAt: true }),
  HttpServerSchema.omit({ id: true, createdAt: true, updatedAt: true }),
  SseServerSchema.omit({ id: true, createdAt: true, updatedAt: true }),
]);
export type McpServerInput = z.infer<typeof McpServerInputSchema>;

export const StoreFileSchema = z.object({
  version: z.literal(1),
  servers: z.array(McpServerSchema).default([]),
});
export type StoreFile = z.infer<typeof StoreFileSchema>;
