# The Chain

A local media download manager with a custom dark interface. Built with Next.js App Router, TypeScript, Tailwind CSS, Lucide, Zod, Prisma, and SQLite.

**This MVP runs entirely in demo mode.** YouTube, Instagram, TikTok, and generic links produce clearly labeled example metadata and simulated transfers. No remote URLs are fetched, no platform protections are bypassed, and no media files are created. Format options and byte counts are illustrative.

## Run

Install Node.js **22.13 or newer** (Node 22 LTS recommended), then:

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. Installation generates the Prisma client. The predev script copies `.env.example` to `.env` if needed, creates the SQLite file, and synchronizes the schema automatically. The initial install needs internet access to download packages and Prisma engines; the app itself needs no external API, account, or API key.

On this Windows workspace, a verified portable Node.js runtime is available under the ignored `.tools/` directory because Node was not installed on PATH. Run `powershell -ExecutionPolicy Bypass -File .\dev.ps1` to use it. The helper only changes PATH for its own process; a copied or cloned project should use a normal Node installation.

Default environment:

```env
DATABASE_URL="file:./dev.db"
```

Prisma resolves relative database paths against `prisma/`. You can set a different SQLite file through `.env` or the process environment. For a manual schema update, run `npm run db:push`. Do not commit `.env` or database files. For production-style local execution:

```sh
npm run build
npm start
```

This is a single-user local workspace, bound to loopback by default. It has no authentication or per-user isolation; do not publish its write APIs to the public internet without adding those features. Production deployment should use migrations instead of startup `db push` and retain the SQLite file on persistent storage.

## Try the complete workflow

1. Click **Cinematic video**, or paste an HTTP(S) URL and choose **Analyze link**.
2. Select a format, then **Add to queue**.
3. Watch progress, pause, refresh the page, and resume. Transfers take about 13 seconds while unpaused.
4. Open **Download history** to see the completed transfer; search, filter by platform or media type, and delete records.
5. Open **Overview** to see statistics calculated from completed SQLite records.
6. Choose **Test retry** to trigger a deliberate failure at 42%. Retry succeeds on the next attempt.
7. Try **Ambient audio** and **Photography** for their relevant format selectors.

Generic URLs use mock metadata too. An unknown website is not reported as a supported real downloader. Since there is no upstream fetch, remote availability, permissions, and provider outages cannot be verified in this MVP. Network errors between browser and API, invalid input, unavailable formats, missing records, invalid transitions, and unexpected database errors have user-facing error responses.

## Structure

```text
prisma/schema.prisma      SQLite Download model
scripts/init.mjs          Environment and first-run database setup
src/app/                 App Router pages, layout, Route Handlers
src/components/          Custom UI, queue rows, media preview, statistics
src/hooks/               Polling and client state
src/lib/                 Prisma singleton, HTTP helpers, URL validation
src/providers/           Provider contract, adapters, demo fixtures
src/services/            Queue transitions, history queries, statistics
src/types/               Shared media and API data types
tests/                   Unit tests and browser integration tests
```

Route Handlers validate inputs with Zod and delegate to services. `endpoint` returns a consistent `{ success, data, error }` envelope; unexpected errors are logged on the server with a generic client message. The client never determines trusted metadata, sizes, or formats: enqueue reanalyzes the URL and validates the selected format server-side.

## Provider adapters

Every adapter implements `MediaProvider`: a name, `validate(URL)`, and asynchronous `analyze(URL)` returning metadata and available formats. The registry tries specific providers first and the generic fallback last. Domain matching respects hostname boundaries, including subdomains, and does not mistake `youtube.com.evil.example` for YouTube.

To add a provider:

1. Extend `ProviderName` and the platform filter validation if introducing a new platform.
2. Create `src/providers/new-provider.ts` implementing the shared interface.
3. Register it ahead of `generic` in `src/providers/index.ts`.
4. Add detection, display, and adapter tests.

For a future real adapter, use only permitted sources or official APIs and implement explicit unavailable/unsupported errors. Keep any transfer execution in a worker, separate from analysis. Before accepting arbitrary real fetch targets, add public-address validation, DNS and redirect checks, response limits, timeouts, and content-type validation. Do not introduce DRM circumvention, login bypasses, or private-content scraping.

## Queue design

SQLite stores `queued`, `processing`, `completed`, and `failed`, plus a separate `paused` flag, progress, attempt count, and timestamps. Pause/resume/retry are validated transitions. Retry resets progress and increments attempts. Completed records are the history; deleting or clearing them also updates statistics.

The simulated worker reconciles elapsed time in `src/services/queue.ts` when the queue or statistics API is read. Every 250 ms represents two percentage points. Browser polling runs every 1.5 seconds. Paused records are excluded, and resume updates the timestamp so paused time is never counted. State survives reloads and restarts. When no client is open, no background process runs; the next read reconciles elapsed time. `completedAt` records reconciliation time, not a real transfer finish time.

The MVP processes one item at a time, oldest first. Pausing the first item holds the queue; resuming or removing it lets the queue continue. Waiting jobs start their progress clock only when selected. Replace reconciliation with a durable worker and atomic job claims later, keeping the existing status contract and API. Real worker concurrency, backpressure, speed limits, cancellation, disk storage, and downloadable file artifacts are future work.

## API

| Endpoint                    | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `POST /api/analyze`         | `{ url }` → demo metadata and formats                |
| `POST /api/download`        | `{ url, formatId }` → persisted queue item           |
| `GET /api/downloads`        | `scope=queue\|history`, `search`, `provider`, `type` |
| `PATCH /api/downloads/:id`  | `{ action: "pause"\|"resume"\|"retry" }`             |
| `DELETE /api/downloads/:id` | Remove one queue/history record                      |
| `DELETE /api/downloads`     | Clear completed records only                         |
| `GET /api/stats`            | Counts, total bytes, most used platform              |

History queries return up to 200 matching records, newest first; statistics aggregate all completed records. Pagination is future work.

The dependency override for `deepmerge-ts` applies the version 8 recursion fix to Prisma's development CLI configuration dependency. Prisma generation, database initialization, build, and browser tests are checked with that override.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

Build the app first. Playwright starts its own production server on port 3100 with **`prisma/e2e.db`**. Tests clear that test database and leave the normal `dev.db` untouched. Port 3100 must be available. Tests cover invalid URLs, provider detection, relevant formats, queue persistence, pause/resume, completion, statistics, history search/filters/deletion, failure/retry, history clearing, API errors, and desktop/mobile overflow. Screenshots are written to `test-results/`.

## Roadmap

Permitted real provider integrations; durable queue workers; real files and a gallery; concurrency and speed controls; desktop/mobile clients; browser extension; account isolation and cloud sync. These features are intentionally outside this MVP.
