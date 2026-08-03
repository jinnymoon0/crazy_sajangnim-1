import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
 * What each of these accounts is called now.
 *
 * Posts and comments carry the username they were written under, which
 * goes stale the moment someone renames themselves. Looking the current
 * one up means a rename shows on everything the person has written,
 * rather than only on what they write next.
 */
export async function getCurrentUsernames(
  userIds: Array<string | null>,
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => Boolean(id))),
  );

  const names = new Map<string, string>();

  if (ids.length === 0) {
    return names;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("site_users")
    .select("id, username")
    .in("id", ids);

  if (error) {
    console.error("Reading current usernames failed:", error.message);

    return names;
  }

  for (const row of (data ?? []) as { id: string; username: string | null }[]) {
    if (row.username) {
      names.set(row.id, row.username);
    }
  }

  return names;
}
