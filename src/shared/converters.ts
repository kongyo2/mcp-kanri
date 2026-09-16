import type { McpServer, Scope } from './schema.js';
import { translate, type Locale } from './i18n.js';

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
  readonly titleKey: string;
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

export function isFormatId(value: string): value is FormatId {
  return FORMAT_DESCRIPTORS.some((descriptor) => descriptor.id === value);
}

const SAFE_SHELL = /^[A-Za-z0-9_./:=+@%-]+$/;

export function quoteShell(token: string): string {
  if (token.length === 0) return "''";
  if (SAFE_SHELL.test(token)) return token;
  return `'${token.replace(/'/g, `'\\''`)}'`;
}

function joinArgs(args: readonly string[]): string {
  return args.map(quoteShell).join(' ');
}

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

function stdioNameAndCommand(server: Extract<McpServer, { transport: 'stdio' }>): string[] {
  const parts: string[] = [quoteShell(server.name), '--', quoteShell(server.command)];
  if (server.args.length > 0) parts.push(joinArgs(server.args));
  return parts;
}

export const CLAUDE_RESERVED_SERVER_NAMES: readonly string[] = [
  'workspace',
  'claude-in-chrome',
  'computer-use',
  'Claude Preview',
  'Claude Browser',
];

export function isClaudeReservedName(name: string): boolean {
  const lower = name.toLowerCase();
  return CLAUDE_RESERVED_SERVER_NAMES.some((reserved) => reserved.toLowerCase() === lower);
}

function hasEdgeWhitespace(value: string): boolean {
  return value !== value.trim();
}

const LINE_BREAK = /[\r\n]+/;

function fieldLabel(group: 'env' | 'headers', key: string): string {
  return `${group}.${key.trim().split(LINE_BREAK).join(' ')}`;
}

function recordWhitespaceFields(
  group: 'env' | 'headers',
  record: Record<string, string>,
): string[] {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (hasEdgeWhitespace(key) || hasEdgeWhitespace(value)) fields.push(fieldLabel(group, key));
  }
  return fields;
}

export function claudeWhitespaceFields(server: McpServer): string[] {
  if (server.transport === 'stdio') {
    const fields: string[] = [];
    if (hasEdgeWhitespace(server.command)) fields.push('command');
    server.args.forEach((arg, index) => {
      if (hasEdgeWhitespace(arg)) fields.push(`args[${index}]`);
    });
    return [...fields, ...recordWhitespaceFields('env', server.env)];
  }
  const fields: string[] = [];
  if (hasEdgeWhitespace(server.url)) fields.push('url');
  return [...fields, ...recordWhitespaceFields('headers', server.headers)];
}

function claudeAddCommand(server: McpServer): string {
  const parts: string[] = ['claude', 'mcp', 'add'];

  if (server.transport === 'stdio') {
    parts.push(...envFlags(server.env));
    parts.push('--transport', 'stdio');
    parts.push(scopeFlag(server.scope));
    parts.push(...stdioNameAndCommand(server));
    return parts.filter(Boolean).join(' ');
  }

  parts.push(...headerFlags(server.headers));
  parts.push('--transport', server.transport);
  parts.push(scopeFlag(server.scope));
  parts.push(quoteShell(server.name));
  parts.push(quoteShell(server.url));
  return parts.filter(Boolean).join(' ');
}

function claudeCliNotes(server: McpServer, locale: Locale): string[] {
  const notes: string[] = [];

  if (isClaudeReservedName(server.name)) {
    notes.push(
      translate(locale, 'converters.claudeCli.reservedName.line1', { name: server.name }),
      translate(locale, 'converters.claudeCli.reservedName.line2'),
    );
  }

  const whitespaceFields = claudeWhitespaceFields(server);
  if (whitespaceFields.length > 0) {
    notes.push(
      translate(locale, 'converters.claudeCli.whitespace.line1', {
        fields: whitespaceFields.join(', '),
      }),
      translate(locale, 'converters.claudeCli.whitespace.line2'),
    );
  }

  if (server.transport === 'sse') {
    notes.push(
      translate(locale, 'converters.claudeCli.sseDeprecated.line1'),
      translate(locale, 'converters.claudeCli.sseDeprecated.line2'),
      translate(locale, 'converters.claudeCli.sseDeprecated.line3'),
    );
  }

  return notes;
}

function asShellComment(note: string): string[] {
  return note.split(LINE_BREAK).map((line) => (line.startsWith('#') ? line : `# ${line}`));
}

