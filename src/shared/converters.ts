import type { McpServer, Scope } from './schema.js';
import { translate, type Locale } from './i18n.js';

export type FormatId =
  | 'claude-cli'
  | 'codex-cli'
  | 'gemini-cli'
  | 'qwen-cli'
  | 'grok-cli'
  | 'opencode-cli'
  | 'claude-desktop'
  | 'mcp-json'
  | 'vscode-json'
  | 'codex-toml'
  | 'grok-toml'
  | 'opencode-json'
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
    id: 'grok-cli',
    titleKey: 'format.grok-cli.title',
    subtitleKey: 'format.grok-cli.subtitle',
    language: 'bash',
  },
  {
    id: 'opencode-cli',
    titleKey: 'format.opencode-cli.title',
    subtitleKey: 'format.opencode-cli.subtitle',
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
    id: 'grok-toml',
    titleKey: 'format.grok-toml.title',
    subtitleKey: 'format.grok-toml.subtitle',
    language: 'toml',
  },
  {
    id: 'opencode-json',
    titleKey: 'format.opencode-json.title',
    subtitleKey: 'format.opencode-json.subtitle',
    language: 'json',
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

function asCommentLines(note: string): string[] {
  return note.split(LINE_BREAK).map((line) => (line.startsWith('#') ? line : `# ${line}`));
}

function asSlashCommentLines(note: string): string[] {
  return note
    .split(LINE_BREAK)
    .map((line) => (line.startsWith('#') ? line.replace(/^#/, '//') : `// ${line}`));
}

export function toClaudeCli(server: McpServer, locale: Locale = 'en'): string {
  const notes = claudeCliNotes(server, locale).flatMap(asCommentLines);
  return [claudeAddCommand(server), ...notes].join('\n');
}

export type CodexConfigTarget = 'user' | 'project';

export const CODEX_USER_CONFIG_PATH = '$CODEX_HOME/config.toml';
export const CODEX_USER_CONFIG_DEFAULT_PATH = '~/.codex/config.toml';
export const CODEX_PROJECT_CONFIG_PATH = '.codex/config.toml';

export function toCodexConfigTarget(scope: Scope): CodexConfigTarget {
  return scope === 'user' ? 'user' : 'project';
}

export function codexConfigPath(scope: Scope): string {
  return toCodexConfigTarget(scope) === 'user' ? CODEX_USER_CONFIG_PATH : CODEX_PROJECT_CONFIG_PATH;
}

function quoteForNote(value: string): string {
  return JSON.stringify(value);
}

function joinForNote(values: readonly string[]): string {
  return values.map(quoteForNote).join(', ');
}

export interface CodexEnvKeyIssues {
  readonly trimmed: readonly string[];
  readonly malformed: readonly string[];
}

export function codexEnvKeyIssues(env: Record<string, string>): CodexEnvKeyIssues {
  const trimmed: string[] = [];
  const malformed: string[] = [];
  for (const key of Object.keys(env)) {
    if (key.includes('=') || key.trim().length === 0) {
      malformed.push(key);
    } else if (key !== key.trim()) {
      trimmed.push(key);
    }
  }
  return { trimmed, malformed };
}

export interface CodexStdioEnvPartition {
  readonly env: Record<string, string>;
  readonly envVars: readonly string[];
  readonly unexpanded: readonly string[];
}

export function partitionCodexStdioEnv(env: Record<string, string>): CodexStdioEnvPartition {
  const literalEnv: Record<string, string> = {};
  const envVars: string[] = [];
  const unexpanded: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (ENV_REF.exec(value)?.[1] === key) {
      envVars.push(key);
      continue;
    }
    if (ENV_REF_ANYWHERE.test(value)) unexpanded.push(key);
    literalEnv[key] = value;
  }
  return { env: literalEnv, envVars, unexpanded };
}

export interface CodexPlaintextAuthPartition {
  readonly bearer: readonly string[];
  readonly other: readonly string[];
}

export function codexUnexpandedHeaders(headers: Record<string, string>): string[] {
  const { staticHttpHeaders } = partitionCodexHttpHeaders(headers);
  return Object.entries(staticHttpHeaders)
    .filter(([, value]) => ENV_REF_ANYWHERE.test(value))
    .map(([key]) => key);
}

function codexHeaderUnexpandedNotes(headers: Record<string, string>, locale: Locale): string[] {
  const fields = codexUnexpandedHeaders(headers);
  if (fields.length === 0) return [];
  return [
    translate(locale, 'converters.codex.headerUnexpanded.line1', { keys: joinForNote(fields) }),
    translate(locale, 'converters.codex.headerUnexpanded.line2'),
  ];
}

export function codexPlaintextAuthHeaders(
  headers: Record<string, string>,
): CodexPlaintextAuthPartition {
  const bearer: string[] = [];
  const other: string[] = [];
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== 'authorization') continue;
    if (BEARER_ENV_REF.test(value) || ENV_REF.test(value)) continue;
    if (BEARER_SCHEME.test(value)) bearer.push(key);
    else other.push(key);
  }
  return { bearer, other };
}

function codexScopeNotes(server: McpServer, locale: Locale): string[] {
  if (server.scope === 'user') return [];
  const notes: string[] = [
    translate(locale, 'converters.codex.noScope.line1', { scope: server.scope }),
    translate(locale, 'converters.codex.noScope.line2'),
    translate(locale, 'converters.codex.noScope.line3'),
    translate(locale, 'converters.codex.noScope.line4'),
  ];
  if (server.scope === 'local') {
    notes.push(
      translate(locale, 'converters.codex.localScope.line1'),
      translate(locale, 'converters.codex.localScope.line2'),
    );
  }
  return notes;
}

function codexSseNotes(server: Extract<McpServer, { transport: 'sse' }>, locale: Locale): string[] {
  const notes: string[] = [
    translate(locale, 'converters.codex.sseBridge.line1'),
    translate(locale, 'converters.codex.sseBridge.line2'),
    translate(locale, 'converters.codex.sseBridge.line3'),
  ];
  if (Object.keys(server.headers).length > 0) {
    notes.push(
      translate(locale, 'converters.codex.sseHeaders.line1'),
      translate(locale, 'converters.codex.sseHeaders.line2'),
    );
  }
  return notes;
}

function codexPlaintextAuthNotes(
  headers: Record<string, string>,
  scope: Scope,
  locale: Locale,
): string[] {
  const { bearer, other } = codexPlaintextAuthHeaders(headers);
  if (bearer.length === 0 && other.length === 0) return [];
  const notes: string[] = [
    translate(locale, 'converters.codex.plainAuth.line1', { path: codexConfigPath(scope) }),
  ];
  if (bearer.length > 0) notes.push(translate(locale, 'converters.codex.plainAuth.bearer'));
  if (other.length > 0) notes.push(translate(locale, 'converters.codex.plainAuth.other'));
  notes.push(translate(locale, 'converters.codex.plainAuth.noOauth'));
  return notes;
}

function codexCliStdioEnvNotes(
  server: Extract<McpServer, { transport: 'stdio' }>,
  locale: Locale,
): string[] {
  const notes: string[] = [];
  const { trimmed } = codexEnvKeyIssues(server.env);
  if (trimmed.length > 0) {
    notes.push(
      translate(locale, 'converters.codexCli.envKeyTrimmed.line1', { keys: joinForNote(trimmed) }),
      translate(locale, 'converters.codexCli.envKeyTrimmed.line2'),
    );
  }
  notes.push(...codexEnvKeyMalformedNotes(server.env, locale));
  const { envVars, unexpanded } = partitionCodexStdioEnv(server.env);
  if (envVars.length > 0) {
    notes.push(
      translate(locale, 'converters.codexCli.envRef.line1', { keys: joinForNote(envVars) }),
      translate(locale, 'converters.codexCli.envRef.line2'),
      translate(locale, 'converters.codexCli.envRef.line3'),
    );
  }
  notes.push(...codexEnvUnexpandedNotes(unexpanded, locale));
  return notes;
}

function codexEnvKeyMalformedNotes(env: Record<string, string>, locale: Locale): string[] {
  const { malformed } = codexEnvKeyIssues(env);
  if (malformed.length === 0) return [];
  return [
    translate(locale, 'converters.codex.envKeyMalformed.line1', { keys: joinForNote(malformed) }),
    translate(locale, 'converters.codex.envKeyMalformed.line2'),
  ];
}

function codexEnvUnexpandedNotes(unexpanded: readonly string[], locale: Locale): string[] {
  if (unexpanded.length === 0) return [];
  return [
    translate(locale, 'converters.codex.envUnexpanded.line1', { keys: joinForNote(unexpanded) }),
    translate(locale, 'converters.codex.envUnexpanded.line2'),
    translate(locale, 'converters.codex.envUnexpanded.line3'),
  ];
}

function codexCliCommand(server: McpServer): string {
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
    return parts.join(' ');
  }

  const bridge = mcpRemoteBridge(server.url, server.headers);
  const parts: string[] = ['codex', 'mcp', 'add', quoteShell(server.name), '--'];
  parts.push(quoteShell(bridge.command));
  if (bridge.args.length > 0) parts.push(joinArgs(bridge.args));
  return parts.join(' ');
}

