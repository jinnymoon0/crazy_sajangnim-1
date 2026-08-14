/*
 * Turning an outbound link into an affiliate link.
 *
 * Every link that leaves this site for a shop goes through here, so
 * that adding a network later is one edit rather than four, and so that
 * a retailer nobody has a programme with still gets a working link.
 *
 * The rule this file exists to keep: when nothing is configured, every
 * function here returns the url it was given, unchanged. A missing
 * environment variable must never turn a product link into a broken one
 * — the shop is worth more sending traffic for free than sending it to
 * a 404.
 *
 * Affiliate ids are not secrets. They travel in the address the browser
 * follows, so they are NEXT_PUBLIC_ and readable in the page; that is
 * how every affiliate link on the web works. Referenced one at a time
 * rather than by computed key because that is the only form Next can
 * substitute at build time.
 */

const IDS = {
  awin: process.env.NEXT_PUBLIC_AWIN_ID,
  rakuten: process.env.NEXT_PUBLIC_RAKUTEN_ID,
  cj: process.env.NEXT_PUBLIC_CJ_ID,
  shareasale: process.env.NEXT_PUBLIC_SHAREASALE_ID,
  linkprice: process.env.NEXT_PUBLIC_LINKPRICE_ID,
  valuecommerce: process.env.NEXT_PUBLIC_VALUECOMMERCE_ID,
  /* Site-wide rather than per-merchant: see resolve() below. */
  skimlinks: process.env.NEXT_PUBLIC_SKIMLINKS_ID,
} as const;

export type AffiliateNetwork = Exclude<keyof typeof IDS, "skimlinks">;

/*
 * The deep-link shapes, one per network.
 *
 * Confirm each against the network's own documentation when you are
 * approved: the shape below is the published one and is stable, but
 * some programmes issue a per-campaign tracking domain or an extra
 * campaign id, and a wrong parameter does not fail loudly — the link
 * works, the click is simply never attributed and the month earns
 * nothing. Click one through and check it appears in the dashboard
 * before rolling a network out across the catalogue.
 */
const DEEP_LINK: Record<
  AffiliateNetwork,
  (affiliateId: string, target: string, merchantId?: string) => string
> = {
  awin: (affiliateId, target, merchantId) =>
    `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${affiliateId}&ued=${encodeURIComponent(target)}`,

  rakuten: (affiliateId, target, merchantId) =>
    `https://click.linksynergy.com/deeplink?id=${affiliateId}&mid=${merchantId}&murl=${encodeURIComponent(target)}`,

  cj: (affiliateId, target, merchantId) =>
    `https://www.anrdoezrs.net/links/${affiliateId}/type/dlg/sid/${merchantId}/${encodeURIComponent(target)}`,

  shareasale: (affiliateId, target, merchantId) =>
    `https://shareasale.com/r.cfm?b=0&u=${affiliateId}&m=${merchantId}&urllink=${encodeURIComponent(target)}`,

  linkprice: (affiliateId, target, merchantId) =>
    `https://click.linkprice.com/click.php?m=${merchantId}&a=${affiliateId}&l=9999&u=${encodeURIComponent(target)}`,

  valuecommerce: (affiliateId, target, merchantId) =>
    `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${affiliateId}&pid=${merchantId}&vc_url=${encodeURIComponent(target)}`,
};

/*
 * Which network carries which shop, and that shop's id within it.
 *
 * Deliberately empty. A guess here is worse than a gap: an entry with
 * the wrong merchant id produces a link that still opens the shop, so
 * nothing looks broken while every click goes unattributed. Add a row
 * only once the programme is approved and its merchant id is in front
 * of you, for example:
 *
 *   "endclothing.com": { network: "awin", merchantId: "1234" },
 *   "musinsa.com":     { network: "linkprice", merchantId: "5678" },
 *
 * Hostnames are matched without "www." and including subdomains, so one
 * row covers us.brand.com and jp.brand.com alike.
 */
const MERCHANTS: Record<string, { network: AffiliateNetwork; merchantId: string }> =
  {};

/* Marks a url that some network has already rewritten. */
const ALREADY_AFFILIATED =
  /awin1\.com|linksynergy\.com|anrdoezrs\.net|dpbolvw\.net|kqzyfj\.com|shareasale\.com|linkprice\.com|valuecommerce\.com|go\.skimresources\.com|redirectingat\.com/i;

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/*
 * A shop's own domain, or one of ours.
 *
 * Our own links must never be wrapped: sending a visitor to the blog
 * by way of an affiliate network would be absurd, and on some networks
 * it is a terms violation that costs the account.
 */
const OUR_DOMAINS = /(^|\.)crazy-sajangnim\.vercel\.app$|(^|\.)localhost$/i;

/*
 * Whether anything here can pay. The disclosure asks before rendering,
 * because a site announcing commissions it does not earn is making a
 * different false statement.
 */
export function isAffiliateConfigured(): boolean {
  return Object.values(IDS).some(Boolean);
}

export function affiliateUrl(url: string): string {
  const host = hostOf(url);

  if (!host || OUR_DOMAINS.test(host) || ALREADY_AFFILIATED.test(url)) {
    return url;
  }

  /* A programme of our own comes first: it pays better than a network. */
  const merchant =
    MERCHANTS[host] ??
    Object.entries(MERCHANTS).find(([domain]) =>
      host.endsWith(`.${domain}`),
    )?.[1];

  if (merchant) {
    const affiliateId = IDS[merchant.network];

    if (affiliateId) {
      return DEEP_LINK[merchant.network](
        affiliateId,
        url,
        merchant.merchantId,
      );
    }
  }

  /*
   * Skimlinks covers whatever is left. It pays less than joining a
   * programme directly, and it is the difference between earning
   * something from sixty-nine shops now and nothing until sixty-nine
   * applications are approved.
   */
  if (IDS.skimlinks) {
    return `https://go.skimresources.com/?id=${IDS.skimlinks}&url=${encodeURIComponent(url)}`;
  }

  return url;
}

/*
 * Whether a link earns anything, for the click event that already
 * fires. Without it the analytics cannot answer the only question that
 * matters once this is live: which retailers are worth the requests
 * that keep them in the catalogue.
 */
export function affiliateNetworkFor(url: string): string | null {
  const host = hostOf(url);

  if (!host || OUR_DOMAINS.test(host)) {
    return null;
  }

  const merchant =
    MERCHANTS[host] ??
    Object.entries(MERCHANTS).find(([domain]) =>
      host.endsWith(`.${domain}`),
    )?.[1];

  if (merchant && IDS[merchant.network]) {
    return merchant.network;
  }

  return IDS.skimlinks ? "skimlinks" : null;
}
