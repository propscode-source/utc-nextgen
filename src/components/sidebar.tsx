"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import type { Role } from "@prisma/client";

export function Sidebar({ role, isLabAssistant = false }: { role: Role; isLabAssistant?: boolean }) {
  const pathname = usePathname();
  const items = navFor(role, { isLabAssistant });

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r bg-card">
      <div className="px-5 py-3 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">UTC NextGen</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Unsri Training Center</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-hide p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} UTC NextGen
      </div>
    </aside>
  );
}
