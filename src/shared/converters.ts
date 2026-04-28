import type { McpServer, Scope } from './schema.js';

/**
 * 各種 MCP クライアントへ貼り付けるためのフォーマット出力。
 *
 * - claude-cli  : `claude mcp add ...` 形式の CLI コマンド (公式: docs.anthropic.com)
 * - codex-cli   : `codex mcp add ...` 形式の CLI コマンド (公式: openai/codex docs)
 * - mcp-json    : Claude Desktop / Cursor / Windsurf / Cline / Gemini で共通の
 *                 `{"mcpServers": {...}}` JSON
 * - vscode-json : VS Code 用 `{"servers": {...}}` JSON (キー名が異なる)
 * - codex-toml  : Codex CLI / Codex IDE 用 `~/.codex/config.toml` 抜粋
 *                 (キーは `mcp_servers` で snake_case)
 *
 * 参考: mcp-router/apps/electron/src/main/modules/mcp-apps-manager/app-paths.ts,
 *       mcpm.sh/src/mcpm/clients/managers/{claude_desktop,codex_cli,vscode}.py
 */

export type FormatId = 'claude-cli' | 'codex-cli' | 'mcp-json' | 'vscode-json' | 'codex-toml';

export interface FormatDescriptor {
  readonly id: FormatId;
  readonly title: string;
  readonly subtitle: string;
  readonly language: 'bash' | 'json' | 'toml';
}

export const FORMAT_DESCRIPTORS: readonly FormatDescriptor[] = [
  {
    id: 'claude-cli',
    title: 'Claude Code (CLI)',
    subtitle: '`claude mcp add` コマンド形式',
    language: 'bash',
  },
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    subtitle: '`codex mcp add` コマンド形式',
    language: 'bash',
  },
  {
    id: 'mcp-json',
    title: 'mcpServers JSON',
    subtitle: 'Claude Desktop / Cursor / Windsurf / Cline / Gemini',
    language: 'json',
  },
  {
    id: 'vscode-json',
    title: 'VS Code mcp.json',
    subtitle: 'トップレベルキーは `servers`',
    language: 'json',
  },
  {
    id: 'codex-toml',
    title: 'Codex config.toml',
    subtitle: '`~/.codex/config.toml` 用 TOML 抜粋',
    language: 'toml',
  },
];

// -------------------- shell quoting --------------------

const SAFE_SHELL = /^[A-Za-z0-9_./:=+@%-]+$/;

/** POSIX シェル向けの安全な単一トークン引用。空文字や特殊文字を含む場合のみ '...'にする。 */
export function quoteShell(token: string): string {
  if (token.length === 0) return "''";
  if (SAFE_SHELL.test(token)) return token;
  // Single-quote escaping: close, escape ', re-open.
  return `'${token.replace(/'/g, `'\\''`)}'`;
}

function joinArgs(args: readonly string[]): string {
  return args.map(quoteShell).join(' ');
}

function envFlags(env: Record<string, string>, flag: '--env' | '-e' = '--env'): string[] {
  return Object.entries(env).map(([k, v]) => `${flag} ${quoteShell(`${k}=${v}`)}`);
}

function headerFlags(headers: Record<string, string>): string[] {
  return Object.entries(headers).map(([k, v]) => `--header ${quoteShell(`${k}: ${v}`)}`);
}

function scopeFlag(scope: Scope): string {
  return `--scope ${scope}`;
}

// -------------------- format implementations --------------------

export function toClaudeCli(server: McpServer): string {
  const parts: string[] = ['claude', 'mcp', 'add'];

  if (server.transport === 'stdio') {
    parts.push('--transport', 'stdio');
    parts.push(scopeFlag(server.scope));
    parts.push(...envFlags(server.env));
    parts.push(quoteShell(server.name));
    parts.push('--');
    parts.push(quoteShell(server.command));
    if (server.args.length > 0) parts.push(joinArgs(server.args));
    return parts.filter(Boolean).join(' ');
  }

  // remote (http / sse)
  parts.push('--transport', server.transport);
  parts.push(scopeFlag(server.scope));
  parts.push(...headerFlags(server.headers));
  parts.push(quoteShell(server.name));
  parts.push(quoteShell(server.url));
  return parts.filter(Boolean).join(' ');
}

export function toCodexCli(server: McpServer): string {
  // Codex CLI は現状 stdio が中心。リモート server は config.toml 直編集が必要。
  if (server.transport !== 'stdio') {
    return [
      `# Codex CLI の \`codex mcp add\` は現状 stdio のみ対応です。`,
      `# リモート (${server.transport}) サーバは右の "Codex config.toml" タブの内容を`,
      `# \`~/.codex/config.toml\` に追記してください。`,
    ].join('\n');
  }
  const parts: string[] = ['codex', 'mcp', 'add'];
  parts.push(...envFlags(server.env));
  parts.push(quoteShell(server.name));
  parts.push('--');
  parts.push(quoteShell(server.command));
  if (server.args.length > 0) parts.push(joinArgs(server.args));
  return parts.filter(Boolean).join(' ');
}

