"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Search, Library, PenLine, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search Posts", icon: Search },
  { href: "/library", label: "Post Library", icon: Library },
  { href: "/post-engine", label: "Post Engine", icon: PenLine },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-zinc-950 text-zinc-400">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-zinc-800/60">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold">
          Li
        </div>
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">LiPS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-zinc-800/80 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-blue-400" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/60 px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-zinc-500">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
