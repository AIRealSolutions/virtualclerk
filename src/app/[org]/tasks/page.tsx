import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AlertCircle, CheckSquare, Clock, Plus } from "lucide-react";
import Link from "next/link";

const STATUS_ORDER = ["overdue", "open", "in_progress", "complete"] as const;

export default async function TasksPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, users!tasks_assigned_to_fkey(full_name, email)")
    .eq("organization_id", organization.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const grouped = STATUS_ORDER.reduce<Record<string, any[]>>((acc, s) => {
    acc[s] = (tasks ?? []).filter((t) => t.status === s);
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">Tasks</h1>
          <p className="text-sm text-gray-500">Action items and follow-ups</p>
        </div>
        <Link
          href={`/${orgSlug}/tasks/new`}
          className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {STATUS_ORDER.map((status) => {
          const items = grouped[status] ?? [];
          return (
            <div key={status} className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <StatusIcon status={status} />
                <h2 className="font-medium text-gray-700 capitalize">
                  {status.replace("_", " ")}
                </h2>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  No {status.replace("_", " ")} tasks
                </div>
              ) : (
                <ul className="divide-y">
                  {items.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 p-4">
                      <StatusIcon status={t.status} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{t.title}</p>
                        {t.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {t.users?.full_name && (
                            <span>→ {t.users.full_name}</span>
                          )}
                          {t.due_date && (
                            <span
                              className={
                                t.status === "overdue"
                                  ? "text-red-500 font-medium"
                                  : ""
                              }
                            >
                              Due {t.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  if (status === "overdue")
    return <AlertCircle className={`h-4 w-4 text-red-500 ${className}`} />;
  if (status === "complete")
    return <CheckSquare className={`h-4 w-4 text-green-500 ${className}`} />;
  if (status === "in_progress")
    return <Clock className={`h-4 w-4 text-amber-500 ${className}`} />;
  return <Clock className={`h-4 w-4 text-gray-400 ${className}`} />;
}
