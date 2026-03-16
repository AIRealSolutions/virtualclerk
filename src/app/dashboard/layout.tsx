import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch user's organizations
  const { data: memberships } = await supabase
    .from("organization_users")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const currentOrg = memberships?.[0]?.organizations ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-civic-slate">
      <Sidebar org={currentOrg} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} org={currentOrg} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
