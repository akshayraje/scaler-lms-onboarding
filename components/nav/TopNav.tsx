import Link from "next/link";
import type { CurrentUser } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

/** App-wide top bar for signed-in pages: logo, section links, account menu. */
export function TopNav({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80 print:hidden">
      <div className="mx-auto flex h-full max-w-[1180px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Scaler — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-4 sm:h-[18px]" src="/scaler-logo.png" alt="Scaler" />
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <UserMenu user={{ name: user.name, email: user.email, image: user.image, isAdmin: user.isAdmin }} />
        </div>
      </div>
    </header>
  );
}
