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
