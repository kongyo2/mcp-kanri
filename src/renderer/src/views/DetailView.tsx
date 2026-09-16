import { useEmit } from '../mvp/react';
import type { DetailViewModel } from '../presenter/types';
import { TabsNode } from './nodes';
import { TabsView } from './TabsView';

interface Props {
  readonly vm: DetailViewModel;
}

export function DetailView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <div>
      <div className="detail-header">
        <div className="detail-title">
          <h1>{vm.name}</h1>
          <span className={vm.transportTagClass}>{vm.transport}</span>
          <span className="tag">{vm.scopeLabel}</span>
        </div>
        <div className="meta">
          {vm.meta.map((item) => (
            <span key={item.id}>
              {item.label}
              {item.code !== null ? (
                <>
                  {' '}
                  <code>{item.code}</code>
                </>
              ) : null}
            </span>
          ))}
        </div>
        {vm.description !== null ? <div className="meta">{vm.description}</div> : null}
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              emit({ scope: 'local', type: 'action/edit' });
            }}
          >
            {vm.editLabel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              emit({ scope: 'local', type: 'action/remove' });
            }}
          >
            {vm.removeLabel}
          </button>
        </div>
      </div>

      <TabsNode channel="format">
        <TabsView vm={vm.tabs} />
      </TabsNode>
      {vm.subtitle !== null ? <div className="format-subtitle">{vm.subtitle}</div> : null}

      <pre className="code-block">
        <button
          className="btn btn-small copy-btn"
          type="button"
          onClick={() => {
            emit({ scope: 'local', type: 'clipboard/requested' });
          }}
        >
          {vm.code.copyLabel}
        </button>
        <code>{vm.code.text}</code>
      </pre>
    </div>
  );
}
