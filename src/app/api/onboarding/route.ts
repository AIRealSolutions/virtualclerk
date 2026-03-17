import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  org_type: z.enum(["government", "nonprofit", "committee", "business", "personal"]),
  description: z.string().optional(),
});

// Service role client bypasses RLS — only used after auth is confirmed
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // Verify user is authenticated via cookie session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, slug, org_type, description } = parsed.data;

  // Use service client for writes (avoids RLS session issues during onboarding)
  const db = getServiceClient();

  // Ensure user profile exists
  await db.from("users").upsert({
    id: user.id,
    email: user.email!,
    full_name: user.user_metadata?.full_name ?? null,
  }, { onConflict: "id" });

  // Create organization
  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({ name, slug, org_type, description: description || null })
    .select("id, slug")
    .single();

  if (orgError) {
    const msg = orgError.message.includes("duplicate")
      ? "That URL slug is already taken — try another."
      : orgError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Add creator as org_admin
  const { error: memberError } = await db
    .from("organization_users")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "org_admin",
      is_active: true,
    });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({ slug: org.slug });
}
