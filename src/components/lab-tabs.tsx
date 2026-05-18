"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export type LabTabItem = {
  href: string;
  label: string;
  icon: IconDefinition;
  count?: number;
};

export function LabTabs({ items }: { items: LabTabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="border-b overflow-x-auto overflow-y-hidden scrollbar-hide">
      <nav className="flex gap-1 -mb-px">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== items[0].href && pathname.startsWith(item.href + "/")) ||
            (item.href === items[0].href && pathname === items[0].href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="h-3.5 w-3.5" />
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{item.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
