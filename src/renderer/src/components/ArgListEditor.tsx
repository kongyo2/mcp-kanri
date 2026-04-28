interface Props {
  readonly label: string;
  readonly hint?: string;
  readonly value: readonly string[];
  readonly onChange: (next: string[]) => void;
}

export function ArgListEditor({ label, hint, value, onChange }: Props): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {hint !== undefined ? <span className="hint">{hint}</span> : null}
      {value.map((arg, idx) => (
        <div key={idx} className="list-row">
          <input
            type="text"
            value={arg}
            placeholder={`引数 ${idx + 1}`}
            onChange={(e) => {
              const next = value.map((v, i) => (i === idx ? e.target.value : v));
              onChange(next);
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              const next = value.filter((_, i) => i !== idx);
              onChange(next);
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
          onChange([...value, '']);
        }}
      >
        ＋ 引数を追加
      </button>
    </div>
  );
}
