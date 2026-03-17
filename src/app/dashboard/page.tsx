import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Calendar,
  CheckSquare,
  FileText,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";


export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's primary org
  const { data: membership } = await supabase
    .from("organization_users")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");


  const org = membership.organizations!;
  const orgSlug = org.slug;

  // Fetch dashboard data in parallel
  const [meetingsRes, tasksRes, documentsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, meeting_date, status, committee_id")
      .eq("organization_id", org.id)
      .gte("meeting_date", new Date().toISOString().split("T")[0])
      .order("meeting_date")
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, assigned_to")
      .eq("organization_id", org.id)
      .in("status", ["open", "in_progress", "overdue"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, name, file_type, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const upcomingMeetings = meetingsRes.data ?? [];
  const openTasks = tasksRes.data ?? [];
  const recentDocs = documentsRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-civic-navy">
          Good morning — {org.name}
        </h1>
        <p className="text-sm text-gray-500">
          Here&apos;s what&apos;s happening today
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Upcoming Meetings"
          value={upcomingMeetings.length}
          href={`/${orgSlug}/meetings`}
        />
        <StatCard
          icon={CheckSquare}
          label="Open Tasks"
          value={openTasks.length}
          href={`/${orgSlug}/tasks`}
        />
        <StatCard
          icon={FileText}
          label="Recent Documents"
          value={recentDocs.length}
          href={`/${orgSlug}/documents`}
        />
        <StatCard
          icon={Users}
          label="Committees"
          value={0}
          href={`/${orgSlug}/committees`}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming meetings */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-civic-navy">Upcoming Meetings</h2>
            <Link
              href={`/${orgSlug}/meetings`}
              className="text-xs text-civic-teal hover:underline"
            >
              View all
            </Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <EmptyState icon={Calendar} message="No upcoming meetings" />
          ) : (
            <ul className="space-y-3">
              {upcomingMeetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/${orgSlug}/meetings/${m.id}`}
                    className="flex items-start gap-3 rounded-md p-2 hover:bg-civic-slate"
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-civic-teal" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {m.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.meeting_date}
                      </p>
                    </div>
                    <MeetingStatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open tasks */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-civic-navy">Open Tasks</h2>
            <Link
              href={`/${orgSlug}/tasks`}
              className="text-xs text-civic-teal hover:underline"
            >
              View all
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} message="No open tasks" />
          ) : (
            <ul className="space-y-3">
              {openTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/${orgSlug}/tasks`}
                    className="flex items-start gap-3 rounded-md p-2 hover:bg-civic-slate"
                  >
                    {t.status === "overdue" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {t.title}
                      </p>
                      {t.due_date && (
                        <p className="text-xs text-gray-500">
                          Due {t.due_date}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent documents */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-civic-navy">Recent Documents</h2>
            <Link
              href={`/${orgSlug}/documents`}
              className="text-xs text-civic-teal hover:underline"
            >
              View all
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <EmptyState icon={FileText} message="No documents uploaded yet" />
          ) : (
            <div className="divide-y">
              {recentDocs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {d.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {d.created_at.split("T")[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 hover:border-civic-blue/30 hover:shadow-sm transition-shadow"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-civic-slate">
        <Icon className="h-5 w-5 text-civic-blue" />
      </div>
      <div>
        <p className="text-2xl font-bold text-civic-navy">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ElementType;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Icon className="mb-2 h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    agenda_finalized: "bg-blue-100 text-blue-700",
    meeting_complete: "bg-green-100 text-green-700",
    minutes_published: "bg-teal-100 text-teal-700",
  };
  const label: Record<string, string> = {
    draft: "Draft",
    agenda_finalized: "Agenda Ready",
    meeting_complete: "Complete",
    minutes_published: "Published",
  };
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.draft}`}
    >
      {label[status] ?? status}
    </span>
  );
}
