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

async function saveServers(servers: McpServer[]): Promise<void> {
  await writeFile({ version: 1, servers });
}

function assertNameAvailable(store: StoreFile, name: string, exceptId?: string): void {
  if (store.servers.some((s) => s.id !== exceptId && s.name === name)) {
    throw new Error(tr('storage.error.duplicateName', { name }));
  }
}

export async function listServers(): Promise<McpServer[]> {
  const store = await readStore();
  return [...store.servers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createServer(input: McpServerInput): Promise<McpServer> {
  const store = await readStore();
  assertNameAvailable(store, input.name);
  const now = Date.now();
  const candidate = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  const validated = McpServerSchema.parse(candidate);
  await saveServers([...store.servers, validated]);
  return validated;
}

export async function updateServer(id: string, input: McpServerInput): Promise<McpServer> {
  const store = await readStore();
  const existing = store.servers.find((s) => s.id === id);
  if (existing === undefined) {
    throw new Error(tr('storage.error.notFound', { id }));
  }
  assertNameAvailable(store, input.name, id);
  const candidate = {
    ...input,
    id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  const validated = McpServerSchema.parse(candidate);
  const next = store.servers.map((s) => (s.id === id ? validated : s));
  await saveServers(next);
  return validated;
}

export async function removeServer(id: string): Promise<void> {
  const store = await readStore();
  const next = store.servers.filter((s) => s.id !== id);
  await saveServers(next);
}

export function getStorePath(): string {
  return storePath();
}
