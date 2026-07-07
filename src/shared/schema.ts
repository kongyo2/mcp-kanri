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

/**
 * 出力先クライアントすべてで安全に使えるサーバ名のみ許可する。
 *
 * 制約の根拠:
 * - **Codex CLI**: `validate_server_name` は `[a-zA-Z0-9_-]+` のみ許可
 *   (openai/codex `codex-rs/cli/src/mcp_cmd.rs` / `codex-mcp/src/rmcp_client.rs`)
 * - **TOML bare key**: `[A-Za-z0-9_-]+` (それ以外の文字を含む場合は引用が必要で
 *   `[mcp_servers.<name>]` テーブルヘッダ表記が壊れる)
 * - JSON / Claude CLI 側はもっと緩いが、共通の最大公約数として `[A-Za-z0-9_-]` のみ
 *   許可する。`.` は Codex CLI で拒否されるため除外。
 */
const NameSchema = z
  .string()
  .min(1, 'validation.nameRequired')
  .max(64, 'validation.nameMaxLength')
  .regex(/^[A-Za-z0-9_-]+$/, 'validation.namePattern');

const KeyValueRecord = z.record(z.string(), z.string());

/**
 * 全 transport 共通のフィールドを、元の定義と同じキー順を保つために先頭 (`transport`
 * より前) と末尾 (`transport` 固有フィールドより後) に分けて定義する。各スキーマは
 * `{ ...serverHeadFields, transport, <固有>, ...serverTailFields }` の順で組み立てる
 * ことで、パース結果および永続化 JSON のキー順を元と完全に一致させる。
 */
const serverHeadFields = {
  id: z.string(),
  name: NameSchema,
  description: z.string().optional().default(''),
};
const serverTailFields = {
  scope: z.enum(['local', 'project', 'user']).default('user'),
  createdAt: z.number(),
  updatedAt: z.number(),
};

const StdioServerSchema = z.object({
  ...serverHeadFields,
  transport: z.literal('stdio'),
  command: z.string().min(1, 'validation.commandRequired'),
  args: z.array(z.string()).default([]),
  env: KeyValueRecord.default({}),
  ...serverTailFields,
});

/**
 * リモート (http / sse) サーバのスキーマ。両者は `transport` リテラルだけが異なり、
 * それ以外のフィールド (url + headers + 共通メタ) は完全に同一なので、transport を
 * 引数化したファクトリで生成する。フィールドの並び順・バリデータは元の定義と一致させ、
 * discriminatedUnion / パース結果のキー順を変えない。
 */
function remoteServerSchema<T extends 'http' | 'sse'>(transport: T) {
  return z.object({
    ...serverHeadFields,
    transport: z.literal(transport),
    url: z.string().url('validation.urlInvalid'),
    headers: KeyValueRecord.default({}),
    ...serverTailFields,
  });
}

const HttpServerSchema = remoteServerSchema('http');

const SseServerSchema = remoteServerSchema('sse');

export const McpServerSchema = z.discriminatedUnion('transport', [
  StdioServerSchema,
  HttpServerSchema,
  SseServerSchema,
]);

export type McpServer = z.infer<typeof McpServerSchema>;
export type Transport = McpServer['transport'];
export type Scope = McpServer['scope'];

/**
 * 編集フォームから受け取る入力 (id / createdAt / updatedAt は呼び出し側で付与する)。
 * 3 つの transport スキーマから同じフィールドを除くため、omit マスクを 1 箇所に定義する。
 */
const INPUT_OMIT = { id: true, createdAt: true, updatedAt: true } as const;

export const McpServerInputSchema = z.discriminatedUnion('transport', [
  StdioServerSchema.omit(INPUT_OMIT),
  HttpServerSchema.omit(INPUT_OMIT),
  SseServerSchema.omit(INPUT_OMIT),
]);
export type McpServerInput = z.infer<typeof McpServerInputSchema>;

export const StoreFileSchema = z.object({
  version: z.literal(1),
  servers: z.array(McpServerSchema).default([]),
});
export type StoreFile = z.infer<typeof StoreFileSchema>;
