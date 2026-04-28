import { useMemo, useState } from 'react';
import type { McpServer } from '../../../shared/schema';
import { FORMAT_DESCRIPTORS, formatServer, type FormatId } from '../../../shared/converters';
import { CopyableBlock } from './CopyableBlock';

interface Props {
  readonly server: McpServer;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}

export function Detail({ server, onEdit, onRemove }: Props): JSX.Element {
  const [activeFormat, setActiveFormat] = useState<FormatId>('claude-cli');

  const activeDescriptor = FORMAT_DESCRIPTORS.find((d) => d.id === activeFormat);
  const text = useMemo(() => formatServer(activeFormat, server), [activeFormat, server]);

  const transportTagClass =
    server.transport === 'stdio'
      ? 'tag stdio'
      : server.transport === 'http'
        ? 'tag http'
        : 'tag sse';

  return (
    <div>
      <div className="detail-header">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h1>{server.name}</h1>
          <span className={transportTagClass}>{server.transport}</span>
          <span className="tag">scope: {server.scope}</span>
        </div>
        <div className="meta">
          {server.transport === 'stdio' ? (
            <>
              <span>
                command: <code>{server.command}</code>
              </span>
              {server.args.length > 0 ? (
                <span>
                  args: <code>{server.args.join(' ')}</code>
                </span>
              ) : null}
              {Object.keys(server.env).length > 0 ? (
                <span>env: {Object.keys(server.env).length} 件</span>
              ) : null}
            </>
          ) : (
            <>
              <span>
                url: <code>{server.url}</code>
              </span>
              {Object.keys(server.headers).length > 0 ? (
                <span>headers: {Object.keys(server.headers).length} 件</span>
              ) : null}
            </>
          )}
        </div>
        {server.description.length > 0 ? <div className="meta">{server.description}</div> : null}
        <div className="actions">
          <button type="button" className="btn" onClick={onEdit}>
            編集
          </button>
          <button type="button" className="btn btn-danger" onClick={onRemove}>
            削除
          </button>
        </div>
      </div>

      <div className="format-tabs" role="tablist">
        {FORMAT_DESCRIPTORS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={activeFormat === d.id}
            className={activeFormat === d.id ? 'is-active' : ''}
            onClick={() => setActiveFormat(d.id)}
          >
            {d.title}
          </button>
        ))}
      </div>
      {activeDescriptor !== undefined ? (
        <div className="format-subtitle">{activeDescriptor.subtitle}</div>
      ) : null}

      <CopyableBlock text={text} />
    </div>
  );
}
