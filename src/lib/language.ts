export type ReplyLanguage = "de" | "en";

export type ChatActivity = "writing" | "looking" | "drawing" | "error";

export type FollowUpKind = "practice" | "slides" | "quiz";

export type NotesFieldKey =
  | "whoSheIs"
  | "howSheLikesToLearn"
  | "goals"
  | "inProgress"
  | "alreadyUnderstands"
  | "getsStuckOn"
  | "littleThings";

export type ChatCopy = {
  greeting: string;
  ideas: readonly string[];
  placeholder: string;
  voiceTitle: string;
  speak: string;
  stop: string;
  backlogHint: string;
  looking: string;
  snag: string;
  voiceUnsupported: string;
  speakUnsupported: string;
  header: string;
  newChat: string;
  chats: string;
  putAway: string;
  putAwayAria: (title: string) => string;
  aboutNoorie: string;
  hideNotes: string;
  studySheet: string;
  edit: string;
  tryAgain: string;
  attach: string;
  closeMenu: string;
  opening: string;
  tagline: string;
  lastUpdated: (when: string) => string;
  notesLabels: Record<NotesFieldKey, string>;
  followUps: readonly { kind: FollowUpKind; label: string; prompt: string }[];
  searchFailed: string;
  pictureFailed: string;
  streamFailed: string;
  somethingWrong: string;
  waterPrompt: string;
  waterDrunk: string;
  waterClose: string;
  updateApp: string;
  installApp: string;
  dismissInstall: string;
  sync: {
    title: string;
    blurb: string;
    loading: string;
    saving: string;
    autoOk: string;
    failed: string;
    missingEnv: string;
  };
};

const GERMAN_WORDS = new Set([
  "ich",
  "nicht",
  "und",
  "der",
  "das",
  "ein",
  "eine",
  "einer",
  "einem",
  "einen",
  "mit",
  "auf",
  "für",
  "fuer",
  "warum",
  "bitte",
  "danke",
  "hallo",
  "guten",
  "mir",
  "dir",
  "mich",
  "dich",
  "mein",
  "meine",
  "meinem",
  "meinen",
  "meiner",
  "dem",
  "des",
  "du",
  "bist",
  "habe",
  "hast",
  "hab",
  "gerne",
  "gern",
  "auch",
  "aber",
  "oder",
  "wenn",
  "dass",
  "schon",
  "noch",
  "sehr",
  "heute",
  "möchte",
  "moechte",
  "kannst",
  "kann",
  "hilfe",
  "hilf",
  "helfen",
  "jetzt",
  "hier",
  "weil",
  "denn",
  "nach",
  "von",
  "zum",
  "zur",
  "beim",
  "kein",
  "keine",
  "keinen",
  "wer",
  "wo",
  "wann",
  "welche",
  "welcher",
  "welches",
  "schule",
  "hausaufgaben",
  "hausaufgabe",
  "erklär",
  "erklaer",
  "erklaere",
  "erkläre",
  "nochmal",
  "lerne",
  "lernen",
  "verstehe",
  "verstanden",
  "richtig",
  "falsch",
  "doch",
  "bin",
  "seid",
  "unser",
  "unsere",
  "euch",
  "nein",
  "mathe",
  "deutsch",
  "wetter",
  "geht",
  "gehts",
  "zeichne",
  "zeichnen",
  "bild",
  "folien",
  "folie",
  "frag",
  "einfach",
  "ganz",
  "mach",
  "ist",
  "sind",
  "sie",
  "wir",
  "es",
  "mal",
]);

const ENGLISH_WORDS = new Set([
  "the",
  "and",
  "you",
  "your",
  "yours",
  "what",
  "how",
  "please",
  "thanks",
  "thank",
  "hello",
  "hi",
  "hey",
  "with",
  "this",
  "that",
  "have",
  "from",
  "would",
  "could",
  "should",
  "because",
  "about",
  "just",
  "really",
  "why",
  "where",
  "when",
  "which",
  "are",
  "were",
  "for",
  "want",
  "need",
  "explain",
  "again",
  "homework",
  "learn",
  "learning",
  "today",
  "can",
  "help",
  "not",
  "does",
  "did",
  "dont",
  "im",
  "its",
  "cant",
  "yes",
  "yeah",
  "yep",
  "nope",
  "is",
  "i",
  "draw",
  "picture",
  "quiz",
  "slides",
  "slide",
  "make",
  "simple",
]);

