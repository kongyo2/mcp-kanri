/**
 * リスト行の React key 用に、プレフィックス付きの単調増加 ID を生成するファクトリ。
 *
 * 各エディタがモジュールスコープで独自のカウンタ (クロージャ) を持つことで、
 * 行を追加した順に `arg-1`, `arg-2`, ... のような一意な key を採番する。
 * この ID は React の key と行内マッチングにのみ使い、保存時は値だけを取り出す
 * ({@link ArgListEditor} の `argRowsToStrings` / {@link KeyValueEditor} の `rowsToRecord`)
 * ため、具体的な文字列自体には意味がなく「一意であること」だけが要件。
 */
export function makeRowIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}
