import type { McpServer, Scope } from './schema.js';
import { translate, type Locale } from './i18n.js';

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
 * - antigravity-json: Google Antigravity Editor 用 `~/.gemini/antigravity/mcp_config.json`。
 *                     stdio は `command` + `args` + `env` (+ `cwd`)、リモートは
 *                     `serverUrl` (camelCase で `url` ではない) + `headers`。
 *                     ネイティブ対応するリモートは Streamable HTTP のみで、SSE は
 *                     未対応のため `npx -y mcp-remote` で stdio に橋渡しする。
 *                     (https://antigravity.google/docs/mcp)
 * - cline-json      : Cline (VS Code 拡張 `saoudrizwan.claude-dev`) 用
 *                     `cline_mcp_settings.json` 抜粋。トップレベルは Claude Desktop と
 *                     同じ `mcpServers` だが、サーバごとの `type` リテラルが他と異なり:
 *                     - stdio          → `"stdio"`
 *                     - SSE            → `"sse"`
 *                     - Streamable HTTP → **`"streamableHttp"`** (camelCase, `"http"` ではない)
 *                     cline/src/services/mcp/schemas.ts の `ServerConfigSchema` 参照。
 *
 * 参考: mcp-router/apps/electron/src/main/modules/mcp-apps-manager/app-paths.ts,
 *       mcpm.sh/src/mcpm/clients/managers/{claude_desktop,claude_code,codex_cli,vscode,gemini_cli,qwen_cli}.py,
 *       google-gemini/gemini-cli/docs/tools/mcp-server.md,
 *       https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/,
 *       https://code.claude.com/docs/en/mcp.md,
 *       https://modelcontextprotocol.io/llms-full.txt,
 *       https://antigravity.google/docs/mcp,
 *       https://github.com/cline/cline (src/services/mcp/schemas.ts,
 *         src/core/storage/disk.ts:GlobalFileNames.mcpSettings)
 */

export type FormatId =
  | 'claude-cli'
  | 'codex-cli'
  | 'gemini-cli'
  | 'qwen-cli'
  | 'claude-desktop'
  | 'mcp-json'
  | 'vscode-json'
  | 'codex-toml'
  | 'antigravity-json'
  | 'cline-json';

export interface FormatDescriptor {
  readonly id: FormatId;
  /** タブ表示用ラベル。renderer 側で i18n 翻訳済み文字列に解決する。 */
  readonly titleKey: string;
  /** タブ下に表示される補足文。renderer 側で i18n 翻訳済み文字列に解決する。 */
  readonly subtitleKey: string;
  readonly language: 'bash' | 'json' | 'toml';
}

