import HomeClient from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

/*
 * The shop is open to anyone. Signing in is only asked for at the blog,
 * where writing carries a name.
 */
export default function HomePage() {
  return <HomeClient />;
}
