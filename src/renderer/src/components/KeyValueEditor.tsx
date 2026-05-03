import { useI18n } from '../i18n';

export interface KeyValueRow {
  readonly id: string;
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

let kvRowCounter = 0;
function nextKvRowId(): string {
  kvRowCounter += 1;
  return `kv-${kvRowCounter}`;
}

export function recordToRows(value: Record<string, string>): KeyValueRow[] {
  return Object.entries(value).map(([k, v]) => ({ id: nextKvRowId(), key: k, value: v }));
}

export function rowsToRecord(rows: readonly KeyValueRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.length > 0) result[row.key] = row.value;
  }
  return result;
}

export function KeyValueEditor({ label, hint, rows, onChange }: Props): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="field">
      <label>{label}</label>
      {hint !== undefined ? <span className="hint">{hint}</span> : null}
      {rows.map((row) => (
        <div key={row.id} className="kv-row">
          <input
            type="text"
            placeholder="KEY"
            value={row.key}
            onChange={(e) => {
              const newKey = e.target.value;
              const next = rows.map((r) => (r.id === row.id ? { ...r, key: newKey } : r));
              onChange([...next]);
            }}
          />
          <input
            type="text"
            placeholder="VALUE"
            value={row.value}
            onChange={(e) => {
              const newValue = e.target.value;
              const next = rows.map((r) => (r.id === row.id ? { ...r, value: newValue } : r));
              onChange([...next]);
            }}
          />
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              const next = rows.filter((r) => r.id !== row.id);
              onChange([...next]);
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
          onChange([...rows, { id: nextKvRowId(), key: '', value: '' }]);
        }}
      >
        {t('form.kv.add')}
      </button>
    </div>
  );
}
