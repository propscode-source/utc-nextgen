"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import type { Role } from "@prisma/client";

export function Sidebar({ role, isLabAssistant = false }: { role: Role; isLabAssistant?: boolean }) {
  const pathname = usePathname();
  const items = navFor(role, { isLabAssistant });

  return (
    <aside className="relative hidden md:flex md:w-64 shrink-0 flex-col border-r border-primary/10 bg-card">
      {/* IT theme: subtle circuit grid on the sidebar */}
      <div className="pointer-events-none absolute inset-0 bg-circuit opacity-30" />
      {/* Vertical accent line */}
      <div className="pointer-events-none absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

      <div className="relative flex h-14 items-center border-b border-primary/10 px-4">
        <Link href="/dashboard" className="flex items-center min-w-0">
          <Image
            src="/logo.png"
            alt="UTC NextGen — Unsri Training Center"
            width={1980}
            height={780}
            priority
            className="h-9 w-auto shrink-0"
          />
        </Link>
      </div>

      <nav className="relative flex-1 overflow-y-auto scrollbar-hide p-3">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigasi
        </div>
        <ul className="space-y-1">
          {items.map((item) => {
            const aliases = item.activePrefixes ?? [];
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              aliases.some((p) => pathname === p || pathname.startsWith(p + "/"));
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-primary text-white font-medium shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary hover:!text-white"
                  )}
                >
                  {/* active left bar (gold accent) */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-accent" />
                  )}
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-accent" : "group-hover:text-white"
                    )}
                  />
                  <span className="group-hover:!text-white">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative px-4 py-3 border-t border-primary/10 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System online</span>
        </div>
        <div className="mt-1 font-mono-tnum">© {new Date().getFullYear()} UTC NextGen</div>
      </div>
    </aside>
  );
}
