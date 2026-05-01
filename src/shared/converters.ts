import type { McpServer, Scope } from './schema.js';

/**
 * 各種 MCP クライアントへ貼り付けるためのフォーマット出力。
 *
 * - claude-cli      : `claude mcp add ...` 形式の CLI コマンド (公式: docs.anthropic.com)
 * - codex-cli       : `codex mcp add ...` 形式の CLI コマンド (公式: openai/codex docs)
 * - gemini-cli      : `gemini mcp add ...` 形式の CLI コマンド
 *                     (google-gemini/gemini-cli `packages/cli/src/commands/mcp/add.ts`)
 * - qwen-cli        : `qwen mcp add ...` 形式の CLI コマンド。qwen-code は gemini-cli の
 *                     fork で `gemini` → `qwen` 以外は同一 (qwenlm/qwen-code docs 参照)。
 * - claude-desktop  : Claude Desktop の `claude_desktop_config.json` 用 JSON。
 *                     リモート (http/sse) は Claude Desktop 本体が未対応のため
 *                     mcpm.sh と同じく `uvx mcp-proxy` で stdio に橋渡しする。
 * - mcp-json        : Cursor / Windsurf / Cline など `{"mcpServers": {...}}`
 *                     を共通スキーマでそのまま受け付けるクライアント向け汎用 JSON
 *                     (Gemini CLI / Qwen Code の settings.json にもそのまま貼れる)
 * - vscode-json     : VS Code 用 `{"servers": {...}}` JSON (キー名が異なる)
 * - codex-toml      : Codex CLI / Codex IDE 用 `~/.codex/config.toml` 抜粋
 *                     (キーは `mcp_servers` で snake_case)
 *
 * 参考: mcp-router/apps/electron/src/main/modules/mcp-apps-manager/app-paths.ts,
 *       mcpm.sh/src/mcpm/clients/managers/{claude_desktop,claude_code,codex_cli,vscode,gemini_cli,qwen_cli}.py,
 *       google-gemini/gemini-cli/docs/tools/mcp-server.md,
 *       https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/,
 *       https://code.claude.com/docs/en/mcp.md,
 *       https://modelcontextprotocol.io/llms-full.txt
 */

export type FormatId =
  | 'claude-cli'
  | 'codex-cli'
  | 'gemini-cli'
  | 'qwen-cli'
  | 'claude-desktop'
  | 'mcp-json'
  | 'vscode-json'
  | 'codex-toml';

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
    id: 'gemini-cli',
    title: 'Gemini CLI',
    subtitle: '`gemini mcp add` コマンド形式 (settings.json: `~/.gemini/settings.json`)',
    language: 'bash',
  },
  {
    id: 'qwen-cli',
    title: 'Qwen Code',
    subtitle: '`qwen mcp add` コマンド形式 (settings.json: `~/.qwen/settings.json`)',
    language: 'bash',
  },
  {
    id: 'claude-desktop',
    title: 'Claude Desktop',
    subtitle: '`%APPDATA%\\Claude\\claude_desktop_config.json` (リモートは uvx mcp-proxy でブリッジ)',
    language: 'json',
  },
  {
    id: 'mcp-json',
    title: 'mcpServers JSON',
    subtitle: 'Cursor / Windsurf / Cline / Gemini など共通形式',
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
  // Codex CLI が `codex mcp add` でサポートする transport は stdio と
  // streamable_http のみ (sse は未対応)。
  // 参考: openai/codex `codex-rs/cli/src/mcp_cmd.rs` の AddMcpTransportArgs。
  if (server.transport === 'stdio') {
    const parts: string[] = ['codex', 'mcp', 'add'];
    parts.push(...envFlags(server.env));
    parts.push(quoteShell(server.name));
    parts.push('--');
    parts.push(quoteShell(server.command));
    if (server.args.length > 0) parts.push(joinArgs(server.args));
    return parts.filter(Boolean).join(' ');
  }

  if (server.transport === 'http') {
    const parts: string[] = [
      'codex',
      'mcp',
      'add',
      quoteShell(server.name),
      '--url',
      quoteShell(server.url),
    ];
    const bearerEnvVar = pickBearerTokenEnvVar(server.headers);
    if (bearerEnvVar !== null) {
      parts.push('--bearer-token-env-var', quoteShell(bearerEnvVar));
    }
    const lines: string[] = [parts.join(' ')];
    const extraHeaders = stripBearerHeader(server.headers, bearerEnvVar !== null);
    if (Object.keys(extraHeaders).length > 0) {
      lines.push(
        '# 注: 任意の HTTP ヘッダ (上記以外) は `codex mcp add` の CLI フラグでは渡せません。',
        '#     右の "Codex config.toml" タブの `http_headers` をそのまま',
        '#     ~/.codex/config.toml の該当 [mcp_servers.<name>] ブロックに追記してください。',
      );
    }
    return lines.join('\n');
  }

  // sse は Codex CLI が直接サポートしないため、`mcp-remote` で stdio に
  // ブリッジする方式 (Anthropic 等が公式に紹介している常套手段) で stdio
  // サーバとして登録する。
  const bridge = mcpRemoteBridge(server.url, server.headers);
  const parts: string[] = ['codex', 'mcp', 'add', quoteShell(server.name), '--'];
  parts.push(quoteShell(bridge.command));
  if (bridge.args.length > 0) parts.push(joinArgs(bridge.args));
  return parts.join(' ');
}

