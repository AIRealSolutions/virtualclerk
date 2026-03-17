"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  meeting_date: z.string().min(1, "Date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  meeting_link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  visibility_level: z.enum(["private", "internal", "public"]),
  status: z.enum(["draft", "agenda_finalized"]),
});
type MeetingForm = z.infer<typeof schema>;

export default function NewMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MeetingForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      visibility_level: "internal",
      status: "draft",
    },
  });

  async function onSubmit(data: MeetingForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      let json: { error?: string; id?: string } = {};
      try { json = await res.json(); } catch { /* empty */ }

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }

      router.push(`/${orgSlug}/meetings/${json.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${orgSlug}/meetings`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to meetings
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-civic-navy">Schedule a Meeting</h1>
        <p className="text-sm text-gray-500">Fill in the details to create a new meeting</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Meeting title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="e.g. Regular Town Council Meeting"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Date + Times */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register("meeting_date")}
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
            {errors.meeting_date && <p className="mt-1 text-xs text-red-500">{errors.meeting_date.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Start time</label>
            <input
              {...register("start_time")}
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">End time</label>
            <input
              {...register("end_time")}
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
          <input
            {...register("location")}
            placeholder="e.g. Town Hall, Room 101"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {/* Virtual meeting link */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Virtual meeting link <span className="text-gray-400">(optional)</span>
          </label>
          <input
            {...register("meeting_link")}
            placeholder="https://zoom.us/j/..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
          {errors.meeting_link && <p className="mt-1 text-xs text-red-500">{errors.meeting_link.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Brief description or notes about this meeting"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {/* Visibility + Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Visibility</label>
            <select
              {...register("visibility_level")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="internal">Internal — members only</option>
              <option value="public">Public — visible on portal</option>
              <option value="private">Private — only me</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select
              {...register("status")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="draft">Draft</option>
              <option value="agenda_finalized">Agenda Finalized</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/${orgSlug}/meetings`}
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
            Create meeting
          </button>
        </div>
      </form>
    </div>
  );
}
