"use client";

import { BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuUser = { name: string; email: string; image: string | null; isAdmin: boolean };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Account menu for ${user.name}`}
      >
        <Avatar className="size-9">
          {/* Google avatar URLs reject requests that carry a Referer header. */}
          {user.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback className="bg-navy text-xs font-semibold text-white">{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-semibold text-foreground">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <BookOpen /> My learning
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/courses">
              <LayoutDashboard /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => startTransition(() => signOutAction())}>
          <LogOut /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
