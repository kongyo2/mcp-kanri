import { useEmit } from '../mvp/react';
import type { ArgListViewModel } from '../presenter/types';
import { FieldShellView } from './FieldShellView';

interface Props {
  readonly vm: ArgListViewModel;
}

export function ArgListView({ vm }: Props): JSX.Element {
  const emit = useEmit();
  return (
    <FieldShellView labelId={vm.labelId} label={vm.label} hint={vm.hint}>
      {vm.rows.map((row) => (
        <div key={row.id} className="list-row">
          <input
            type="text"
            value={row.value}
            placeholder={row.placeholder}
            aria-label={row.ariaLabel}
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
