import { NextRequest, NextResponse } from "next/server";

const MCP_URL = "https://claude-mcp-api.ml.goodnotes.com/mcp";

/**
 * GoodNotes official MCP is built for host apps (Claude/Cursor), not arbitrary
 * websites. We attempt a handshake and return a clear result so the UI can
 * fall back to printable study sheets.
 */
export async function POST() {
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "sunshine", version: "1.0.0" },
        },
      }),
    });

    const text = await res.text();
    const looksOk =
      res.ok &&
      (text.includes("result") ||
        text.includes("serverInfo") ||
        text.includes("protocolVersion") ||
        text.includes("tools"));

    if (!looksOk) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GoodNotes MCP refused a full in-app auth from this website. Print the study sheet as PDF and import it into GoodNotes.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "GoodNotes endpoint answered. Creating notebooks may still need the GoodNotes app. You can also Print / Save PDF.",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not reach GoodNotes MCP from this site. Use Print / Save PDF and import into GoodNotes.",
      },
      { status: 502 }
    );
  }
}

export async function PUT(req: NextRequest) {
  let body: { title?: string; markdown?: string };
  try {
    body = (await req.json()) as { title?: string; markdown?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "create_markdown_text_document",
          arguments: {
            title: body.title || "Sunshine study sheet",
            content: body.markdown || "",
          },
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GoodNotes did not accept the document from this app. Print / Save PDF instead.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Requested a new GoodNotes markdown document. Open GoodNotes if a handoff appears.",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not send to GoodNotes from this site. Print / Save PDF instead.",
      },
      { status: 502 }
    );
  }
}
