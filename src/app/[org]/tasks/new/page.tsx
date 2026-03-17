"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
});
type TaskForm = z.infer<typeof schema>;

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium" },
  });

  useEffect(() => {
    fetch(`/api/org-members?orgSlug=${orgSlug}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => {});
  }, [orgSlug]);

  async function onSubmit(data: TaskForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          orgSlug,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
        }),
      });

      let json: { error?: string; id?: string } = {};
      try { json = await res.json(); } catch { /* empty */ }

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }

      router.push(`/${orgSlug}/tasks/${json.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/${orgSlug}/tasks`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-civic-navy">New Task</h1>
        <p className="text-sm text-gray-500">Create an action item or follow-up</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="e.g. Submit budget report to finance committee"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Additional context or notes"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        {/* Assignee + Due date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Assign to <span className="text-gray-400">(optional)</span>
            </label>
            <select
              {...register("assigned_to")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Due date <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register("due_date")}
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
          <div className="flex gap-3">
            {(["low", "medium", "high"] as const).map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2">
                <input
                  {...register("priority")}
                  type="radio"
                  value={p}
                  className="accent-civic-blue"
                />
                <span className="text-sm capitalize text-gray-700">{p}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/${orgSlug}/tasks`}
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
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}
