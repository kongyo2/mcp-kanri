import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { kanri } from './api';
import type { McpServer, McpServerInput } from '../../shared/schema';
import { EditorForm } from './components/EditorForm';
import { Detail } from './components/Detail';

type Mode = { kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; serverId: string };

interface Toast {
  readonly message: string;
  readonly kind: 'success' | 'error';
}

export function App(): JSX.Element {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [toast, setToast] = useState<Toast | null>(null);
  const [storePath, setStorePath] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: 'success' | 'error'): void => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, kind });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const list = await kanri.list();
      setServers(list);
    } catch (err) {
      // ストアの読込/パース/スキーマ検証で失敗した場合、storage.ts は空ストアで
      // 上書きせず例外を投げてくる。ユーザにエラーを提示し、サイドバーは前回値
      // (空でも) を維持する。
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void reload();
    void kanri.getStorePath().then(setStorePath);
  }, [reload]);

  const selected = useMemo(
    () => servers.find((s) => s.id === selectedId) ?? null,
    [servers, selectedId],
  );

  const editingTarget =
    mode.kind === 'edit' ? (servers.find((s) => s.id === mode.serverId) ?? null) : null;

  const handleCreate = async (input: McpServerInput): Promise<void> => {
    try {
      const created = await kanri.create(input);
      await reload();
      setSelectedId(created.id);
      setMode({ kind: 'idle' });
      showToast(`"${created.name}" を登録しました`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleUpdate = async (id: string, input: McpServerInput): Promise<void> => {
    try {
      const updated = await kanri.update(id, input);
      await reload();
      setSelectedId(updated.id);
      setMode({ kind: 'idle' });
      showToast(`"${updated.name}" を更新しました`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleRemove = async (server: McpServer): Promise<void> => {
    if (!window.confirm(`"${server.name}" を削除します。よろしいですか?`)) return;
    try {
      await kanri.remove(server.id);
      await reload();
      if (selectedId === server.id) setSelectedId(null);
      showToast(`"${server.name}" を削除しました`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">MCP管理</span>
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => {
              setMode({ kind: 'create' });
              setSelectedId(null);
            }}
          >
            ＋ 新規登録
          </button>
        </div>
        <div className="sidebar-list">
          {servers.length === 0 ? (
            <div className="sidebar-empty">
              登録済みの MCP はありません。
              <br />
              右上の「＋ 新規登録」から追加してください。
            </div>
          ) : (
            servers.map((s) => {
              const isSelected = mode.kind === 'idle' && selectedId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`sidebar-item${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setMode({ kind: 'idle' });
                    setSelectedId(s.id);
                  }}
                >
                  <span className="sidebar-item-name">
                    {s.name}
                    <span className={`tag ${s.transport}`}>{s.transport}</span>
                  </span>
                  <span className="sidebar-item-meta">
                    {s.transport === 'stdio'
                      ? `${s.command}${s.args.length > 0 ? ' ' + s.args.join(' ') : ''}`
                      : s.url}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="sidebar-footer">
          ストア: <code>{storePath}</code>
        </div>
      </aside>

      <main className="main">
        {mode.kind === 'create' ? (
          <>
            <h2 style={{ marginTop: 0 }}>新規 MCP を登録</h2>
            <EditorForm onCancel={() => setMode({ kind: 'idle' })} onSubmit={handleCreate} />
          </>
        ) : mode.kind === 'edit' && editingTarget !== null ? (
          <>
            <h2 style={{ marginTop: 0 }}>"{editingTarget.name}" を編集</h2>
            <EditorForm
              initial={editingTarget}
              onCancel={() => setMode({ kind: 'idle' })}
              onSubmit={(input) => handleUpdate(editingTarget.id, input)}
            />
          </>
        ) : selected !== null ? (
          <Detail
            server={selected}
            onEdit={() => setMode({ kind: 'edit', serverId: selected.id })}
            onRemove={() => {
              void handleRemove(selected);
            }}
          />
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>📋</div>
            <div style={{ fontSize: 16, color: 'var(--text)' }}>MCP を選択してください</div>
            <div>
              一つの登録から、Claude / Codex CLI コマンドや
              <br />
              `mcpServers` JSON / VS Code `servers` JSON / Codex `config.toml` を
              <br />
              切り替えてコピーできます。
            </div>
          </div>
        )}
      </main>

      {toast !== null ? <div className={`toast ${toast.kind}`}>{toast.message}</div> : null}
    </div>
  );
}
