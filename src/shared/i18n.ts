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

const ja = {
  'app.title': 'MCP管理',
  'app.sidebar.title': 'MCP管理',
  'app.sidebar.newServer': '＋ 新規登録',
  'app.sidebar.empty.line1': '登録済みの MCP はありません。',
  'app.sidebar.empty.line2': '右上の「＋ 新規登録」から追加してください。',
  'app.sidebar.storeLabel': 'ストア:',
  'app.language.label': '言語',
  'app.language.ja': '日本語',
  'app.language.en': 'English',

  'app.toast.created': '"{name}" を登録しました',
  'app.toast.updated': '"{name}" を更新しました',
  'app.toast.removed': '"{name}" を削除しました',
  'app.confirm.remove': '"{name}" を削除します。よろしいですか?',
  'dialog.remove.title': '削除の確認',

  'main.create.heading': '新規 MCP を登録',
  'main.edit.heading': '"{name}" を編集',
  'main.empty.title': 'MCP を選択してください',
  'main.empty.body':
    '一つの登録から、Claude / Codex / Grok / opencode CLI コマンドや `mcpServers` JSON / VS Code `servers` JSON / Codex・Grok の `config.toml` / opencode の `opencode.json` を切り替えてコピーできます。',

  'detail.scope': 'scope: {scope}',
  'detail.command': 'command:',
  'detail.args': 'args:',
  'detail.envCount': 'env: {count} 件',
  'detail.url': 'url:',
  'detail.headersCount': 'headers: {count} 件',
  'detail.button.edit': '編集',
  'detail.button.remove': '削除',

  'form.transport.label': 'トランスポート',
  'form.transport.hint':
    'stdio はローカルプロセス起動 / http (Streamable) と sse はリモート MCP サーバ (Claude Code では sse は非推奨)',
  'form.name.label': '名前 (server-name)',
  'form.name.hint':
    '英数字 / `_` / `-` のみ (Codex CLI / TOML 互換)。例: `chrome-devtools` `context7`。`workspace` / `claude-in-chrome` / `computer-use` は Claude Code の予約名です。Grok は英字か `_` で始まり、末尾が `_` でなく `__` を含まない名前のみツールを登録します',
  'form.scope.label': 'scope (Claude / Gemini / Qwen / Grok CLI)',
  'form.scope.hint':
    'Claude / Gemini / Qwen / Grok CLI の `--scope` に反映 (`codex mcp add` に scope 相当のオプションはなく常に `$CODEX_HOME/config.toml` へ書き込みますが、"Codex config.toml" タブは project / local ならプロジェクト直下の `.codex/config.toml` 向けに出力します。Grok は user / project のみで local は project に丸めます。opencode も global / project の 2 階層のみで、非対話の `opencode mcp add` は常にグローバル設定へ書き込むため、project / local は "opencode.json" タブの出力を使ってください)',
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
  'form.kv.keyLabel': '{group} キー {index}',
  'form.kv.valueLabel': '{group} 値 {index}',
  'form.submit.create': '登録する',
  'form.submit.update': '更新する',
  'form.cancel': 'キャンセル',

  'validation.nameRequired': 'name は必須です',
  'validation.nameMaxLength': 'name は 64 文字以内で指定してください',
  'validation.namePattern':
    'name は英数字 / _ / - のみ使用できます (Codex CLI / TOML bare key 互換)',
  'validation.commandRequired': 'command は必須です',
  'validation.urlInvalid': 'URL の形式が正しくありません',

  'copy.button': 'コピー',
  'copy.copied': 'コピーしました',

  'format.claude-cli.title': 'Claude Code (CLI)',
  'format.claude-cli.subtitle':
    '`claude mcp add` コマンド形式 (local / user は `~/.claude.json`、project はプロジェクト直下の `.mcp.json` に書き込み)',
  'format.codex-cli.title': 'Codex CLI',
  'format.codex-cli.subtitle':
    '`codex mcp add` コマンド形式 (scope 相当のオプションはなく、常に `$CODEX_HOME/config.toml` = 既定 `~/.codex/config.toml` へ書き込み)',
  'format.gemini-cli.title': 'Gemini CLI',
  'format.gemini-cli.subtitle':
    '`gemini mcp add` コマンド形式 (settings.json: `~/.gemini/settings.json`)',
  'format.qwen-cli.title': 'Qwen Code',
  'format.qwen-cli.subtitle':
    '`qwen mcp add` コマンド形式 (settings.json: `~/.qwen/settings.json`)',
  'format.grok-cli.title': 'Grok Build (CLI)',
  'format.grok-cli.subtitle':
    '`grok mcp add` コマンド形式 (user は `%USERPROFILE%\\.grok\\config.toml`、project は `.grok\\config.toml` に書き込み)',
  'format.opencode-cli.title': 'opencode CLI',
  'format.opencode-cli.subtitle':
    '`opencode mcp add` コマンド形式 (名前を渡す非対話モードには scope 相当のオプションがなく、常にグローバル設定 `$XDG_CONFIG_HOME/opencode/opencode.json` = 既定 `~/.config/opencode/opencode.json` へ書き込み)',
  'format.claude-desktop.title': 'Claude Desktop',
  'format.claude-desktop.subtitle':
    '`%APPDATA%\\Claude\\claude_desktop_config.json` (リモートは uvx mcp-proxy でブリッジ)',
  'format.mcp-json.title': 'mcpServers JSON',
  'format.mcp-json.subtitle': 'Cursor / Windsurf / Cline / Gemini など共通形式',
  'format.vscode-json.title': 'VS Code mcp.json',
  'format.vscode-json.subtitle': 'トップレベルキーは `servers`',
  'format.codex-toml.title': 'Codex config.toml',
  'format.codex-toml.subtitle':
    '`$CODEX_HOME/config.toml` (user・既定 `~/.codex/config.toml`) / プロジェクト直下の `.codex/config.toml` (project・要 trust) 用 TOML 抜粋',
  'format.grok-toml.title': 'Grok config.toml',
  'format.grok-toml.subtitle':
    '`%USERPROFILE%\\.grok\\config.toml` (user) / `.grok\\config.toml` (project) 用 TOML 抜粋 (HTTP / SSE はネイティブ対応でブリッジ不要)',
  'format.opencode-json.title': 'opencode.json',
  'format.opencode-json.subtitle':
    '`$XDG_CONFIG_HOME/opencode/opencode.json` (user・既定 `~/.config/opencode/opencode.json`) / プロジェクト直下の `opencode.json` (project) 用 `mcp` 抜粋 (JSONC なので `//` コメント可、HTTP / SSE は `type: "remote"` でネイティブ対応)',
  'format.antigravity-json.title': 'Antigravity mcp_config.json',
  'format.antigravity-json.subtitle':
    '`~/.gemini/antigravity/mcp_config.json` (リモートは `serverUrl` キー / SSE は npx mcp-remote でブリッジ)',
  'format.cline-json.title': 'Cline (cline_mcp_settings.json)',
  'format.cline-json.subtitle':
    'VS Code 拡張 `saoudrizwan.claude-dev` 用 (Streamable HTTP の `type` は `"streamableHttp"` で `"http"` ではない)',

  'converters.claudeCli.reservedName.line1':
    '# 注: "{name}" は Claude Code が組み込みサーバ用に予約している名前です。',
  'converters.claudeCli.reservedName.line2':
    '#     `claude mcp add` はこの名前をエラーで拒否するため、別名に変更してください。',
  'converters.claudeCli.whitespace.line1':
    '# 注: 次のフィールドの先頭 / 末尾に空白が含まれています: {fields}',
  'converters.claudeCli.whitespace.line2':
    '#     Claude Code は空白を除去せずそのまま使い、`claude mcp list` と `/mcp` で警告します。',
  'converters.claudeCli.sseDeprecated.line1':
    '# 注: Claude Code では SSE トランスポートは非推奨です。サービスが HTTP',
  'converters.claudeCli.sseDeprecated.line2':
    '#     (Streamable HTTP) エンドポイントを提供していればそちらを使ってください。',
  'converters.claudeCli.sseDeprecated.line3':
    '#     v2.1.265 以降は SSE 専用エンドポイントも `--transport http` で追加でき、自動で SSE に切り替わります。',

  'converters.grok.nameStart.line1':
    '# 注: "{name}" が英字または `_` 以外で始まっているため、Grok のツールカタログに登録されません。',
  'converters.grok.nameStart.line2':
    '#     `grok mcp add` 自体は成功しますが、`server__tool` 名が InvalidServerName で弾かれ、ツールを呼び出せません。',
  'converters.grok.nameAmbiguous.line1':
    '# 注: "{name}" は末尾が `_` か `__` を含むため、`server__tool` の区切りが曖昧になります。',
  'converters.grok.nameAmbiguous.line2':
    '#     Grok は該当ツールをカタログから除外します (InvalidOrAmbiguousQualifiedName)。名前を変更してください。',
  'converters.grok.sseUrlSuffix.line1':
    '# 注: URL が `/sse` で終わるため、Grok は `type` の指定に関わらず SSE として接続します。',
  'converters.grok.sseUrlSuffix.line2':
    '#     Streamable HTTP として接続したい場合は、末尾が `/sse` 以外のエンドポイントを指定してください。',
  'converters.grok.localScope.line1':
    '# 注: Grok の scope は user / project の 2 つだけのため、local は project (`.grok/config.toml`) として出力しています。',
  'converters.grok.localScope.line2':
    '#     全プロジェクト共通にする場合は scope を user に変更してください。',

  'converters.opencode.sse.line1':
    '# 注: opencode に SSE 専用の type はなく、`type: "remote"` が Streamable HTTP → SSE の順で接続を試みます。',
  'converters.opencode.sse.line2':
    '#     SSE しか提供しないエンドポイントでも、そのまま `remote` として登録すれば自動で SSE にフォールバックします。',
  'converters.opencode.envRef.line1':
    '# 注: 次のフィールドに含まれる `${VAR}` を、opencode の変数展開 `{env:VAR}` に変換しました: {fields}',
  'converters.opencode.envRef.line2':
    '#     opencode は設定ファイル読み込み時に展開します。ただし変数が未設定でもエラーにはならず空文字に置換されるため、事前に環境変数を設定してください。',
  'converters.opencode.envRef.line3':
    '#     未設定のまま起動すると、env なら空の値のままサーバが起動し、header なら空の認証情報でリクエストが飛び、url なら `https:///mcp` のような壊れた URL になって接続に失敗します。',
  'converters.opencode.unexpanded.line1':
    '# 注: 次のフィールドには `${...}` が残っています: {fields}',
  'converters.opencode.unexpanded.line2':
    '#     opencode が展開するのは `{env:VAR}` と `{file:path}` だけで、`${...}` はそのまま文字列として扱われます。',
  'converters.opencode.localScope.line1':
    '# 注: opencode の設定は global / project の 2 階層だけのため、local はプロジェクト直下の `opencode.json` として出力しています。',
  'converters.opencode.localScope.line2':
    '#     `opencode.json` が未追跡の場合に限り .gitignore で除外できます。すでにコミット済みのファイルは .gitignore を追加しても変更が追跡され続けるので、秘密情報は値に直接書かず `{env:VAR}` で環境変数を参照するか、scope を user にしてリポジトリ外のグローバル設定に置いてください。',
  'converters.opencodeCli.globalOnly.line1':
    '# 注: scope="{scope}" は `opencode mcp add` では表現できません (名前を渡す非対話モードに scope 相当のオプションがなく、常にグローバル設定へ書き込みます)。',
  'converters.opencodeCli.globalOnly.line2':
    '#     実行すると全プロジェクトで有効なグローバル登録になってしまうため、下のコマンドはコメントアウトしてあります。',
  'converters.opencodeCli.globalOnly.line3':
    '#     代わりに "opencode.json" タブの内容を、プロジェクト直下の {path} に貼り付けてください。',
  'converters.opencodeCli.globalOnly.line4':
    '#     対話モードなら scope を選べます。引数なしで `opencode mcp add` を実行し、Location で Current project を選んでください。',
  'converters.opencode.envKeyMalformed.line1':
    '# 注: 次の env キーは環境変数名として使えません: {keys}',
  'converters.opencode.envKeyMalformed.line2':
    '#     プロセスの環境は NAME=VALUE の並びなので `=` を含むキーは表現できず (`A=B` に `c` を入れても子プロセスには A=B=c として渡り A に B=c が入ります)、空のキーも同様です。`opencode mcp add --env` は最初の `=` までをキーとして解釈するため同じ結果になり、"opencode.json" タブに書いても実行時の挙動は変わりません。キー名を変更してください。',
  'converters.opencode.headerKeyMalformed.line1':
    '# 注: 次の header キーは HTTP ヘッダ名として使えません: {keys}',
  'converters.opencode.headerKeyMalformed.line2':
    '#     HTTP のフィールド名は token (英数字と `!#$%&\'*+-.^_`|~` のみ) である必要があり、空白・`:`・`=` を含む名前や空の名前は使えません。`opencode mcp add --header` は最初の `=` までをキーとして解釈し、"opencode.json" タブに書いた場合もリクエスト組み立て時に不正なヘッダ名として拒否されます。キー名を変更してください。',
  'converters.opencodeCli.optionName.line1':
    '# 注: サーバ名 "{name}" は `-` で始まるため、`opencode mcp add` の位置引数として渡せません。',
  'converters.opencodeCli.optionName.line2':
    '#     シェルのクオートを外した時点でオプションと区別できず (例: 名前 `--url` は `--url` オプションとして、名前 `--` は引数区切りとして解釈されます)、名前が渡らず CLI がエラーになるため、下のコマンドはコメントアウトしてあります。',
  'converters.opencodeCli.optionName.line3':
    '#     "opencode.json" タブの出力なら `mcp` のキーとしてそのまま書けます。CLI から登録したい場合は `-` で始まらない名前に変更してください。',
  'converters.opencodeJson.target.global':
    '# 書き込み先: {path} (既定 {defaultPath})。ファイルが無ければこのまま新規作成し、既にある場合は下の `mcp` の 1 エントリだけを既存の `mcp` オブジェクトにマージしてください (全体を貼ると JSON が壊れるか、既存の設定を失います)。',
  'converters.opencodeJson.target.project':
    '# 書き込み先: プロジェクト直下の {path} (scope: {scope})。ファイルが無ければこのまま新規作成し、既にある場合は下の `mcp` の 1 エントリだけを既存の `mcp` オブジェクトにマージしてください (全体を貼ると JSON が壊れるか、既存の設定を失います)。',
  'converters.opencodeCli.invalidUrl.line1':
    '# 注: 変換後の URL は `URL.canParse` を通らないため、`opencode mcp add --url` が "Invalid URL" で失敗します。下のコマンドはコメントアウトしてあります。',
  'converters.opencodeCli.invalidUrl.line2':
    '#     ホスト部分に `{env:VAR}` を置くと URL として解釈できないためです。設定ファイルは読み込み前にテキストとして置換されるので、"opencode.json" タブの出力ならそのまま使えます。',

  'converters.codexCli.extraHeadersNote.line1':
    '# 注: `codex mcp add` が扱えるヘッダは `--bearer-token-env-var` だけで、任意の HTTP ヘッダは CLI フラグで渡せません。',
  'converters.codexCli.extraHeadersNote.line2':
    '#     右の "Codex config.toml" タブの `http_headers` / `env_http_headers` をそのまま',
  'converters.codexCli.extraHeadersNote.line3':
    '#     {path} の該当 [mcp_servers.<name>] ブロックに追記してください。',
  'converters.codexCli.envKeyTrimmed.line1': '# 注: 次の env キーは前後に空白を含みます: {keys}',
  'converters.codexCli.envKeyTrimmed.line2':
    '#     `codex mcp add --env KEY=VALUE` はキー側だけを trim するため、"Codex config.toml" タブの出力とキー名がずれます。',
  'converters.codex.envKeyMalformed.line1':
    '# 注: 次の env キーは環境変数名として使えません: {keys}',
  'converters.codex.envKeyMalformed.line2':
    '#     プロセスの環境は NAME=VALUE 形式なので `=` を含むキーは表現できず (`A=B` に `c` を入れても A に B=c が入ります)、空のキーは `codex mcp add` がエラーにします。キー名を変更してください。',
  'converters.codexCli.envRef.line1':
    '# 注: 次の env は値が `${VAR}` 形式ですが、Codex は `env` の値を展開せずそのまま子プロセスへ渡します: {keys}',
  'converters.codexCli.envRef.line2':
    '#     `codex mcp add` は env を [mcp_servers.<name>.env] サブテーブルに書き出すので、実行後に該当行をそこから削除し、',
  'converters.codexCli.envRef.line3':
    '#     親の [mcp_servers.<name>] テーブル (env サブテーブルより前) に `env_vars` を追加してください。env サブテーブル内に置くと invalid type: sequence, expected a string で失敗します。',

  'converters.codex.noScope.line1':
    '# 注: scope="{scope}" は `codex mcp add` では表現できません (scope 相当のオプションがなく、常に $CODEX_HOME/config.toml = 既定 ~/.codex/config.toml へ書き込みます)。',
  'converters.codex.noScope.line2':
    '#     実行すると全プロジェクトで有効なグローバル登録になってしまうため、下のコマンドはコメントアウトしてあります。',
  'converters.codex.noScope.line3':
    '#     代わりに "Codex config.toml" タブの内容を、プロジェクト直下の .codex/config.toml に貼り付けてください。',
  'converters.codex.noScope.line4':
    '#     プロジェクト層は $CODEX_HOME/config.toml の [projects.\'<プロジェクトの絶対パス>\'] に trust_level = "trusted" がある場合のみ読み込まれます。',
  'converters.codex.localScope.line1':
    '# 注: Codex には local (自分だけ) に相当する層がなく、.codex/config.toml はリポジトリで共有されます。',
  'converters.codex.localScope.line2':
    '#     秘密情報を含む場合は scope を user にしてください。.gitignore は未追跡のファイルにしか効かず、既にコミット済みの .codex/config.toml は隠せません。',
  'converters.codex.sseBridge.line1':
    '# 注: Codex のトランスポートは stdio と streamable_http (url) の 2 つだけで、SSE はサポートされません。',
  'converters.codex.sseBridge.line2':
    '#     そのため `npx -y mcp-remote` を stdio で起動して SSE へ橋渡ししています (Node.js が必要)。',
  'converters.codex.sseBridge.line3':
    '#     サービスが Streamable HTTP エンドポイントを提供している場合は、トランスポートを http に変更してください。',
  'converters.codex.sseHeaders.line1':
    '# 注: SSE 用のヘッダは mcp-remote の引数として config.toml に平文で残り、Codex は `${VAR}` を展開しません。',
  'converters.codex.sseHeaders.line2':
    '#     秘密情報を含む場合は、Streamable HTTP + `bearer_token_env_var` / `env_http_headers` への切り替えを検討してください。',
  'converters.codex.headerUnexpanded.line1':
    '# 注: 次のヘッダは `env_http_headers` に振り替えられない `${...}` 参照を含んでいます: {keys}',
  'converters.codex.headerUnexpanded.line2':
    '#     Codex は `http_headers` の値をそのまま送るため、リテラルの文字列がサーバへ渡ります。値全体を `${VAR}` (既定値や前後の文字なし) にすれば環境変数から読まれます。',

  'converters.codex.plainAuth.line1':
    '# 注: Authorization ヘッダに値を直接書いているため、{path} に平文で保存されます。',
  'converters.codex.plainAuth.bearer':
    '#     Bearer トークンは `Bearer ${VAR}` 形式にすると `bearer_token_env_var` / `--bearer-token-env-var` へ変換され、実際の値は環境変数から読まれます。',
  'converters.codex.plainAuth.other':
    '#     Bearer 以外の認証方式 (Basic / Digest など) は方式ごと壊れるので `Bearer` に書き換えず、値全体を環境変数に移して `Authorization` = `${VAR}` と書いてください (`env_http_headers` に変換されます)。',
  'converters.codex.plainAuth.noOauth':
    '#     また `codex mcp list` はこのサーバを Bearer 認証済みとして表示します (ログインが必要なサーバとしては出ません)。',

  'converters.codex.envUnexpanded.line1':
    '# 注: 次の env は `env_vars` に振り替えられない `${...}` 参照を含んでいます (キー名と変数名が違う、既定値や前後の文字が付いている、など): {keys}',
  'converters.codex.envUnexpanded.line2':
    '#     Codex は `env` の値を展開せずそのまま渡すので、実際の値をここに書いてください。',
  'converters.codex.envUnexpanded.line3':
    '#     環境変数から引き継ぎたい場合は、キーと同じ名前の変数を Codex 側に用意して `env_vars` に指定します。キー名の方は変えないでください (サーバが期待する変数名です)。',

  'converters.codexToml.target.user': '# 貼り付け先: {path} (既定 {defaultPath})',
  'converters.codexToml.target.project': '# 貼り付け先: プロジェクト直下の {path} (scope: {scope})',
  'converters.codexToml.projectTrust.line1':
    '# 注: プロジェクト層 (.codex/config.toml) は、$CODEX_HOME/config.toml の',
  'converters.codexToml.projectTrust.line2':
    '#     [projects.\'<プロジェクトの絶対パス>\'] に trust_level = "trusted" がある場合のみ読み込まれます。',
  'converters.codexToml.projectTrust.line3':
    '#     キーはシングルクォート (TOML リテラル文字列) にしてください。ダブルクォートだと Windows パスの `\\Users` などがエスケープ扱いになり、config.toml 全体が読み込めなくなります。',
  'converters.codexToml.projectTrust.line4':
    '#     パスに `\'` が含まれる場合だけはリテラル文字列にできないので、ダブルクォートにして `\\` を `\\\\` に、`"` を `\\"` に置き換えてください (例: "C:\\\\Users\\\\O\'Brien\\\\repo")。',
  'converters.codexToml.envVars.line1':
    '# 注: 次の env は値が同名の `${VAR}` 参照だったため、`env_vars` に振り替えました: {keys}',
  'converters.codexToml.envVars.line2':
    '#     Codex は stdio の子プロセスへ既定の環境変数しか渡さないため、`env_vars` で明示した変数だけが引き継がれます。',

  'storage.error.readFailed': 'MCP 設定ストア ({path}) の読込に失敗しました: {message}',
  'storage.error.jsonParse':
    'MCP 設定ストア ({path}) は JSON として解釈できませんでした。元ファイルは隣接の .broken-* に退避しました: {message}',
  'storage.error.schemaMismatch':
    'MCP 設定ストア ({path}) のスキーマが不正です。元ファイルは隣接の .broken-* に退避しました: {message}',
  'storage.error.duplicateName': '同名のサーバ "{name}" が既に登録されています',
  'storage.error.notFound': 'id={id} のサーバが見つかりません',

  'bootstrap.rootMissing': 'root 要素が見つかりません',
};

