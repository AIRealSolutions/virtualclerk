import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getOrgSettings, resolveGoogleClientId } from "@/lib/org-settings";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const orgSlug = request.nextUrl.searchParams.get("orgSlug");
  if (!orgSlug) return NextResponse.json({ error: "orgSlug required" }, { status: 400 });

  // Resolve org
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: org } = await db
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Use org-specific key if available, fall back to platform key
  const orgSettings = await getOrgSettings(org.id);
  const clientId = resolveGoogleClientId(orgSettings.google_client_id);

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/${orgSlug}/settings?error=google_not_configured`, request.url)
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: orgSlug,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
