import { useI18n } from '../i18n';

export interface ArgRow {
  readonly id: string;
  readonly value: string;
}

let argRowCounter = 0;
function nextArgRowId(): string {
  argRowCounter += 1;
  return `arg-${argRowCounter}`;
}

export function stringsToArgRows(values: readonly string[]): ArgRow[] {
  return values.map((v) => ({ id: nextArgRowId(), value: v }));
}

export function argRowsToStrings(rows: readonly ArgRow[]): string[] {
  return rows.map((r) => r.value);
}

interface Props {
  readonly label: string;
  readonly hint?: string;
  readonly value: readonly ArgRow[];
  readonly onChange: (next: ArgRow[]) => void;
}

export function ArgListEditor({ label, hint, value, onChange }: Props): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="field">
      <label>{label}</label>
      {hint !== undefined ? <span className="hint">{hint}</span> : null}
      {value.map((row, idx) => (
        <div key={row.id} className="list-row">
          <input
            type="text"
            value={row.value}
            placeholder={t('form.args.placeholder', { index: idx + 1 })}
            onChange={(e) => {
              const newValue = e.target.value;
              const next = value.map((r) => (r.id === row.id ? { ...r, value: newValue } : r));
              onChange(next);
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              const next = value.filter((r) => r.id !== row.id);
              onChange(next);
            }}
          >
            {t('form.kv.remove')}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          onChange([...value, { id: nextArgRowId(), value: '' }]);
        }}
      >
        {t('form.args.add')}
      </button>
    </div>
  );
}
