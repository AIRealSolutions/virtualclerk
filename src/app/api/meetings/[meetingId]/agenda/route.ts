import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  orgSlug: z.string(),
  title: z.string().min(2),
  category: z.enum([
    "call_to_order", "roll_call", "approval_of_minutes",
    "old_business", "new_business", "public_comment",
    "reports", "announcements", "adjournment", "other",
  ]),
  description: z.string().optional(),
  presenter: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
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
    const { meetingId } = params;

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

    // Verify membership
    const { data: membership } = await db
      .from("organization_users")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["org_admin", "clerk", "board_member"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify meeting belongs to this org
    const { data: meeting } = await db
      .from("meetings")
      .select("id")
      .eq("id", meetingId)
      .eq("organization_id", org.id)
      .single();

    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    // Get next order_index
    const { data: lastItem } = await db
      .from("agenda_items")
      .select("order_index")
      .eq("meeting_id", meetingId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const order_index = lastItem ? lastItem.order_index + 1 : 1;

    const { data: item, error } = await db
      .from("agenda_items")
      .insert({
        meeting_id: meetingId,
        title: fields.title,
        category: fields.category,
        description: fields.description || null,
        presenter: fields.presenter || null,
        duration_minutes: fields.duration_minutes ?? null,
        order_index,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ id: item.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
