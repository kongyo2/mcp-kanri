import { useEffect, useRef, useState } from 'react';

interface Props {
  readonly text: string;
}

export function CopyableBlock({ text }: Props): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const resetTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const clearResetTimer = (): void => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  // フォーマットタブ切替やサーバ選択変更で `text` が変わった場合は、
  // 直前のコピー成功表示が誤って残らないようリセットする。
  useEffect(() => {
    clearResetTimer();
    setCopied(false);
  }, [text]);

  // アンマウント時にタイマーを解放しておく。
  useEffect(() => clearResetTimer, []);

  const onCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      clearResetTimer();
      setCopied(true);
      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 1500);
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
