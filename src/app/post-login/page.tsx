import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const state = await getAuthState();

  if (!state.authenticated) {
    redirect("/login");
  }

  if (!state.username) {
    redirect("/choose-username");
  }

  redirect("/");
}
