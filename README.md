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

Open [http://localhost:3000](http://localhost:3000). Admin: `/admin`. To-dos: `/todos`. Settings: `/settings`. Study sheet: `/study-sheet`.

## Push reminders

In **Settings**, Noorie can turn on push and choose channels (due to-dos primary; water optional).

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set in `.env.local` / Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`
3. Apply the Supabase migration `supabase/migrations/20261013_sunshine_push.sql` (already applied on the Ritz AI project)
4. Deploy with `vercel.json` cron (`*/5 * * * *` → `/api/cron/reminders`; needs a plan that allows sub-daily crons)

On iPhone, install Sunshine to the Home Screen first, then enable push in Settings.

## Features

- Chat with streaming replies
- Saved chats (archive = put away)
- About Nourie living memory
- Configurable push reminders for due to-dos
- Water reminder every 30 minutes
- One surprise overlay per visit
- Voice-to-text, file attachments
- Slides and diagrams in-thread
- GoodNotes connect attempt + printable study sheet
