import type { ReactNode } from "react";

/*
 * Post text with its links made clickable.
 *
 * Every post that starts from a product carries that product's address
 * in the body, and it was rendered as characters — the one thing in the
 * post a reader actually wants to follow, and they had to select and
 * copy it.
 *
 * Nothing here interprets markup. The text is split on this pattern and
 * the pieces are returned as React nodes, so anything that is not a
 * matched http(s) address stays a plain string and is escaped by React
 * as usual. That is the whole reason this is not a markdown renderer or
 * a dangerouslySetInnerHTML: post bodies are written by whoever has an
 * account, and the only thing they can turn into an element here is a
 * URL that already looked like one.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

/*
 * Trailing punctuation belongs to the sentence, not the address. A link
 * at the end of "look at https://shop.com/item." is the item, and the
 * full stop is not part of it.
 */
function splitTrailingPunctuation(url: string): [string, string] {
  const match = /[.,;:!?)\]}]+$/.exec(url);

  if (!match) {
    return [url, ""];
  }

  /* A closing bracket is only punctuation if nothing opened it. */
  const trailing = match[0];
  const head = url.slice(0, url.length - trailing.length);

  return [head, trailing];
}

/* What to show instead of a 120-character address with three query strings. */
function label(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    const shown = `${parsed.hostname.replace(/^www\./, "")}${path}`;

    return shown.length > 60 ? `${shown.slice(0, 57)}…` : shown;
  } catch {
    return url;
  }
}

/*
 * The same text for somewhere a link cannot go.
 *
 * Each card in the feed is one big link to the post, and an anchor
 * inside an anchor is not valid HTML — browsers recover by splitting
 * the card, which breaks the click target. So the preview shows the
 * address shortened to something readable instead of turning it into a
 * second link, and a post whose body is only a link still previews as
 * "graphpaper-tokyo.com/products/…" rather than as nothing at all.
 */
export function shortenUrls(text: string): string {
  return text.replace(new RegExp(URL_PATTERN.source, URL_PATTERN.flags), (match) => {
    const [url, trailing] = splitTrailingPunctuation(match);

    return `${label(url)}${trailing}`;
  });
}

export default function PostText({ children }: { children: string }) {
  const nodes: ReactNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  /* Fresh state per call: a /g regex carries lastIndex between uses. */
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  while ((match = pattern.exec(children)) !== null) {
    const [url, trailing] = splitTrailingPunctuation(match[0]);

    if (match.index > lastIndex) {
      nodes.push(children.slice(lastIndex, match.index));
    }

    nodes.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        /*
         * nofollow because these are links a stranger typed, and
         * noopener because the page they open must not get a handle on
         * this one.
         */
        rel="noopener noreferrer nofollow"
        className="font-semibold text-neutral-950 underline decoration-neutral-400 underline-offset-4 transition hover:decoration-neutral-950"
      >
        {label(url)}
      </a>,
    );

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < children.length) {
    nodes.push(children.slice(lastIndex));
  }

  return <>{nodes}</>;
}
