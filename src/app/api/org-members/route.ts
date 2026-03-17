import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Verify requester is a member
    const { data: membership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: members } = await db
      .from("organization_users")
      .select("user_id, users(full_name, email)")
      .eq("organization_id", org.id)
      .eq("is_active", true);

    const result = (members ?? []).map((m) => {
      const u = m.users as { full_name: string | null; email: string } | null;
      return { user_id: m.user_id, full_name: u?.full_name ?? null, email: u?.email ?? "" };
    });

    return NextResponse.json({ members: result });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
