import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export default async function CommitteesPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  const { data: committees } = await supabase
    .from("committees")
    .select("*, committee_members(count)")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">Committees</h1>
          <p className="text-sm text-gray-500">
            {committees?.length ?? 0} active committees
          </p>
        </div>
        <Link
          href={`/${orgSlug}/committees/new`}
          className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
        >
          <Plus className="h-4 w-4" />
          New Committee
        </Link>
      </div>

      {!committees || committees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-gray-400">
          <Users className="mb-3 h-12 w-12" />
          <p className="font-medium">No committees yet</p>
          <p className="mt-1 text-sm">
            Create your first committee to organize meetings and members
          </p>
          <Link
            href={`/${orgSlug}/committees/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
          >
            <Plus className="h-4 w-4" />
            Create committee
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {committees.map((c) => {
            const memberCount = (c.committee_members as any)?.[0]?.count ?? 0;
            return (
              <Link
                key={c.id}
                href={`/${orgSlug}/committees/${c.id}`}
                className="rounded-lg border border-gray-200 bg-white p-5 hover:border-civic-blue/30 hover:shadow-sm transition-all"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-civic-slate">
                  <Users className="h-5 w-5 text-civic-blue" />
                </div>
                <h3 className="font-semibold text-civic-navy">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {c.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{memberCount} members</span>
                  {c.meeting_schedule && (
                    <span className="truncate">{c.meeting_schedule}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
