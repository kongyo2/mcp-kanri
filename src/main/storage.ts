import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import type { ZodError } from 'zod';
import {
  McpServerSchema,
  StoreFileSchema,
  type McpServer,
  type McpServerInput,
  type StoreFile,
} from '../shared/schema.js';
import { getMainLocale } from './locale.js';
import { translate } from '../shared/i18n.js';

/**
 * `userData` ディレクトリ配下に JSON で MCP 登録一覧を永続化する。
 *
 * - mcp-router の `mcp-config-importer` が `mcpServers` を JSON で扱うのに倣い、
 *   このアプリの内部ストアも `mcpServers` ライクな配列で保持する。
 * - 起動毎にスキーマ検証 (Zod) を行い、ファイル未作成時のみ空ストアを返す。
 *   読み込み/JSON パース/スキーマ検証で失敗した場合はユーザデータ消失を避けるため
 *   呼び出し側に例外を伝播させる (空ストアで上書きしない)。
 */

const FILE_NAME = 'mcp-kanri-store.json';

let cachedPath: string | null = null;

function storePath(): string {
  if (cachedPath !== null) return cachedPath;
  const dir = app.getPath('userData');
  cachedPath = path.join(dir, FILE_NAME);
  return cachedPath;
}

function tr(key: string, params?: Record<string, string | number>): string {
  return translate(getMainLocale(), key, params);
}

/**
 * ストアを読み込む。
 *
 * - ファイル未作成 (ENOENT) の場合のみ空ストア (`{version: 1, servers: []}`) を返す。
 * - 読込・パース・スキーマ検証エラーは **呼び出し側に伝播** する。
 *   かつてここで `console.warn` し空ストアを返していたが、その挙動だと
 *   一時的な読込失敗 (権限エラー / 部分書込みファイル / 文字化け等) の直後に
 *   `createServer` などが空配列を書き戻し、登録済みサーバを丸ごと失う
 *   データロスバグになっていた (Codex Review #3152647727)。
 *
 * 破損ファイル復旧のため、スキーマ不一致時は元ファイルを `<name>.broken-<ts>` に
 * 退避してから例外を投げる (UI からはエラーモーダルで提示)。
 */
async function readStore(): Promise<StoreFile> {
  const p = storePath();
  let buf: string;
  try {
    buf = await fs.readFile(p, 'utf8');
  } catch (err) {
    if (isNotFound(err)) return { version: 1, servers: [] };
    throw new Error(tr('storage.error.readFailed', { path: p, message: describeError(err) }), {
      cause: err,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(buf);
  } catch (err) {
    await quarantineCorruptStore(p, 'json-parse-error');
    throw new Error(tr('storage.error.jsonParse', { path: p, message: describeError(err) }), {
      cause: err,
    });
  }

  const result = StoreFileSchema.safeParse(parsed);
  if (result.success) return result.data;

  await quarantineCorruptStore(p, 'schema-mismatch');
  throw new Error(
    tr('storage.error.schemaMismatch', { path: p, message: formatZodIssues(result.error) }),
  );
}

/**
 * Zod のエラーメッセージは schema.ts で `validation.namePattern` 等の i18n キー
 * として埋め込まれているため、ユーザに見せる前に必ずロケール解決する。
 * パス情報も合わせて読み取れるよう `path: translatedMessage` 形式で結合する。
 */
function formatZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const translated = tr(issue.message);
      const issuePath = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `${issuePath}: ${translated}`;
    })
    .join('; ');
}

async function quarantineCorruptStore(p: string, reason: string): Promise<void> {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dst = `${p}.broken-${ts}`;
    await fs.rename(p, dst);
    console.warn(`[storage] quarantined corrupt store (${reason}) -> ${dst}`);
  } catch (err) {
    console.error('[storage] failed to quarantine corrupt store', err);
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ENOENT'
  );
}

async function writeFile(store: StoreFile): Promise<void> {
  const p = storePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, p);
}

export async function listServers(): Promise<McpServer[]> {
  const store = await readStore();
  return [...store.servers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createServer(input: McpServerInput): Promise<McpServer> {
  const store = await readStore();
  if (store.servers.some((s) => s.name === input.name)) {
    throw new Error(tr('storage.error.duplicateName', { name: input.name }));
  }
  const now = Date.now();
  const candidate = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  const validated = McpServerSchema.parse(candidate);
  await writeFile({ version: 1, servers: [...store.servers, validated] });
  return validated;
}

export async function updateServer(id: string, input: McpServerInput): Promise<McpServer> {
  const store = await readStore();
  const existing = store.servers.find((s) => s.id === id);
  if (existing === undefined) {
    throw new Error(tr('storage.error.notFound', { id }));
  }
  if (store.servers.some((s) => s.id !== id && s.name === input.name)) {
    throw new Error(tr('storage.error.duplicateName', { name: input.name }));
  }
  const candidate = {
    ...input,
    id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  const validated = McpServerSchema.parse(candidate);
  const next = store.servers.map((s) => (s.id === id ? validated : s));
  await writeFile({ version: 1, servers: next });
  return validated;
}

export async function removeServer(id: string): Promise<void> {
  const store = await readStore();
  const next = store.servers.filter((s) => s.id !== id);
  await writeFile({ version: 1, servers: next });
}

export function getStorePath(): string {
  return storePath();
}