interface JsonStdio {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
interface JsonHttpLike {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
}

function serverToJsonValue(server: McpServer): JsonStdio | JsonHttpLike {
  if (server.transport === 'stdio') {
    const result: JsonStdio = { command: server.command };
    if (server.args.length > 0) result.args = server.args;
    if (Object.keys(server.env).length > 0) result.env = server.env;
    return result;
  }
  const result: JsonHttpLike = {
    type: server.transport,
    url: server.url,
  };
  if (Object.keys(server.headers).length > 0) result.headers = server.headers;
  return result;
}

export function toMcpJson(server: McpServer): string {
  const value = serverToJsonValue(server);
  const obj = { mcpServers: { [server.name]: value } };
  return JSON.stringify(obj, null, 2);
}

export function toVscodeJson(server: McpServer): string {
  const value = serverToJsonValue(server);
  const obj = { servers: { [server.name]: value } };
  return JSON.stringify(obj, null, 2);
}

// -------------------- TOML --------------------

const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;

function tomlKey(key: string): string {
  if (TOML_BARE_KEY.test(key)) return key;
  return `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function tomlString(value: string): string {
  // TOML basic string with escaping.
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

function tomlArrayOfStrings(items: readonly string[]): string {
  return `[${items.map(tomlString).join(', ')}]`;
}

function tomlInlineTable(record: Record<string, string>): string {
  const entries = Object.entries(record).map(([k, v]) => `${tomlKey(k)} = ${tomlString(v)}`);
  return `{ ${entries.join(', ')} }`;
}

export function toCodexToml(server: McpServer): string {
  // Codex は `[mcp_servers.<name>]` の TOML テーブル。
  const header = `[mcp_servers.${tomlKey(server.name)}]`;
  const lines: string[] = [header];

  if (server.transport === 'stdio') {
    lines.push(`command = ${tomlString(server.command)}`);
    if (server.args.length > 0) {
      lines.push(`args = ${tomlArrayOfStrings(server.args)}`);
    }
    if (Object.keys(server.env).length > 0) {
      lines.push(`env = ${tomlInlineTable(server.env)}`);
    }
  } else {
    lines.push(`url = ${tomlString(server.url)}`);
    if (Object.keys(server.headers).length > 0) {
      lines.push(`http_headers = ${tomlInlineTable(server.headers)}`);
    }
  }
  return lines.join('\n') + '\n';
}

// -------------------- dispatcher --------------------

export function formatServer(format: FormatId, server: McpServer): string {
  switch (format) {
    case 'claude-cli':
      return toClaudeCli(server);
    case 'codex-cli':
      return toCodexCli(server);
    case 'mcp-json':
      return toMcpJson(server);
    case 'vscode-json':
      return toVscodeJson(server);
    case 'codex-toml':
      return toCodexToml(server);
  }
}
