import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { EMPTY_NOTES, type ChatThread, type NourieNotes } from "@/lib/types";
import { sunshineVaultKey } from "@/lib/vault-key";

function vaultKey(): string {
  return sunshineVaultKey();
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured.", found: false },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("sunshine_pull", {
    p_key: vaultKey(),
  });
  if (error) {
    return NextResponse.json({ error: error.message, found: false }, { status: 502 });
  }

  const payload = data as {
    found?: boolean;
    chats?: ChatThread[];
    notes?: NourieNotes;
    updatedAt?: string;
  };

  if (!payload?.found) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    chats: Array.isArray(payload.chats) ? payload.chats : [],
    notes: payload.notes ?? EMPTY_NOTES,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: { chats?: ChatThread[]; notes?: NourieNotes };
  try {
    body = (await req.json()) as { chats?: ChatThread[]; notes?: NourieNotes };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const chats = Array.isArray(body.chats) ? body.chats : [];
  const notes = body.notes ?? EMPTY_NOTES;

  // Drop large inline images before upload so the vault stays small.
  const slimChats = chats.map((thread) => ({
    ...thread,
    messages: thread.messages.map((message) =>
      message.image ? { ...message, image: undefined } : message
    ),
  }));

  const { data, error } = await supabase.rpc("sunshine_push", {
    p_key: vaultKey(),
    p_chats: slimChats,
    p_notes: notes,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const payload = data as { updatedAt?: string };
  return NextResponse.json({
    ok: true,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  });
}
