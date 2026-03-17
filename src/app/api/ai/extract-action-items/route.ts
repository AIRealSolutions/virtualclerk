import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { z } from "zod";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const schema = z.object({
  meetingId: z.string().uuid(),
  notes: z.string().min(1).max(20000),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { meetingId, notes } = parsed.data;

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, organizations(id)")
    .eq("id", meetingId)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      instructions: `You are a professional clerk assistant extracting action items from meeting notes.
Extract all action items and return them as a JSON array with this structure:
[
  {
    "title": "short action item title",
    "description": "more detail if available",
    "assigned_to_name": "person's name if mentioned, else null",
    "due_date": "YYYY-MM-DD if mentioned, else null"
  }
]
Only return the JSON array, no other text.`,
      input: `Extract action items from these meeting notes:\n\n${notes}`,
    });

    let actionItems: any[] = [];
    try {
      actionItems = JSON.parse(response.output_text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const org = meeting.organizations as any;

    // Insert tasks
    const tasks = actionItems.map((item) => ({
      organization_id: org.id,
      meeting_id: meetingId,
      title: item.title,
      description: item.description ?? null,
      due_date: item.due_date ?? null,
      status: "open" as const,
      created_by: user.id,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("tasks")
      .insert(tasks)
      .select("id, title");

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tasks: inserted,
      count: inserted?.length ?? 0,
    });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "AI extraction failed" },
      { status: 500 }
    );
  }
}
