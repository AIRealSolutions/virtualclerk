import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, committees(name)")
    .eq("organization_id", organization.id)
    .order("meeting_date", { ascending: false });

  const grouped = groupByMonth(meetings ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">Meetings</h1>
          <p className="text-sm text-gray-500">
            All scheduled and past meetings
          </p>
        </div>
        <Link
          href={`/${orgSlug}/meetings/new`}
          className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
        >
          <Plus className="h-4 w-4" />
          New Meeting
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-gray-400">
          <Calendar className="mb-3 h-12 w-12" />
          <p className="font-medium">No meetings yet</p>
          <p className="mt-1 text-sm">Schedule your first meeting to get started</p>
          <Link
            href={`/${orgSlug}/meetings/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
          >
            <Plus className="h-4 w-4" />
            Schedule a meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                {month}
              </h2>
              <div className="space-y-2">
                {items.map((m) => (
                  <Link
                    key={m.id}
                    href={`/${orgSlug}/meetings/${m.id}`}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-civic-blue/30 hover:shadow-sm transition-all"
                  >
                    {/* Date block */}
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-civic-slate text-center">
                      <span className="text-xs font-medium uppercase text-gray-500">
                        {new Date(m.meeting_date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none text-civic-navy">
                        {new Date(m.meeting_date).getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{m.title}</p>
                      <p className="text-sm text-gray-500">
                        {(m.committees as any)?.name ?? "No committee"} •{" "}
                        {m.location ?? "No location"}
                      </p>
                    </div>

                    <StatusBadge status={m.status} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByMonth(meetings: any[]) {
  return meetings.reduce<Record<string, any[]>>((acc, m) => {
    const key = new Date(m.meeting_date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    (acc[key] ??= []).push(m);
    return acc;
  }, {});
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  agenda_finalized: "bg-blue-100 text-blue-700",
  meeting_complete: "bg-green-100 text-green-700",
  minutes_published: "bg-teal-100 text-teal-700",
};
const statusLabels: Record<string, string> = {
  draft: "Draft",
  agenda_finalized: "Agenda Ready",
  meeting_complete: "Complete",
  minutes_published: "Published",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[status] ?? statusColors.draft}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
