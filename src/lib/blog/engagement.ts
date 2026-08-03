import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface PostEngagement {
  likes: number;
  comments: number;
}

const EMPTY: PostEngagement = { likes: 0, comments: 0 };

const PAGE_SIZE = 1000;

function isMissingTable(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

/*
 * Read a whole column, a page at a time. A response is capped at a
 * thousand rows however large a limit is asked for, so a single read
 * quietly stops counting once a table passes that.
 */
async function readColumn(
  table: string,
  column: string,
): Promise<string[] | null> {
  const supabase = getSupabaseAdmin();
  const values: string[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;

    const { data, error } = await supabase
      .from(table)
      .select(column)
      .order(column)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (isMissingTable(error)) {
        return null;
      }

      console.error(`Reading ${table}.${column} failed:`, error.message);

      return null;
    }

    const rows = (data ?? []) as unknown as Record<string, string | null>[];

    for (const row of rows) {
      const value = row[column];

      if (value) {
        values.push(value);
      }
    }

    if (rows.length < PAGE_SIZE) {
      return values;
    }
  }
}

/*
 * How many likes and comments each post has. Counted in one pass for
 * the whole feed rather than per card, which would be one round trip
 * per post.
 */
export async function getEngagementByPost(): Promise<
  Map<string, PostEngagement>
> {
  const [likes, comments] = await Promise.all([
    readColumn("blog_post_likes", "post_id"),
    readColumn("blog_comments", "post_id"),
  ]);

  const engagement = new Map<string, PostEngagement>();

  const bump = (postId: string, key: keyof PostEngagement) => {
    const entry = engagement.get(postId) ?? { ...EMPTY };

    entry[key] += 1;
    engagement.set(postId, entry);
  };

  for (const postId of likes ?? []) {
    bump(postId, "likes");
  }

  for (const postId of comments ?? []) {
    bump(postId, "comments");
  }

  return engagement;
}

/*
 * The counts for one post, and whether this reader has liked it.
 */
export async function getPostEngagement(
  postId: string,
  userId: string | null,
): Promise<PostEngagement & { likedByViewer: boolean }> {
  const supabase = getSupabaseAdmin();

  const [likes, comments, mine] = await Promise.all([
    supabase
      .from("blog_post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId),

    supabase
      .from("blog_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId),

    userId
      ? supabase
          .from("blog_post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    likes: likes.error ? 0 : (likes.count ?? 0),
    comments: comments.error ? 0 : (comments.count ?? 0),
    likedByViewer: Boolean(mine.data),
  };
}
