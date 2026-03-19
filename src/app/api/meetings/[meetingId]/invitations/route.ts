import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const inviteSchema = z.object({
  orgSlug: z.string(),
  // Array of invitees — each is either a user_id (org member) or a raw email
  invitees: z.array(
    z.union([
      z.object({ type: z.literal("member"), user_id: z.string().uuid(), email: z.string().email(), name: z.string().nullable() }),
      z.object({ type: z.literal("external"), email: z.string().email(), name: z.string().optional() }),
    ])
  ).min(1),
});

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { orgSlug, invitees } = parsed.data;
    const { meetingId } = params;
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

    if (!membership || !["org_admin", "clerk", "board_member"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify meeting belongs to org
    const { data: meeting } = await client
      .from("meetings")
      .select("id, title")
      .eq("id", meetingId)
      .eq("organization_id", org.id)
      .single();

    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    // Build insert rows — upsert so re-inviting is safe
    const rows = invitees.map((inv) => ({
      meeting_id: meetingId,
      organization_id: org.id,
      invited_by: user.id,
      user_id: inv.type === "member" ? inv.user_id : null,
      email: inv.email,
      name: inv.type === "member" ? (inv.name ?? null) : (inv.name ?? null),
      status: "pending",
    }));

    const { data: inserted, error } = await client
      .from("meeting_invitations")
      .upsert(rows, { onConflict: "meeting_id,email", ignoreDuplicates: false })
      .select("id, email, rsvp_token");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ sent: inserted?.length ?? 0, invitations: inserted });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgSlug = request.nextUrl.searchParams.get("orgSlug");
    if (!orgSlug) return NextResponse.json({ error: "orgSlug required" }, { status: 400 });

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

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: invitations } = await client
      .from("meeting_invitations")
      .select("id, email, name, status, user_id, rsvp_token, note, created_at, responded_at")
      .eq("meeting_id", params.meetingId)
      .order("created_at");

    return NextResponse.json({ invitations: invitations ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
