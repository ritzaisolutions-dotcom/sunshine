const base = process.env.SMOKE_BASE || "http://localhost:3000";

async function check(name, fn) {
  try {
    const result = await fn();
    console.log(`PASS  ${name}${result ? ` — ${result}` : ""}`);
    return true;
  } catch (error) {
    console.log(`FAIL  ${name} — ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function get(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().then((t) => t.slice(0, 120))}`);
  return res.status;
}

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain */
  }
  return { status: res.status, text, json };
}

let ok = true;

ok =
  (await check("GET /", async () => {
    const s = await get("/");
    return String(s);
  })) && ok;

ok =
  (await check("GET /admin", async () => {
    const s = await get("/admin");
    return String(s);
  })) && ok;

ok =
  (await check("GET /study-sheet", async () => {
    const s = await get("/study-sheet");
    return String(s);
  })) && ok;

ok =
  (await check("POST /api/chat", async () => {
    const { status, text } = await post("/api/chat", {
      messages: [{ role: "user", content: "Say hi in one short sentence." }],
    });
    if (status !== 200) throw new Error(`${status} ${text.slice(0, 160)}`);
    if (!text.trim()) throw new Error("empty stream");
    return `stream ${text.trim().slice(0, 60)}…`;
  })) && ok;

ok =
  (await check("POST /api/search", async () => {
    const { status, json, text } = await post("/api/search", {
      query: "capital of France",
    });
    if (status !== 200) throw new Error(`${status} ${text.slice(0, 200)}`);
    if (!json?.text) throw new Error(`no text: ${text.slice(0, 200)}`);
    return json.text.slice(0, 80);
  })) && ok;

ok =
  (await check("POST /api/image", async () => {
    const { status, json, text } = await post("/api/image", {
      prompt: "tiny yellow sun emoji style simple",
    });
    if (status !== 200) throw new Error(`${status} ${text.slice(0, 200)}`);
    if (!json?.src?.startsWith("data:image")) {
      throw new Error(`bad src: ${String(json?.src).slice(0, 40)}`);
    }
    return `data url ${json.src.length} chars`;
  })) && ok;

ok =
  (await check("POST /api/memory", async () => {
    const { status, json, text } = await post("/api/memory", {
      notes: {
        whoSheIs: "",
        howSheLikesToLearn: "",
        goals: "",
        inProgress: "",
        alreadyUnderstands: "",
        getsStuckOn: "",
        littleThings: "",
        lastUpdated: null,
      },
      recentTranscript: "Noorie: I like maths.\nMaria Sunshine: Great!",
    });
    if (status !== 200) throw new Error(`${status} ${text.slice(0, 200)}`);
    if (!json?.notes) throw new Error("no notes");
    return "notes ok";
  })) && ok;

ok =
  (await check("POST /api/backlog", async () => {
    const { status, json, text } = await post("/api/backlog", {
      recentTranscript:
        "Noorie: I wish Sunshine could make flashcards.\nMaria: Noted!",
    });
    if (status !== 200) throw new Error(`${status} ${text.slice(0, 200)}`);
    if (!Array.isArray(json?.items)) throw new Error("no items array");
    return `items ${json.items.length}`;
  })) && ok;

ok =
  (await check("POST /api/goodnotes", async () => {
    const { status, json } = await post("/api/goodnotes", {});
    if (status !== 200 && status !== 502 && status !== 400) {
      throw new Error(`${status} ${JSON.stringify(json)}`);
    }
    return `${status} connected=${json?.connected ?? "n/a"}`;
  })) && ok;

process.exit(ok ? 0 : 1);
