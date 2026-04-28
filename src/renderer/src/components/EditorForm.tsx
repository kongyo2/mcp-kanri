import { useEffect, useMemo, useState } from 'react';
import {
  McpServerInputSchema,
  type McpServer,
  type McpServerInput,
  type Scope,
  type Transport,
} from '../../../shared/schema';
import { KeyValueEditor, recordToRows, rowsToRecord, type KeyValueRow } from './KeyValueEditor';
import { ArgListEditor } from './ArgListEditor';

interface Props {
  readonly initial?: McpServer;
  readonly onCancel: () => void;
  readonly onSubmit: (input: McpServerInput) => Promise<void>;
}

interface DraftState {
  transport: Transport;
  name: string;
  description: string;
  scope: Scope;
  command: string;
  args: string[];
  envRows: KeyValueRow[];
  url: string;
  headerRows: KeyValueRow[];
}

function buildInitialDraft(initial?: McpServer): DraftState {
  if (initial === undefined) {
    return {
      transport: 'stdio',
      name: '',
      description: '',
      scope: 'user',
      command: 'npx',
      args: ['-y'],
      envRows: [],
      url: '',
      headerRows: [],
    };
  }
  if (initial.transport === 'stdio') {
    return {
      transport: 'stdio',
      name: initial.name,
      description: initial.description ?? '',
      scope: initial.scope,
      command: initial.command,
      args: [...initial.args],
      envRows: recordToRows(initial.env),
      url: '',
      headerRows: [],
    };
  }
  return {
    transport: initial.transport,
    name: initial.name,
    description: initial.description ?? '',
    scope: initial.scope,
    command: 'npx',
    args: [],
    envRows: [],
    url: initial.url,
    headerRows: recordToRows(initial.headers),
  };
}

function buildInput(draft: DraftState): McpServerInput {
  const base = {
    name: draft.name.trim(),
    description: draft.description,
    scope: draft.scope,
  };
  if (draft.transport === 'stdio') {
    return {
      ...base,
      transport: 'stdio' as const,
      command: draft.command.trim(),
      args: draft.args.filter((a) => a.length > 0),
      env: rowsToRecord(draft.envRows),
    };
  }
  return {
    ...base,
    transport: draft.transport,
    url: draft.url.trim(),
    headers: rowsToRecord(draft.headerRows),
  };
}

export function EditorForm({ initial, onCancel, onSubmit }: Props): JSX.Element {
  const [draft, setDraft] = useState<DraftState>(() => buildInitialDraft(initial));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(buildInitialDraft(initial));
  }, [initial]);

  const validation = useMemo(() => McpServerInputSchema.safeParse(buildInput(draft)), [draft]);
  const isValid = validation.success;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(buildInput(draft));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const validationMessage =
    !isValid && validation.error.issues[0] !== undefined
      ? validation.error.issues[0].message
      : null;

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <div className="field">
        <label>トランスポート</label>
        <span className="hint">
          stdio はローカルプロセス起動 / http (Streamable) と sse はリモート MCP サーバ
        </span>
        <div className="transport-tabs" role="tablist">
          {(['stdio', 'http', 'sse'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={draft.transport === t}
              className={draft.transport === t ? 'is-active' : ''}
              onClick={() => setDraft({ ...draft, transport: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>名前 (server-name)</label>
          <span className="hint">
            英数字 / `_` / `-` / `.` のみ。例: `chrome-devtools` `context7`
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="chrome-devtools"
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>scope (Claude CLI / Codex CLI)</label>
          <span className="hint">CLI の `--scope` オプションに反映</span>
          <select
            value={draft.scope}
            onChange={(e) => setDraft({ ...draft, scope: e.target.value as Scope })}
          >
            <option value="local">local (現プロジェクトのみ)</option>
            <option value="project">project (.mcp.json として共有)</option>
            <option value="user">user (全プロジェクト共通)</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>説明 (任意)</label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="メモ・用途・参考リンクなど"
        />
      </div>

      {draft.transport === 'stdio' ? (
        <>
          <div className="field-row">
            <div className="field" style={{ flex: '0 0 220px' }}>
              <label>command</label>
              <input
                type="text"
                value={draft.command}
                onChange={(e) => setDraft({ ...draft, command: e.target.value })}
                placeholder="npx"
                required
              />
            </div>
          </div>
          <ArgListEditor
            label="args"
            hint="例: `-y`, `chrome-devtools-mcp@latest`"
            value={draft.args}
            onChange={(next) => setDraft({ ...draft, args: next })}
          />
          <KeyValueEditor
            label="env"
            hint="MCP サーバに渡す環境変数 (API キーなど)"
            rows={draft.envRows}
            onChange={(next) => setDraft({ ...draft, envRows: next })}
          />
        </>
      ) : (
        <>
          <div className="field">
            <label>URL</label>
            <span className="hint">
              {draft.transport === 'http'
                ? '例: https://mcp.notion.com/mcp'
                : '例: https://mcp.asana.com/sse'}
            </span>
            <input
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://"
              required
            />
          </div>
          <KeyValueEditor
            label="headers"
            hint="例: `Authorization` = `Bearer xxxxx`"
            rows={draft.headerRows}
            onChange={(next) => setDraft({ ...draft, headerRows: next })}
          />
        </>
      )}

      {error !== null ? (
        <div className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      ) : null}
      {validationMessage !== null ? (
        <div className="hint" style={{ color: 'var(--warning)' }}>
          {validationMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
          {initial !== undefined ? '更新する' : '登録する'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