export function toClaudeCli(server: McpServer, locale: Locale = 'en'): string {
  const notes = claudeCliNotes(server, locale).flatMap(asShellComment);
  return [claudeAddCommand(server), ...notes].join('\n');
}

export function toCodexCli(server: McpServer, locale: Locale = 'en'): string {
  if (server.transport === 'stdio') {
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

  const bridge = mcpRemoteBridge(server.url, server.headers);
  const parts: string[] = ['codex', 'mcp', 'add', quoteShell(server.name), '--'];
  parts.push(quoteShell(bridge.command));
  if (bridge.args.length > 0) parts.push(joinArgs(bridge.args));
  return parts.join(' ');
}

function toGeminiLikeCli(bin: 'gemini' | 'qwen', server: McpServer): string {
  const scopeArg = server.scope === 'user' ? 'user' : 'project';
  const parts: string[] = [bin, 'mcp', 'add', '--scope', scopeArg];

  if (server.transport === 'stdio') {
    parts.push(...envFlags(server.env, '-e'));
    parts.push(quoteShell(server.name));
    parts.push(quoteShell(server.command));
    if (server.args.length > 0) {
      parts.push('--');
      parts.push(joinArgs(server.args));
    }
    return parts.join(' ');
  }

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

function stdioEntry(server: Extract<McpServer, { transport: 'stdio' }>): StdioEntry {
  const entry: StdioEntry = { command: server.command };
  if (server.args.length > 0) entry.args = server.args;
  if (Object.keys(server.env).length > 0) entry.env = server.env;
  return entry;
}

function withHeaders<T extends { headers?: Record<string, string> }>(
  entry: T,
  headers: Record<string, string>,
): T {
  if (Object.keys(headers).length > 0) entry.headers = headers;
  return entry;
}

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

const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;

function tomlKey(key: string): string {
  if (TOML_BARE_KEY.test(key)) return key;
  return `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function tomlString(value: string): string {
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
    const bridge = mcpRemoteBridge(server.url, server.headers);
    lines.push(`command = ${tomlString(bridge.command)}`);
    lines.push(`args = ${tomlArrayOfStrings(bridge.args)}`);
  }
  return lines.join('\n') + '\n';
}

interface AntigravityHttp {
  serverUrl: string;
  headers?: Record<string, string>;
}

function serverToAntigravityValue(server: McpServer): StdioEntry | AntigravityHttp {
  if (server.transport === 'stdio') return stdioEntry(server);
  if (server.transport === 'http') {
    return withHeaders<AntigravityHttp>({ serverUrl: server.url }, server.headers);
  }
  const bridge = mcpRemoteBridge(server.url, server.headers);
  return { command: bridge.command, args: bridge.args };
}

export function toAntigravityJson(server: McpServer): string {
  return toJsonBlock('mcpServers', server.name, serverToAntigravityValue(server));
}

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
  return withHeaders<ClineHttpLike>(
    { type: server.transport === 'http' ? 'streamableHttp' : 'sse', url: server.url },
    server.headers,
  );
}

export function toClineJson(server: McpServer): string {
  return toJsonBlock('mcpServers', server.name, serverToClineValue(server));
}

export function formatServer(format: FormatId, server: McpServer, locale: Locale = 'en'): string {
  switch (format) {
    case 'claude-cli':
      return toClaudeCli(server, locale);
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
