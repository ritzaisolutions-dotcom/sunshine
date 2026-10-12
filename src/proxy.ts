import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  accessCookieValue,
  getAccessKeyword,
} from "@/lib/access-gate";

export async function proxy(request: NextRequest) {
  const keyword = getAccessKeyword();
  if (!keyword) {
    return NextResponse.next();
  }

  const expected = await accessCookieValue(keyword);
  const unlocked = request.cookies.get(ACCESS_COOKIE)?.value === expected;
  const { pathname } = request.nextUrl;

  if (pathname === "/unlock" || pathname.startsWith("/unlock/")) {
    if (unlocked) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (unlocked) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked." }, { status: 401 });
  }

  const unlockUrl = new URL("/unlock", request.url);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest|favicon\\.ico|api/unlock).*)",
  ],
};
