interface Props {
  readonly label: string;
  readonly hint: string | null;
  readonly children: React.ReactNode;
}

export function FieldShellView({ label, hint, children }: Props): JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {hint !== null ? <span className="hint">{hint}</span> : null}
      {children}
    </div>
  );
}
