"use client";

import { BLOG_SHARE_DRAFT_KEY, type BlogShareDraft } from "@/types/blog";

/*
 * The item handed over by "Share on blog", read by everything on the
 * page that needs it.
 *
 * Session storage cannot serve two readers here. The draft is deleted
 * as soon as it is read — deliberately, so that opening the blog again
 * next week does not reopen a half-written post about a sale that
 * ended — and the compose form used to be the only reader. The page now
 * also shows the item at the top, and whichever of the two ran first
 * was deleting the draft out from under the other.
 *
 * So the read happens once and the result is kept in memory for as long
 * as the tab is on this page. Storage is emptied on that first read,
 * exactly as before; every later reader is served from the copy.
 */
const seen = new Map<string, BlogShareDraft | null>();

function parse(raw: string): BlogShareDraft | null {
  try {
    const draft = JSON.parse(raw) as BlogShareDraft;

    return draft?.productName && draft?.brandName ? draft : null;
  } catch {
    return null;
  }
}

/*
 * `productId` is what the address bar says the page is about. A draft
 * for a different item is left in storage rather than consumed: it
 * belongs to a page the reader has not opened yet, and eating it here
 * would leave that page blank.
 */
export function readShareDraft(productId?: string): BlogShareDraft | null {
  const key = productId ?? "";

  const remembered = seen.get(key);

  if (remembered !== undefined) {
    return remembered;
  }

  let draft: BlogShareDraft | null = null;

  try {
    const raw = sessionStorage.getItem(BLOG_SHARE_DRAFT_KEY);

    draft = raw ? parse(raw) : null;

    if (draft && productId && draft.productId !== productId) {
      draft = null;
    } else if (draft) {
      sessionStorage.removeItem(BLOG_SHARE_DRAFT_KEY);
    }
  } catch {
    /* Private browsing, or storage disabled. The page still works. */
    draft = null;
  }

  seen.set(key, draft);

  return draft;
}
