"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  meeting_schedule: z.string().optional(),
  visibility_level: z.enum(["private", "internal", "public"]),
});
type CommitteeForm = z.infer<typeof schema>;

export default function NewCommitteePage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommitteeForm>({
    resolver: zodResolver(schema),
    defaultValues: { visibility_level: "internal" },
  });

  async function onSubmit(data: CommitteeForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/committees`, {
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

      router.push(`/${orgSlug}/committees/${json.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${orgSlug}/committees`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to committees
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-civic-navy">New Committee</h1>
        <p className="text-sm text-gray-500">Create a new committee or working group</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">

        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            placeholder="e.g. Finance Committee"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="What does this committee do?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {/* Meeting schedule + Visibility */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Meeting schedule <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register("meeting_schedule")}
              placeholder="e.g. 1st Monday monthly"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
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
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/${orgSlug}/committees`}
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
            Create committee
          </button>
        </div>
      </form>
    </div>
  );
}
