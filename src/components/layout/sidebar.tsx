"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Home,
  Settings,
  Users,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import type { Organization } from "@/types/database";
import { cn } from "@/lib/utils";

interface SidebarProps {
  org: Organization | null;
}

export default function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname();
  const base = org ? `/${org.slug}` : "/dashboard";

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: `${base}/meetings`, icon: Calendar, label: "Meetings" },
    { href: `${base}/committees`, icon: Users, label: "Committees" },
    { href: `${base}/documents`, icon: FileText, label: "Documents" },
    { href: `${base}/tasks`, icon: CheckSquare, label: "Tasks" },
    { href: `/public/${org?.slug}`, icon: Globe, label: "Public Portal" },
    { href: `${base}/settings`, icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-civic-blue">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-civic-navy">
            VirtualClerk.ai
          </p>
          {org && (
            <p className="truncate text-xs text-gray-400">{org.name}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-civic-blue text-white"
                      : "text-gray-600 hover:bg-civic-slate hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Org switcher placeholder */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-civic-blue text-[10px] font-bold text-white">
            {org?.name.charAt(0) ?? "V"}
          </div>
          <span className="truncate text-xs text-gray-500">
            {org?.name ?? "No organization"}
          </span>
        </div>
      </div>
    </aside>
  );
}
