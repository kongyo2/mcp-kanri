import { useMemo, useState } from 'react';
import type { McpServer } from '../../../shared/schema';
import { FORMAT_DESCRIPTORS, formatServer, type FormatId } from '../../../shared/converters';
import { CopyableBlock } from './CopyableBlock';
import { useI18n } from '../i18n';

interface Props {
  readonly server: McpServer;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}

export function Detail({ server, onEdit, onRemove }: Props): JSX.Element {
  const { t, locale } = useI18n();
  const [activeFormat, setActiveFormat] = useState<FormatId>('claude-cli');

  const activeDescriptor = FORMAT_DESCRIPTORS.find((d) => d.id === activeFormat);
  const text = useMemo(
    () => formatServer(activeFormat, server, locale),
    [activeFormat, server, locale],
  );

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
          <span className="tag">{t('detail.scope', { scope: server.scope })}</span>
        </div>
        <div className="meta">
          {server.transport === 'stdio' ? (
            <>
              <span>
                {t('detail.command')} <code>{server.command}</code>
              </span>
              {server.args.length > 0 ? (
                <span>
                  {t('detail.args')} <code>{server.args.join(' ')}</code>
                </span>
              ) : null}
              {Object.keys(server.env).length > 0 ? (
                <span>{t('detail.envCount', { count: Object.keys(server.env).length })}</span>
              ) : null}
            </>
          ) : (
            <>
              <span>
                {t('detail.url')} <code>{server.url}</code>
              </span>
              {Object.keys(server.headers).length > 0 ? (
                <span>
                  {t('detail.headersCount', { count: Object.keys(server.headers).length })}
                </span>
              ) : null}
            </>
          )}
        </div>
        {server.description.length > 0 ? <div className="meta">{server.description}</div> : null}
        <div className="actions">
          <button type="button" className="btn" onClick={onEdit}>
            {t('detail.button.edit')}
          </button>
          <button type="button" className="btn btn-danger" onClick={onRemove}>
            {t('detail.button.remove')}
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
            {t(d.titleKey)}
          </button>
        ))}
      </div>
      {activeDescriptor !== undefined ? (
        <div className="format-subtitle">{t(activeDescriptor.subtitleKey)}</div>
      ) : null}

      <CopyableBlock text={text} />
    </div>
  );
}