/**
 * Gemini CLI / Qwen Code 共通の `<bin> mcp add` コマンドを生成する。
 *
 * qwen-code は google-gemini/gemini-cli の fork で、CLI のコマンド体系は完全に同一
 * (バイナリ名と settings ディレクトリだけ `gemini` → `qwen` に置き換わる) なので
 * バイナリ名を引数化したヘルパとして実装する。
 *
 * 構文: `<bin> mcp add [options] <name> <commandOrUrl> [args...]`
 *
 * 主な特徴 (Claude / Codex CLI と異なる点):
 * - 引数の `--` 区切りは使わない (`gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest`
 *   のように name の後に command + args を直接続ける。yargs の
 *   `'unknown-options-as-args': true` で実現されている)。
 * - scope は `--scope user|project` のみで、`local` は無いので `local`/`project`
 *   は `--scope project` に丸める。
 * - stdio がデフォルト transport なので `--transport stdio` は省略する
 *   (chrome-devtools-mcp の README 等の正式例に合わせる)。
 * - リモートは `--transport http|sse` を明示し、`-H "K: V"` 形式でヘッダを渡す。
 *
 * 参考: google-gemini/gemini-cli `packages/cli/src/commands/mcp/add.ts`,
 *       google-gemini/gemini-cli/docs/tools/mcp-server.md,
 *       ChromeDevTools/chrome-devtools-mcp README,
 *       https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/
 */
function toGeminiLikeCli(bin: 'gemini' | 'qwen', server: McpServer): string {
  const scopeArg = server.scope === 'user' ? 'user' : 'project';
  const parts: string[] = [bin, 'mcp', 'add', '--scope', scopeArg];

  if (server.transport === 'stdio') {
    // -e KEY=value を name より前に並べる (gemini-cli のテストにある正式な並び)。
    for (const [k, v] of Object.entries(server.env)) {
      parts.push('-e', quoteShell(`${k}=${v}`));
    }
    parts.push(quoteShell(server.name));
    parts.push(quoteShell(server.command));
    if (server.args.length > 0) parts.push(joinArgs(server.args));
    return parts.join(' ');
  }

  // remote (http / sse)
  parts.push('--transport', server.transport);
  for (const [k, v] of Object.entries(server.headers)) {
    parts.push('-H', quoteShell(`${k}: ${v}`));
  }
  parts.push(quoteShell(server.name));
  parts.push(quoteShell(server.url));
  return parts.join(' ');
}

export function toGeminiCli(server: McpServer): string {
  return toGeminiLikeCli('gemini', server);
}

export function toQwenCli(server: McpServer): string {
  return toGeminiLikeCli('qwen', server);
}

/**
 * SSE / HTTP リモート MCP サーバを stdio に橋渡しする `mcp-remote` ブリッジコマンド。
 * 参考: https://www.npmjs.com/package/mcp-remote
 *
 * `npx` 第一引数に `-y` を付与し、Codex / Claude などの非対話ランチャから
 * 実行された際に「`mcp-remote` をインストールしますか?」プロンプトでブロックして
 * MCP サーバが起動しないことを防ぐ (`npx` のインストール確認はデフォルトでは
 * 対話的、`--yes/-y` で抑制可能)。
 */
export function mcpRemoteBridge(
  url: string,
  headers: Record<string, string>,
): { command: string; args: string[] } {
  const args: string[] = ['-y', 'mcp-remote', url];
  for (const [k, v] of Object.entries(headers)) {
    args.push('--header', `${k}: ${v}`);
  }
  return { command: 'npx', args };
}

/**
 * `Authorization: Bearer ${ENV_VAR}` 形式のヘッダを検出し、Codex CLI の
 * `--bearer-token-env-var=<ENV_VAR>` に変換できるなら ENV_VAR 名を返す。
 *
 * Codex は実際のトークン値ではなく **環境変数名** を要求するため、
 * `Authorization: Bearer <literal_token>` のようにリテラル値が指定されている場合は
 * 変換せず (CLI ではなく config.toml + 環境変数の設定が必要)、null を返す。
 */
function pickBearerTokenEnvVar(headers: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== 'authorization') continue;
    const match = /^Bearer\s+\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(v);
    if (match !== null && match[1] !== undefined) return match[1];
  }
  return null;
}

function stripBearerHeader(
  headers: Record<string, string>,
  removeAuthorization: boolean,
): Record<string, string> {
  if (!removeAuthorization) return headers;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization') continue;
    result[k] = v;
  }
  return result;
}

