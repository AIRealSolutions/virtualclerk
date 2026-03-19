"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X, Users, Mail, CheckCircle2, Copy } from "lucide-react";

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface SentInvitation {
  email: string;
  rsvp_token: string;
}

type Invitee =
  | { type: "member"; user_id: string; email: string; name: string | null }
  | { type: "external"; email: string; name: string };

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const meetingId = params.meetingId as string;

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [externalEmail, setExternalEmail] = useState("");
  const [externalName, setExternalName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvitation[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org-members?orgSlug=${orgSlug}`)
      .then((r) => r.json())
      .then((d) => setOrgMembers(d.members ?? []))
      .catch(() => {});
  }, [orgSlug]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function addMember() {
    const m = orgMembers.find((m) => m.user_id === selectedMemberId);
    if (!m) return;
    if (invitees.some((i) => i.email === m.email)) return;
    setInvitees((prev) => [...prev, { type: "member", user_id: m.user_id, email: m.email, name: m.full_name }]);
    setSelectedMemberId("");
  }

  function addExternal() {
    const email = externalEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (invitees.some((i) => i.email === email)) return;
    setInvitees((prev) => [...prev, { type: "external", email, name: externalName.trim() }]);
    setExternalEmail("");
    setExternalName("");
  }

  function remove(email: string) {
    setInvitees((prev) => prev.filter((i) => i.email !== email));
  }

  async function sendInvitations() {
    if (invitees.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, invitees }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }
      setSent(json.invitations ?? []);
      setInvitees([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(token: string) {
    const link = `${appUrl}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const availableMembers = orgMembers.filter((m) => !invitees.some((i) => i.email === m.email));

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
        <h1 className="text-2xl font-bold text-civic-navy">Invite Attendees</h1>
        <p className="text-sm text-gray-500">Invite organization members or external guests to this meeting</p>
      </div>

      {/* Sent confirmation */}
      {sent.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{sent.length} invitation{sent.length !== 1 ? "s" : ""} sent</span>
          </div>
          <p className="text-sm text-green-600">
            Share the RSVP links below with external guests who don't have an account.
          </p>
          <ul className="space-y-2">
            {sent.map((inv) => (
              <li key={inv.rsvp_token} className="flex items-center justify-between rounded-md bg-white border border-green-200 px-3 py-2 text-sm">
                <span className="text-gray-700">{inv.email}</span>
                <button
                  onClick={() => copyLink(inv.rsvp_token)}
                  className="inline-flex items-center gap-1.5 text-xs text-civic-blue hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === inv.rsvp_token ? "Copied!" : "Copy RSVP link"}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => router.push(`/${orgSlug}/meetings/${meetingId}`)}
            className="mt-2 text-sm text-civic-blue hover:underline"
          >
            Back to meeting →
          </button>
        </div>
      )}

      {sent.length === 0 && (
        <div className="space-y-5">
          {/* Add org member */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4 text-gray-400" />
              Add organization member
            </div>
            <div className="flex gap-2">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
              >
                <option value="">Select a member…</option>
                {availableMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addMember}
                disabled={!selectedMemberId}
                className="inline-flex items-center gap-1 rounded-md bg-civic-blue px-3 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          {/* Add external guest */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4 text-gray-400" />
              Add external guest
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                value={externalEmail}
                onChange={(e) => setExternalEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === "Enter" && addExternal()}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
              />
              <input
                type="text"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                placeholder="Full name (optional)"
                onKeyDown={(e) => e.key === "Enter" && addExternal()}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
              />
            </div>
            <button
              type="button"
              onClick={addExternal}
              disabled={!externalEmail.includes("@")}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add external guest
            </button>
          </div>

          {/* Invitee list */}
          {invitees.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b px-5 py-3 text-sm font-medium text-gray-700">
                Invitees ({invitees.length})
              </div>
              <ul className="divide-y">
                {invitees.map((inv) => (
                  <li key={inv.email} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {inv.type === "member" ? (inv.name ?? inv.email) : (inv.name || inv.email)}
                      </p>
                      {inv.type === "member" && inv.name && (
                        <p className="text-xs text-gray-400">{inv.email}</p>
                      )}
                      {inv.type === "external" && inv.name && (
                        <p className="text-xs text-gray-400">{inv.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        inv.type === "member"
                          ? "bg-civic-blue/10 text-civic-blue"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {inv.type === "member" ? "Member" : "External"}
                      </span>
                      <button
                        onClick={() => remove(inv.email)}
                        className="text-gray-300 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/${orgSlug}/meetings/${meetingId}`}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={sendInvitations}
              disabled={loading || invitees.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-5 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send {invitees.length > 0 ? `${invitees.length} ` : ""}invitation{invitees.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