function codexCliTransportNotes(server: McpServer, locale: Locale): string[] {
  if (server.transport === 'stdio') return codexCliStdioEnvNotes(server, locale);
  if (server.transport === 'sse') return codexSseNotes(server, locale);

  const notes: string[] = [];
  const bearerEnvVar = pickBearerTokenEnvVar(server.headers);
  const extraHeaders = stripBearerHeader(server.headers, bearerEnvVar !== null);
  if (Object.keys(extraHeaders).length > 0) {
    notes.push(
      translate(locale, 'converters.codexCli.extraHeadersNote.line1'),
      translate(locale, 'converters.codexCli.extraHeadersNote.line2'),
      translate(locale, 'converters.codexCli.extraHeadersNote.line3', {
        path: codexConfigPath(server.scope),
      }),
    );
  }
  notes.push(...codexHeaderUnexpandedNotes(server.headers, locale));
  notes.push(...codexPlaintextAuthNotes(server.headers, server.scope, locale));
  return notes;
}

export function toCodexCli(server: McpServer, locale: Locale = 'en'): string {
  const command = codexCliCommand(server);
  const transportNotes = codexCliTransportNotes(server, locale).flatMap(asCommentLines);

  if (server.scope === 'user') {
    return [command, ...transportNotes].join('\n');
  }

  const scopeNotes = codexScopeNotes(server, locale).flatMap(asCommentLines);
  return [...scopeNotes, ...asCommentLines(command), ...transportNotes].join('\n');
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

export type GrokScope = 'user' | 'project';

export function toGrokScope(scope: Scope): GrokScope {
  return scope === 'user' ? 'user' : 'project';
}

export type GrokNameIssue = 'start' | 'ambiguous';

const GROK_CATALOG_NAME_START = /^[A-Za-z_]/;

export function grokNameIssues(name: string): GrokNameIssue[] {
  const issues: GrokNameIssue[] = [];
  if (!GROK_CATALOG_NAME_START.test(name)) issues.push('start');
  if (name.endsWith('_') || name.includes('__')) issues.push('ambiguous');
  return issues;
}

export function grokTreatsAsSse(server: McpServer): boolean {
  if (server.transport === 'stdio') return false;
  return server.transport === 'sse' || server.url.endsWith('/sse');
}

function grokSharedNotes(server: McpServer, locale: Locale): string[] {
  const notes: string[] = [];

  for (const issue of grokNameIssues(server.name)) {
    if (issue === 'start') {
      notes.push(
        translate(locale, 'converters.grok.nameStart.line1', { name: server.name }),
        translate(locale, 'converters.grok.nameStart.line2'),
      );
    } else {
      notes.push(
        translate(locale, 'converters.grok.nameAmbiguous.line1', { name: server.name }),
        translate(locale, 'converters.grok.nameAmbiguous.line2'),
      );
    }
  }

  if (server.transport === 'http' && grokTreatsAsSse(server)) {
    notes.push(
      translate(locale, 'converters.grok.sseUrlSuffix.line1'),
      translate(locale, 'converters.grok.sseUrlSuffix.line2'),
    );
  }

  return notes;
}

function grokAddCommand(server: McpServer): string {
  const parts: string[] = ['grok', 'mcp', 'add', '--transport', server.transport];
  parts.push('--scope', toGrokScope(server.scope));

  if (server.transport === 'stdio') {
    parts.push(...envFlags(server.env, '-e'));
    parts.push(...stdioNameAndCommand(server));
    return parts.join(' ');
  }

  parts.push(quoteShell(server.name));
  parts.push(quoteShell(server.url));
  parts.push(...headerFlags(server.headers));
  return parts.join(' ');
}

export function toGrokCli(server: McpServer, locale: Locale = 'en'): string {
  const notes = grokSharedNotes(server, locale);
  if (server.scope === 'local') {
    notes.push(
      translate(locale, 'converters.grok.localScope.line1'),
      translate(locale, 'converters.grok.localScope.line2'),
    );
  }
  return [grokAddCommand(server), ...notes.flatMap(asCommentLines)].join('\n');
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

const ENV_REF = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const ENV_REF_ANYWHERE = /\$\{[^}]*\}/;
const BEARER_ENV_REF = /^Bearer\s+\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const BEARER_SCHEME = /^Bearer\s/i;

function pickBearerTokenEnvVar(headers: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== 'authorization') continue;
    const match = BEARER_ENV_REF.exec(v);
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

function codexTomlTargetNote(scope: Scope, locale: Locale): string {
  if (toCodexConfigTarget(scope) === 'user') {
    return translate(locale, 'converters.codexToml.target.user', {
      path: CODEX_USER_CONFIG_PATH,
      defaultPath: CODEX_USER_CONFIG_DEFAULT_PATH,
    });
  }
  return translate(locale, 'converters.codexToml.target.project', {
    path: CODEX_PROJECT_CONFIG_PATH,
    scope,
  });
}

function codexTomlTrailingNotes(server: McpServer, locale: Locale): string[] {
  const notes: string[] = [];

  if (toCodexConfigTarget(server.scope) === 'project') {
    notes.push(
      translate(locale, 'converters.codexToml.projectTrust.line1'),
      translate(locale, 'converters.codexToml.projectTrust.line2'),
      translate(locale, 'converters.codexToml.projectTrust.line3'),
      translate(locale, 'converters.codexToml.projectTrust.line4'),
    );
  }
  if (server.scope === 'local') {
    notes.push(
      translate(locale, 'converters.codex.localScope.line1'),
      translate(locale, 'converters.codex.localScope.line2'),
    );
  }

  if (server.transport === 'stdio') {
    notes.push(...codexEnvKeyMalformedNotes(server.env, locale));
    const { envVars, unexpanded } = partitionCodexStdioEnv(server.env);
    if (envVars.length > 0) {
      notes.push(
        translate(locale, 'converters.codexToml.envVars.line1', { keys: joinForNote(envVars) }),
        translate(locale, 'converters.codexToml.envVars.line2'),
      );
    }
    notes.push(...codexEnvUnexpandedNotes(unexpanded, locale));
    return notes;
  }

  if (server.transport === 'sse') {
    notes.push(...codexSseNotes(server, locale));
    return notes;
  }
  notes.push(...codexHeaderUnexpandedNotes(server.headers, locale));
  notes.push(...codexPlaintextAuthNotes(server.headers, server.scope, locale));
  return notes;
}

export function toCodexToml(server: McpServer, locale: Locale = 'en'): string {
  const lines: string[] = [
    ...asCommentLines(codexTomlTargetNote(server.scope, locale)),
    `[mcp_servers.${tomlKey(server.name)}]`,
  ];

  if (server.transport === 'stdio') {
    lines.push(`command = ${tomlString(server.command)}`);
    if (server.args.length > 0) {
      lines.push(`args = ${tomlArrayOfStrings(server.args)}`);
    }
    const part = partitionCodexStdioEnv(server.env);
    if (Object.keys(part.env).length > 0) {
      lines.push(`env = ${tomlInlineTable(part.env)}`);
    }
    if (part.envVars.length > 0) {
      lines.push(`env_vars = ${tomlArrayOfStrings(part.envVars)}`);
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

  const notes = codexTomlTrailingNotes(server, locale).flatMap(asCommentLines);
  return [...lines, ...notes].join('\n') + '\n';
}

export function toGrokToml(server: McpServer, locale: Locale = 'en'): string {
  const lines: string[] = [`[mcp_servers.${tomlKey(server.name)}]`];

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
    if (server.transport === 'sse') {
      lines.push(`type = ${tomlString('sse')}`);
    }
    if (Object.keys(server.headers).length > 0) {
      lines.push(`headers = ${tomlInlineTable(server.headers)}`);
    }
  }

  lines.push('enabled = true');
  const notes = grokSharedNotes(server, locale).flatMap(asCommentLines);
  return [...lines, ...notes].join('\n') + '\n';
}

export type OpencodeScope = 'global' | 'project';

export const OPENCODE_GLOBAL_CONFIG_PATH = '~/.config/opencode/opencode.json';
export const OPENCODE_GLOBAL_CONFIG_WINDOWS_PATH =
  '%USERPROFILE%\\.config\\opencode\\opencode.json';
export const OPENCODE_PROJECT_CONFIG_PATH = 'opencode.json';
export const OPENCODE_CONFIG_SCHEMA_URL = 'https://opencode.ai/config.json';

export function toOpencodeScope(scope: Scope): OpencodeScope {
  return scope === 'user' ? 'global' : 'project';
}

export function opencodeConfigPath(scope: Scope): string {
  return toOpencodeScope(scope) === 'global'
    ? OPENCODE_GLOBAL_CONFIG_PATH
    : OPENCODE_PROJECT_CONFIG_PATH;
}

const OPENCODE_ENV_REF = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export function toOpencodeVariables(value: string): string {
  return value.replace(OPENCODE_ENV_REF, (_match, name: string) => `{env:${name}}`);
}

function opencodeRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, toOpencodeVariables(value)]),
  );
}

