import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, ExternalLink } from "lucide-react";
import CalendarView from "@/components/calendar/calendar-view";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Check if Google Calendar is connected
  let googleConnected = false;
  let googleCalendarName: string | null = null;
  try {
    const { data: gcal } = await db
      .from("google_calendar_connections")
      .select("google_calendar_id, calendar_name")
      .eq("organization_id", org.id)
      .single();
    googleConnected = !!gcal;
    googleCalendarName = (gcal as any)?.calendar_name ?? null;
  } catch {
    // table may not exist yet
  }

  // Check if current user is admin
  let isAdmin = false;
  if (user) {
    const { data: membership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();
    isAdmin = !!membership && ["org_admin", "clerk"].includes(membership.role);
  }

  // Fetch meetings for this org (next 6 months + past 1 month)
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 1);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 6);

  const { data: meetings } = await db
    .from("meetings")
    .select("id, title, meeting_date, status")
    .eq("organization_id", org.id)
    .gte("meeting_date", rangeStart.toISOString().split("T")[0])
    .lte("meeting_date", rangeEnd.toISOString().split("T")[0])
    .order("meeting_date");

  // Fetch tasks with due dates
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, due_date, status, priority")
    .eq("organization_id", org.id)
    .neq("status", "complete")
    .not("due_date", "is", null)
    .gte("due_date", rangeStart.toISOString().split("T")[0])
    .lte("due_date", rangeEnd.toISOString().split("T")[0])
    .order("due_date");

  const events = [
    ...(meetings ?? []).map((m) => ({
      id: m.id,
      date: m.meeting_date,
      title: m.title,
      type: "meeting" as const,
      href: `/${orgSlug}/meetings/${m.id}`,
      status: m.status,
    })),
    ...(tasks ?? []).map((t) => ({
      id: t.id,
      date: t.due_date!,
      title: t.title,
      type: "task" as const,
      href: `/${orgSlug}/tasks/${t.id}`,
      status: t.status,
      priority: t.priority,
    })),
  ];

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">Calendar</h1>
          <p className="text-sm text-gray-500">Meetings and task due dates</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/meetings/new`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Meeting
          </Link>
          <Link
            href={`/${orgSlug}/tasks/new`}
            className="inline-flex items-center gap-1.5 rounded-md bg-civic-blue px-3 py-2 text-sm font-medium text-white hover:bg-civic-navy"
          >
            <Plus className="h-4 w-4" />
            Task
          </Link>
        </div>
      </div>

      {/* Google Calendar connection banner */}
      {isAdmin && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
          googleConnected
            ? "border-green-200 bg-green-50"
            : "border-gray-200 bg-white"
        }`}>
          <div className="flex items-center gap-3">
            <CalendarDays className={`h-5 w-5 ${googleConnected ? "text-green-600" : "text-gray-400"}`} />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {googleConnected
                  ? `Google Calendar connected${googleCalendarName ? ` — ${googleCalendarName}` : ""}`
                  : "Connect Google Calendar"}
              </p>
              <p className="text-xs text-gray-500">
                {googleConnected
                  ? "Meetings will sync automatically when created"
                  : "Sync your meetings to Google Calendar"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {googleConnected ? (
              <>
                <a
                  href={`/api/calendar/google/sync?orgSlug=${orgSlug}`}
                  className="inline-flex items-center gap-1 rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                >
                  Sync now
                </a>
                <a
                  href={`/api/calendar/google/disconnect?orgSlug=${orgSlug}`}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                >
                  Disconnect
                </a>
              </>
            ) : (
              <a
                href={`/api/calendar/google/connect?orgSlug=${orgSlug}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-civic-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-civic-navy"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Connect
              </a>
            )}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <CalendarView
        events={events}
        orgSlug={orgSlug}
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth()}
      />

      {/* Upcoming list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Upcoming this month</h2>
        </div>
        <ul className="divide-y">
          {events
            .filter((e) => {
              const d = new Date(e.date + "T00:00:00");
              return d >= now && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 10)
            .map((e) => (
              <li key={e.id}>
                <Link
                  href={e.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${
                    e.type === "meeting" ? "bg-civic-blue" : e.priority === "high" ? "bg-red-500" : "bg-amber-400"
                  }`} />
                  <span className="flex-1 text-sm text-gray-800">{e.title}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                    e.type === "meeting" ? "bg-civic-blue/10 text-civic-blue" : "bg-gray-100 text-gray-600"
                  }`}>
                    {e.type}
                  </span>
                </Link>
              </li>
            ))}
          {events.filter((e) => {
            const d = new Date(e.date + "T00:00:00");
            return d >= now && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length === 0 && (
            <li className="py-8 text-center text-sm text-gray-400">Nothing scheduled this month</li>
          )}
        </ul>
      </div>
    </div>
  );
}
