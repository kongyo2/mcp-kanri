import { useEmit } from '../mvp/react';
import type { KeyValueListViewModel } from '../presenter/types';
import { FieldShellView } from './FieldShellView';

interface Props {
  readonly vm: KeyValueListViewModel;
}

export function KeyValueListView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <FieldShellView label={vm.label} hint={vm.hint}>
      {vm.rows.map((row) => (
        <div key={row.id} className="kv-row">
          <input
            type="text"
            placeholder={vm.keyPlaceholder}
            value={row.key}
            disabled={vm.disabled}
            onChange={(event) => {
              emit({
                scope: 'local',
                type: 'rows/edited',
                rowId: row.id,
                part: 'key',
                value: event.target.value,
              });
            }}
          />
          <input
            type="text"
            placeholder={vm.valuePlaceholder}
            value={row.value}
            disabled={vm.disabled}
            onChange={(event) => {
              emit({
                scope: 'local',
                type: 'rows/edited',
                rowId: row.id,
                part: 'value',
                value: event.target.value,
              });
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            disabled={vm.disabled}
            onClick={() => {
              emit({ scope: 'local', type: 'rows/removed', rowId: row.id });
            }}
          >
            {vm.removeLabel}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small add-row-btn"
        disabled={vm.disabled}
        onClick={() => {
          emit({ scope: 'local', type: 'rows/appended' });
        }}
      >
        {vm.addLabel}
      </button>
    </FieldShellView>
  );
}