export type MessageKey = keyof typeof ja;

const en: Record<MessageKey, string> = {
  'app.title': 'MCP Kanri',
  'app.sidebar.title': 'MCP Kanri',
  'app.sidebar.newServer': '＋ New server',
  'app.sidebar.empty.line1': 'No MCP servers registered yet.',
  'app.sidebar.empty.line2': 'Click "＋ New server" at the top right to add one.',
  'app.sidebar.storeLabel': 'Store:',
  'app.language.label': 'Language',
  'app.language.ja': '日本語',
  'app.language.en': 'English',

  'app.toast.created': 'Created "{name}"',
  'app.toast.updated': 'Updated "{name}"',
  'app.toast.removed': 'Removed "{name}"',
  'app.confirm.remove': 'Delete "{name}". Are you sure?',
  'dialog.remove.title': 'Confirm deletion',

  'main.create.heading': 'Register a new MCP server',
  'main.edit.heading': 'Edit "{name}"',
  'main.empty.title': 'Select an MCP server',
  'main.empty.body':
    'From a single registration, switch and copy `claude` / `codex` / `gemini` / `qwen` / `grok` / `opencode` CLI commands, `mcpServers` JSON, VS Code `servers` JSON, the Codex / Grok `config.toml`, or the opencode `opencode.json`.',

  'detail.scope': 'scope: {scope}',
  'detail.command': 'command:',
  'detail.args': 'args:',
  'detail.envCount': 'env: {count} entries',
  'detail.url': 'url:',
  'detail.headersCount': 'headers: {count} entries',
  'detail.button.edit': 'Edit',
  'detail.button.remove': 'Delete',

  'form.transport.label': 'Transport',
  'form.transport.hint':
    'stdio launches a local process; http (Streamable) and sse target remote MCP servers (sse is deprecated in Claude Code)',
  'form.name.label': 'Name (server-name)',
  'form.name.hint':
    'Letters, digits, `_`, `-` only (Codex CLI / TOML compatible). e.g. `chrome-devtools`, `context7`. `workspace` / `claude-in-chrome` / `computer-use` are reserved by Claude Code. Grok only registers tools for names that start with a letter or `_`, do not end with `_`, and contain no `__`',
  'form.scope.label': 'scope (Claude / Gemini / Qwen / Grok CLI)',
  'form.scope.hint':
    'Maps to the `--scope` option of Claude / Gemini / Qwen / Grok CLI (`codex mcp add` has no scope option and always writes `$CODEX_HOME/config.toml`, but the "Codex config.toml" tab targets `.codex/config.toml` at the project root for project / local. Grok has only user / project, so local is rounded to project. opencode likewise has only global / project, and the non-interactive `opencode mcp add` always writes the global config, so use the "opencode.json" tab for project / local)',
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
  'form.kv.keyLabel': '{group} key {index}',
  'form.kv.valueLabel': '{group} value {index}',
  'form.submit.create': 'Create',
  'form.submit.update': 'Update',
  'form.cancel': 'Cancel',

  'validation.nameRequired': 'Name is required',
  'validation.nameMaxLength': 'Name must be 64 characters or fewer',
  'validation.namePattern':
    'Name may only contain letters, digits, `_` and `-` (Codex CLI / TOML bare key compatible)',
  'validation.commandRequired': 'command is required',
  'validation.urlInvalid': 'URL is not in a valid format',

  'copy.button': 'Copy',
  'copy.copied': 'Copied!',

  'format.claude-cli.title': 'Claude Code (CLI)',
  'format.claude-cli.subtitle':
    '`claude mcp add` command form (local / user write to `~/.claude.json`, project to `.mcp.json` at the project root)',
  'format.codex-cli.title': 'Codex CLI',
  'format.codex-cli.subtitle':
    '`codex mcp add` command form (no scope option; always writes to `$CODEX_HOME/config.toml`, `~/.codex/config.toml` by default)',
  'format.gemini-cli.title': 'Gemini CLI',
  'format.gemini-cli.subtitle':
    '`gemini mcp add` command form (settings.json: `~/.gemini/settings.json`)',
  'format.qwen-cli.title': 'Qwen Code',
  'format.qwen-cli.subtitle':
    '`qwen mcp add` command form (settings.json: `~/.qwen/settings.json`)',
  'format.grok-cli.title': 'Grok Build (CLI)',
  'format.grok-cli.subtitle':
    '`grok mcp add` command form (user writes `%USERPROFILE%\\.grok\\config.toml`, project writes `.grok\\config.toml`)',
  'format.opencode-cli.title': 'opencode CLI',
  'format.opencode-cli.subtitle':
    '`opencode mcp add` command form (the non-interactive mode that takes a name has no scope option and always writes the global `$XDG_CONFIG_HOME/opencode/opencode.json`, `~/.config/opencode/opencode.json` by default)',
  'format.claude-desktop.title': 'Claude Desktop',
  'format.claude-desktop.subtitle':
    '`%APPDATA%\\Claude\\claude_desktop_config.json` (remote servers bridged via uvx mcp-proxy)',
  'format.mcp-json.title': 'mcpServers JSON',
  'format.mcp-json.subtitle': 'Common form for Cursor / Windsurf / Cline / Gemini etc.',
  'format.vscode-json.title': 'VS Code mcp.json',
  'format.vscode-json.subtitle': 'Top-level key is `servers`',
  'format.codex-toml.title': 'Codex config.toml',
  'format.codex-toml.subtitle':
    'TOML excerpt for `$CODEX_HOME/config.toml` (user; `~/.codex/config.toml` by default) or `.codex/config.toml` at the project root (project; requires trust)',
  'format.grok-toml.title': 'Grok config.toml',
  'format.grok-toml.subtitle':
    'TOML excerpt for `%USERPROFILE%\\.grok\\config.toml` (user) or `.grok\\config.toml` (project); HTTP / SSE are native, so no bridge is needed',
  'format.opencode-json.title': 'opencode.json',
  'format.opencode-json.subtitle':
    '`mcp` excerpt for `$XDG_CONFIG_HOME/opencode/opencode.json` (user; `~/.config/opencode/opencode.json` by default) or `opencode.json` at the project root (project); it is JSONC so `//` comments are allowed, and HTTP / SSE are native through `type: "remote"`',
  'format.antigravity-json.title': 'Antigravity mcp_config.json',
  'format.antigravity-json.subtitle':
    '`~/.gemini/antigravity/mcp_config.json` (remote uses `serverUrl` key; SSE bridged via npx mcp-remote)',
  'format.cline-json.title': 'Cline (cline_mcp_settings.json)',
  'format.cline-json.subtitle':
    'VS Code extension `saoudrizwan.claude-dev` (Streamable HTTP `type` is `"streamableHttp"`, not `"http"`)',

  'converters.claudeCli.reservedName.line1':
    '# Note: "{name}" is a name Claude Code reserves for one of its built-in servers.',
  'converters.claudeCli.reservedName.line2':
    '#       `claude mcp add` rejects it with an error, so rename the server first.',
  'converters.claudeCli.whitespace.line1': '# Note: leading or trailing whitespace in: {fields}',
  'converters.claudeCli.whitespace.line2':
    '#       Claude Code uses the values as written instead of trimming them, and warns in `claude mcp list` and `/mcp`.',
  'converters.claudeCli.sseDeprecated.line1':
    '# Note: the SSE transport is deprecated in Claude Code. Prefer an HTTP',
  'converters.claudeCli.sseDeprecated.line2':
    '#       (Streamable HTTP) endpoint whenever the service offers one.',
  'converters.claudeCli.sseDeprecated.line3':
    '#       Since v2.1.265 an SSE-only endpoint also works with `--transport http`, which falls back to SSE automatically.',

  'converters.grok.nameStart.line1':
    '# Note: "{name}" does not start with a letter or `_`, so Grok never admits it into the tool catalog.',
  'converters.grok.nameStart.line2':
    '#       `grok mcp add` still succeeds, but every `server__tool` name is rejected as InvalidServerName and the tools stay unusable.',
  'converters.grok.nameAmbiguous.line1':
    '# Note: "{name}" ends with `_` or contains `__`, which makes the `server__tool` delimiter ambiguous.',
  'converters.grok.nameAmbiguous.line2':
    '#       Grok skips those tools (InvalidOrAmbiguousQualifiedName), so rename the server first.',
  'converters.grok.sseUrlSuffix.line1':
    '# Note: the URL ends with `/sse`, so Grok connects over SSE no matter what `type` says.',
  'converters.grok.sseUrlSuffix.line2':
    '#       Point at an endpoint that does not end with `/sse` if you want Streamable HTTP.',
  'converters.grok.localScope.line1':
    '# Note: Grok only has the user and project scopes, so local is emitted as project (`.grok/config.toml`).',
  'converters.grok.localScope.line2':
    '#       Switch the scope to user to share the server across every project.',

  'converters.opencode.sse.line1':
    '# Note: opencode has no dedicated SSE type; `type: "remote"` tries Streamable HTTP first and then SSE.',
  'converters.opencode.sse.line2':
    '#       An SSE-only endpoint still works as `remote`, because opencode falls back to SSE automatically.',
  'converters.opencode.envRef.line1':
    '# Note: `${VAR}` in the following fields was rewritten to the opencode substitution `{env:VAR}`: {fields}',
  'converters.opencode.envRef.line2':
    '#       opencode expands it while loading the config, but an unset variable is replaced with an empty string rather than raising an error, so export it first.',
  'converters.opencode.envRef.line3':
    '#       Left unset, an env value starts the server empty, a header sends an empty credential, and a url collapses to something like `https:///mcp` that cannot connect.',
  'converters.opencode.unexpanded.line1':
    '# Note: the following fields still contain `${...}`: {fields}',
  'converters.opencode.unexpanded.line2':
    '#       opencode only expands `{env:VAR}` and `{file:path}`, so `${...}` is kept as a literal string.',
  'converters.opencode.localScope.line1':
    '# Note: opencode only has the global and project layers, so local is emitted as `opencode.json` at the project root.',
  'converters.opencode.localScope.line2':
    '#       .gitignore only hides `opencode.json` while it is still untracked; once the file is committed, later edits keep being tracked. Keep secrets out of the values by referencing environment variables with `{env:VAR}`, or switch the scope to user so they live in the global config outside the repository.',
  'converters.opencodeCli.globalOnly.line1':
    '# Note: scope="{scope}" cannot be expressed with `opencode mcp add` — the non-interactive form that takes a name has no scope option and always writes the global config.',
  'converters.opencodeCli.globalOnly.line2':
    '#       Running it would register the server globally, for every project, so the command below is commented out.',
  'converters.opencodeCli.globalOnly.line3':
    '#       Paste the "opencode.json" tab into {path} at the project root instead.',
  'converters.opencodeCli.globalOnly.line4':
    '#       The interactive flow can pick a scope: run `opencode mcp add` with no arguments and choose "Current project" for Location.',
  'converters.opencode.envKeyMalformed.line1':
    '# Note: these env keys cannot be used as environment variable names: {keys}',
  'converters.opencode.envKeyMalformed.line2':
    '#       A process environment is a list of NAME=VALUE entries, so a key containing `=` cannot be represented (`A=B` set to `c` reaches the child as `A=B=c`, i.e. `A` with the value `B=c`), and the same goes for an empty key. `opencode mcp add --env` splits on the first `=` and lands in the same place, and writing it in the "opencode.json" tab does not change the runtime behaviour. Rename the key.',
  'converters.opencode.headerKeyMalformed.line1':
    '# Note: these header keys cannot be used as HTTP header names: {keys}',
  'converters.opencode.headerKeyMalformed.line2':
    '#       An HTTP field name has to be a token (alphanumerics plus `!#$%&\'*+-.^_`|~`), so a name containing whitespace, `:` or `=`, and an empty name, are all invalid. `opencode mcp add --header` splits on the first `=`, and writing it in the "opencode.json" tab only defers the problem: the request is rejected for the invalid header name. Rename the key.',
  'converters.opencodeCli.optionName.line1':
    '# Note: the server name "{name}" starts with `-`, so it cannot be passed as a positional argument to `opencode mcp add`.',
  'converters.opencodeCli.optionName.line2':
    '#       Once shell quoting is removed it is indistinguishable from an option (the name `--url` is read as the `--url` option, and the name `--` as the argument separator), so the name never arrives and the CLI errors out. The command below is therefore commented out.',
  'converters.opencodeCli.optionName.line3':
    '#       The "opencode.json" tab can carry it verbatim as an `mcp` key. To register from the CLI, rename the server so it does not start with `-`.',
  'converters.opencodeJson.target.global':
    '# Write to: {path} (default: {defaultPath}). Create the file with this content when it does not exist; when it does, merge just the one `mcp` entry below into the existing `mcp` object (pasting the whole document either breaks the JSON or drops your existing settings).',
  'converters.opencodeJson.target.project':
    '# Write to: {path} at the project root (scope: {scope}). Create the file with this content when it does not exist; when it does, merge just the one `mcp` entry below into the existing `mcp` object (pasting the whole document either breaks the JSON or drops your existing settings).',
  'converters.opencodeCli.invalidUrl.line1':
    '# Note: the rewritten URL does not pass `URL.canParse`, so `opencode mcp add --url` fails with "Invalid URL". The command below is commented out.',
  'converters.opencodeCli.invalidUrl.line2':
    '#       A `{env:VAR}` in the host part cannot be parsed as a URL. The config file is substituted as text before it is loaded, so the "opencode.json" tab output works as-is.',

  'converters.codexCli.extraHeadersNote.line1':
    '# Note: `--bearer-token-env-var` is the only header `codex mcp add` can set; arbitrary HTTP headers have no CLI flag.',
  'converters.codexCli.extraHeadersNote.line2':
    '#       Copy the `http_headers` / `env_http_headers` lines from the "Codex config.toml" tab',
  'converters.codexCli.extraHeadersNote.line3':
    '#       into the matching [mcp_servers.<name>] block in {path}.',
  'converters.codexCli.envKeyTrimmed.line1':
    '# Note: these env keys have leading or trailing whitespace: {keys}',
  'converters.codexCli.envKeyTrimmed.line2':
    '#       `codex mcp add --env KEY=VALUE` trims the key only, so the stored key differs from the "Codex config.toml" tab.',
  'converters.codex.envKeyMalformed.line1':
    '# Note: these env keys cannot be used as environment variable names: {keys}',
  'converters.codex.envKeyMalformed.line2':
    '#       A process environment is a list of NAME=VALUE entries, so a key containing `=` cannot be represented (`A=B` set to `c` arrives as `A` with the value `B=c`), and an empty key is rejected by `codex mcp add`. Rename the key.',
  'converters.codexCli.envRef.line1':
    '# Note: these env values look like `${VAR}`, but Codex passes `env` values to the child process verbatim: {keys}',
  'converters.codexCli.envRef.line2':
    '#       `codex mcp add` writes env into a [mcp_servers.<name>.env] sub-table, so after running it, delete those entries from there and',
  'converters.codexCli.envRef.line3':
    '#       add `env_vars` to the parent [mcp_servers.<name>] table, above the env sub-table. Inside the sub-table it fails with "invalid type: sequence, expected a string".',

  'converters.codex.noScope.line1':
    '# Note: scope="{scope}" cannot be expressed with `codex mcp add` — it has no scope option and always writes to $CODEX_HOME/config.toml (~/.codex/config.toml by default).',
  'converters.codex.noScope.line2':
    '#       Running it would register the server globally, for every project, so the command below is commented out.',
  'converters.codex.noScope.line3':
    '#       Paste the "Codex config.toml" tab into .codex/config.toml at the project root instead.',
  'converters.codex.noScope.line4':
    '#       The project layer is only loaded when $CODEX_HOME/config.toml has trust_level = "trusted" under [projects.\'<absolute project path>\'].',
  'converters.codex.localScope.line1':
    '# Note: Codex has no local (private to you) layer, so .codex/config.toml is shared with everyone who checks out the repository.',
  'converters.codex.localScope.line2':
    '#       Use the user scope for anything private: .gitignore only helps while the file is untracked, and never hides a .codex/config.toml that is already committed.',
  'converters.codex.sseBridge.line1':
    '# Note: Codex only supports the stdio and streamable_http (url) transports; there is no SSE transport.',
  'converters.codex.sseBridge.line2':
    '#       The server is therefore bridged by launching `npx -y mcp-remote` over stdio (Node.js required).',
  'converters.codex.sseBridge.line3':
    '#       Switch the transport to http whenever the service offers a Streamable HTTP endpoint.',
  'converters.codex.sseHeaders.line1':
    '# Note: SSE headers end up as mcp-remote arguments stored in plain text in config.toml, and Codex does not expand `${VAR}`.',
  'converters.codex.sseHeaders.line2':
    '#       For secrets, prefer Streamable HTTP with `bearer_token_env_var` / `env_http_headers`.',
  'converters.codex.headerUnexpanded.line1':
    '# Note: these headers hold a `${...}` reference that cannot be mapped to `env_http_headers`: {keys}',
  'converters.codex.headerUnexpanded.line2':
    '#       Codex sends `http_headers` values verbatim, so the server receives the literal text. Make the whole value a plain `${VAR}` (no default, no surrounding text) to read it from the environment.',

  'converters.codex.plainAuth.line1':
    '# Note: the Authorization header holds the credential itself, so it is stored in plain text in {path}.',
  'converters.codex.plainAuth.bearer':
    '#       For a Bearer token, write it as `Bearer ${VAR}`: that maps to `bearer_token_env_var` / `--bearer-token-env-var` and the value is read from the environment.',
  'converters.codex.plainAuth.other':
    '#       Do not rewrite a non-Bearer scheme (Basic, Digest, ...) as `Bearer` — that breaks the scheme. Move the whole value into an environment variable and write `Authorization` = `${VAR}`, which maps to `env_http_headers`.',
  'converters.codex.plainAuth.noOauth':
    '#       `codex mcp list` also reports this server as bearer-authenticated, so it is not listed as one that still needs a login.',

  'converters.codex.envUnexpanded.line1':
    '# Note: these env values hold a `${...}` reference that `env_vars` cannot express (the key and the variable differ, or the reference carries a default or surrounding text): {keys}',
  'converters.codex.envUnexpanded.line2':
    '#       Codex passes `env` values through without expanding them, so write the real value here.',
  'converters.codex.envUnexpanded.line3':
    "#       To inherit it instead, export the value under the key's own name in Codex's environment and list that name in `env_vars`. Do not rename the key — the server expects it.",

  'converters.codexToml.target.user': '# Paste into: {path} (default: {defaultPath})',
  'converters.codexToml.target.project':
    '# Paste into: {path} at the project root (scope: {scope})',
  'converters.codexToml.projectTrust.line1':
    '# Note: the project layer (.codex/config.toml) is only loaded when $CODEX_HOME/config.toml has',
  'converters.codexToml.projectTrust.line2':
    '#       trust_level = "trusted" under [projects.\'<absolute project path>\'].',
  'converters.codexToml.projectTrust.line3':
    '#       Keep the single quotes (a TOML literal string): in double quotes a Windows path like `\\Users` is read as an escape and the whole config.toml stops loading.',
  'converters.codexToml.projectTrust.line4':
    '#       Only when the path itself contains `\'` can it not be a literal string — then use double quotes and escape every `\\` as `\\\\` and every `"` as `\\"` (e.g. "C:\\\\Users\\\\O\'Brien\\\\repo").',
  'converters.codexToml.envVars.line1':
    '# Note: these env values were `${VAR}` references naming the same key, so they moved to `env_vars`: {keys}',
  'converters.codexToml.envVars.line2':
    '#       Codex passes only a fixed set of environment variables to stdio servers, so `env_vars` is what forwards the rest.',

  'storage.error.readFailed': 'Failed to read MCP store ({path}): {message}',
  'storage.error.jsonParse':
    'MCP store ({path}) could not be parsed as JSON. The original file was moved aside as .broken-*: {message}',
  'storage.error.schemaMismatch':
    'MCP store ({path}) failed schema validation. The original file was moved aside as .broken-*: {message}',
  'storage.error.duplicateName': 'A server named "{name}" is already registered',
  'storage.error.notFound': 'Server with id={id} not found',

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
