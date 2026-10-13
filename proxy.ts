import { NextResponse, type NextRequest } from "next/server";

// Forwards the requested path to server components, so an unauthenticated visit
// to e.g. /courses/posh-pocso (from a nudge link) can send the user to
// /login?callbackUrl=/courses/posh-pocso and back after Google sign-in.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|webp|ico)$).*)"],
};
