import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["accepted", "declined", "tentative"]),
  note: z.string().max(500).optional(),
});

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — fetch invitation details for the RSVP page (public, no auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const client = db();

    const { data: invitation } = await client
      .from("meeting_invitations")
      .select("id, email, name, status, note, meetings(title, meeting_date, start_time, location, description), organizations(name, slug)")
      .eq("rsvp_token", params.token)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    return NextResponse.json({ invitation });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

// PATCH — submit RSVP (public, no auth — token is the credential)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { status, note } = parsed.data;
    const client = db();

    const { data: existing } = await client
      .from("meeting_invitations")
      .select("id")
      .eq("rsvp_token", params.token)
      .single();

    if (!existing) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const { error } = await client
      .from("meeting_invitations")
      .update({
        status,
        note: note ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("rsvp_token", params.token);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, status });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
