import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Plus,
  FileText,
  CheckSquare,
  GripVertical,
  Sparkles,
} from "lucide-react";
import AgendaItemCard from "@/components/meetings/agenda-item-card";
import GenerateMinutesButton from "@/components/meetings/generate-minutes-button";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ org: string; meetingId: string }>;
}) {
  const { org: orgSlug, meetingId } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, committees(name), organizations(slug)")
    .eq("id", meetingId)
    .single();

  if (!meeting) notFound();

  const [agendaRes, documentsRes, motionsRes, minutesRes] = await Promise.all([
    supabase
      .from("agenda_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("order_index"),
    supabase
      .from("documents")
      .select("id, name, file_type, created_at")
      .eq("meeting_id", meetingId),
    supabase
      .from("motions")
      .select("*, votes(*)")
      .eq("meeting_id", meetingId),
    supabase.from("minutes").select("*").eq("meeting_id", meetingId).single(),
  ]);

  const agendaItems = agendaRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const motions = motionsRes.data ?? [];
  const minutes = minutesRes.data ?? null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={`/${orgSlug}/meetings`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to meetings
      </Link>

      {/* Meeting header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-civic-navy">{meeting.title}</h1>
            {meeting.description && (
              <p className="mt-1 text-gray-500">{meeting.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {meeting.meeting_date}
              </span>
              {meeting.start_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {meeting.start_time}
                  {meeting.end_time ? ` – ${meeting.end_time}` : ""}
                </span>
              )}
              {meeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {meeting.location}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={meeting.status} />
        </div>
      </div>

      {/* Agenda */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-civic-navy">Agenda</h2>
          <Link
            href={`/${orgSlug}/meetings/${meetingId}/agenda/new`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </Link>
        </div>
        {agendaItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No agenda items yet — add the first one
          </div>
        ) : (
          <ol className="divide-y">
            {agendaItems.map((item, i) => (
              <AgendaItemCard key={item.id} item={item} index={i + 1} />
            ))}
          </ol>
        )}
      </section>

      {/* Documents */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-civic-navy">Documents</h2>
          <Link
            href={`/${orgSlug}/documents/upload?meeting=${meetingId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No documents attached to this meeting
          </div>
        ) : (
          <ul className="divide-y">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1 text-sm">{d.name}</span>
                <span className="text-xs text-gray-400">{d.created_at.split("T")[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Motions */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-civic-navy">Motions & Votes</h2>
          <Link
            href={`/${orgSlug}/meetings/${meetingId}/motions/new`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Record motion
          </Link>
        </div>
        {motions.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No motions recorded
          </div>
        ) : (
          <ul className="divide-y">
            {motions.map((m) => {
              const votes = (m.votes as any[]) ?? [];
              const yes = votes.filter((v) => v.vote === "yes").length;
              const no = votes.filter((v) => v.vote === "no").length;
              const abstain = votes.filter((v) => v.vote === "abstain").length;
              return (
                <li key={m.id} className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900">{m.motion_text}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">{yes} Yes</span>
                    <span className="text-red-500 font-medium">{no} No</span>
                    <span>{abstain} Abstain</span>
                    <ResultBadge result={m.result} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Minutes */}
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-civic-navy">Minutes</h2>
          <GenerateMinutesButton meetingId={meetingId} hasMinutes={!!minutes} />
        </div>
        {minutes ? (
          <div className="p-5">
            {minutes.ai_generated && (
              <div className="mb-3 flex items-center gap-1.5 text-xs text-civic-teal">
                <Sparkles className="h-3.5 w-3.5" />
                AI-generated draft — review before approving
              </div>
            )}
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
              {minutes.content}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">
            No minutes yet — generate with AI or write manually
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    agenda_finalized: "bg-blue-100 text-blue-700",
    meeting_complete: "bg-green-100 text-green-700",
    minutes_published: "bg-teal-100 text-teal-700",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    agenda_finalized: "Agenda Ready",
    meeting_complete: "Complete",
    minutes_published: "Published",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${map[status] ?? map.draft}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, string> = {
    passed: "text-green-600 font-semibold",
    failed: "text-red-500 font-semibold",
    tabled: "text-amber-600 font-semibold",
    withdrawn: "text-gray-400",
    pending: "text-gray-400",
  };
  return (
    <span className={`ml-auto ${map[result] ?? ""}`}>
      {result.charAt(0).toUpperCase() + result.slice(1)}
    </span>
  );
}
