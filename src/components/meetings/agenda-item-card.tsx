"use client";

import { GripVertical, Sparkles } from "lucide-react";
import type { AgendaItem } from "@/types/database";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  call_to_order: "Call to Order",
  roll_call: "Roll Call",
  approval_of_minutes: "Approval of Minutes",
  old_business: "Old Business",
  new_business: "New Business",
  public_comment: "Public Comment",
  reports: "Reports",
  announcements: "Announcements",
  adjournment: "Adjournment",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  new_business: "bg-blue-100 text-blue-700",
  old_business: "bg-amber-100 text-amber-700",
  public_comment: "bg-green-100 text-green-700",
  reports: "bg-purple-100 text-purple-700",
  adjournment: "bg-gray-100 text-gray-600",
};

interface AgendaItemCardProps {
  item: AgendaItem;
  index: number;
}

export default function AgendaItemCard({ item, index }: AgendaItemCardProps) {
  return (
    <li className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50">
      {/* Drag handle */}
      <button className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-400">
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Index */}
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-civic-slate text-xs font-medium text-civic-blue">
        {index}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{item.title}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600"
            )}
          >
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
          {item.duration_minutes && (
            <span className="text-xs text-gray-400">
              {item.duration_minutes} min
            </span>
          )}
        </div>

        {item.description && (
          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
        )}

        {item.ai_summary && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-teal-50 px-3 py-2 text-xs text-teal-700">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{item.ai_summary}</p>
          </div>
        )}

        {item.presenter && (
          <p className="mt-1 text-xs text-gray-400">
            Presenter: {item.presenter}
          </p>
        )}
      </div>
    </li>
  );
}
