/*
 * Who may moderate other people's writing.
 *
 * Ordinarily a post or comment belongs to whoever wrote it and nobody
 * else can touch it. The super admin is the exception: they can edit or
 * delete anything, so the site can be cleaned up without going through
 * the database by hand.
 *
 * Identified by email rather than by account id, matching the admin app,
 * so the same person is the super admin in both without a second list to
 * keep in step. Override with SUPER_ADMIN_EMAIL if it ever changes.
 */

import { auth } from "@/auth";

import { isAuthor, type StoredAuthorship, type Viewer } from "./authorship";

export const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL ?? "jinnymoon0@gmail.com"
).toLowerCase();

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

/*
 * Only a Google-verified address counts. An unverified one proves
 * nothing about who owns it, and this address is the whole of the
 * permission — anyone able to set it unverified could claim the site.
 */
export async function isViewerSuperAdmin(): Promise<boolean> {
  const session = await auth();

  if (session?.user?.googleEmailVerified === false) {
    return false;
  }

  return isSuperAdminEmail(session?.user?.email);
}

/*
 * True when this viewer may change the row: they wrote it, or they are
 * the super admin.
 */
export async function canModerate(
  row: StoredAuthorship,
  viewer: Viewer,
): Promise<boolean> {
  return isAuthor(row, viewer) || (await isViewerSuperAdmin());
}
