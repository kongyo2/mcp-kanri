# MCP管理 (mcp-kanri)

Windows 11 向けの MCP (Model Context Protocol) 設定管理デスクトップアプリ。

1 つの MCP サーバ登録から、各クライアント (Claude Code CLI / Codex CLI / Claude
Desktop / Cursor / Windsurf / Cline / Gemini / VS Code / Codex `config.toml`)
へ貼り付けるための **コマンド or JSON / TOML** をワンクリックで切り替えてコピー
できます。MCP サーバ自体をホストする機能はありません — あくまで設定スニペットを
生成・コピーするためのツールです。

## 主な機能

- MCP サーバ登録 (Zod でスキーマ検証)
  - `stdio` (ローカルプロセス: `command` + `args` + `env`)
  - `http` (Streamable HTTP リモート: `url` + `headers`)
  - `sse` (Server-Sent Events リモート: `url` + `headers`)
  - `--scope` (`local` / `project` / `user`) を Claude / Codex CLI コマンド側に反映
- 1 つの登録から複数フォーマットへ即座に変換 + 「コピー」ボタン
  - **Claude Code (CLI)**: `claude mcp add --transport ... --scope ... <name> -- <cmd> <args>`
  - **Codex CLI**: `codex mcp add --env ... <name> -- <cmd> <args>`
  - **mcpServers JSON**: Claude Desktop / Cursor / Windsurf / Cline / Gemini で共通
  - **VS Code mcp.json**: トップレベルキーが `servers` (mcpServers ではない)
  - **Codex config.toml**: `[mcp_servers.<name>]` ブロック (snake_case)
- 永続化は `app.getPath('userData')/mcp-kanri-store.json` に JSON で保存
- UI 言語: 日本語

## 例: chrome-devtools-mcp を登録すると…

| 出力フォーマット | 結果                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Claude CLI       | `claude mcp add --transport stdio --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest`          |
| Codex CLI        | `codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`                                          |
| mcpServers JSON  | `{ "mcpServers": { "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] } } }` |
| VS Code JSON     | `{ "servers": { "chrome-devtools": { ... } } }`                                                               |
| Codex TOML       | `[mcp_servers.chrome-devtools]\ncommand = "npx"\nargs = ["-y", "chrome-devtools-mcp@latest"]`                 |

## 技術スタック

- Electron + Vite (`electron-vite`)
- React 18 + TypeScript (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)
- Zod でスキーマ検証
- Oxlint (lint) / Prettier (format)
- Vitest (converters の単体テスト 14 件)
- electron-builder で Windows 向け NSIS インストーラ (`MCP-Kanri-Setup-x.y.z.exe`) を生成

## 開発コマンド

```bash
npm install
npm run dev          # electron-vite で dev サーバ + Electron 起動
npm run build        # main / preload / renderer をビルド
npm run build:win    # 加えて electron-builder で Windows .exe を生成
npm run typecheck    # tsc --noEmit (web + node 両方)
npm run lint         # oxlint --silent
npm run lint:strict  # oxlint --deny-warnings
npm run format       # prettier --write
npm run format:check # prettier --check
npm run test         # vitest run (converters の正当性をテスト)
```

## プロジェクト構成

```
src/
├── main/        # Electron main process
│   ├── index.ts
│   └── storage.ts          # userData 配下の JSON で永続化
├── preload/     # contextBridge で renderer に API を公開
│   ├── index.ts
│   └── index.d.ts
├── renderer/    # React UI (日本語)
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── main.tsx
│       ├── styles.css
│       └── components/
│           ├── ArgListEditor.tsx
│           ├── CopyableBlock.tsx
│           ├── Detail.tsx
│           ├── EditorForm.tsx
│           └── KeyValueEditor.tsx
└── shared/      # main / preload / renderer で共有
    ├── converters.ts       # 各フォーマットへの変換 (テスト対象)
    ├── converters.test.ts
    ├── ipc.ts              # IPC チャネル定数 + KanriApi 型
    └── schema.ts           # Zod 定義 (McpServer / McpServerInput / StoreFile)
```

## 参考

- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
  の README で例として使われている `chrome-devtools` サーバ
- [mcp-router/mcp-router](https://github.com/mcp-router/mcp-router) — 各クライアントの
  設定ファイル所在 (`AppPaths`) と `StandardAppDefinition` を参考
- [pathintegral-institute/mcpm.sh](https://github.com/pathintegral-institute/mcpm.sh) —
  各クライアント (`claude_desktop`, `codex_cli`, `vscode`, `cursor`, `windsurf`,
  `cline`, `gemini_cli`) の設定キー名 / TOML キー名を参考
- 公式ドキュメント
  - Claude Code MCP: <https://docs.anthropic.com/en/docs/claude-code/mcp>
  - Codex MCP (`mcp_servers` TOML): OpenAI Codex docs

## TypeScript / Lint 方針

- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` +
  `noImplicitOverride` + `noUnusedLocals` 等を有効化
- `any` / `as` キャスト / `!` 非 null アサーションを避ける
- Lint baseline は [`ts-npm-oxlint-setup`](https://github.com/kongyo2/ts-npm-oxlint-setup) と
  [`kongyo-ts-prettier-setup`](https://github.com/kongyo2/kongyo-ts-prettier-setup)
  の SKILL.md に準拠

## ライセンス

MIT
