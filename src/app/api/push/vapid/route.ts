import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push is not configured.", publicKey: null },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
