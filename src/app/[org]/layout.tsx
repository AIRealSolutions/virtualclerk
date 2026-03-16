import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  // Check membership
  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-civic-slate">
      <Sidebar org={organization} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} org={organization} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
