interface Props {
  readonly label: string;
  readonly hint?: string;
  readonly value: Record<string, string>;
  readonly onChange: (next: Record<string, string>) => void;
}

interface Row {
  readonly key: string;
  readonly value: string;
}

function toRows(value: Record<string, string>): Row[] {
  return Object.entries(value).map(([k, v]) => ({ key: k, value: v }));
}

function toRecord(rows: readonly Row[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.length > 0) result[row.key] = row.value;
  }
  return result;
}

export function KeyValueEditor({ label, hint, value, onChange }: Props): JSX.Element {
  const rows = toRows(value);

  const update = (next: Row[]): void => {
    onChange(toRecord(next));
  };

  return (
    <div className="field">
      <label>{label}</label>
      {hint !== undefined ? <span className="hint">{hint}</span> : null}
      {rows.map((row, idx) => (
        <div key={idx} className="kv-row">
          <input
            type="text"
            placeholder="KEY"
            value={row.key}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r));
              update(next);
            }}
          />
          <input
            type="text"
            placeholder="VALUE"
            value={row.value}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r));
              update(next);
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              const next = rows.filter((_, i) => i !== idx);
              update(next);
            }}
          >
            削除
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-small"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          update([...rows, { key: '', value: '' }]);
        }}
      >
        ＋ 追加
      </button>
    </div>
  );
}