const WEAK_ENGLISH_WORDS = new Set([
  "a",
  "to",
  "of",
  "in",
  "on",
  "me",
  "my",
  "we",
  "it",
  "do",
  "be",
]);

const NEW_CHAT_TITLES = {
  de: "Neuer Chat",
  en: "New chat",
} as const;

type LangScore = {
  de: number;
  en: number;
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9äöüß]+/)
    .filter(Boolean);
}

function scoreText(text: string): LangScore {
  const score: LangScore = { de: 0, en: 0 };
  if (/[äöüß]/i.test(text)) score.de += 4;

  for (const token of tokens(text)) {
    if (GERMAN_WORDS.has(token)) {
      score.de += 2;
      continue;
    }
    if (ENGLISH_WORDS.has(token)) {
      score.en += 2;
      continue;
    }
    if (WEAK_ENGLISH_WORDS.has(token)) score.en += 1;
  }

  return score;
}

function decide(score: LangScore): ReplyLanguage | null {
  const total = score.de + score.en;
  const diff = Math.abs(score.de - score.en);
  if (total < 2 || diff < 2) return null;
  return score.de > score.en ? "de" : "en";
}

/** German or English from recent user text. Null when the words do not say. */
export function detectReplyLanguage(
  samples: readonly string[]
): ReplyLanguage | null {
  const usable = samples
    .map((sample) => sample.trim())
    .filter(Boolean)
    .slice(-8);
  if (!usable.length) return null;

  const latest = usable[usable.length - 1] ?? "";
  const latestPick = decide(scoreText(latest));
  if (latestPick) return latestPick;

  const combined: LangScore = { de: 0, en: 0 };
  usable.forEach((text, index) => {
    const weight = index === usable.length - 1 ? 3 : 1;
    const score = scoreText(text);
    combined.de += score.de * weight;
    combined.en += score.en * weight;
  });

  return decide(combined);
}

export function browserReplyLanguage(): ReplyLanguage {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}

export function resolveReplyLanguage(samples: readonly string[]): ReplyLanguage {
  return detectReplyLanguage(samples) ?? browserReplyLanguage();
}

export function speechLocale(lang: ReplyLanguage): string {
  switch (lang) {
    case "de":
      return "de-DE";
    case "en":
      return "en-US";
    default: {
      const exhaustive: never = lang;
      return exhaustive;
    }
  }
}

export function languageInstruction(lang: ReplyLanguage): string {
  switch (lang) {
    case "de":
      return `Language rule (this overrides any earlier instruction to speak only English): Noorie's latest message is German. Write every sentence she will read or hear in German. Slide titles, slide text, and diagram labels are German too. Mermaid keywords stay in the required syntax. The image prompt inside the image block stays English so the picture model understands it. Backlog wish strings stay English. Do not answer in English unless her next message switches to English.`;
    case "en":
      return `Language rule (this overrides any earlier instruction to speak only English): Noorie's latest message is English. Write every sentence she will read or hear in English. Slide titles, slide text, and diagram labels are English too. Mermaid keywords stay in the required syntax. The image prompt inside the image block stays English. Backlog wish strings stay English. Do not answer in German unless her next message switches to German.`;
    default: {
      const exhaustive: never = lang;
      return exhaustive;
    }
  }
}

export function openingGreeting(lang: ReplyLanguage): string {
  switch (lang) {
    case "de":
      return "Hallo Noorie — ich bin Maria Sunshine. Was möchtest du heute lernen oder üben?";
    case "en":
      return "Hi Noorie — I’m Maria Sunshine. What would you like to learn or work on today?";
    default: {
      const exhaustive: never = lang;
      return exhaustive;
    }
  }
}

export function isOpeningGreeting(text: string): boolean {
  return text === openingGreeting("de") || text === openingGreeting("en");
}

export function newChatTitle(lang: ReplyLanguage): string {
  return NEW_CHAT_TITLES[lang];
}

