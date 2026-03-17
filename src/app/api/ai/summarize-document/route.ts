import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { z } from "zod";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const schema = z.object({
  documentId: z.string().uuid(),
  text: z.string().min(1).max(50000),
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
  const { documentId, text } = parsed.data;

  const { data: doc } = await supabase
    .from("documents")
    .select("*, organizations(id)")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o",
      instructions:
        "You are a government document analyst. Summarize the provided document in 2-3 concise paragraphs. Focus on key points, decisions, and any action items. Keep language neutral and factual.",
      input: `Summarize this document titled "${doc.name}":\n\n${text}`,
    });

    const summary = response.output_text;

    // Save summary back to document
    await supabase
      .from("documents")
      .update({ ai_summary: summary })
      .eq("id", documentId);

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "AI summarization failed" }, { status: 500 });
  }
}
