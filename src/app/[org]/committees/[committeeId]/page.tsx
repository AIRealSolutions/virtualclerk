import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Users, Calendar } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  chair: "Chair",
  vice_chair: "Vice Chair",
  member: "Member",
  alternate: "Alternate",
};

const ROLE_COLORS: Record<string, string> = {
  chair: "bg-civic-blue/10 text-civic-blue",
  vice_chair: "bg-civic-teal/10 text-civic-teal",
  member: "bg-gray-100 text-gray-600",
  alternate: "bg-amber-50 text-amber-700",
};

export default async function CommitteeDetailPage({
  params,
}: {
  params: Promise<{ org: string; committeeId: string }>;
}) {
  const { org: orgSlug, committeeId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Use service client for full data access
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org } = await db
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: committee } = await db
    .from("committees")
    .select("*")
    .eq("id", committeeId)
    .eq("organization_id", org.id)
    .single();

  if (!committee) notFound();

  // Check if current user is admin/clerk (can manage members)
  let canManage = false;
  if (user) {
    const { data: membership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();
    canManage = !!membership && ["org_admin", "clerk"].includes(membership.role);
  }

  const { data: members } = await db
    .from("committee_members")
    .select("id, role, user_id, users(full_name, email)")
    .eq("committee_id", committeeId)
    .order("role");

  return (
    <div className="space-y-6">
      <Link
        href={`/${orgSlug}/committees`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to committees
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">{committee.name}</h1>
          {committee.description && (
            <p className="mt-1 text-sm text-gray-500">{committee.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {committee.meeting_schedule && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {committee.meeting_schedule}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {members?.length ?? 0} members
            </span>
            <span className="capitalize rounded-full bg-gray-100 px-2 py-0.5">
              {committee.visibility_level}
            </span>
          </div>
        </div>
        {canManage && (
          <Link
            href={`/${orgSlug}/committees/${committeeId}/members/new`}
            className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
          >
            <Plus className="h-4 w-4" />
            Add member
          </Link>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Members</h2>
        </div>

        {!members || members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="mb-3 h-10 w-10" />
            <p className="font-medium text-sm">No members yet</p>
            {canManage && (
              <Link
                href={`/${orgSlug}/committees/${committeeId}/members/new`}
                className="mt-3 inline-flex items-center gap-1 text-sm text-civic-blue hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add first member
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => {
              const userInfo = m.users as { full_name: string | null; email: string } | null;
              return (
                <li key={m.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {userInfo?.full_name ?? userInfo?.email ?? "Unknown user"}
                    </p>
                    {userInfo?.full_name && (
                      <p className="text-xs text-gray-400">{userInfo.email}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
