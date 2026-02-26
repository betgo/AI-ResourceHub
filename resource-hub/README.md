# ResourceHub

ResourceHub is a Next.js full-stack app for publishing and discovering digital resources.

## Getting Started

1. Copy the environment template:

```bash
cp .env.local.example .env.local
```

2. Fill in all Supabase values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

3. Install dependencies and start development:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment Validation

`src/lib/env.ts` provides centralized environment loading and validation:

- `publicEnv` for browser-safe Supabase variables.
- `getServerEnv()` for server-only secrets.
- `env` for shared server runtime access.

If any required variable is missing, the app throws an error at startup/runtime.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## End-to-End Validation

Expected acceptance flow:

1. Register
2. Submit a resource (pending)
3. Admin review (approve/reject)
4. Browse published resources
5. Favorite / comment / download

## Known Issues

- If Supabase migrations are not applied, write APIs fail with errors like `Could not find the table 'public.resources' in the schema cache`.
- When email confirmation is enabled in Supabase Auth, newly registered users cannot sign in until mailbox verification is completed.

## Manual Recovery

1. Apply SQL migrations in `supabase/migrations/` to the active Supabase project.
2. Confirm at least one admin user exists (`app_metadata.role=admin` or equivalent).
3. For automation-only environments, either pre-create confirmed test users or disable email confirmation temporarily.
