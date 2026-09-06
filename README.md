This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable (anon) key.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only). Required for the daily recurring-transaction cron. **Never expose this to the client.**
- `CRON_SECRET` — Secret used by [Vercel Cron](https://vercel.com/docs/cron-jobs) to authenticate cron invocations (`Authorization: Bearer <CRON_SECRET>`).

## Demo Account

The login page has a one-click “Try Demo Dashboard” button that creates a demo user (`demo@finora.app`) with sample data and signs you in. Creating/seeding the account the first time requires `SUPABASE_SERVICE_ROLE_KEY` on the server; once the demo user exists, sign-in works without it. Disable the feature with `NEXT_PUBLIC_DEMO_MODE=false`; to remove it entirely, delete `src/lib/demo.ts` and `src/app/api/demo/login/route.ts`, and remove the DEMO-ONLY block in `src/app/login/page.tsx`.

## Recurring Transactions (Cron)

Due recurring templates are materialized into transactions by `POST /api/recurring/generate` (also callable from the Recurring page via “Generate Now”). A daily cron job is configured in `vercel.json`; on Vercel it runs the endpoint at 06:00 UTC every day. For the cron to work, set both `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` on your Vercel project — without the service role key the job cannot see other users’ templates. Change the schedule in `vercel.json` if you want a different time/frequency.
