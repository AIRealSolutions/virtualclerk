import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  orgSlug: z.string(),
  timezone: z.string().optional(),
  openai_api_key: z.string().optional(),
  google_client_id: z.string().optional(),
  google_client_secret: z.string().optional(),
});

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgSlug = request.nextUrl.searchParams.get("orgSlug");
    if (!orgSlug) return NextResponse.json({ error: "orgSlug required" }, { status: 400 });

    const client = db();

    const { data: org } = await client
      .from("organizations")
      .select("id, name, description, org_type")
      .eq("slug", orgSlug)
      .single();

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const { data: membership } = await client
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: settings } = await client
      .from("organization_settings")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    return NextResponse.json({
      org,
      settings: {
        timezone: settings?.timezone ?? "America/New_York",
        openai_api_key: mask(settings?.openai_api_key),
        google_client_id: mask(settings?.google_client_id),
        google_client_secret: mask(settings?.google_client_secret),
        has_openai_key: !!settings?.openai_api_key,
        has_google_client_id: !!settings?.google_client_id,
        has_google_client_secret: !!settings?.google_client_secret,
      },
      isAdmin: ["org_admin", "clerk"].includes(membership.role),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { orgSlug, ...fields } = parsed.data;
    const client = db();

    const { data: org } = await client
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const { data: membership } = await client
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["org_admin", "clerk"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Fetch existing settings so we don't overwrite keys with empty strings
    const { data: existing } = await client
      .from("organization_settings")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    const updates: Record<string, string | null> = {
      timezone: fields.timezone ?? existing?.timezone ?? "America/New_York",
      updated_at: new Date().toISOString(),
    };

    // Only update a key if a non-empty, non-masked value was provided
    for (const key of ["openai_api_key", "google_client_id", "google_client_secret"] as const) {
      const val = fields[key];
      if (val && !val.includes("••••")) {
        updates[key] = val;
      } else if (val === "") {
        // Explicit clear
        updates[key] = null;
      }
      // Otherwise keep existing
    }

    const { error } = await client
      .from("organization_settings")
      .upsert({ organization_id: org.id, ...updates }, { onConflict: "organization_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
