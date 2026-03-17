import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  // Only admins can disconnect
  const { data: membership } = await db
    .from("organization_users")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["org_admin", "clerk"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  await db
    .from("google_calendar_connections")
    .delete()
    .eq("organization_id", org.id);

  return NextResponse.redirect(new URL(`/${orgSlug}/calendar?disconnected=1`, request.url));
}
