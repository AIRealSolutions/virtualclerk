import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: { committeeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgSlug = request.nextUrl.searchParams.get("orgSlug");
    if (!orgSlug) return NextResponse.json({ error: "orgSlug required" }, { status: 400 });

    const { committeeId } = params;

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

    // Get all org members with their user profiles
    const { data: orgMembers } = await db
      .from("organization_users")
      .select("user_id, users(full_name, email)")
      .eq("organization_id", org.id)
      .eq("is_active", true);

    // Get existing committee member user_ids to exclude them
    const { data: existingMembers } = await db
      .from("committee_members")
      .select("user_id")
      .eq("committee_id", committeeId);

    const existingIds = new Set((existingMembers ?? []).map((m) => m.user_id));

    const eligible = (orgMembers ?? [])
      .filter((m) => !existingIds.has(m.user_id))
      .map((m) => {
        const u = m.users as { full_name: string | null; email: string } | null;
        return {
          user_id: m.user_id,
          full_name: u?.full_name ?? null,
          email: u?.email ?? "",
        };
      });

    return NextResponse.json({ members: eligible });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
