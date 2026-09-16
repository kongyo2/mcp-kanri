interface Props {
  readonly labelId: string;
  readonly label: string;
  readonly hint: string | null;
  readonly children: React.ReactNode;
}

export function FieldShellView({ labelId, label, hint, children }: Props): JSX.Element {
  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="field-label">
        {label}
      </span>
      {hint !== null ? <span className="hint">{hint}</span> : null}
      {children}
    </div>
  );
}
