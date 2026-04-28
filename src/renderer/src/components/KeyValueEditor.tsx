export interface KeyValueRow {
  readonly key: string;
  readonly value: string;
}

interface Props {
  readonly label: string;
  readonly hint?: string;
  /**
   * 編集中の行リスト。**空キーの行も保持する** ため `Row[]` で受け取る。
   * 親側でストレージに保存する際は {@link rowsToRecord} で空キーを除いた `Record` に変換する。
   */
  readonly rows: readonly KeyValueRow[];
  readonly onChange: (next: KeyValueRow[]) => void;
}

export function recordToRows(value: Record<string, string>): KeyValueRow[] {
  return Object.entries(value).map(([k, v]) => ({ key: k, value: v }));
}

export function rowsToRecord(rows: readonly KeyValueRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.length > 0) result[row.key] = row.value;
  }
  return result;
}

export function KeyValueEditor({ label, hint, rows, onChange }: Props): JSX.Element {
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
              onChange([...next]);
            }}
          />
          <input
            type="text"
            placeholder="VALUE"
            value={row.value}
            onChange={(e) => {
              const next = rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r));
              onChange([...next]);
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              const next = rows.filter((_, i) => i !== idx);
              onChange([...next]);
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
          onChange([...rows, { key: '', value: '' }]);
        }}
      >
        ＋ 追加
      </button>
    </div>
  );
}
