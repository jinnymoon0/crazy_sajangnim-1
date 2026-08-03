/*
 * Who wrote a post or comment.
 *
 * The account id is what identifies the writer; author_name is only the
 * username they had at the time, kept so rows whose account was deleted
 * still show something, and so rows written before the id column
 * existed still work.
 */

export interface StoredAuthorship {
  user_id: string | null;
  author_name: string | null;
}

export interface Viewer {
  id: string;
  username: string;
}

/*
 * True when this viewer wrote it.
 *
 * The id is checked first and alone: once a row has one, the stored
 * name is a stale label and must not be allowed to grant access — two
 * accounts can hold the same name in turn, if the first is deleted and
 * the second claims it.
 *
 * Only rows with no id fall back to the name, which is the best that
 * can be said about writing that predates the column.
 */
export function isAuthor(row: StoredAuthorship, viewer: Viewer): boolean {
  if (row.user_id) {
    return row.user_id === viewer.id;
  }

  return Boolean(row.author_name) && row.author_name === viewer.username;
}

/*
 * The name to show. Prefer whatever the account is called now, so a
 * rename carries across everything the person has written; fall back to
 * the name recorded at the time for accounts that are gone.
 */
export function displayName(
  row: StoredAuthorship,
  currentNames: Map<string, string>,
): string {
  const current = row.user_id ? currentNames.get(row.user_id) : undefined;

  return current ?? row.author_name ?? "Anonymous";
}