export const FORMAT_DESCRIPTORS: readonly FormatDescriptor[] = [
  {
    id: 'claude-cli',
    titleKey: 'format.claude-cli.title',
    subtitleKey: 'format.claude-cli.subtitle',
    language: 'bash',
  },
  {
    id: 'codex-cli',
    titleKey: 'format.codex-cli.title',
    subtitleKey: 'format.codex-cli.subtitle',
    language: 'bash',
  },
  {
    id: 'gemini-cli',
    titleKey: 'format.gemini-cli.title',
    subtitleKey: 'format.gemini-cli.subtitle',
    language: 'bash',
  },
  {
    id: 'qwen-cli',
    titleKey: 'format.qwen-cli.title',
    subtitleKey: 'format.qwen-cli.subtitle',
    language: 'bash',
  },
  {
    id: 'claude-desktop',
    titleKey: 'format.claude-desktop.title',
    subtitleKey: 'format.claude-desktop.subtitle',
    language: 'json',
  },
  {
    id: 'mcp-json',
    titleKey: 'format.mcp-json.title',
    subtitleKey: 'format.mcp-json.subtitle',
    language: 'json',
  },
  {
    id: 'vscode-json',
    titleKey: 'format.vscode-json.title',
    subtitleKey: 'format.vscode-json.subtitle',
    language: 'json',
  },
  {
    id: 'codex-toml',
    titleKey: 'format.codex-toml.title',
    subtitleKey: 'format.codex-toml.subtitle',
    language: 'toml',
  },
  {
    id: 'antigravity-json',
    titleKey: 'format.antigravity-json.title',
    subtitleKey: 'format.antigravity-json.subtitle',
    language: 'json',
  },
  {
    id: 'cline-json',
    titleKey: 'format.cline-json.title',
    subtitleKey: 'format.cline-json.subtitle',
    language: 'json',
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

/**
 * `Record` の各エントリを `<flag> <quoted "KEY<sep>VALUE">` トークンの配列に変換する。
 * env (`KEY=VALUE`) とヘッダ (`KEY: VALUE`) はフラグ名と区切り文字が違うだけで同一処理なので、
 * この 1 箇所に集約し {@link envFlags} / {@link headerFlags} から呼び分ける。
 */
function entryFlags(record: Record<string, string>, flag: string, sep: '=' | ': '): string[] {
  return Object.entries(record).map(([k, v]) => `${flag} ${quoteShell(`${k}${sep}${v}`)}`);
}

function envFlags(env: Record<string, string>, flag: '--env' | '-e' = '--env'): string[] {
  return entryFlags(env, flag, '=');
}

function headerFlags(
  headers: Record<string, string>,
  flag: '--header' | '-H' = '--header',
): string[] {
  return entryFlags(headers, flag, ': ');
}

function scopeFlag(scope: Scope): string {
  return `--scope ${scope}`;
}

/**
 * stdio CLI コマンドの共通末尾 (NAME → `--` → COMMAND → args...) を組み立てる。
 * Claude CLI (`claude mcp add`) と Codex CLI (`codex mcp add`) はこの並びを共有するが、
 * `--env` を置ける位置は異なる ({@link toClaudeCli} の可変長オプションに関する注記を参照)
 * ため、env フラグは各呼び出し側で前置する。gemini/qwen は `-e` フラグと `--` 区切りの
 * 位置がさらに異なるため、この共通末尾には含めない。
 */
function stdioNameAndCommand(server: Extract<McpServer, { transport: 'stdio' }>): string[] {
  const parts: string[] = [quoteShell(server.name), '--', quoteShell(server.command)];
  if (server.args.length > 0) parts.push(joinArgs(server.args));
  return parts;
}

// -------------------- format implementations --------------------

/**
 * Claude Code CLI (`claude mcp add [options] <name> <commandOrUrl> [args...]`) 形式。
 *
 * **重要 (可変長オプション)**: Claude CLI の env / header は commander の可変長オプション
 * `-e, --env <env...>` / `-H, --header <header...>` として定義されており、直後のトークンを
 * 次のオプション (`-` 始まり) が現れるまで貪欲に値として吸い込む。そのため
 * `--env KEY=VALUE <name>` のようにサーバ名を直後に置くと name が値として取り込まれ、
 * `Invalid environment variable format: <name>` / `error: missing required argument 'name'`
 * で失敗する。公式ドキュメントも「`--env` とサーバ名の間には必ず別のオプションを挟むこと」
 * と明示しているため、env / header フラグは先頭に出し、`--transport` / `--scope` を
 * 挟んでから name を置く。
 *
 * 参考: https://code.claude.com/docs/en/mcp.md
 *       ("Important: Separate server arguments with `--`" の注記),
 *       `claude mcp add --help` (Claude Code v2.1.220)
 *
 * なお Codex CLI (clap) の `--env` は 1 オカレンスにつき値 1 個のみを取るため
 * この制約はなく、{@link toCodexCli} では従来どおり name の直前に置いてよい。
 */
export function toClaudeCli(server: McpServer): string {
  const parts: string[] = ['claude', 'mcp', 'add'];

  if (server.transport === 'stdio') {
    parts.push(...envFlags(server.env));
    parts.push('--transport', 'stdio');
    parts.push(scopeFlag(server.scope));
    parts.push(...stdioNameAndCommand(server));
    return parts.filter(Boolean).join(' ');
  }

  // remote (http / sse)
  parts.push(...headerFlags(server.headers));
  parts.push('--transport', server.transport);
  parts.push(scopeFlag(server.scope));
  parts.push(quoteShell(server.name));
  parts.push(quoteShell(server.url));
  return parts.filter(Boolean).join(' ');
}

export function toCodexCli(server: McpServer, locale: Locale = 'en'): string {
  // Codex CLI が `codex mcp add` でサポートする transport は stdio と
  // streamable_http のみ (sse は未対応)。
  // 参考: openai/codex `codex-rs/cli/src/mcp_cmd.rs` の AddMcpTransportArgs。
  if (server.transport === 'stdio') {
    // clap の `--env` は 1 オカレンス = 値 1 個 (`value_parser = parse_env_pair`) なので、
    // Claude CLI と違い name を直後に置いても吸い込まれない。
    const parts: string[] = [
      'codex',
      'mcp',
      'add',
      ...envFlags(server.env),
      ...stdioNameAndCommand(server),
    ];
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
        translate(locale, 'converters.codexCli.extraHeadersNote.line1'),
        translate(locale, 'converters.codexCli.extraHeadersNote.line2'),
        translate(locale, 'converters.codexCli.extraHeadersNote.line3'),
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
 * - scope は `--scope user|project` のみで、`local` は無いので `local`/`project`
 *   は `--scope project` に丸める。
 * - stdio がデフォルト transport なので `--transport stdio` は省略する
 *   (chrome-devtools-mcp の README 等の正式例に合わせる)。
 * - リモートは `--transport http|sse` を明示し、`-H "K: V"` 形式でヘッダを渡す。
 * - stdio で server 側 args が 1 つ以上ある場合は `--` 区切りを必ず挟む。
 *   gemini-cli は `'unknown-options-as-args': true` だが既知フラグ
 *   (`-e` `-H` `--scope` `--transport` `--timeout` `--trust` 等) は
 *   そのまま yargs に消費されてしまうため、`-e ENVVAR=val` のような
 *   サーバ引数が壊れる。`'populate--': true` で `--` 以降は確実に
 *   `args[...]` の variadic positional として保存される
 *   (gemini-cli `mcp/add.test.ts` `'should handle MCP server args with -- separator'` 参照)。
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
    parts.push(...envFlags(server.env, '-e'));
    parts.push(quoteShell(server.name));
    parts.push(quoteShell(server.command));
    if (server.args.length > 0) {
      parts.push('--');
      parts.push(joinArgs(server.args));
    }
    return parts.join(' ');
  }

  // remote (http / sse)
  parts.push('--transport', server.transport);
  parts.push(...headerFlags(server.headers, '-H'));
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
 * Codex の `bearer_token_env_var` / `--bearer-token-env-var` は実際のトークン値ではなく
 * **環境変数名** を要求する。リテラルのトークン値を取る旧 `bearer_token` フィールドは
 * 現行の openai/codex では streamable_http で受け付けられない
 * (`codex-rs/config/src/mcp_types.rs` `RawMcpServerConfig::try_from` が
 * `throw_if_set("streamable_http", "bearer_token", ...)` で拒否)。
 * そのため `Authorization: Bearer <literal_token>` のようにリテラル値が指定されている場合は
 * `--bearer-token-env-var` に変換せず null を返し、リテラル値は `toCodexToml` 側で
 * `http_headers` エントリとして書き出す (`toCodexCli` では follow-up ノートで config.toml を案内)。
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

/**
 * stdio 用 JSON エントリの共通形。mcpServers JSON / Claude Desktop / Antigravity /
 * Cline はいずれも `command` + 任意の `args` / `env` を同じ形で持つ。
 */
interface StdioEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
interface JsonHttpLike {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
}

/**
 * stdio サーバの `command` と、非空のときだけ `args` / `env` を付けたエントリを組み立てる。
 * 空配列 / 空オブジェクトのフィールドはどのクライアント設定でも省くのが慣習なので、
 * その「非空なら含める」ロジックを 1 箇所に集約する。
 */
function stdioEntry(server: Extract<McpServer, { transport: 'stdio' }>): StdioEntry {
  const entry: StdioEntry = { command: server.command };
  if (server.args.length > 0) entry.args = server.args;
  if (Object.keys(server.env).length > 0) entry.env = server.env;
  return entry;
}

/** `headers` が非空のときだけ付与する (リモートエントリ生成の共通処理)。 */
function withHeaders<T extends { headers?: Record<string, string> }>(
  entry: T,
  headers: Record<string, string>,
): T {
  if (Object.keys(headers).length > 0) entry.headers = headers;
  return entry;
}

/** `{ <topKey>: { <name>: value } }` を 2 スペース整形 JSON 文字列にする共通ラッパ。 */
function toJsonBlock(topKey: 'mcpServers' | 'servers', name: string, value: unknown): string {
  return JSON.stringify({ [topKey]: { [name]: value } }, null, 2);
}

function serverToJsonValue(server: McpServer): StdioEntry | JsonHttpLike {
  if (server.transport === 'stdio') return stdioEntry(server);
  return withHeaders<JsonHttpLike>({ type: server.transport, url: server.url }, server.headers);
}

export function toMcpJson(server: McpServer): string {
  return toJsonBlock('mcpServers', server.name, serverToJsonValue(server));
}

export function toVscodeJson(server: McpServer): string {
  return toJsonBlock('servers', server.name, serverToJsonValue(server));
}

/**
 * Claude Desktop (`claude_desktop_config.json`) は本体が stdio MCP サーバのみ対応で、
 * `type: "http"` / `type: "sse"` のリモートエントリは認識されない。mcpm.sh の
 * `ClaudeDesktopManager.to_client_format` に倣い、`uvx mcp-proxy` で stdio に
 * 橋渡しした stdio コマンドへ変換する。
 *
 * sparfenyuk/mcp-proxy の CLI 仕様 (README) に厳密に合わせるため、mcpm.sh の
 * 実装にあった以下のバグは修正している:
 *
 * - `--transport` 既定が SSE なので、ソースが `transport: "http"` (Streamable HTTP) の
 *   場合は `--transport streamablehttp` を明示しないと SSE で接続しに行って失敗する。
 * - `--headers KEY VALUE` は repeatable で、複数ヘッダは `--headers K1 V1
 *   --headers K2 V2 ...` のように `--headers` ごとに繰り返す必要がある。一度だけ
 *   `--headers` を出して KEY VALUE を並べると 2 ペア目以降が位置引数として
 *   解釈されてしまう。
 *
 * 参考: mcpm.sh/src/mcpm/clients/managers/claude_desktop.py,
 *       mcpm.sh/src/mcpm/core/schema.py `RemoteServerConfig.to_mcp_proxy_stdio`,
 *       https://github.com/sparfenyuk/mcp-proxy README (CLI flags)
 */
export function mcpProxyBridge(
  sourceTransport: 'http' | 'sse',
  url: string,
  headers: Record<string, string>,
): { command: string; args: string[] } {
  const args: string[] = ['mcp-proxy'];
  if (sourceTransport === 'http') {
    args.push('--transport', 'streamablehttp');
  }
  for (const [k, v] of Object.entries(headers)) {
    args.push('--headers', k, v);
  }
  args.push(url);
  return { command: 'uvx', args };
}

export function toClaudeDesktop(server: McpServer): string {
  let value: StdioEntry;
  if (server.transport === 'stdio') {
    value = stdioEntry(server);
  } else {
    const bridge = mcpProxyBridge(server.transport, server.url, server.headers);
    value = { command: bridge.command, args: bridge.args };
  }
  return toJsonBlock('mcpServers', server.name, value);
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

// -------------------- Antigravity --------------------

/**
 * Google Antigravity Editor 向けの `mcp_config.json` (`~/.gemini/antigravity/mcp_config.json`)
 * を生成する。
 *
 * 仕様 (https://antigravity.google/docs/mcp):
 * - トップレベルキーは Claude Desktop と同じ `mcpServers`。
 * - サーバごとに以下のいずれかでトランスポートが決まる:
 *   - `command` (string)  → stdio (path to executable)
 *   - `serverUrl` (string) → Streamable HTTP リモート
 *   - **重要**: キー名は `serverUrl` (camelCase の U) で、`url` ではない。
 *     `mcpServers JSON` / VS Code 形式とは異なる点なので注意。
 * - stdio オプショナル: `args` (string[]), `env` (object), `cwd` (string)
 * - リモートオプショナル: `headers` (object), `authProviderType`
 *   ("google_credentials" のみ), `oauth` ({ clientId, clientSecret })
 * - 共通オプショナル: `disabled` (boolean), `disabledTools` (string[])
 * - SSE はネイティブ未対応のため、SSE 登録は `npx -y mcp-remote` で stdio に
 *   橋渡しした形 (Codex CLI と同じパターン) で出力する。
 */
// stdio エントリは mcpServers JSON と同一形なので {@link StdioEntry} を共用する。
interface AntigravityHttp {
  serverUrl: string;
  headers?: Record<string, string>;
}

function serverToAntigravityValue(server: McpServer): StdioEntry | AntigravityHttp {
  if (server.transport === 'stdio') return stdioEntry(server);
  if (server.transport === 'http') {
    return withHeaders<AntigravityHttp>({ serverUrl: server.url }, server.headers);
  }
  // sse: Antigravity は Streamable HTTP のみネイティブ対応するため、SSE は
  // mcp-remote で stdio に橋渡しした形で書き出す。
  const bridge = mcpRemoteBridge(server.url, server.headers);
  return { command: bridge.command, args: bridge.args };
}

export function toAntigravityJson(server: McpServer): string {
  return toJsonBlock('mcpServers', server.name, serverToAntigravityValue(server));
}

// -------------------- Cline --------------------

/**
 * Cline (VS Code 拡張 `saoudrizwan.claude-dev`) の `cline_mcp_settings.json`
 * (VS Code globalStorage 配下) に貼り付ける JSON を生成する。
 *
 * 仕様 (cline/src/services/mcp/schemas.ts):
 * - トップレベルキーは `mcpServers` (Claude Desktop と同じ)。
 * - 各サーバには `type` リテラルが必要で、Cline 独自の値を取る:
 *   - stdio          → `"stdio"`
 *   - SSE            → `"sse"`
 *   - Streamable HTTP → **`"streamableHttp"`** (Cursor / VS Code の `"http"` ではない)
 * - フィールドは透過的:
 *   - stdio: `command`, `args` (任意), `env` (任意), `cwd` (任意)
 *   - sse / streamableHttp: `url`, `headers` (任意)
 * - 共通オプショナル: `autoApprove` (string[]), `disabled` (boolean),
 *   `timeout` (秒, default 60 / 最小 1)。デフォルト値はファイル側で省略可能なので
 *   常時の出力はしない (mcpServers JSON / Claude Desktop の出力と整合)。
 *
 * 重要: 旧バージョンの Cline は `transportType` という別フィールド名で transport を
 * 持っていた (`"stdio"` / `"sse"` / `"http"`)。schemas.ts の `.transform()` で
 * 互換変換されるが、新規生成は新フィールド名 `type` を使う。
 *
 * 重要 2: 現行スキーマの discriminated union は `sse` が `streamableHttp` より先に
 * 並んでおり、`type` を省略した URL 系設定は **SSE として解釈される** (後方互換)。
 * そのため Streamable HTTP は `type` を必ず明示する必要がある。stdio / sse でも
 * 明確化のため `type` を常に出力する。
 *
 * 参考:
 *   - cline/src/services/mcp/schemas.ts `ServerConfigSchema` (z.discriminatedUnion)
 *   - cline/src/services/mcp/McpHub.ts `addRemoteServer` (defaults: `type:"streamableHttp"`,
 *     `disabled:false`, `autoApprove:[]`)
 *   - cline/src/core/storage/disk.ts `GlobalFileNames.mcpSettings = "cline_mcp_settings.json"`
 *   - cline/docs/mcp/adding-and-configuring-servers.mdx
 */
// Cline の stdio は共通の {@link StdioEntry} に `type: "stdio"` リテラルを足しただけ。
interface ClineStdio extends StdioEntry {
  type: 'stdio';
}
interface ClineHttpLike {
  type: 'sse' | 'streamableHttp';
  url: string;
  headers?: Record<string, string>;
}

function serverToClineValue(server: McpServer): ClineStdio | ClineHttpLike {
  if (server.transport === 'stdio') {
    return { type: 'stdio', ...stdioEntry(server) };
  }
  // Cline の type リテラルは `streamableHttp` (camelCase) であって `http` ではない。
  // mcpServers JSON / VS Code は `"http"` を使うため、Cline 専用に書き換える。
  return withHeaders<ClineHttpLike>(
    { type: server.transport === 'http' ? 'streamableHttp' : 'sse', url: server.url },
    server.headers,
  );
}

export function toClineJson(server: McpServer): string {
  return toJsonBlock('mcpServers', server.name, serverToClineValue(server));
}

// -------------------- dispatcher --------------------

export function formatServer(format: FormatId, server: McpServer, locale: Locale = 'en'): string {
  switch (format) {
    case 'claude-cli':
      return toClaudeCli(server);
    case 'codex-cli':
      return toCodexCli(server, locale);
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
    case 'antigravity-json':
      return toAntigravityJson(server);
    case 'cline-json':
      return toClineJson(server);
  }
}