function opencodeVariableRecord(server: McpServer): Record<string, string> {
  return server.transport === 'stdio' ? server.env : server.headers;
}

export function opencodeEnvRefKeys(record: Record<string, string>): string[] {
  return Object.entries(record)
    .filter(([, value]) => toOpencodeVariables(value) !== value)
    .map(([key]) => key);
}

export function opencodeUnexpandedKeys(record: Record<string, string>): string[] {
  return Object.entries(record)
    .filter(([, value]) => toOpencodeVariables(value) === value && ENV_REF_ANYWHERE.test(value))
    .map(([key]) => key);
}

function opencodeVariableNotes(server: McpServer, locale: Locale): string[] {
  const record = opencodeVariableRecord(server);
  const group = server.transport === 'stdio' ? 'environment' : 'headers';
  const notes: string[] = [];

  const converted = opencodeEnvRefKeys(record);
  if (converted.length > 0) {
    notes.push(
      translate(locale, 'converters.opencode.envRef.line1', {
        group,
        keys: joinForNote(converted),
      }),
      translate(locale, 'converters.opencode.envRef.line2'),
    );
  }

  const unexpanded = opencodeUnexpandedKeys(record);
  if (unexpanded.length > 0) {
    notes.push(
      translate(locale, 'converters.opencode.unexpanded.line1', { keys: joinForNote(unexpanded) }),
      translate(locale, 'converters.opencode.unexpanded.line2'),
    );
  }

  return notes;
}

