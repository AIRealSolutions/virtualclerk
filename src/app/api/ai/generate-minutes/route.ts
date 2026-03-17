import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { z } from "zod";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const schema = z.object({
  meetingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate body
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { meetingId } = parsed.data;

  // Fetch meeting + agenda items
  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, committees(name), organizations(id, name)")
    .eq("id", meetingId)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Check org membership
  const org = meeting.organizations as any;
  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || !["org_admin", "clerk", "board_member"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: agendaItems } = await supabase
    .from("agenda_items")
    .select("title, description, category, presenter, ai_summary")
    .eq("meeting_id", meetingId)
    .order("order_index");

  const { data: motions } = await supabase
    .from("motions")
    .select("motion_text, result, proposed_by, votes(*)")
    .eq("meeting_id", meetingId);

  // Build prompt context
  const agendaText = (agendaItems ?? [])
    .map(
      (item, i) =>
        `${i + 1}. ${item.title} [${item.category}]${
          item.description ? `\n   ${item.description}` : ""
        }${item.presenter ? `\n   Presenter: ${item.presenter}` : ""}${
          item.ai_summary ? `\n   Summary: ${item.ai_summary}` : ""
        }`
    )
    .join("\n\n");

  const motionsText = (motions ?? [])
    .map((m) => {
      const votes = (m.votes as any[]) ?? [];
      const yes = votes.filter((v) => v.vote === "yes").length;
      const no = votes.filter((v) => v.vote === "no").length;
      const abstain = votes.filter((v) => v.vote === "abstain").length;
      return `- Motion: "${m.motion_text}" — Result: ${m.result} (${yes} Yes, ${no} No, ${abstain} Abstain)`;
    })
    .join("\n");

  const systemPrompt = `You are a professional municipal clerk assistant.
Generate formal, accurate, and neutral meeting minutes based on the provided agenda and motions.
Follow standard parliamentary minutes format:
1. Call to order / attendance note
2. Each agenda item with any actions taken
3. Motions and vote results
4. Adjournment

Keep language formal, factual, and objective. Do not add information not provided.`;

  const userPrompt = `Generate minutes for the following meeting:

Organization: ${org.name}
Committee: ${(meeting.committees as any)?.name ?? "N/A"}
Meeting Title: ${meeting.title}
Date: ${meeting.meeting_date}
Location: ${meeting.location ?? "N/A"}
Start Time: ${meeting.start_time ?? "N/A"}

AGENDA:
${agendaText || "No agenda items recorded."}

MOTIONS & VOTES:
${motionsText || "No motions recorded."}

Please generate complete, professional meeting minutes.`;

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      instructions: systemPrompt,
      input: userPrompt,
    });

    const minutesContent = response.output_text;

    // Upsert minutes
    const { error: upsertError } = await supabase
      .from("minutes")
      .upsert(
        {
          meeting_id: meetingId,
          organization_id: org.id,
          content: minutesContent,
          ai_generated: true,
          is_approved: false,
          created_by: user.id,
        },
        { onConflict: "meeting_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save minutes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content: minutesContent });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
