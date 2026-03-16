"use client";

import { useState } from "react";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface GenerateMinutesButtonProps {
  meetingId: string;
  hasMinutes: boolean;
}

export default function GenerateMinutesButton({
  meetingId,
  hasMinutes,
}: GenerateMinutesButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to generate minutes");
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-civic-teal" />
        )}
        {hasMinutes ? "Regenerate with AI" : "Generate with AI"}
      </button>

      {!hasMinutes && (
        <button className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
          <FileText className="h-3.5 w-3.5" />
          Write manually
        </button>
      )}
    </div>
  );
}
