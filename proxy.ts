import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reservationsEnabled } from "@/lib/features";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/reservations") &&
    !reservationsEnabled()
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/reservations/:path*"],
};
