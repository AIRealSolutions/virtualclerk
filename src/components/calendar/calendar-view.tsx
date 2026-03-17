"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: "meeting" | "task";
  href: string;
  status?: string;
  priority?: string;
}

interface Props {
  events: CalEvent[];
  orgSlug: string;
  initialYear: number;
  initialMonth: number; // 0-indexed
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarView({ events, orgSlug, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete final week
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const eventsByDate = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <button onClick={prevMonth} className="rounded-md p-1.5 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-civic-navy">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={nextMonth} className="rounded-md p-1.5 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Day name row */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const ds = day ? dateStr(day) : null;
          const dayEvents = ds ? (eventsByDate[ds] ?? []) : [];
          const isToday = ds === todayStr;

          return (
            <div
              key={i}
              className={`min-h-[90px] border-b border-r p-1.5 last:border-r-0 ${
                !day ? "bg-gray-50/50" : ""
              }`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-civic-blue text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={e.href}
                        className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium leading-tight ${
                          e.type === "meeting"
                            ? "bg-civic-blue/10 text-civic-blue hover:bg-civic-blue/20"
                            : e.priority === "high"
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                        title={e.title}
                      >
                        {e.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1 text-[10px] text-gray-400">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t px-5 py-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-civic-blue/30" /> Meeting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> Task
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-100" /> High priority task
        </span>
      </div>
    </div>
  );
}
