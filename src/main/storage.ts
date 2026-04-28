import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import {
  McpServerSchema,
  StoreFileSchema,
  type McpServer,
  type McpServerInput,
  type StoreFile,
} from '../shared/schema.js';

/**
 * `userData` ディレクトリ配下に JSON で MCP 登録一覧を永続化する。
 *
 * - mcp-router の `mcp-config-importer` が `mcpServers` を JSON で扱うのに倣い、
 *   このアプリの内部ストアも `mcpServers` ライクな配列で保持する。
 * - 起動毎にスキーマ検証 (Zod) を行い、破損していた場合は空ストアにフォールバックする。
 */

const FILE_NAME = 'mcp-kanri-store.json';

let cachedPath: string | null = null;

function storePath(): string {
  if (cachedPath !== null) return cachedPath;
  const dir = app.getPath('userData');
  cachedPath = path.join(dir, FILE_NAME);
  return cachedPath;
}

async function readFileSafely(): Promise<StoreFile> {
  const p = storePath();
  try {
    const buf = await fs.readFile(p, 'utf8');
    const parsed: unknown = JSON.parse(buf);
    const result = StoreFileSchema.safeParse(parsed);
    if (result.success) return result.data;
    console.warn('[storage] schema mismatch, falling back to empty store', result.error.format());
    return { version: 1, servers: [] };
  } catch (err) {
    if (isNotFound(err)) return { version: 1, servers: [] };
    console.error('[storage] failed to read store, returning empty store', err);
    return { version: 1, servers: [] };
  }
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
  const store = await readFileSafely();
  return [...store.servers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createServer(input: McpServerInput): Promise<McpServer> {
  const store = await readFileSafely();
  if (store.servers.some((s) => s.name === input.name)) {
    throw new Error(`同名のサーバ "${input.name}" が既に登録されています`);
  }
  const now = Date.now();
  const candidate = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  const validated = McpServerSchema.parse(candidate);
  await writeFile({ version: 1, servers: [...store.servers, validated] });
  return validated;
}

export async function updateServer(id: string, input: McpServerInput): Promise<McpServer> {
  const store = await readFileSafely();
  const existing = store.servers.find((s) => s.id === id);
  if (existing === undefined) {
    throw new Error(`id=${id} のサーバが見つかりません`);
  }
  if (store.servers.some((s) => s.id !== id && s.name === input.name)) {
    throw new Error(`同名のサーバ "${input.name}" が既に登録されています`);
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
  const store = await readFileSafely();
  const next = store.servers.filter((s) => s.id !== id);
  await writeFile({ version: 1, servers: next });
}

export function getStorePath(): string {
  return storePath();
}
