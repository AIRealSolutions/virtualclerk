"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "call_to_order",       label: "Call to Order" },
  { value: "roll_call",           label: "Roll Call" },
  { value: "approval_of_minutes", label: "Approval of Minutes" },
  { value: "old_business",        label: "Old Business" },
  { value: "new_business",        label: "New Business" },
  { value: "public_comment",      label: "Public Comment" },
  { value: "reports",             label: "Reports" },
  { value: "announcements",       label: "Announcements" },
  { value: "adjournment",         label: "Adjournment" },
  { value: "other",               label: "Other" },
] as const;

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  category: z.enum([
    "call_to_order", "roll_call", "approval_of_minutes",
    "old_business", "new_business", "public_comment",
    "reports", "announcements", "adjournment", "other",
  ]),
  description: z.string().optional(),
  presenter: z.string().optional(),
  duration_minutes: z.coerce.number().int().min(1).optional().or(z.literal("")),
});
type AgendaItemForm = z.infer<typeof schema>;

export default function NewAgendaItemPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const meetingId = params.meetingId as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgendaItemForm>({
    resolver: zodResolver(schema),
    defaultValues: { category: "new_business" },
  });

  async function onSubmit(data: AgendaItemForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          duration_minutes: data.duration_minutes === "" ? null : data.duration_minutes,
          orgSlug,
        }),
      });

      let json: { error?: string } = {};
      try { json = await res.json(); } catch { /* empty */ }

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }

      router.push(`/${orgSlug}/meetings/${meetingId}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${orgSlug}/meetings/${meetingId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to meeting
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-civic-navy">Add Agenda Item</h1>
        <p className="text-sm text-gray-500">Add an item to the meeting agenda</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="e.g. Approval of FY2026 Budget"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Category + Duration */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select
              {...register("category")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Duration <span className="text-gray-400">(minutes)</span>
            </label>
            <input
              {...register("duration_minutes")}
              type="number"
              min={1}
              placeholder="15"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
        </div>

        {/* Presenter */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Presenter <span className="text-gray-400">(optional)</span>
          </label>
          <input
            {...register("presenter")}
            placeholder="e.g. Director of Finance"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description / Notes <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Background information, supporting details, or notes for this agenda item"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/${orgSlug}/meetings/${meetingId}`}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-5 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to agenda
          </button>
        </div>
      </form>
    </div>
  );
}
