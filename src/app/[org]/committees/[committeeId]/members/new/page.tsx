"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  user_id: z.string().min(1, "Please select a member"),
  role: z.enum(["chair", "vice_chair", "member", "alternate"]),
});
type AddMemberForm = z.infer<typeof schema>;

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

export default function AddCommitteeMemberPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.org as string;
  const committeeId = params.committeeId as string;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberForm>({
    resolver: zodResolver(schema),
    defaultValues: { role: "member" },
  });

  useEffect(() => {
    fetch(`/api/committees/${committeeId}/members/eligible?orgSlug=${orgSlug}`)
      .then((r) => r.json())
      .then((data) => setOrgMembers(data.members ?? []))
      .catch(() => setOrgMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [committeeId, orgSlug]);

  async function onSubmit(data: AddMemberForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/committees/${committeeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      let json: { error?: string } = {};
      try { json = await res.json(); } catch { /* empty */ }

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        return;
      }

      router.push(`/${orgSlug}/committees/${committeeId}`);
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
        href={`/${orgSlug}/committees/${committeeId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to committee
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-civic-navy">Add Committee Member</h1>
        <p className="text-sm text-gray-500">Add an organization member to this committee</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">

        {/* Member select */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Member <span className="text-red-500">*</span>
          </label>
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
            </div>
          ) : (
            <select
              {...register("user_id")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
            >
              <option value="">Select a member…</option>
              {orgMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                </option>
              ))}
            </select>
          )}
          {errors.user_id && <p className="mt-1 text-xs text-red-500">{errors.user_id.message}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
          <select
            {...register("role")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
          >
            <option value="member">Member</option>
            <option value="chair">Chair</option>
            <option value="vice_chair">Vice Chair</option>
            <option value="alternate">Alternate</option>
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href={`/${orgSlug}/committees/${committeeId}`}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || loadingMembers}
            className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-5 py-2 text-sm font-medium text-white hover:bg-civic-navy disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to committee
          </button>
        </div>
      </form>
    </div>
  );
}
