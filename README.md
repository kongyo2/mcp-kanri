# mcp-kanri

[![CI](https://github.com/kongyo2/mcp-kanri/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kongyo2/mcp-kanri/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/kongyo2/mcp-kanri?sort=semver&display_name=tag)](https://github.com/kongyo2/mcp-kanri/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/kongyo2/mcp-kanri/total)](https://github.com/kongyo2/mcp-kanri/releases)
[![License: MIT](https://img.shields.io/github/license/kongyo2/mcp-kanri)](LICENSE)
[![Platform: Windows 11](https://img.shields.io/badge/platform-Windows%2011-0078D6?logo=windows11&logoColor=white)](https://github.com/kongyo2/mcp-kanri/releases/latest)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/kongyo2/mcp-kanri)

> **Languages:** [日本語](#日本語) / [English](#english)

mcp-kanri is a Windows 11 desktop app for managing MCP (Model Context Protocol)
server configurations. From a single MCP registration, it generates and lets
you copy CLI commands for Claude Code / Codex / Gemini / Qwen / Grok Build /
opencode, the `mcpServers` JSON used by Claude Desktop / Cursor / VS Code /
Google Antigravity / Cline, the `config.toml` snippets used by Codex and Grok
Build, and the `opencode.json` snippet used by opencode — all with one click.

The UI is fully bilingual (日本語 / English) and the language can be switched
at any time from the sidebar footer. The initial language is detected from the
operating system locale.

---

## 日本語

Windows 11 向けの MCP (Model Context Protocol) 設定管理デスクトップアプリです。
1 つの MCP サーバ登録から Claude Code / Codex / Gemini / Qwen / Grok Build /
opencode の各 CLI コマンドや、Claude Desktop / Cursor / VS Code /
Google Antigravity / Cline 用の `mcpServers` JSON、Codex と Grok Build の
`config.toml`、opencode の `opencode.json` まで、ワンクリックで生成・コピー
できます。

UI は日本語と英語に対応しており、サイドバー下部から切り替えられます。
初回起動時は OS のロケールから自動判定します。

### スクリーンショット

#### Claude Desktop 用 `claude_desktop_config.json` をワンクリックで生成

リモート (HTTP / SSE) の MCP サーバは Claude Desktop 本体が直接対応していないため、
`uvx mcp-proxy` で stdio に橋渡しする形に自動変換します。

![Claude Desktop タブ](docs/images/claude-desktop.png)

#### Claude Code (CLI) の `claude mcp add` コマンドも同じ登録から生成

タブを切り替えるだけで、同じ MCP サーバ定義を別フォーマットへ瞬時に変換します。

![Claude Code (CLI) タブ](docs/images/claude-code-cli.png)

### 主な機能

- **MCP サーバ登録の一元管理**: stdio / Streamable HTTP / SSE の 3 トランスポート
  に対応。`command` + `args` + `env`、または `url` + `headers` をフォームで編集
  できます。
- **14 種類の出力フォーマットを自動生成**: 1 つの登録から下記の貼り付け先を
  すべて出力します。
  - `Claude Code (CLI)` — `claude mcp add ...` コマンド
  - `Codex CLI` — `codex mcp add ...` コマンド
  - `Gemini CLI` — `gemini mcp add ...` コマンド
  - `Qwen Code` — `qwen mcp add ...` コマンド
  - `Grok Build (CLI)` — `grok mcp add ...` コマンド
  - `opencode CLI` — `opencode mcp add ...` コマンド
  - `Claude Desktop` — `%APPDATA%\Claude\claude_desktop_config.json`
  - `mcpServers JSON` — Cursor / Windsurf などの共通形式
  - `VS Code mcp.json` — トップレベルキーが `servers` の VS Code 形式
  - `Codex config.toml` — `~/.codex/config.toml` (user) / プロジェクト直下の
    `.codex/config.toml` (project・local) 用の TOML 抜粋
  - `Grok config.toml` — `%USERPROFILE%\.grok\config.toml` (user) /
    `.grok\config.toml` (project) 用の `[mcp_servers.<name>]` 抜粋
  - `opencode.json` — `$XDG_CONFIG_HOME/opencode/opencode.json`
    (user・既定 `~/.config/opencode/opencode.json`) / プロジェクト直下の
    `opencode.json` (project・local) 用の `mcp` 抜粋
  - `Antigravity mcp_config.json` — Google Antigravity Editor 用
    `~/.gemini/antigravity/mcp_config.json` (リモートは `url` ではなく
    `serverUrl` キー)
  - `Cline (cline_mcp_settings.json)` — VS Code 拡張
    `saoudrizwan.claude-dev` の `cline_mcp_settings.json` 用 JSON
    (Streamable HTTP の `type` は `"streamableHttp"` で `"http"` ではない)
- **クライアント差分の自動吸収**: クライアントごとの仕様差をアプリ側で
  解決します。例:
  - Claude Desktop は本体が stdio のみ対応のため、リモートサーバは
    `uvx mcp-proxy` で stdio に変換します。Streamable HTTP の場合は
    `--transport streamablehttp` を明示し、ヘッダは `--headers K V` を
    1 つずつ繰り返す形式で出力します。
  - Codex のトランスポートは `stdio` と `streamable_http` の 2 つだけで SSE を
    持たないため、SSE 登録は `npx -y mcp-remote` で stdio に橋渡しし、その旨を
    コメントで注記します。
  - Gemini CLI / Qwen Code の stdio 出力では、引数を `--` の後ろに置きます。
    `--` がないと、引数に含まれるフラグが CLI 自身のオプションとして
    解釈されます。
  - `Authorization: Bearer ${ENV_VAR}` 形式のヘッダは Codex の
    `bearer_token_env_var` / `--bearer-token-env-var` に自動変換。それ以外の
    `${ENV_VAR}` ヘッダは `env_http_headers`、リテラル値は `http_headers` に
    振り分けます。
  - `codex mcp add` に scope 相当のオプションはなく、常に
    `$CODEX_HOME/config.toml` (既定 `~/.codex/config.toml`) へ書き込みます。
    一方 Codex の設定はプロジェクト層 (`.codex/config.toml`) も読むため、
    scope が `project` / `local` の場合は「Codex config.toml」タブを
    プロジェクト直下向けに出力し、`$CODEX_HOME/config.toml` の
    `[projects.'<絶対パス>']` に `trust_level = "trusted"` が必要なことを
    注記します (信頼されていないプロジェクト層は読み込まれません)。パスは
    シングルクォート (TOML リテラル文字列) で示します。ダブルクォートだと
    Windows パスの `\Users` などがエスケープ扱いになり `config.toml` 全体が
    読めなくなるためです。パスに `'` が含まれる場合はリテラル文字列にできない
    ので、その場合だけダブルクォートと `\\` を使うよう併記します。
    貼り付け先としては `~/.codex` ではなく `$CODEX_HOME` を案内するので、
    `CODEX_HOME` を変更している環境でも Codex が実際に読むファイルを指します。
  - scope が `project` / `local` のときは「Codex CLI」タブの
    `codex mcp add` 行自体をコメントアウトします。このコマンドには scope が
    なく、貼り付けて実行すると意図に反して全プロジェクト共通のグローバル
    登録になってしまうためです (注記を読む前に実行されてしまいます)。
    env の値などに改行が含まれていても、コメント化は行単位なので全行が
    コメントになります。
  - Codex には `local` (自分だけ) に相当する層がないため、`local` は
    `project` と同じ `.codex/config.toml` として出力し、リポジトリで共有される
    点を注記します。`.gitignore` は未追跡のファイルにしか効かず、既に
    コミット済みの `.codex/config.toml` は隠せないため、秘密情報は scope を
    `user` にするよう案内します。
  - Codex は stdio の `env` の値を展開しないので、`KEY = "${KEY}"` のように
    キー名と同じ変数を参照している env は `env_vars = ["KEY"]` に振り替えます
    (Codex は既定の環境変数しか子プロセスに渡さないため、`env_vars` が
    引き継ぎ手段になります)。キー名と変数名が違って振り替えられない場合は
    そのまま出力し、展開されないことを CLI / TOML の両タブで注記します。
    `${VAR:-default}` や `prefix-${VAR}` のように `env_vars` へ振り替えられない
    形の参照も同じ注記の対象です (Codex は展開しないため、そのままの文字列が
    サーバに渡ります)。
  - HTTP ヘッダも同様で、`env_http_headers` / `bearer_token_env_var` に
    振り替えられなかった値に `${...}` が残っている場合は注記を出します。
    Codex は `http_headers` の値をそのまま送るため、`${VAR:-default}` などは
    リテラルのままサーバへ渡ってしまうからです。
  - `codex mcp add --env KEY=VALUE` はキー側だけを trim するため、前後に空白の
    ある env キーには注記を出します。`=` を含むキーや空のキーはプロセスの環境
    (`NAME=VALUE` 形式) でそもそも表現できないので、CLI / TOML の両タブで
    キー名の変更を促します。
  - `${KEY}` 参照を `env_vars` に振り替える案内では、`codex mcp add` が env を
    `[mcp_servers.<name>.env]` サブテーブルに書き出すこと、`env_vars` は親の
    `[mcp_servers.<name>]` テーブル側に置く必要があることまで明記します
    (サブテーブル内に置くと `invalid type: sequence, expected a string` で
    失敗するため)。
  - `Authorization` に値を直接書いた登録は、`config.toml` に平文で残ること、
    `codex mcp list` が Bearer 認証済みとして表示する (ログインが必要な
    サーバとして出てこない) ことを注記します。案内する書き方は認証方式ごとに
    分かれ、Bearer トークンなら `Bearer ${VAR}` 形式、Basic / Digest など
    Bearer 以外の方式なら値全体を環境変数に移した `Authorization` = `${VAR}`
    (= `env_http_headers`) です。
  - Google Antigravity はリモート URL のキー名が `serverUrl` (camelCase)
    で他のクライアントと異なるため、自動で書き換えます。SSE はネイティブ
    未対応なので `npx -y mcp-remote` で stdio に橋渡しします。
  - Cline は Streamable HTTP の `type` リテラルが `"streamableHttp"`
    (camelCase) で、Cursor / VS Code / Claude の `"http"` とは異なるため、
    自動で書き換えます。保存先は VS Code globalStorage の
    `saoudrizwan.claude-dev/settings/cline_mcp_settings.json` です。
  - Grok Build は HTTP / SSE をネイティブ対応 (`url` と `type = "sse"`) して
    いるため、`uvx mcp-proxy` / `npx mcp-remote` でのブリッジは行わず、
    そのまま `url` 形式で出力します。OAuth が必要なサーバは Grok Build が
    ブラウザ認証まで行い、トークンを `~/.grok/mcp_credentials.json` に
    保存するため、`Authorization` ヘッダを手書きする必要はありません。
  - Grok Build の scope は `user` と `project` の 2 つだけなので、`local` は
    `project` (`.grok\config.toml`) に丸め、その旨をコメントで注記します。
  - Grok Build は `server__tool` (アンダースコア 2 つ) でツールを
    カタログ登録するため、サーバ名が英字か `_` 以外で始まる場合
    (`InvalidServerName`)、末尾が `_` の場合や `__` を含む場合
    (`InvalidOrAmbiguousQualifiedName`) はツールが読み込まれません。
    `grok mcp add` 自体は成功してしまうため、該当する登録には出力に
    コメントで注記します。
  - Grok Build は URL が `/sse` で終わるリモートサーバを、`type` の指定に
    関わらず SSE として接続します。`--transport http` で登録していても
    同じなので、該当する場合は注記します。
  - ヘッダや env に書いた `${VAR}` / `${VAR:-default}` は Grok Build が
    読み込み時に展開するため、Codex のような `env_http_headers` /
    `bearer_token_env_var` への振り分けはせず、そのまま出力します。
  - stdio の引数は `--` の後ろに、env は `-e KEY=value` を 1 つずつ繰り返す
    形式で出力します (Grok Build の `--env` は 1 フラグにつき 1 ペア)。
  - Windows では `npx` などの `.cmd` シムを Grok Build が `PATH` / `PATHEXT`
    から解決するため、`cmd /c` でくるむ必要はありません。
  - Grok Build は `~/.claude.json` / `.cursor/mcp.json` / `.mcp.json` も
    読み込むので、「mcpServers JSON」タブの出力もそのまま使えます。
  - `npx` / `uvx` のように初回起動でパッケージを取得する stdio サーバは、
    既定 30 秒の `startup_timeout_sec` に収まらないことがあります。その場合は
    貼り付けた `[mcp_servers.<name>]` に `startup_timeout_sec` を足し、
    `grok mcp doctor <name>` で接続を確認してください。
  - opencode はトランスポートを `local` (stdio) と `remote` の 2 種類だけで
    表現します。`remote` は Streamable HTTP → SSE の順に接続を試すため、
    SSE 専用エンドポイントでも `uvx mcp-proxy` / `npx mcp-remote` による
    ブリッジは不要です。該当する登録には注記を添えます。
  - opencode の `local` は `command` と `args` を 1 本の配列にまとめ
    (`"command": ["npx", "-y", ...]`)、環境変数のキーも `env` ではなく
    `environment` なので、自動で変換します。
  - opencode は設定ファイル読み込み時に `{env:VAR}` と `{file:path}` を
    展開します (`${VAR}` 形式は展開しません)。そのため command / args /
    env / headers / リモート URL に書いた `${VAR}` は `{env:VAR}` へ自動
    変換し、変換したフィールドを注記します。`${1BAD}` のように変換できない
    `${...}` が残る場合も別途注記します。
  - 変数が未設定でも opencode はエラーにせず空文字に置換します。env なら
    空の値でサーバが起動し、header なら空の認証情報でリクエストが飛び、
    URL なら `https:///mcp` になって接続に失敗するため、その旨も注記します。
  - URL のホスト部分に `{env:VAR}` を置くと `URL.canParse` を通らず、
    `opencode mcp add --url` が "Invalid URL" で失敗します (パス部分なら
    通ります)。該当する場合はコマンドをコメントアウトして注記します。
    設定ファイルは読み込み前にテキスト置換されるため、「opencode.json」
    タブの出力はホスト部分でもそのまま使えます。
  - 名前を渡す非対話モードの `opencode mcp add <name>` には scope 相当の
    オプションがなく、常にグローバル設定へ書き込みます。`project` / `local`
    を選んでいる場合は、そのまま貼るとグローバル登録になってしまうため
    Codex タブと同じくコマンド自体をコメントアウトし、「opencode.json」タブ
    の出力を使うか引数なしの `opencode mcp add` を対話モードで実行するよう
    注記します。
  - `opencode mcp add` の `--header` は他の CLI と違って `KEY=VALUE` 形式
    (`Key: Value` ではない) です。`--env` は local 専用、`--header` は
    remote 専用で、混ぜると CLI 側がエラーになるため出力を出し分けます。
  - `--env` / `--header` は値を `--env=KEY=VALUE` のように連結した形で
    出力します。分離した形だと、`-FOO` のように `-` で始まるキーを
    yargs がオプションとみなして値を黙って捨ててしまうためです
    (yargs 18.0.0 では `--env -FOO=v` が `env = []`、`--env=-FOO=v` が
    `env = ["-FOO=v"]` になります)。シェルのクオートは引数解析より前に
    外れるので、クオートでは防げません。
  - キー名の検証はトランスポートごとに分けています。env は `=` を含むキーと
    空のキーを弾きます (プロセスの環境は NAME=VALUE の並びなので、`A=B` に
    `c` を入れても子には `A=B=c` として渡り `A` に `B=c` が入ります)。
    header は HTTP の token (英数字と ``!#$%&'*+-.^_`|~``) のみを許すため、
    空白や `:` を含む `Bad Header` / `X:Y` なども弾きます。CLI の
    `--env` / `--header` も最初の `=` で分割するため同じ結果になり、
    `opencode.json` に直接書いても実行時に壊れる (header は fetch が
    リクエスト組み立て時に拒否する) ため、どちらのタブでも
    「キー名を変更してください」と注記します。
  - サーバ名が `-` で始まる場合 (`--url` や `--` など。mcp-kanri の名前
    バリデーションは `[A-Za-z0-9_-]` を許すので入力できてしまいます)、
    シェルのクオートを外すと `opencode mcp add` のオプションと区別が
    つかず名前が渡りません。scope 不一致と同じくコマンドをコメントアウト
    して注記します。`mcp` のキーとしてなら問題なく書けるので、
    「opencode.json」タブの出力はそのまま使えます。
  - opencode の設定は JSONC (`opencode.json` / `opencode.jsonc` とも
    jsonc-parser で読み込み) なので、「opencode.json」タブの注記は `//`
    コメントで出力し、そのまま貼り付けられます。
  - opencode のグローバル設定は XDG 準拠 (`xdg-basedir`) で、Windows でも
    `%USERPROFILE%\.config\opencode\opencode.json` です
    (`%APPDATA%` ではありません)。`XDG_CONFIG_HOME` を設定している場合は
    そちらが優先されます。
  - opencode はツールを `<サーバ名>_<ツール名>` で登録するため、
    `"tools": { "<サーバ名>_*": false }` のように glob で有効/無効を
    切り替えられます。サーバ名に使える文字は `[A-Za-z0-9_-]` で、
    mcp-kanri の名前バリデーションと同じ範囲です。
  - リモートサーバの OAuth は opencode が自動検出し、必要なら
    `opencode mcp auth <name>` でブラウザ認証まで行います。トークンは
    `~/.local/share/opencode/mcp-auth.json` に保存されるので、
    `Authorization` ヘッダを手書きする必要はありません。
- **スコープ対応**: `local` / `project` / `user` を切り替えて出力。各 CLI の
  仕様に合わせて自動で正規化します (Gemini / Qwen / Grok Build は `local` を
  `project` に丸め、Codex は `project` / `local` を `.codex/config.toml` の
  プロジェクト層に割り当て、opencode は `user` をグローバル設定・
  `project` / `local` をプロジェクト直下の `opencode.json` に割り当てるなど)。
- **安全なシェルクオート**: 値に空白や特殊文字を含む場合のみ `'...'` で
  くるみ、POSIX シェルにそのまま貼って動く形式で出力します。
- **ワンクリックコピー**: 生成結果はコピー ボタン 1 つで貼り付けられます。
- **永続化**: 登録は `%APPDATA%\mcp-kanri\mcp-kanri-store.json` に
  バージョニング付き JSON で保存されます。
- **多言語対応 (日本語 / English)**: サイドバー下部のスイッチで言語を切り替え
  られます。選択は `localStorage` に保存され、main プロセス側のエラーメッセージ
  も同じ言語で返ります。

---

## English

mcp-kanri is a Windows 11 desktop app for managing MCP (Model Context Protocol)
configurations. From a single MCP server registration, it generates and copies
the CLI commands for Claude Code / Codex / Gemini / Qwen / Grok Build /
opencode, the `mcpServers` JSON for Claude Desktop / Cursor / VS Code / Google
Antigravity / Cline, the `config.toml` snippets for Codex and Grok Build, and
the `opencode.json` snippet for opencode, all with a single click.

### Screenshots

#### Generate `claude_desktop_config.json` for Claude Desktop with one click

Claude Desktop itself does not support remote (HTTP / SSE) MCP servers
directly, so remote servers are automatically rewritten to a stdio command
that bridges through `uvx mcp-proxy`.

![Claude Desktop tab](docs/images/claude-desktop.png)

#### Generate the `claude mcp add` command for Claude Code (CLI) from the same registration

Switching tabs is enough to convert the same MCP server definition into
another format on the fly.

![Claude Code (CLI) tab](docs/images/claude-code-cli.png)

### Highlights

- **Centralised MCP server registry**: supports the three transports
  (`stdio` / Streamable HTTP / SSE). Edit `command` + `args` + `env`, or
  `url` + `headers`, from a form.
- **Fourteen output formats generated automatically**: a single registration is
  rendered into all of the following:
  - `Claude Code (CLI)` — `claude mcp add ...` command
  - `Codex CLI` — `codex mcp add ...` command
  - `Gemini CLI` — `gemini mcp add ...` command
  - `Qwen Code` — `qwen mcp add ...` command
  - `Grok Build (CLI)` — `grok mcp add ...` command
  - `opencode CLI` — `opencode mcp add ...` command
  - `Claude Desktop` — `%APPDATA%\Claude\claude_desktop_config.json`
  - `mcpServers JSON` — common form for Cursor / Windsurf, etc.
  - `VS Code mcp.json` — VS Code form whose top-level key is `servers`
  - `Codex config.toml` — TOML excerpt for `~/.codex/config.toml` (user) or
    `.codex/config.toml` at the project root (project / local)
  - `Grok config.toml` — `[mcp_servers.<name>]` excerpt for
    `%USERPROFILE%\.grok\config.toml` (user) or `.grok\config.toml` (project)
  - `opencode.json` — `mcp` excerpt for
    `$XDG_CONFIG_HOME/opencode/opencode.json` (user;
    `~/.config/opencode/opencode.json` by default) or `opencode.json` at the
    project root (project / local)
  - `Antigravity mcp_config.json` — Google Antigravity Editor's
    `~/.gemini/antigravity/mcp_config.json` (remote uses the `serverUrl`
    key, not `url`)
  - `Cline (cline_mcp_settings.json)` — JSON for the VS Code extension
    `saoudrizwan.claude-dev`. Its Streamable HTTP `type` literal is
    `"streamableHttp"`, not `"http"`.
- **Per-client quirks handled for you**:
  - Because Claude Desktop only speaks stdio natively, remote servers are
    rewritten via `uvx mcp-proxy`. A Streamable HTTP source gets an explicit
    `--transport streamablehttp`, and each header becomes one repeated
    `--headers K V`.
  - Codex only has the `stdio` and `streamable_http` transports, so SSE
    registrations are bridged to stdio via `npx -y mcp-remote` and the output
    carries a note saying so.
  - Gemini CLI / Qwen Code stdio output places the server's args after a `--`
    separator. Without it, a flag among those args is read as an option of
    the CLI itself.
  - `Authorization: Bearer ${ENV_VAR}` headers are converted to Codex's
    `bearer_token_env_var` / `--bearer-token-env-var` automatically. Other
    `${ENV_VAR}` headers go to `env_http_headers`, and literal values to
    `http_headers`.
  - `codex mcp add` has no scope option and always writes
    `$CODEX_HOME/config.toml` (`~/.codex/config.toml` by default). Codex's
    config loader does read a project layer (`.codex/config.toml`), so for the
    `project` / `local` scopes the "Codex config.toml" tab targets the project
    root and notes that `$CODEX_HOME/config.toml` needs
    `trust_level = "trusted"` under `[projects.'<absolute path>']` — an
    untrusted project layer is skipped entirely. The path is shown
    single-quoted (a TOML literal string) because in double quotes a Windows
    path like `\Users` is read as an escape and the whole `config.toml` stops
    loading. A path containing `'` cannot be a literal string at all, so the
    note covers the double-quoted, `\\`-escaped form for that one case.
    Paste targets name `$CODEX_HOME` rather than a hard-coded
    `~/.codex`, so they still point at the file Codex actually reads when
    `CODEX_HOME` is customised.
  - For the `project` / `local` scopes the `codex mcp add` line in the "Codex
    CLI" tab is itself commented out: the command has no scope, so pasting it
    would register the server globally — against the chosen scope, and before
    the reader reaches the note explaining that. Commenting is line by line,
    so a value containing newlines is commented on every line.
  - Codex has no `local` (private to you) layer, so `local` is emitted as the
    same `.codex/config.toml` as `project`, with a note that the file is
    shared with everyone who checks out the repository. Since `.gitignore`
    only helps while a file is untracked and cannot hide an already-committed
    `.codex/config.toml`, the note points at the `user` scope for secrets.
  - Codex does not expand `env` values for stdio servers, so an entry like
    `KEY = "${KEY}"` — one that references the variable of the same name — is
    moved to `env_vars = ["KEY"]`. (Codex passes only a fixed set of
    environment variables to stdio children, and `env_vars` is what forwards
    the rest.) When the key and the variable name differ the entry is kept
    as-is, and both the CLI and TOML tabs note that it will not be expanded.
    References that `env_vars` cannot express at all — `${VAR:-default}`,
    `prefix-${VAR}` and friends — get the same note, since Codex hands the
    literal text to the server.
  - HTTP headers get the matching treatment: when a value still holds a
    `${...}` after the `env_http_headers` / `bearer_token_env_var` mapping, it
    is flagged, because Codex sends `http_headers` values verbatim and the
    server would receive the literal `${VAR:-default}` text.
  - `codex mcp add --env KEY=VALUE` trims the key only, so env keys with
    surrounding whitespace get a note. A key containing `=` or an empty key
    cannot be represented in a process environment (a list of `NAME=VALUE`
    entries) at all, so both tabs ask for the key to be renamed.
  - The advice for moving a `${KEY}` reference to `env_vars` spells out that
    `codex mcp add` writes env into a `[mcp_servers.<name>.env]` sub-table and
    that `env_vars` belongs in the parent `[mcp_servers.<name>]` table —
    inside the sub-table it fails with
    `invalid type: sequence, expected a string`.
  - A registration that writes the credential straight into `Authorization` is
    flagged: it is stored in plain text in `config.toml`, and `codex mcp list`
    reports the server as bearer-authenticated, so it never shows up as one
    that still needs a login. The suggested form follows the scheme:
    `Bearer ${VAR}` for a Bearer token, and for Basic / Digest and friends,
    the whole value moved into an environment variable referenced as
    `Authorization` = `${VAR}` (which becomes `env_http_headers`).
  - Google Antigravity uses `serverUrl` (camelCase) for remote URLs, which
    differs from every other client; the converter rewrites the key
    automatically. SSE is not supported natively, so SSE entries are
    bridged to stdio via `npx -y mcp-remote`.
  - Cline's Streamable HTTP `type` literal is `"streamableHttp"`
    (camelCase), not `"http"` like Cursor / VS Code / Claude. The
    converter rewrites it automatically. The settings file lives in the VS
    Code globalStorage at
    `saoudrizwan.claude-dev/settings/cline_mcp_settings.json`.
  - Grok Build speaks HTTP and SSE natively (`url` plus `type = "sse"`), so
    remote servers are emitted in that native form instead of being bridged
    through `uvx mcp-proxy` / `npx mcp-remote`. OAuth servers are handled by
    Grok Build itself (browser flow, tokens stored in
    `~/.grok/mcp_credentials.json`), so there is no `Authorization` header to
    write by hand.
  - Grok Build only has the `user` and `project` scopes, so `local` is
    rounded to `project` (`.grok\config.toml`) with a note in the output.
  - Grok Build registers tools under `server__tool` (two underscores), so a
    server name that starts with anything other than a letter or `_`
    (`InvalidServerName`), ends with `_`, or contains `__`
    (`InvalidOrAmbiguousQualifiedName`) never gets its tools loaded. Since
    `grok mcp add` itself still succeeds, the output carries a note whenever
    the name hits one of those rules.
  - Grok Build connects to any remote server whose URL ends with `/sse` over
    SSE regardless of `type`, even when it was added with
    `--transport http`, so that case is flagged too.
  - `${VAR}` / `${VAR:-default}` references in headers and env values are
    expanded by Grok Build at load time, so they are emitted verbatim rather
    than being split into Codex-style `env_http_headers` /
    `bearer_token_env_var`.
  - stdio arguments are placed after `--`, and env values are emitted as one
    repeated `-e KEY=value` flag per entry (Grok Build's `--env` takes a
    single pair per flag).
  - On Windows there is no need to wrap `npx` and friends in `cmd /c`: Grok
    Build resolves the `.cmd` shim through `PATH` / `PATHEXT` itself.
  - Grok Build also reads `~/.claude.json`, `.cursor/mcp.json` and
    `.mcp.json`, so the "mcpServers JSON" tab works for it as well.
  - stdio servers that fetch their package on first launch (`npx`, `uvx`) can
    outlast the 30 second default `startup_timeout_sec`. Add that key to the
    pasted `[mcp_servers.<name>]` block when it happens, then verify with
    `grok mcp doctor <name>`.
  - opencode models transports as just `local` (stdio) and `remote`. A
    `remote` server is tried as Streamable HTTP first and then as SSE, so
    SSE-only endpoints need no `uvx mcp-proxy` / `npx mcp-remote` bridge;
    affected registrations carry a note explaining the fallback.
  - opencode's `local` entries merge `command` and `args` into one array
    (`"command": ["npx", "-y", ...]`) and name the environment map
    `environment` rather than `env`, so both are converted for you.
  - opencode expands `{env:VAR}` and `{file:path}` while loading the config
    and does not understand the `${VAR}` form, so `${VAR}` written in the
    command, the args, env, headers or a remote URL is rewritten to
    `{env:VAR}` and the rewritten fields are noted. Any `${...}` that cannot
    be rewritten (e.g. `${1BAD}`) gets its own note.
  - An unset variable is not an error for opencode: it substitutes an empty
    string. That starts the server with an empty env value, sends an empty
    credential in a header, or collapses a URL to `https:///mcp`, so the
    output says so.
  - A `{env:VAR}` in the host part of a URL does not pass `URL.canParse`, so
    `opencode mcp add --url` fails with "Invalid URL" (the path part is
    fine). The command is commented out with a note in that case. The config
    file is substituted as text before loading, so the "opencode.json" tab
    output works even for the host part.
  - The non-interactive `opencode mcp add <name>` has no scope option and
    always writes the global config. When the scope is `project` or `local`,
    pasting it as-is would register the server globally, so the command
    itself is commented out — as the Codex tab already does — and the output
    says to use the "opencode.json" tab instead, or to run `opencode mcp add`
    with no arguments and pick "Current project".
  - Unlike the other CLIs, `opencode mcp add --header` takes `KEY=VALUE`
    rather than `Key: Value`. `--env` is local-only and `--header` is
    remote-only — mixing them is a CLI error — so the two forms are emitted
    separately.
  - `--env` / `--header` values are emitted attached, as `--env=KEY=VALUE`.
    In the separated form yargs reads a key starting with `-` (such as
    `-FOO`) as another option and silently drops the value (in yargs 18.0.0,
    `--env -FOO=v` gives `env = []` while `--env=-FOO=v` gives
    `env = ["-FOO=v"]`). Shell quoting cannot prevent this, because quotes
    are removed before argument parsing.
  - Key validation is per transport. For env, a key containing `=` and an
    empty key are rejected (a process environment is a list of `NAME=VALUE`
    entries, so `A=B` set to `c` reaches the child as `A=B=c`, i.e. `A` with
    the value `B=c`). For headers, only an HTTP token is allowed
    (alphanumerics plus ``!#$%&'*+-.^_`|~``), which also rejects names with
    whitespace or `:` such as `Bad Header` and `X:Y`. The CLI's `--env` /
    `--header` split on the first `=` and land in the same place, and
    writing it straight into `opencode.json` still breaks at runtime
    (headers are rejected by fetch when the request is built), so both tabs
    carry a note asking you to rename the key.
  - A server name starting with `-` (`--url`, `--`, …; mcp-kanri's name
    validation allows `[A-Za-z0-9_-]`, so it can be entered) is
    indistinguishable from an `opencode mcp add` option once shell quoting
    is removed, and the name never arrives. The command is commented out
    with a note, as for the scope mismatch. Such a name is fine as an `mcp`
    key, so the "opencode.json" tab output is usable as-is.
  - opencode config is JSONC (both `opencode.json` and `opencode.jsonc` are
    read through jsonc-parser), so the "opencode.json" tab emits its notes as
    `//` comments and stays pasteable as-is.
  - opencode's global config is XDG based (`xdg-basedir`), so on Windows it
    lives at `%USERPROFILE%\.config\opencode\opencode.json`, not under
    `%APPDATA%`. `XDG_CONFIG_HOME` takes precedence when it is set.
  - opencode registers tools as `<server-name>_<tool-name>`, so they can be
    toggled with globs such as `"tools": { "<server-name>_*": false }`.
    Server names may use `[A-Za-z0-9_-]`, which matches mcp-kanri's own name
    validation.
  - OAuth for remote servers is detected automatically, and
    `opencode mcp auth <name>` runs the browser flow. Tokens are stored in
    `~/.local/share/opencode/mcp-auth.json`, so there is no need to hand-write
    an `Authorization` header.
- **Scope aware**: emits `local` / `project` / `user`, normalised to each
  CLI's accepted values (e.g. Gemini / Qwen / Grok Build collapse `local` to
  `project`, Codex maps `project` / `local` onto the `.codex/config.toml`
  project layer, and opencode maps `user` to its global config and
  `project` / `local` to `opencode.json` at the project root).
- **Safe shell quoting**: values are single-quoted only when they contain
  whitespace or special characters, so the output can be pasted into any
  POSIX shell as-is.
- **One-click copy**: every generated block has a copy button.
- **Persistent storage**: registrations live in
  `%APPDATA%\mcp-kanri\mcp-kanri-store.json` as versioned JSON.
- **Bilingual UI (日本語 / English)**: switch languages from the sidebar
  footer. The choice is persisted in `localStorage` and the main process
  honours it for error messages too.

## License

MIT
