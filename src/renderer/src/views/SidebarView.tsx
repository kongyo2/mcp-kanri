import { Fragment } from 'react';
import { useEmit } from '../mvp/react';
import type { ServerItemViewModel, SidebarViewModel } from '../presenter/types';
import { ServerRowNode } from './nodes';

interface Props {
  readonly vm: SidebarViewModel;
}

export function SidebarView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{vm.title}</span>
        <button
          type="button"
          className="btn btn-primary btn-small"
          data-focus-fallback=""
          onClick={() => {
            emit({ scope: 'local', type: 'action/create' });
          }}
        >
          {vm.newServerLabel}
        </button>
      </div>
      <div className="sidebar-list">
        {vm.emptyLines !== null ? (
          <div className="sidebar-empty">
            {vm.emptyLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </div>
        ) : (
          vm.items.map((item) => (
            <ServerRowNode key={item.id} serverId={item.id}>
              <ServerListItemView vm={item} />
            </ServerRowNode>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <div className="lang-switcher" aria-label={vm.languageLabel}>
          <span className="lang-switcher-label">{vm.languageLabel}:</span>
          {vm.languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`lang-switcher-btn${option.active ? ' is-active' : ''}`}
              aria-pressed={option.active}
              onClick={() => {
                emit({ scope: 'local', type: 'locale/selected', value: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="sidebar-store">
          {vm.storeLabel} <code>{vm.storePath}</code>
        </div>
      </div>
    </aside>
  );
}

function ServerListItemView({ vm }: { readonly vm: ServerItemViewModel }): JSX.Element {
  const emit = useEmit();
  return (
    <button
      type="button"
      className={`sidebar-item${vm.selected ? ' is-selected' : ''}`}
      onClick={() => {
        emit({ scope: 'local', type: 'row/activated' });
      }}
    >
      <span className="sidebar-item-name">
        {vm.name}
        <span className={vm.transportTagClass}>{vm.transport}</span>
      </span>
      <span className="sidebar-item-meta">{vm.meta}</span>
    </button>
  );
}
