import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Search, Tag, Upload } from "lucide-react";
import DocumentSearch from "@/components/documents/document-search";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { org: orgSlug } = await params;
  const { q, tag } = await searchParams;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!organization) notFound();

  let query = supabase
    .from("documents")
    .select("id, name, description, file_type, tags, visibility_level, created_at, created_by")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.textSearch("search_vector", q);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: documents } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-civic-navy">Documents</h1>
          <p className="text-sm text-gray-500">
            {documents?.length ?? 0} documents
          </p>
        </div>
        <Link
          href={`/${orgSlug}/documents/upload`}
          className="inline-flex items-center gap-2 rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {/* Search */}
      <DocumentSearch orgSlug={orgSlug} defaultQ={q} />

      {/* Document grid */}
      {!documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-gray-400">
          <FileText className="mb-3 h-12 w-12" />
          <p className="font-medium">{q ? "No documents found" : "No documents yet"}</p>
          <p className="mt-1 text-sm">
            {q ? "Try a different search term" : "Upload your first document to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-civic-blue/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-civic-slate">
                  <FileText className="h-5 w-5 text-civic-blue" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{doc.name}</p>
                  {doc.description && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {doc.tags.slice(0, 3).map((t: string) => (
                    <Link
                      key={t}
                      href={`/${orgSlug}/documents?tag=${t}`}
                      className="inline-flex items-center gap-1 rounded-full bg-civic-slate px-2 py-0.5 text-xs text-civic-blue hover:bg-blue-100"
                    >
                      <Tag className="h-3 w-3" />
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>{doc.file_type?.toUpperCase() ?? "FILE"}</span>
                <span>{doc.created_at.split("T")[0]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
