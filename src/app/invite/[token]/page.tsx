"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Building2, Calendar, MapPin, Clock, CheckCircle2, Loader2, CalendarDays } from "lucide-react";

type RSVPStatus = "accepted" | "declined" | "tentative";

interface InvitationData {
  id: string;
  email: string;
  name: string | null;
  status: string;
  note: string | null;
  meetings: {
    title: string;
    meeting_date: string;
    start_time: string | null;
    location: string | null;
    description: string | null;
  };
  organizations: {
    name: string;
    slug: string;
  };
}

const STATUS_CONFIG = {
  accepted:  { label: "Accept",    color: "bg-green-600 hover:bg-green-700",  icon: "✓" },
  tentative: { label: "Maybe",     color: "bg-amber-500 hover:bg-amber-600",  icon: "?" },
  declined:  { label: "Decline",   color: "bg-red-500 hover:bg-red-600",      icon: "✗" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function RSVPPage() {
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [note, setNote] = useState("");
  const [suggestAlt, setSuggestAlt] = useState(false);
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [altNote, setAltNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((r) => r.json())
      .then((d) => { setInvitation(d.invitation ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  async function submitRSVP() {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError(null);

    // Build note combining user note + alternative time suggestion
    let fullNote = note.trim();
    if (suggestAlt && (altDate || altTime || altNote)) {
      const parts = ["[Alternative time suggested]"];
      if (altDate) parts.push(`Date: ${altDate}`);
      if (altTime) parts.push(`Time: ${altTime}`);
      if (altNote) parts.push(altNote);
      fullNote = [fullNote, parts.join(" | ")].filter(Boolean).join("\n");
    }

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, note: fullNote || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }
      setSubmitted(true);
      setInvitation((prev) => prev ? { ...prev, status: selectedStatus } : prev);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-civic-slate">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-civic-slate px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const meeting = invitation.meetings;
  const org = invitation.organizations;
  const alreadyResponded = invitation.status !== "pending";

  return (
    <div className="min-h-screen bg-civic-slate px-4 py-12">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          <span>{org.name}</span>
        </div>

        {/* Meeting card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-civic-blue">Meeting Invitation</p>
            <h1 className="mt-1 text-xl font-bold text-civic-navy">{meeting.title}</h1>
            {invitation.name && (
              <p className="mt-1 text-sm text-gray-500">For: {invitation.name}</p>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{formatDate(meeting.meeting_date)}</span>
            </div>
            {meeting.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{formatTime(meeting.start_time)}</span>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{meeting.location}</span>
              </div>
            )}
            {meeting.description && (
              <p className="mt-2 text-gray-500 text-sm leading-relaxed">{meeting.description}</p>
            )}
          </div>
        </div>

        {/* RSVP section */}
        {submitted || alreadyResponded ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
            <p className="font-semibold text-green-800">
              Response recorded —{" "}
              {selectedStatus === "accepted" ? "See you there!" :
               selectedStatus === "tentative" ? "Maybe see you there." :
               "Thanks for letting us know."}
            </p>
            {suggestAlt && altDate && (
              <p className="text-sm text-green-700">Your alternative time suggestion has been noted.</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">Will you attend?</h2>

            {/* Status buttons */}
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(STATUS_CONFIG) as [RSVPStatus, typeof STATUS_CONFIG[RSVPStatus]][]).map(([status, cfg]) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`rounded-lg py-3 text-sm font-medium text-white transition-all ${cfg.color} ${
                    selectedStatus === status ? "ring-2 ring-offset-2 ring-gray-400 scale-105" : "opacity-80"
                  }`}
                >
                  <span className="block text-lg">{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Note <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Any message for the organizer…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
              />
            </div>

            {/* Suggest alternative time */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setSuggestAlt((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-civic-blue hover:underline"
              >
                <CalendarDays className="h-4 w-4" />
                {suggestAlt ? "Remove alternative time suggestion" : "Suggest an alternative time"}
              </button>

              {suggestAlt && (
                <div className="mt-3 space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs text-amber-700 font-medium">Suggest a time that works better for you</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Alternative date</label>
                      <input
                        type="date"
                        value={altDate}
                        onChange={(e) => setAltDate(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Alternative time</label>
                      <input
                        type="time"
                        value={altTime}
                        onChange={(e) => setAltTime(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Reason / context</label>
                    <input
                      type="text"
                      value={altNote}
                      onChange={(e) => setAltNote(e.target.value)}
                      placeholder="e.g. I have a conflict that afternoon"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <button
              onClick={submitRSVP}
              disabled={!selectedStatus || submitting}
              className="w-full rounded-lg bg-civic-blue py-2.5 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </span>
              ) : "Submit RSVP"}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Powered by VirtualClerk.ai · {org.name}
        </p>
      </div>
    </div>
  );
}