/**
 * Codex の `[mcp_servers.<name>]` ストリーム HTTP 用に、ヘッダを 3 種類に振り分ける。
 *
 * - `bearer_token_env_var` : `Authorization: Bearer ${ENV_VAR}` パターン
 * - `env_http_headers`     : 任意ヘッダ + 値が `${ENV_VAR}` 全体の場合
 * - `http_headers`         : それ以外 (リテラル値)
 *
 * 参考: openai/codex `codex-rs/config/src/mcp_types.rs` の `McpServerTransportConfig::StreamableHttp`
 */
export interface CodexHeaderPartition {
  readonly bearerTokenEnvVar: string | null;
  readonly envHttpHeaders: Record<string, string>;
  readonly staticHttpHeaders: Record<string, string>;
}

const ENV_REF = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

export function partitionCodexHttpHeaders(headers: Record<string, string>): CodexHeaderPartition {
  const bearerEnvVar = pickBearerTokenEnvVar(headers);
  const envHttpHeaders: Record<string, string> = {};
  const staticHttpHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (bearerEnvVar !== null && k.toLowerCase() === 'authorization') {
      // bearer_token_env_var に統合済みなのでスキップ
      continue;
    }
    const envMatch = ENV_REF.exec(v);
    if (envMatch !== null && envMatch[1] !== undefined) {
      envHttpHeaders[k] = envMatch[1];
    } else {
      staticHttpHeaders[k] = v;
    }
  }
  return {
    bearerTokenEnvVar: bearerEnvVar,
    envHttpHeaders,
    staticHttpHeaders,
  };
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

/**
 * Claude Desktop (`claude_desktop_config.json`) は本体が stdio MCP サーバのみ対応で、
 * `type: "http"` / `type: "sse"` のリモートエントリは認識されない。
 *
 * mcpm.sh の `ClaudeDesktopManager.to_client_format` は `RemoteServerConfig` を
 * `to_mcp_proxy_stdio()` 経由で `uvx mcp-proxy <URL> [--headers KEY VALUE ...]` の
 * stdio コマンドに変換してから書き出している。同じ仕様を踏襲する。
 *
 * 参考: mcpm.sh/src/mcpm/clients/managers/claude_desktop.py,
 *       mcpm.sh/src/mcpm/core/schema.py `RemoteServerConfig.to_mcp_proxy_stdio`
 */
export function mcpProxyBridge(
  url: string,
  headers: Record<string, string>,
): { command: string; args: string[] } {
  const args: string[] = ['mcp-proxy', url];
  const headerEntries = Object.entries(headers);
  if (headerEntries.length > 0) {
    args.push('--headers');
    for (const [k, v] of headerEntries) {
      args.push(k);
      args.push(v);
    }
  }
  return { command: 'uvx', args };
}

export function toClaudeDesktop(server: McpServer): string {
  let value: JsonStdio;
  if (server.transport === 'stdio') {
    const stdio: JsonStdio = { command: server.command };
    if (server.args.length > 0) stdio.args = server.args;
    if (Object.keys(server.env).length > 0) stdio.env = server.env;
    value = stdio;
  } else {
    const bridge = mcpProxyBridge(server.url, server.headers);
    value = { command: bridge.command, args: bridge.args };
  }
  const obj = { mcpServers: { [server.name]: value } };
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
  // Codex の `~/.codex/config.toml` は `[mcp_servers.<name>]` の TOML テーブル。
  // McpServerTransportConfig は `Stdio` と `StreamableHttp` のみで `Sse` 列挙子は
  // ない (openai/codex `codex-rs/config/src/mcp_types.rs`)。SSE は CLI と同じく
  // `mcp-remote` で stdio に橋渡しする形で書き出す。
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
  } else if (server.transport === 'http') {
    lines.push(`url = ${tomlString(server.url)}`);
    const part = partitionCodexHttpHeaders(server.headers);
    if (part.bearerTokenEnvVar !== null) {
      lines.push(`bearer_token_env_var = ${tomlString(part.bearerTokenEnvVar)}`);
    }
    if (Object.keys(part.staticHttpHeaders).length > 0) {
      lines.push(`http_headers = ${tomlInlineTable(part.staticHttpHeaders)}`);
    }
    if (Object.keys(part.envHttpHeaders).length > 0) {
      lines.push(`env_http_headers = ${tomlInlineTable(part.envHttpHeaders)}`);
    }
  } else {
    // sse: Codex は SSE をネイティブサポートしないため stdio + mcp-remote 橋渡し。
    const bridge = mcpRemoteBridge(server.url, server.headers);
    lines.push(`command = ${tomlString(bridge.command)}`);
    lines.push(`args = ${tomlArrayOfStrings(bridge.args)}`);
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
    case 'gemini-cli':
      return toGeminiCli(server);
    case 'qwen-cli':
      return toQwenCli(server);
    case 'claude-desktop':
      return toClaudeDesktop(server);
    case 'mcp-json':
      return toMcpJson(server);
    case 'vscode-json':
      return toVscodeJson(server);
    case 'codex-toml':
      return toCodexToml(server);
  }
}
