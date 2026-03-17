import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const orgSlug = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam || !code || !orgSlug) {
    return NextResponse.redirect(
      new URL(`/${orgSlug ?? ""}/calendar?error=google_auth_failed`, request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.redirect(
      new URL(`/${orgSlug}/calendar?error=token_exchange_failed`, request.url)
    );
  }

  // Fetch the primary calendar info
  let calendarName: string | null = null;
  let googleCalendarId = "primary";
  try {
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (calRes.ok) {
      const calData = await calRes.json();
      calendarName = calData.summary ?? null;
      googleCalendarId = calData.id ?? "primary";
    }
  } catch { /* non-fatal */ }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org } = await db
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) {
    return NextResponse.redirect(new URL(`/${orgSlug}/calendar?error=org_not_found`, request.url));
  }

  // Upsert the connection
  const tokenExpiry = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await db.from("google_calendar_connections").upsert({
    organization_id: org.id,
    connected_by: user.id,
    google_calendar_id: googleCalendarId,
    calendar_name: calendarName,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    token_expiry: tokenExpiry,
  }, { onConflict: "organization_id" });

  return NextResponse.redirect(new URL(`/${orgSlug}/calendar?connected=1`, request.url));
}
