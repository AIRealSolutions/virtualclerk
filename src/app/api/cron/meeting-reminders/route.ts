import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// This route is called by Vercel Cron — protected by CRON_SECRET
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role for cron jobs (bypasses RLS)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Fetch meetings happening tomorrow
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, meeting_date, start_time, location, organization_id, organizations(name)")
    .eq("meeting_date", tomorrowStr)
    .in("status", ["draft", "agenda_finalized"]);

  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ message: "No meetings tomorrow", count: 0 });
  }

  let notificationsCreated = 0;

  for (const meeting of meetings) {
    const org = meeting.organizations as any;

    // Get org members to notify
    const { data: members } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", meeting.organization_id)
      .eq("is_active", true)
      .in("role", ["org_admin", "clerk", "board_member", "committee_member"]);

    if (!members) continue;

    const notifications = members.map((m) => ({
      organization_id: meeting.organization_id,
      user_id: m.user_id,
      title: `Meeting tomorrow: ${meeting.title}`,
      body: `${org?.name} has a meeting scheduled for tomorrow${
        meeting.start_time ? ` at ${meeting.start_time}` : ""
      }${meeting.location ? ` at ${meeting.location}` : ""}.`,
      type: "meeting_reminder",
      link: `/dashboard`,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    if (!error) notificationsCreated += notifications.length;
  }

  return NextResponse.json({
    message: `Reminders sent`,
    meetings: meetings.length,
    notifications: notificationsCreated,
  });
}