export function isNewChatTitle(title: string): boolean {
  return title === NEW_CHAT_TITLES.de || title === NEW_CHAT_TITLES.en;
}

/** Short topic title from Noorie's first message. */
export function provisionalChatTitle(
  text: string,
  lang: ReplyLanguage,
  fallbackFileName?: string
): string {
  const cleaned = text
    .trim()
    .replace(/^(attached files)$/i, "")
    .replace(
      /^(hallo|hi|hey|hello)\s+(maria(\s+sunshine)?|noorie)\b[,!.:]?\s*/i,
      ""
    )
    .replace(/^(maria(\s+sunshine)?)\b[,!.:]?\s*/i, "")
    .replace(
      /^(erklär mir|erklaer mir|erkläre mir|explain|tell me|can you|kannst du|könntest du|koenntest du)\b[,!.:]?\s*/i,
      ""
    )
    .replace(/^(bitte|please)\b[,!.:]?\s*/i, "")
    .replace(/^(ganz kurz|kurz|briefly|very briefly)\b[,!.:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const source = cleaned || fallbackFileName?.trim() || "";
  if (!source) return newChatTitle(lang);

  const words = source.split(/\s+/).filter(Boolean).slice(0, 4);
  let title = words.join(" ");
  title = title.replace(/[?.!,;:]+$/g, "").trim();
  if (title.length > 36) title = `${title.slice(0, 33).trimEnd()}…`;
  return title || newChatTitle(lang);
}

export function canReplaceChatTitle(
  currentTitle: string,
  provisionalTitle: string
): boolean {
  return (
    isNewChatTitle(currentTitle) ||
    currentTitle === provisionalTitle ||
    currentTitle.trim() === ""
  );
}

export function chatActivityLabel(
  lang: ReplyLanguage,
  activity: ChatActivity
): string {
  switch (activity) {
    case "writing":
      return lang === "de" ? "Schreibt…" : "Writing…";
    case "looking":
      return lang === "de" ? "Schaut nach…" : "Looking it up…";
    case "drawing":
      return lang === "de" ? "Zeichnet…" : "Drawing…";
    case "error":
      return lang === "de" ? "Fehler" : "Error";
    default: {
      const exhaustive: never = activity;
      return exhaustive;
    }
  }
}

export function chatCopy(lang: ReplyLanguage): ChatCopy {
  switch (lang) {
    case "de":
      return {
        greeting: openingGreeting("de"),
        ideas: [
          "Erklär mir das ganz einfach",
          "Mach mir Folien",
          "Zeichne mir ein Bild",
          "Frag mich ab",
        ],
        placeholder: "Nachricht an Maria Sunshine…",
        voiceTitle: "Auf Deutsch oder Englisch sprechen",
        speak: "Vorlesen",
        stop: "Stopp",
        backlogHint:
          "Sag Maria Sunshine, wenn du etwas an Sunshine ändern möchtest. Sie speichert es in der Wunschliste.",
        looking: "Ich schau kurz nach…",
        snag: "Da ist etwas schiefgelaufen",
        voiceUnsupported:
          "Spracheingabe funktioniert in diesem Browser nicht.",
        speakUnsupported:
          "Vorlesen funktioniert in diesem Browser nicht.",
        header: "Mit Maria Sunshine sprechen",
        newChat: "Neuer Chat",
        chats: "Chats",
        putAway: "Weggelegt",
        putAwayAria: (title) => `${title} weglegen`,
        aboutNoorie: "Über Noorie",
        hideNotes: "Notizen aus",
        studySheet: "Lernblatt",
        edit: "Bearbeiten",
        tryAgain: "Nochmal",
        attach: "Anhang",
        closeMenu: "Menü schließen",
        opening: "Sunshine",
        tagline: "Maria Sunshine für Noorie",
        lastUpdated: (when) => `Zuletzt: ${when}`,
        notesLabels: {
          whoSheIs: "Wer sie ist",
          howSheLikesToLearn: "So lernt sie gern",
          goals: "Ziele",
          inProgress: "Gerade in Arbeit",
          alreadyUnderstands: "Das kann sie schon",
          getsStuckOn: "Hier wird sie unsicher",
          littleThings: "Kleine Dinge zum Merken",
        },
        followUps: [
          {
            kind: "practice",
            label: "Üb eine Aufgabe",
            prompt: "Gib mir bitte eine kurze Übungsaufgabe dazu.",
          },
          {
            kind: "slides",
            label: "Mach Folien",
            prompt: "Mach bitte einfache Folien dazu.",
          },
          {
            kind: "quiz",
            label: "Frag mich ab",
            prompt: "Frag mich bitte dazu ab.",
          },
        ],
        searchFailed: "Maria konnte das gerade nicht nachschauen.",
        pictureFailed: "Das Bild ist nicht angekommen.",
        streamFailed: "Keine Antwort gekommen.",
        somethingWrong: "Etwas ist schiefgelaufen.",
        waterPrompt: "Zeit für einen Schluck Wasser",
        waterDrunk: "Getrunken",
        waterClose: "Schließen",
        updateApp: "Sunshine aktualisieren",
        installApp: "Sunshine installieren",
        dismissInstall: "Nicht jetzt",
        sync: {
          title: "Cloud",
          blurb:
            "Chats und Über Noorie speichern sich automatisch — auf Telefon und Laptop gleich.",
          loading: "Cloud wird geladen…",
          saving: "Wird gespeichert…",
          autoOk: "Automatisch synchron",
          failed: "Sync fehlgeschlagen.",
          missingEnv:
            "Cloud-Sync braucht NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY auf dem Server.",
        },
      };
    case "en":
      return {
        greeting: openingGreeting("en"),
        ideas: [
          "Explain this in a simple way",
          "Make me slides",
          "Draw me a picture",
          "Quiz me",
        ],
        placeholder: "Message Maria Sunshine…",
        voiceTitle: "Speak in English or German",
        speak: "Speak",
        stop: "Stop",
        backlogHint:
          "Tell Maria Sunshine if you want anything in Sunshine changed. She saves it in the upgrade backlog.",
        looking: "Looking that up…",
        snag: "I hit a snag",
        voiceUnsupported: "Voice input is not supported in this browser.",
        speakUnsupported: "Speaking aloud is not supported in this browser.",
        header: "Chat with Maria Sunshine",
        newChat: "New chat",
        chats: "Chats",
        putAway: "Put away",
        putAwayAria: (title) => `Put away ${title}`,
        aboutNoorie: "About Noorie",
        hideNotes: "Hide notes",
        studySheet: "Study sheet",
        edit: "Edit",
        tryAgain: "Try again",
        attach: "Attach",
        closeMenu: "Close menu",
        opening: "Sunshine",
        tagline: "Maria Sunshine for Noorie",
        lastUpdated: (when) => `Last updated: ${when}`,
        notesLabels: {
          whoSheIs: "Who she is",
          howSheLikesToLearn: "How she likes to learn",
          goals: "Goals",
          inProgress: "In progress",
          alreadyUnderstands: "Already understands",
          getsStuckOn: "Gets stuck on",
          littleThings: "Little things to remember",
        },
        followUps: [
          {
            kind: "practice",
            label: "Practice a question",
            prompt: "Please give me a short practice question about this.",
          },
          {
            kind: "slides",
            label: "Make slides",
            prompt: "Please make simple slides about this.",
          },
          {
            kind: "quiz",
            label: "Quiz me",
            prompt: "Please quiz me about this.",
          },
        ],
        searchFailed: "Maria could not look that up right now.",
        pictureFailed: "The picture did not come back.",
        streamFailed: "No response stream.",
        somethingWrong: "Something went wrong.",
        waterPrompt: "Time for a sip of water",
        waterDrunk: "Drunk",
        waterClose: "Close",
        updateApp: "Update Sunshine",
        installApp: "Install Sunshine",
        dismissInstall: "Not now",
        sync: {
          title: "Cloud",
          blurb:
            "Chats and About Noorie save automatically — same on phone and laptop.",
          loading: "Loading cloud…",
          saving: "Saving…",
          autoOk: "Synced automatically",
          failed: "Sync failed.",
          missingEnv:
            "Cloud sync needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on the server.",
        },
      };
    default: {
      const exhaustive: never = lang;
      return exhaustive;
    }
  }
}
