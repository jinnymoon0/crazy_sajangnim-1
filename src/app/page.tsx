import HomeClient from "@/components/home/HomeClient";
import { getAuthState } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/*
 * The shop is open to anyone. Signing in is only asked for at the blog,
 * and to follow a product through to the retailer.
 *
 * Whether there is a session is read here rather than in the cards, so
 * the answer arrives with the page — asking from the browser would show
 * every product as locked for a moment first.
 */
export default async function HomePage() {
  const state = await getAuthState();

  return <HomeClient isSignedIn={state.authenticated} />;
}