function opencodeSharedNotes(server: McpServer, locale: Locale): string[] {
  const notes: string[] = [];

  if (server.transport === 'sse') {
    notes.push(
      translate(locale, 'converters.opencode.sse.line1'),
      translate(locale, 'converters.opencode.sse.line2'),
    );
  }

  notes.push(...opencodeVariableNotes(server, locale));
  return notes;
}

function opencodeAddCommand(server: McpServer): string {
  const parts: string[] = ['opencode', 'mcp', 'add', quoteShell(server.name)];

  if (server.transport === 'stdio') {
    parts.push(...entryFlags(opencodeRecord(server.env), '--env', '='));
    parts.push('--', quoteShell(server.command));
    if (server.args.length > 0) parts.push(joinArgs(server.args));
    return parts.join(' ');
  }

  parts.push('--url', quoteShell(server.url));
  parts.push(...entryFlags(opencodeRecord(server.headers), '--header', '='));
  return parts.join(' ');
}

export function toOpencodeCli(server: McpServer, locale: Locale = 'en'): string {
  const notes: string[] = [];

  if (toOpencodeScope(server.scope) === 'project') {
    notes.push(
      translate(locale, 'converters.opencodeCli.globalOnly.line1', { scope: server.scope }),
      translate(locale, 'converters.opencodeCli.globalOnly.line2', {
        path: OPENCODE_PROJECT_CONFIG_PATH,
      }),
      translate(locale, 'converters.opencodeCli.globalOnly.line3'),
    );
  }

  notes.push(...opencodeSharedNotes(server, locale));
  return [opencodeAddCommand(server), ...notes.flatMap(asCommentLines)].join('\n');
}

