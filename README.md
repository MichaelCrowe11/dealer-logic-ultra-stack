# Dealer Logic Ultra Stack

Express backend and Prisma schema for an automotive dealership call and CRM service, with a sync script for ElevenLabs conversational agents.

## Status

`archived`

One commit, dated 2025-09-11 (git log). Development stopped there. The only later activity is a Dependabot pull request from 2025-10-29, left open. The code is kept for reference.

## Install and first run

Not maintained. No supported install path.

Not run today: `npm ci`. The lockfile lists 1022 packages, over the estate disk cap of about 800, so nothing was installed. That also rules out `tsc -p tsconfig.backend.json`, `next build`, `jest` and `prisma migrate`, which all need `node_modules`.

What did run today (Node v26.5.0), a syntax check only:

```
$ node --check scripts/sync-agents.js && node --check scripts/test-agent-sync.js && node --check next.config.js && node --check tailwind.config.js && echo "syntax ok: 4 files"
syntax ok: 4 files
```

## What runs today

Nothing is maintained. For reference, the repo contains:

- `src/backend/server.ts`: an Express 5 app with helmet, a rate limiter, sessions, Socket.io, a `/health` route, and routers under `/api/auth`, `/api/dealerships`, `/api/voice`, `/api/analytics`, `/api/pricing`, `/api/roi`, `/api/crm`, `/api/elevenlabs` and `/api/webhooks`.
- `prisma/schema.prisma`: 12 PostgreSQL models (User, Dealership, Customer, VoiceCall, Agent, Transcription, Lead, Activity, Analytics, Transaction, Quote, AnalyticsEvent).
- `src/backend/services/convai-sync.service.ts`: shells out to a `convai` command line tool (`convai agent list --json`, `convai agent deploy`) and calls the ElevenLabs voices API. It falls back to `../agents.json` and `../agent_configs`, which are not in this repo.
- `src/frontend/components/pricing/roi-calculator.tsx`: one React component. There is no `app/` or `pages/` directory, so `next build` has no site to produce.
- No test files. `npm test` runs jest against nothing.

## Limits

- The tier prices in `src/backend/api/pricing.ts` and `src/frontend/components/pricing/roi-calculator.tsx` (299, 799 and 2499 a month) are placeholders typed into the code. Nothing here is for sale at those prices.
- The ROI formula in `roi-calculator.tsx` (85 percent of missed calls recovered, 30 percent staff saving, a five year multiple) and the 10 percent annual discount in `pricing.ts` are placeholders. No measurement backs them. Do not quote them.
- `src/backend/api/roi.ts` projects revenue with a fixed 30 percent cost ratio and a 5 percent default growth rate. Also placeholders.
- `npm start` runs `dist/server/index.js`, but the backend build writes to `dist/backend/`. `npm run migrate` and `npm run seed` point at files with no source. `npm run docker:build` needs a Dockerfile that is not in the repo.
- JWT and session secrets fall back to fixed strings (`your-jwt-secret`, `your-session-secret`) when the env vars are unset. Do not deploy as is.
- `.env.example` lists keys for Vapi, Twilio, HubSpot, Salesforce, Pipedrive, Zoho, SendGrid, Stripe, AWS and Mixpanel. The code reads none of them. Only `ELEVENLABS_API_KEY`, the database, JWT, session, Redis, port and logging variables are read (grep of `process.env`). The CRM names appear only as enum values in `src/shared/types/index.ts`.
- Not a dealership management system. Makes no claim about call recovery, compliance, or telephony law.

## License and contact

No license file. `package.json` declares `UNLICENSED`, so no rights are granted.

Contact: michael@crowelogic.com
