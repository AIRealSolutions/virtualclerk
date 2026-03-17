import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  orgSlug: z.string(),
  user_id: z.string().uuid(),
  role: z.enum(["chair", "vice_chair", "member", "alternate"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { committeeId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { orgSlug, ...fields } = parsed.data;
    const { committeeId } = params;

    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve org
    const { data: org } = await db
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Verify requester is admin or clerk
    const { data: membership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["org_admin", "clerk"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify committee belongs to this org
    const { data: committee } = await db
      .from("committees")
      .select("id")
      .eq("id", committeeId)
      .eq("organization_id", org.id)
      .single();

    if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

    // Verify the target user is an org member
    const { data: targetMembership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", fields.user_id)
      .single();

    if (!targetMembership) {
      return NextResponse.json({ error: "User is not a member of this organization" }, { status: 400 });
    }

    const { data: member, error } = await db
      .from("committee_members")
      .insert({
        committee_id: committeeId,
        organization_id: org.id,
        user_id: fields.user_id,
        role: fields.role,
      })
      .select("id")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return NextResponse.json({ error: "This person is already a member of this committee" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: member.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
