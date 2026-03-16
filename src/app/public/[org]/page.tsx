import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Calendar, FileText } from "lucide-react";

export default async function PublicPortalPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug, description, logo_url, website")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  // Only fetch public data
  const [meetingsRes, minutesRes, docsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, meeting_date, status, location")
      .eq("organization_id", organization.id)
      .eq("visibility_level", "public")
      .gte("meeting_date", new Date().toISOString().split("T")[0])
      .order("meeting_date")
      .limit(10),
    supabase
      .from("minutes")
      .select("id, meeting_id, approved_at, meetings(title, meeting_date)")
      .eq("organization_id", organization.id)
      .eq("is_approved", true)
      .order("approved_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, name, file_type, created_at, tags")
      .eq("organization_id", organization.id)
      .eq("visibility_level", "public")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const upcomingMeetings = meetingsRes.data ?? [];
  const approvedMinutes = minutesRes.data ?? [];
  const publicDocs = docsRes.data ?? [];

  return (
    <div className="min-h-screen bg-civic-slate">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          <Building2 className="h-6 w-6 text-civic-blue" />
          <div>
            <h1 className="text-base font-semibold text-civic-navy">
              {organization.name}
            </h1>
            <p className="text-xs text-gray-500">Public Records Portal</p>
          </div>
          <div className="ml-auto text-xs text-gray-400">
            Powered by{" "}
            <Link href="/" className="text-civic-teal hover:underline">
              VirtualClerk.ai
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {organization.description && (
          <p className="mb-8 text-gray-600">{organization.description}</p>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming meetings */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold text-civic-navy">
                  <Calendar className="h-4 w-4" />
                  Upcoming Meetings
                </h2>
              </div>
              {upcomingMeetings.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No upcoming public meetings
                </div>
              ) : (
                <ul className="divide-y">
                  {upcomingMeetings.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/public/${orgSlug}/meetings/${m.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-civic-slate"
                      >
                        <div className="flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-white text-center">
                          <span className="text-xs font-medium uppercase text-gray-400">
                            {new Date(m.meeting_date).toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold leading-none text-civic-navy">
                            {new Date(m.meeting_date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.title}</p>
                          {m.location && (
                            <p className="text-sm text-gray-500">{m.location}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right sidebar: minutes + docs */}
          <div className="space-y-6">
            {/* Approved Minutes */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-civic-navy text-sm">
                  Approved Minutes
                </h2>
              </div>
              {approvedMinutes.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No published minutes yet
                </div>
              ) : (
                <ul className="divide-y">
                  {approvedMinutes.map((m) => {
                    const meeting = m.meetings as any;
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/public/${orgSlug}/minutes/${m.id}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-civic-slate"
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-civic-teal" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {meeting?.title ?? "Meeting Minutes"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {meeting?.meeting_date}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Public documents */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-civic-navy text-sm">
                  Public Documents
                </h2>
              </div>
              {publicDocs.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No public documents
                </div>
              ) : (
                <ul className="divide-y">
                  {publicDocs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-400">
                          {d.created_at.split("T")[0]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
