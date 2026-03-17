import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  orgSlug: z.string(),
  title: z.string().min(2),
  meeting_date: z.string().min(1),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  meeting_link: z.string().optional(),
  description: z.string().optional(),
  visibility_level: z.enum(["private", "internal", "public"]),
  status: z.enum(["draft", "agenda_finalized"]),
});

export async function POST(request: NextRequest) {
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

    const { data: meeting, error } = await db
      .from("meetings")
      .insert({
        organization_id: org.id,
        created_by: user.id,
        title: fields.title,
        meeting_date: fields.meeting_date,
        start_time: fields.start_time || null,
        end_time: fields.end_time || null,
        location: fields.location || null,
        meeting_link: fields.meeting_link || null,
        description: fields.description || null,
        visibility_level: fields.visibility_level,
        status: fields.status,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ id: meeting.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
