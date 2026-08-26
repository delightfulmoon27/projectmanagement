# Project manager

A personal project management app with a Gantt timeline, task priority scoring, dependencies, recurring tasks, and project archiving.

## Stack

Next.js (App Router) · Supabase (auth + Postgres + realtime) · Tailwind CSS

## Setup

1. **Supabase**
   - Your tables and RLS policies are already created. If you ever need to recreate them, run [`sql/migration.sql`](sql/migration.sql) in the Supabase SQL editor — it also enables realtime on the `tasks` table.
   - In the Supabase dashboard, enable email/password auth and create your user account under **Authentication → Users → Add user** (there is no in-app signup).

2. **Environment variables**
   - Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API):
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` — you'll be redirected to `/login`.

## Structure

```
/app
  /login              Login page (public)
  /(protected)         Auth-gated route group
    layout.tsx          Server-side auth check + toast provider
    page.tsx             Timeline page (fetches initial data)
    /components         Timeline, GanttRow, GanttBar, modals, detail panel, etc.
/lib
  supabase/            Browser + server Supabase clients, middleware session refresh
  types.ts             Shared TypeScript types
  scoring.ts           Priority score + status derivation
  dates.ts             ISO week / month grid helpers
  recurring.ts         Next-instance calculation for recurring tasks
/sql
  migration.sql        Tables, indexes, RLS policies, realtime publication
proxy.ts               Session refresh + route protection (Next.js 16 middleware)
```

## Notes

- Priority score = `urgency(deadline) × 0.6 + impact × 0.4`, recalculated on the frontend — see `lib/scoring.ts`.
- Realtime sync is enabled on the `tasks` table only, so edits made on one device (e.g. mobile) appear on another without a refresh.
- Marking a recurring task's progress to 100% automatically creates the next instance (previous `end_date + 1` as the new start).