interface OpencodeLocal {
  type: 'local';
  command: string[];
  enabled: true;
  environment?: Record<string, string>;
}

interface OpencodeRemote {
  type: 'remote';
  url: string;
  enabled: true;
  headers?: Record<string, string>;
}

function serverToOpencodeValue(server: McpServer): OpencodeLocal | OpencodeRemote {
  if (server.transport === 'stdio') {
    const entry: OpencodeLocal = {
      type: 'local',
      command: [server.command, ...server.args],
      enabled: true,
    };
    const environment = opencodeRecord(server.env);
    if (Object.keys(environment).length > 0) entry.environment = environment;
    return entry;
  }
  return withHeaders<OpencodeRemote>(
    { type: 'remote', url: server.url, enabled: true },
    opencodeRecord(server.headers),
  );
}

export function toOpencodeJson(server: McpServer, locale: Locale = 'en'): string {
  const notes: string[] = [
    translate(locale, 'converters.opencodeJson.target', { path: opencodeConfigPath(server.scope) }),
  ];

  if (server.scope === 'local') {
    notes.push(
      translate(locale, 'converters.opencode.localScope.line1'),
      translate(locale, 'converters.opencode.localScope.line2'),
    );
  }

  notes.push(...opencodeSharedNotes(server, locale));

  const body = JSON.stringify(
    {
      $schema: OPENCODE_CONFIG_SCHEMA_URL,
      mcp: { [server.name]: serverToOpencodeValue(server) },
    },
    null,
    2,
  );

  return [...notes.flatMap(asSlashCommentLines), body].join('\n');
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
    case 'grok-cli':
      return toGrokCli(server, locale);
    case 'opencode-cli':
      return toOpencodeCli(server, locale);
    case 'claude-desktop':
      return toClaudeDesktop(server);
    case 'mcp-json':
      return toMcpJson(server);
    case 'vscode-json':
      return toVscodeJson(server);
    case 'codex-toml':
      return toCodexToml(server, locale);
    case 'grok-toml':
      return toGrokToml(server, locale);
    case 'opencode-json':
      return toOpencodeJson(server, locale);
    case 'antigravity-json':
      return toAntigravityJson(server);
    case 'cline-json':
      return toClineJson(server);
  }
}
