"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface DocumentSearchProps {
  orgSlug: string;
  defaultQ?: string;
}

export default function DocumentSearch({ orgSlug, defaultQ }: DocumentSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`/${orgSlug}/documents?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents..."
          className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-civic-blue focus:ring-1 focus:ring-civic-blue"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-civic-blue px-4 py-2 text-sm font-medium text-white hover:bg-civic-navy"
      >
        Search
      </button>
    </form>
  );
}
