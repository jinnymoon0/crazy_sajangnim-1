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
 * Only the account id counts. The stored name is never enough: a
 * username is unique among accounts that exist, not across time, so
 * deleting an account frees its name for anyone else to claim. Reading
 * the name as proof of authorship would hand that person everything the
 * first one wrote.
 *
 * Rows with no id are therefore editable by nobody. They are writing
 * from before the id was recorded whose account has since gone — the
 * author cannot be established, so no one should be trusted as them.
 */
export function isAuthor(row: StoredAuthorship, viewer: Viewer): boolean {
  return Boolean(row.user_id) && row.user_id === viewer.id;
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
