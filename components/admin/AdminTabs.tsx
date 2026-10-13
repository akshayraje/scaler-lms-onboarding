"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/automation", label: "Automation" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b" aria-label="Admin sections">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground",
              active && "border-primary text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
