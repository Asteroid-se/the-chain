# The Chain

A local media download manager with a custom dark interface. Built with Next.js App Router, TypeScript, Tailwind CSS, Lucide, Zod, Prisma, and SQLite.

**Direct public media-file URLs download for real.** The generic adapter accepts direct HTTP(S) links whose response is a supported video, audio, or image type with a declared size. Files are streamed into `MEDIA_DIR`, tracked in SQLite, and can be saved from History. YouTube, Instagram, and TikTok page URLs still use clearly labeled demo adapters. No DRM, login, private-content, or platform protection bypass is implemented.

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
MEDIA_DIR="./storage"
MAX_MEDIA_BYTES="536870912"
```

Prisma resolves relative database paths against `prisma/`. You can set a different SQLite file through `.env` or the process environment. For a manual schema update, run `npm run db:push`. Do not commit `.env` or database files. For production-style local execution:

```sh
npm run build
npm start
```

This is a single-user local workspace, bound to loopback by default. It has no authentication or per-user isolation; do not publish its write APIs to the public internet without adding those features. Production deployment should use migrations instead of startup `db push` and retain the SQLite file on persistent storage.

For a password-protected internet demo on one VPS, see [the Turkish deployment guide](deploy/README.tr.md). It includes Docker Compose, a persistent SQLite volume, Caddy HTTPS, and HTTP Basic Authentication. The deployment remains a shared demo workspace.

## Try the complete workflow

1. Paste a direct public media-file URL such as an `.mp4` URL and choose **Analyze link**, or click a platform sample to exercise demo mode.
2. Select a format, then **Add to queue**.
3. Watch real byte progress, pause, refresh the page, and resume. Resume uses HTTP Range when the origin supports it; otherwise the transfer safely restarts from byte zero.
4. Open **Download history** to save the completed file to your device; search, filter by platform or media type, and delete records. Deleting a real record deletes its stored file.
5. Open **Overview** to see statistics calculated from completed SQLite records.
6. Choose **Test retry** to trigger a deliberate failure at 42%. Retry succeeds on the next attempt.
7. Try **Ambient audio** and **Photography** for their relevant format selectors.

Generic URLs are inspected with HEAD, with a one-byte Range fallback. Supported MIME types are MP4, WebM, QuickTime, MP3, M4A, OGG, WAV, JPEG, PNG, WebP, and GIF. The default limit is 512 MB. The server rejects private/local IP addresses, embedded credentials, nonstandard ports, redirects to blocked destinations, unknown MIME types, missing sizes, and oversized responses. Only download media you own or are permitted to download.

## Structure

```text
prisma/schema.prisma      SQLite Download model
scripts/init.mjs          Environment and first-run database setup
src/app/                 App Router pages, layout, Route Handlers
src/components/          Custom UI, queue rows, media preview, statistics
src/hooks/               Polling and client state
src/lib/                 Prisma singleton, HTTP helpers, URL validation
src/providers/           Provider contract, adapters, demo fixtures
src/services/            Queue transitions, real file worker, history and statistics
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

Provider page adapters should use official or otherwise permitted sources and return explicit unavailable/unsupported errors. The generic adapter already validates public addresses, every redirect, response size, timeout, and content type. Do not introduce DRM circumvention, login bypasses, or private-content scraping.

## Queue design

SQLite stores `queued`, `processing`, `completed`, and `failed`, plus a separate `paused` flag, progress, attempt count, and timestamps. Pause/resume/retry are validated transitions. Retry resets progress and increments attempts. Completed records are the history; deleting or clearing them also updates statistics.

Demo jobs retain elapsed-time reconciliation. Real jobs stream their origin response to `MEDIA_DIR`, update byte progress in SQLite, and run through Next.js `after()` after the enqueue response. Browser polling runs every 1.5 seconds. A queue read restarts an interrupted real worker after a server restart. State and partial files survive reloads and restarts.

The MVP processes one real item at a time, oldest first. Pausing the first real item holds the real queue; resuming or removing it lets the queue continue. The current in-process worker suits the single-instance Docker deployment. Multiple application replicas need a durable external worker and atomic job claims.

## API

| Endpoint                      | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `POST /api/analyze`           | `{ url }` → real direct-file or demo metadata        |
| `POST /api/download`          | `{ url, formatId }` → persisted queue item           |
| `GET /api/downloads`          | `scope=queue\|history`, `search`, `provider`, `type` |
| `PATCH /api/downloads/:id`    | `{ action: "pause"\|"resume"\|"retry" }`             |
| `DELETE /api/downloads/:id`   | Remove one queue/history record                      |
| `GET /api/downloads/:id/file` | Stream one completed stored media file               |
| `DELETE /api/downloads`       | Clear completed records only                         |
| `GET /api/stats`              | Counts, total bytes, most used platform              |

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
