# Sunshine

Girlie English chat where **Maria** helps **Nourie**. Deployed at [sunshine.vercel.app](https://sunshine.vercel.app).

## Stack

- Next.js, TypeScript, Tailwind, shadcn/ui
- Mistral `mistral-small-latest` via `/api/chat`
- Chats, notes, admin settings stored in the browser

## Local

```bash
npm install
cp .env.example .env.local
# add MISTRAL_API_KEY=
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: `/admin`. Study sheet: `/study-sheet`.

## Features

- Chat with streaming replies
- Saved chats (archive = put away)
- About Nourie living memory
- Water reminder every 30 minutes
- One surprise overlay per visit
- Voice-to-text, file attachments
- Slides and diagrams in-thread
- GoodNotes connect attempt + printable study sheet
