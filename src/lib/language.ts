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
  todosNav: string;
  settingsNav: string;
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
  todos: {
    title: string;
    back: string;
    open: string;
    done: string;
    suggested: string;
    add: string;
    placeholder: string;
    dueOptional: string;
    recurrence: string;
    none: string;
    daily: string;
    weekly: string;
    accept: string;
    dismiss: string;
    emptyOpen: string;
    emptyDone: string;
    emptySuggested: string;
    markDone: string;
    reopen: string;
    delete: string;
    edit: string;
    save: string;
    cancel: string;
    dragHandle: string;
    loading: string;
    failed: string;
    reminderTitle: string;
    reminderClose: string;
  };
  settings: {
    title: string;
    back: string;
    pushTitle: string;
    pushBlurb: string;
    iosHint: string;
    turnOn: string;
    turnOff: string;
    channels: string;
    dueTodos: string;
    dueTodosHint: string;
    water: string;
    waterHint: string;
    enabled: string;
    disabled: string;
    saved: string;
    failed: string;
    unsupported: string;
    denied: string;
    testPush: string;
    testOk: string;
    subscribed: string;
    notSubscribed: string;
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
        todosNav: "To-dos",
        settingsNav: "Einstellungen",
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
        todos: {
          title: "To-dos",
          back: "Zurück zum Chat",
          open: "Offen",
          done: "Erledigt",
          suggested: "Maria schlägt vor",
          add: "Hinzufügen",
          placeholder: "Neues To-do…",
          dueOptional: "Fällig (optional)",
          recurrence: "Wiederholung",
          none: "Einmalig",
          daily: "Täglich",
          weekly: "Wöchentlich",
          accept: "Annehmen",
          dismiss: "Weglegen",
          emptyOpen: "Noch keine offenen To-dos.",
          emptyDone: "Noch nichts erledigt.",
          emptySuggested: "Keine Vorschläge von Maria.",
          markDone: "Erledigt",
          reopen: "Wieder öffnen",
          delete: "Löschen",
          edit: "Bearbeiten",
          save: "Speichern",
          cancel: "Abbrechen",
          dragHandle: "Ziehen zum Sortieren",
          loading: "To-dos werden geladen…",
          failed: "To-dos konnten nicht geladen werden.",
          reminderTitle: "Denk daran",
          reminderClose: "Schließen",
        },
        settings: {
          title: "Einstellungen",
          back: "Zurück zum Chat",
          pushTitle: "Erinnerungen",
          pushBlurb:
            "Maria kann dich per Push an fällige To-dos erinnern — auch wenn Sunshine zu ist.",
          iosHint:
            "Am iPhone: Sunshine zum Home-Bildschirm legen, dann hier Push einschalten.",
          turnOn: "Push einschalten",
          turnOff: "Push ausschalten",
          channels: "Was soll Maria schicken?",
          dueTodos: "Fällige To-dos",
          dueTodosHint: "Wenn ein Termin erreicht ist (alle 5 Minuten geprüft).",
          water: "Wasser-Erinnerung",
          waterHint: "Zusätzlicher System-Hinweis, während Sunshine offen ist.",
          enabled: "Push ist an",
          disabled: "Push ist aus",
          saved: "Gespeichert",
          failed: "Konnte nicht gespeichert werden.",
          unsupported: "Dieser Browser unterstützt keine Push-Benachrichtigungen.",
          denied:
            "Benachrichtigungen sind blockiert. Bitte in den Browser-Einstellungen erlauben.",
          testPush: "Test-Benachrichtigung",
          testOk: "Test gesendet — schau außerhalb der App",
          subscribed: "Dieses Gerät ist angemeldet.",
          notSubscribed:
            "Dieses iPhone/Gerät ist noch nicht angemeldet — nur ein anderes Gerät. Tippe auf Push einschalten.",
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
        todosNav: "To-dos",
        settingsNav: "Settings",
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
        todos: {
          title: "To-dos",
          back: "Back to chat",
          open: "Open",
          done: "Done",
          suggested: "Maria suggested",
          add: "Add",
          placeholder: "New to-do…",
          dueOptional: "Due (optional)",
          recurrence: "Repeat",
          none: "Once",
          daily: "Daily",
          weekly: "Weekly",
          accept: "Accept",
          dismiss: "Dismiss",
          emptyOpen: "No open to-dos yet.",
          emptyDone: "Nothing done yet.",
          emptySuggested: "No suggestions from Maria.",
          markDone: "Done",
          reopen: "Reopen",
          delete: "Delete",
          edit: "Edit",
          save: "Save",
          cancel: "Cancel",
          dragHandle: "Drag to reorder",
          loading: "Loading to-dos…",
          failed: "Could not load to-dos.",
          reminderTitle: "Remember this",
          reminderClose: "Close",
        },
        settings: {
          title: "Settings",
          back: "Back to chat",
          pushTitle: "Reminders",
          pushBlurb:
            "Maria can push due to-dos to you — even when Sunshine is closed.",
          iosHint:
            "On iPhone: add Sunshine to the Home Screen, then turn push on here.",
          turnOn: "Turn push on",
          turnOff: "Turn push off",
          channels: "What should Maria send?",
          dueTodos: "Due to-dos",
          dueTodosHint: "When a deadline is reached (checked every 5 minutes).",
          water: "Water reminder",
          waterHint: "Extra system nudge while Sunshine is open.",
          enabled: "Push is on",
          disabled: "Push is off",
          saved: "Saved",
          failed: "Could not save.",
          unsupported: "This browser does not support push notifications.",
          denied:
            "Notifications are blocked. Allow them in your browser settings.",
          testPush: "Send test notification",
          testOk: "Test sent — check outside the app",
          subscribed: "This device is subscribed.",
          notSubscribed:
            "This phone/device is not subscribed yet — only another device is. Tap Turn push on.",
        },
      };
    default: {
      const exhaustive: never = lang;
      return exhaustive;
    }
  }
}
