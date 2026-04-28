import { useState } from 'react';

interface Props {
  readonly text: string;
}

export function CopyableBlock({ text }: Props): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  const onCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('clipboard write failed', err);
    }
  };

  return (
    <pre className="code-block">
      <button
        className="btn btn-small copy-btn"
        type="button"
        onClick={() => {
          void onCopy();
        }}
      >
        {copied ? 'コピーしました' : 'コピー'}
      </button>
      <code>{text}</code>
    </pre>
  );
}
