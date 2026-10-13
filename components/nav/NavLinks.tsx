"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Top-level sections. Onboarding etc. get added here as they ship.
const LINKS = [{ href: "/", label: "My learning", match: (p: string) => p === "/" || p.startsWith("/courses") }];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden h-full items-stretch gap-1 sm:flex" aria-label="Main">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center border-b-2 border-transparent px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
