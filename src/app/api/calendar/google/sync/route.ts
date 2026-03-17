import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return res.ok ? data.access_token : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const orgSlug = request.nextUrl.searchParams.get("orgSlug");
  if (!orgSlug) return NextResponse.json({ error: "orgSlug required" }, { status: 400 });

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org } = await db
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { data: gcal } = await db
    .from("google_calendar_connections")
    .select("*")
    .eq("organization_id", org.id)
    .single();

  if (!gcal) {
    return NextResponse.redirect(new URL(`/${orgSlug}/calendar?error=not_connected`, request.url));
  }

  // Refresh token if expired
  let accessToken = (gcal as any).access_token as string;
  const expiry = (gcal as any).token_expiry ? new Date((gcal as any).token_expiry) : null;
  if (expiry && expiry <= new Date() && (gcal as any).refresh_token) {
    const newToken = await refreshAccessToken((gcal as any).refresh_token);
    if (newToken) {
      accessToken = newToken;
      await db
        .from("google_calendar_connections")
        .update({ access_token: newToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString() })
        .eq("organization_id", org.id);
    }
  }

  const googleCalendarId = (gcal as any).google_calendar_id ?? "primary";

  // Fetch upcoming meetings
  const today = new Date().toISOString().split("T")[0];
  const { data: meetings } = await db
    .from("meetings")
    .select("id, title, meeting_date, start_time, end_time, location, description, meeting_link")
    .eq("organization_id", org.id)
    .gte("meeting_date", today)
    .order("meeting_date");

  let synced = 0;
  let failed = 0;

  for (const m of meetings ?? []) {
    const startDateTime = m.start_time
      ? `${m.meeting_date}T${m.start_time}:00`
      : `${m.meeting_date}T09:00:00`;
    const endDateTime = m.end_time
      ? `${m.meeting_date}T${m.end_time}:00`
      : `${m.meeting_date}T10:00:00`;

    const event = {
      summary: `[VirtualClerk] ${m.title}`,
      description: [
        m.description ?? "",
        m.meeting_link ? `Join: ${m.meeting_link}` : "",
        `\nManage at: ${process.env.NEXT_PUBLIC_APP_URL}/${orgSlug}/meetings/${m.id}`,
      ].filter(Boolean).join("\n"),
      location: m.location ?? undefined,
      start: { dateTime: startDateTime, timeZone: "America/New_York" },
      end: { dateTime: endDateTime, timeZone: "America/New_York" },
      extendedProperties: {
        private: { virtualclerk_meeting_id: m.id },
      },
    };

    // Check if event already exists by extendedProperties query
    const searchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events?privateExtendedProperty=virtualclerk_meeting_id%3D${m.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let existingEventId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      existingEventId = searchData.items?.[0]?.id ?? null;
    }

    const apiUrl = existingEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${existingEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`;

    const res = await fetch(apiUrl, {
      method: existingEventId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (res.ok) synced++;
    else failed++;
  }

  // Redirect back with results
  return NextResponse.redirect(
    new URL(`/${orgSlug}/calendar?synced=${synced}&failed=${failed}`, request.url)
  );
}
