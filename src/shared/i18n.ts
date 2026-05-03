/**
 * 多言語対応 (i18n) のメッセージ辞書とロケール解決ロジック。
 *
 * - main / preload / renderer / shared 全てから利用できるよう shared に置く。
 * - メッセージは「キー」で参照し、translate(locale, key, params) で展開する。
 * - schema (Zod) のバリデーションメッセージはこのファイルのキー文字列を直接埋め込み、
 *   renderer 側で `translateMessage` を通して表示文言に変換する。
 */

export const SUPPORTED_LOCALES = ['ja', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(input: string | undefined | null): Locale {
  if (input === undefined || input === null) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

/**
 * メッセージキーは `ja` の宣言から型推論する。`ja` には明示的な型注釈を付けず、
 * リテラルなプロパティ名を保持させることで `keyof typeof ja` が文字列リテラル
 * ユニオンになるようにする。`en` を `Record<MessageKey, string>` で宣言することで、
 * 片方のロケールにキーを足し忘れた / 多く書いた場合は build 時にエラーになる。
 */

const ja = {
  // App / window
  'app.title': 'MCP管理',
  'app.sidebar.title': 'MCP管理',
  'app.sidebar.newServer': '＋ 新規登録',
  'app.sidebar.empty.line1': '登録済みの MCP はありません。',
  'app.sidebar.empty.line2': '右上の「＋ 新規登録」から追加してください。',
  'app.sidebar.storeLabel': 'ストア:',
  'app.language.label': '言語',
  'app.language.ja': '日本語',
  'app.language.en': 'English',

  // Toasts / confirms
  'app.toast.created': '"{name}" を登録しました',
  'app.toast.updated': '"{name}" を更新しました',
  'app.toast.removed': '"{name}" を削除しました',
  'app.confirm.remove': '"{name}" を削除します。よろしいですか?',

  // Main panel
  'main.create.heading': '新規 MCP を登録',
  'main.edit.heading': '"{name}" を編集',
  'main.empty.title': 'MCP を選択してください',
  'main.empty.body':
    '一つの登録から、Claude / Codex CLI コマンドや `mcpServers` JSON / VS Code `servers` JSON / Codex `config.toml` を切り替えてコピーできます。',

  // Detail
  'detail.scope': 'scope: {scope}',
  'detail.command': 'command:',
  'detail.args': 'args:',
  'detail.envCount': 'env: {count} 件',
  'detail.url': 'url:',
  'detail.headersCount': 'headers: {count} 件',
  'detail.button.edit': '編集',
  'detail.button.remove': '削除',

  // Editor form
  'form.transport.label': 'トランスポート',
  'form.transport.hint':
    'stdio はローカルプロセス起動 / http (Streamable) と sse はリモート MCP サーバ',
  'form.name.label': '名前 (server-name)',
  'form.name.hint':
    '英数字 / `_` / `-` のみ (Codex CLI / TOML 互換)。例: `chrome-devtools` `context7`',
  'form.scope.label': 'scope (Claude CLI / Codex CLI)',
  'form.scope.hint': 'CLI の `--scope` オプションに反映',
  'form.scope.local': 'local (現プロジェクトのみ)',
  'form.scope.project': 'project (.mcp.json として共有)',
  'form.scope.user': 'user (全プロジェクト共通)',
  'form.description.label': '説明 (任意)',
  'form.description.placeholder': 'メモ・用途・参考リンクなど',
  'form.command.label': 'command',
  'form.args.label': 'args',
  'form.args.hint': '例: `-y`, `chrome-devtools-mcp@latest`',
  'form.args.placeholder': '引数 {index}',
  'form.args.add': '＋ 引数を追加',
  'form.env.label': 'env',
  'form.env.hint': 'MCP サーバに渡す環境変数 (API キーなど)',
  'form.url.label': 'URL',
  'form.url.hint.http': '例: https://mcp.notion.com/mcp',
  'form.url.hint.sse': '例: https://mcp.asana.com/sse',
  'form.headers.label': 'headers',
  'form.headers.hint': '例: `Authorization` = `Bearer xxxxx`',
  'form.kv.add': '＋ 追加',
  'form.kv.remove': '削除',
  'form.submit.create': '登録する',
  'form.submit.update': '更新する',
  'form.cancel': 'キャンセル',

  // Validation messages (Zod) - keys embedded in schema.ts
  'validation.nameRequired': 'name は必須です',
  'validation.nameMaxLength': 'name は 64 文字以内で指定してください',
  'validation.namePattern':
    'name は英数字 / _ / - のみ使用できます (Codex CLI / TOML bare key 互換)',
  'validation.commandRequired': 'command は必須です',
  'validation.urlInvalid': 'URL の形式が正しくありません',

  // Copy block
  'copy.button': 'コピー',
  'copy.copied': 'コピーしました',

  // Format descriptors
  'format.claude-cli.title': 'Claude Code (CLI)',
  'format.claude-cli.subtitle': '`claude mcp add` コマンド形式',
  'format.codex-cli.title': 'Codex CLI',
  'format.codex-cli.subtitle': '`codex mcp add` コマンド形式',
  'format.gemini-cli.title': 'Gemini CLI',
  'format.gemini-cli.subtitle':
    '`gemini mcp add` コマンド形式 (settings.json: `~/.gemini/settings.json`)',
  'format.qwen-cli.title': 'Qwen Code',
  'format.qwen-cli.subtitle':
    '`qwen mcp add` コマンド形式 (settings.json: `~/.qwen/settings.json`)',
  'format.claude-desktop.title': 'Claude Desktop',
  'format.claude-desktop.subtitle':
    '`%APPDATA%\\Claude\\claude_desktop_config.json` (リモートは uvx mcp-proxy でブリッジ)',
  'format.mcp-json.title': 'mcpServers JSON',
  'format.mcp-json.subtitle': 'Cursor / Windsurf / Cline / Gemini など共通形式',
  'format.vscode-json.title': 'VS Code mcp.json',
  'format.vscode-json.subtitle': 'トップレベルキーは `servers`',
  'format.codex-toml.title': 'Codex config.toml',
  'format.codex-toml.subtitle': '`~/.codex/config.toml` 用 TOML 抜粋',

  // Codex CLI inline note (emitted by converters when extra HTTP headers present)
  'converters.codexCli.extraHeadersNote.line1':
    '# 注: 任意の HTTP ヘッダ (上記以外) は `codex mcp add` の CLI フラグでは渡せません。',
  'converters.codexCli.extraHeadersNote.line2':
    '#     右の "Codex config.toml" タブの `http_headers` をそのまま',
  'converters.codexCli.extraHeadersNote.line3':
    '#     ~/.codex/config.toml の該当 [mcp_servers.<name>] ブロックに追記してください。',

  // Storage / main process errors
  'storage.error.readFailed': 'MCP 設定ストア ({path}) の読込に失敗しました: {message}',
  'storage.error.jsonParse':
    'MCP 設定ストア ({path}) は JSON として解釈できませんでした。元ファイルは隣接の .broken-* に退避しました: {message}',
  'storage.error.schemaMismatch':
    'MCP 設定ストア ({path}) のスキーマが不正です。元ファイルは隣接の .broken-* に退避しました: {message}',
  'storage.error.duplicateName': '同名のサーバ "{name}" が既に登録されています',
  'storage.error.notFound': 'id={id} のサーバが見つかりません',

  // Renderer bootstrap
  'bootstrap.rootMissing': 'root 要素が見つかりません',
};

export type MessageKey = keyof typeof ja;

const en: Record<MessageKey, string> = {
  // App / window
  'app.title': 'MCP Kanri',
  'app.sidebar.title': 'MCP Kanri',
  'app.sidebar.newServer': '＋ New server',
  'app.sidebar.empty.line1': 'No MCP servers registered yet.',
  'app.sidebar.empty.line2': 'Click "＋ New server" at the top right to add one.',
  'app.sidebar.storeLabel': 'Store:',
  'app.language.label': 'Language',
  'app.language.ja': '日本語',
  'app.language.en': 'English',

  // Toasts / confirms
  'app.toast.created': 'Created "{name}"',
  'app.toast.updated': 'Updated "{name}"',
  'app.toast.removed': 'Removed "{name}"',
  'app.confirm.remove': 'Delete "{name}". Are you sure?',

  // Main panel
  'main.create.heading': 'Register a new MCP server',
  'main.edit.heading': 'Edit "{name}"',
  'main.empty.title': 'Select an MCP server',
  'main.empty.body':
    'From a single registration, switch and copy `claude` / `codex` / `gemini` / `qwen` CLI commands, `mcpServers` JSON, VS Code `servers` JSON, or Codex `config.toml`.',

  // Detail
  'detail.scope': 'scope: {scope}',
  'detail.command': 'command:',
  'detail.args': 'args:',
  'detail.envCount': 'env: {count} entries',
  'detail.url': 'url:',
  'detail.headersCount': 'headers: {count} entries',
  'detail.button.edit': 'Edit',
  'detail.button.remove': 'Delete',

  // Editor form
  'form.transport.label': 'Transport',
  'form.transport.hint':
    'stdio launches a local process; http (Streamable) and sse target remote MCP servers',
  'form.name.label': 'Name (server-name)',
  'form.name.hint':
    'Letters, digits, `_`, `-` only (Codex CLI / TOML compatible). e.g. `chrome-devtools`, `context7`',
  'form.scope.label': 'scope (Claude CLI / Codex CLI)',
  'form.scope.hint': 'Maps to the CLI `--scope` option',
  'form.scope.local': 'local (current project only)',
  'form.scope.project': 'project (shared as .mcp.json)',
  'form.scope.user': 'user (shared across all projects)',
  'form.description.label': 'Description (optional)',
  'form.description.placeholder': 'Notes, purpose, reference links, etc.',
  'form.command.label': 'command',
  'form.args.label': 'args',
  'form.args.hint': 'e.g. `-y`, `chrome-devtools-mcp@latest`',
  'form.args.placeholder': 'Arg {index}',
  'form.args.add': '＋ Add arg',
  'form.env.label': 'env',
  'form.env.hint': 'Environment variables passed to the MCP server (API keys, etc.)',
  'form.url.label': 'URL',
  'form.url.hint.http': 'e.g. https://mcp.notion.com/mcp',
  'form.url.hint.sse': 'e.g. https://mcp.asana.com/sse',
  'form.headers.label': 'headers',
  'form.headers.hint': 'e.g. `Authorization` = `Bearer xxxxx`',
  'form.kv.add': '＋ Add',
  'form.kv.remove': 'Remove',
  'form.submit.create': 'Create',
  'form.submit.update': 'Update',
  'form.cancel': 'Cancel',

  // Validation messages (Zod)
  'validation.nameRequired': 'Name is required',
  'validation.nameMaxLength': 'Name must be 64 characters or fewer',
  'validation.namePattern':
    'Name may only contain letters, digits, `_` and `-` (Codex CLI / TOML bare key compatible)',
  'validation.commandRequired': 'command is required',
  'validation.urlInvalid': 'URL is not in a valid format',

  // Copy block
  'copy.button': 'Copy',
  'copy.copied': 'Copied!',

  // Format descriptors
  'format.claude-cli.title': 'Claude Code (CLI)',
  'format.claude-cli.subtitle': '`claude mcp add` command form',
  'format.codex-cli.title': 'Codex CLI',
  'format.codex-cli.subtitle': '`codex mcp add` command form',
  'format.gemini-cli.title': 'Gemini CLI',
  'format.gemini-cli.subtitle':
    '`gemini mcp add` command form (settings.json: `~/.gemini/settings.json`)',
  'format.qwen-cli.title': 'Qwen Code',
  'format.qwen-cli.subtitle':
    '`qwen mcp add` command form (settings.json: `~/.qwen/settings.json`)',
  'format.claude-desktop.title': 'Claude Desktop',
  'format.claude-desktop.subtitle':
    '`%APPDATA%\\Claude\\claude_desktop_config.json` (remote servers bridged via uvx mcp-proxy)',
  'format.mcp-json.title': 'mcpServers JSON',
  'format.mcp-json.subtitle': 'Common form for Cursor / Windsurf / Cline / Gemini etc.',
  'format.vscode-json.title': 'VS Code mcp.json',
  'format.vscode-json.subtitle': 'Top-level key is `servers`',
  'format.codex-toml.title': 'Codex config.toml',
  'format.codex-toml.subtitle': 'TOML excerpt for `~/.codex/config.toml`',

  'converters.codexCli.extraHeadersNote.line1':
    '# Note: arbitrary HTTP headers (other than the above) cannot be passed via `codex mcp add` CLI flags.',
  'converters.codexCli.extraHeadersNote.line2':
    '#       Copy the `http_headers` block from the "Codex config.toml" tab on the right',
  'converters.codexCli.extraHeadersNote.line3':
    '#       into the matching [mcp_servers.<name>] block in ~/.codex/config.toml.',

  // Storage / main process errors
  'storage.error.readFailed': 'Failed to read MCP store ({path}): {message}',
  'storage.error.jsonParse':
    'MCP store ({path}) could not be parsed as JSON. The original file was moved aside as .broken-*: {message}',
  'storage.error.schemaMismatch':
    'MCP store ({path}) failed schema validation. The original file was moved aside as .broken-*: {message}',
  'storage.error.duplicateName': 'A server named "{name}" is already registered',
  'storage.error.notFound': 'Server with id={id} not found',

  // Renderer bootstrap
  'bootstrap.rootMissing': 'Root element was not found',
};

const dictionaries: Record<Locale, Record<MessageKey, string>> = { ja, en };

function format(template: string, params?: Record<string, string | number>): string {
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

/** ロケールに応じてメッセージを取得する。未知キーはキー文字列をそのまま返す。 */
export function translate(
  locale: Locale,
  key: MessageKey | string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const template = dict[key as string] ?? dictionaries[DEFAULT_LOCALE][key as string];
  if (template === undefined) return key as string;
  return format(template, params);
}
