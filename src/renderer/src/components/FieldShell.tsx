interface Props {
  readonly label: string;
  readonly hint?: string | undefined;
  readonly children: React.ReactNode;
}

/**
 * リストエディタ ({@link ArgListEditor} / {@link KeyValueEditor}) が共有する外枠。
 *
 * `.field` コンテナ + ラベル + 任意のヒント文だけを描画し、行リストと「追加」ボタンは
 * `children` として各エディタが差し込む。両エディタで完全に同一だったこのラッパ部分を
 * 1 箇所に集約する (描画される DOM は従来と同一)。
 */
export function FieldShell({ label, hint, children }: Props): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {hint !== undefined ? <span className="hint">{hint}</span> : null}
      {children}
    </div>
  );
}
