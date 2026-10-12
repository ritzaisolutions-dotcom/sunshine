import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  accessCookieValue,
  accessGateRequired,
  getAccessKeyword,
  keywordsMatch,
} from "@/lib/access-gate";

export async function GET(req: NextRequest) {
  const keyword = getAccessKeyword();
  if (!keyword) {
    return NextResponse.json({ required: false, unlocked: true });
  }

  const expected = await accessCookieValue(keyword);
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  return NextResponse.json({
    required: true,
    unlocked: cookie === expected,
  });
}

export async function POST(req: NextRequest) {
  const keyword = getAccessKeyword();
  if (!keyword) {
    return NextResponse.json({ ok: true, required: false });
  }

  let body: { keyword?: string };
  try {
    body = (await req.json()) as { keyword?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const provided = typeof body.keyword === "string" ? body.keyword : "";
  if (!keywordsMatch(provided, keyword)) {
    return NextResponse.json({ error: "Wrong keyword." }, { status: 401 });
  }

  const token = await accessCookieValue(keyword);
  const res = NextResponse.json({ ok: true, required: true });
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  if (!accessGateRequired()) {
    return NextResponse.json({ ok: true });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
