# Sunshine

Girlie English chat where **Maria** helps **Nourie**.

**Live:** [sunshine-maria.vercel.app](https://sunshine-maria.vercel.app) · [sunshine-sooty.vercel.app](https://sunshine-sooty.vercel.app)

`sunshine.vercel.app` is already taken on Vercel, so production uses the aliases above. GitHub: [ritzaisolutions-dotcom/sunshine](https://github.com/ritzaisolutions-dotcom/sunshine).

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
