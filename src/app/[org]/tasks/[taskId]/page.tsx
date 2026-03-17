"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TaskStatus = "open" | "in_progress" | "complete" | "overdue";
type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: Priority;
  meeting_id: string | null;
  created_at: string;
  users: { full_name: string | null; email: string } | null;
  meetings: { title: string } | null;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "overdue", label: "Overdue" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-5 w-5 text-amber-500" />;
  if (status === "overdue") return <AlertCircle className="h-5 w-5 text-red-500" />;
  return <Circle className="h-5 w-5 text-gray-400" />;
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("tasks")
      .select("*, users:assigned_to(full_name, email), meetings(title)")
      .eq("id", taskId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTask(data as Task);
          setEditTitle(data.title);
          setEditDesc(data.description ?? "");
          setEditDue(data.due_date ?? "");
          setEditPriority(data.priority as Priority);
        }
        setLoading(false);
      });
  }, [taskId]);

  async function updateStatus(status: TaskStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, status }),
    });
    if (res.ok) {
      setTask((t) => t ? { ...t, status } : t);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to update");
    }
    setSaving(false);
  }

  async function saveEdits() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgSlug,
        title: editTitle,
        description: editDesc || null,
        due_date: editDue || null,
        priority: editPriority,
      }),
    });
    if (res.ok) {
      setTask((t) => t ? { ...t, title: editTitle, description: editDesc || null, due_date: editDue || null, priority: editPriority } : t);
      setDirty(false);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function deleteTask() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${taskId}?orgSlug=${orgSlug}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/${orgSlug}/tasks`);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to delete");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-24 text-center text-gray-400">
        Task not found.{" "}
        <Link href={`/${orgSlug}/tasks`} className="text-civic-blue hover:underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/${orgSlug}/tasks`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
        <button
          onClick={deleteTask}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <StatusIcon status={task.status} />
        <span className="text-sm font-medium text-gray-700">{STATUS_OPTIONS.find((s) => s.value === task.status)?.label}</span>
        <span className="ml-auto text-xs text-gray-400">Change status:</span>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateStatus(s.value)}
              disabled={saving || s.value === task.status}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${
                s.value === task.status
                  ? "bg-civic-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit form */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
          <input
            value={editTitle}
            onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={editDesc}
            onChange={(e) => { setEditDesc(e.target.value); setDirty(true); }}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Due date</label>
            <input
              type="date"
              value={editDue}
              onChange={(e) => { setEditDue(e.target.value); setDirty(true); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => { setEditPriority(e.target.value as Priority); setDirty(true); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {task.users && (
          <div className="text-sm text-gray-500">
            Assigned to: <span className="font-medium text-gray-700">{task.users.full_name ?? task.users.email}</span>
          </div>
        )}

        {task.meetings && (
          <div className="text-sm text-gray-500">
            Linked meeting: <span className="font-medium text-gray-700">{task.meetings.title}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority} priority
          </span>
          <span className="text-xs text-gray-400">
            Created {new Date(task.created_at).toLocaleDateString()}
          </span>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {dirty && (
          <div className="flex justify-end border-t pt-4">
            <button
              onClick={saveEdits}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-5 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
