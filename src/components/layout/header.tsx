"use client";

import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import type { Organization } from "@/types/database";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  user: SupabaseUser;
  org: Organization | null;
}

export default function Header({ user, org }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb / title area — filled by page */}
      <div />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative rounded-full p-1.5 hover:bg-civic-slate">
          <Bell className="h-4 w-4 text-gray-500" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-civic-slate"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-civic-blue text-xs font-semibold text-white">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-gray-700 sm:block">
              {user.email}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-civic-slate"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/${org?.slug}/settings`);
                }}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
