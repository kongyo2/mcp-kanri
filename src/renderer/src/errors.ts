/**
 * 例外を UI 表示用の文字列に正規化する。Error なら `message`、それ以外は `String()` 化する。
 * IPC 越し / スキーマ検証 / 予期しない値のいずれで throw されても表示できるようにするための共通処理。
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
