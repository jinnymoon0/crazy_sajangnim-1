import HomeClient from "@/components/home/HomeClient";
import { requireOnboardedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/*
 * The shop requires a signed-in account with a chosen username; the
 * redirect happens server-side so it works without any client
 * JavaScript.
 */
export default async function HomePage() {
  await requireOnboardedUser();

  return <HomeClient />;
}
