# EVKERK Automation Wiring

## Architecture

The normal human entry point is QQ, not the website admin.

`QQ -> Xiaoguang/Qwen proposal -> Sinan hard validation -> Church Ops API -> D1/R2/Calendar -> website`

For sermon recordings, the bounded path is:

`admin audio upload -> private R2 object -> queued media job -> Sinan church media worker -> existing Home ASR -> local Qwen article draft -> ready_for_review -> human approval -> published sermon`

The website remains the display layer. D1/R2/Calendar are authoritative state; conversation text is never authoritative state.

## 1. Cloudflare D1

Create a database named:

`evkerk-website-db`

Apply migrations in order:

- `migrations/0001_init.sql`
- `migrations/0002_sinan_ops.sql`
- `migrations/0003_media_ingest.sql`

Then add the binding to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "evkerk-website-db"
database_id = "<D1 UUID>"
```

`0002` adds durable Sinan jobs, approvals and audit/undo records. `0003` adds media ingest jobs plus sermon article fields.

Without D1, the public events endpoint intentionally falls back to the two regular Sunday services so the homepage never goes blank. All write/ingest APIs intentionally refuse to operate without D1.

## 2. Cloudflare R2

Create one private bucket:

`evkerk-media`

Bind it to the Worker as:

```toml
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "evkerk-media"
```

Raw sermon recordings are stored under `sermon-audio/...`. They are not publicly readable while queued, processing or waiting for review. The public audio/transcript routes only return content after the media job is explicitly published.

Default browser upload limit is 95 MB. Override with Worker variable:

`MAX_MEDIA_MB=<number>`

Do not expose the R2 bucket directly to the public internet.

## 3. Tokens

Create a long random admin secret and configure it in the Worker as:

`INGEST_TOKEN`

Create a separate long Sinan machine secret and configure it in the Worker as:

`SINAN_TOKEN`

Store the same `SINAN_TOKEN` on the church/Sinan machine in:

`<SINAN_PROJECT_ROOT>/.sinan/church-ops.token`

The QQ Church Ops client and Church Media Worker may reuse that same machine token. Qwen never receives the token. The deterministic Sinan clients own authenticated network calls. Never commit either token to GitHub.

## 4. Church Ops API

Primary QQ intent endpoint:

`POST /api/sinan/intents`

Supported bounded types include:

- `announcement.publish`
- `announcement.unpublish`
- `sermon.publish`
- `sermon.unpublish`
- `calendar.create`
- `calendar.update`
- `calendar.cancel`
- `media.publish`

The server calculates risk again and does not trust a risk value proposed by the model.

High-risk actions create a 15-minute `CH-A-...` approval. Sunday/calendar changes, cancellations and destructive unpublishing are high risk.

Every completed write receives an `OP-...` operation id and audit record. Reversible D1 operations can be undone through:

`POST /api/sinan/undo`

## 5. Church Media Ingest v0.1

Human/admin routes use `INGEST_TOKEN`:

- `POST /api/media/upload` — raw audio request body; filename/date/speaker are supplied in headers.
- `GET /api/media/jobs`
- `GET /api/media/jobs/:id`
- `PATCH /api/media/jobs/:id` — edit the generated draft.
- `POST /api/media/jobs/:id/retry`
- `POST /api/media/jobs/:id/publish` — the only v0.1 route that turns the generated draft into a published sermon.

Sinan machine routes use `SINAN_TOKEN`:

- `GET /api/sinan/media/jobs?status=queued`
- `POST /api/sinan/media/jobs/:id/claim`
- `GET /api/sinan/media/jobs/:id/audio`
- `POST /api/sinan/media/jobs/:id/result`
- `POST /api/sinan/media/jobs/:id/fail`

The Sinan worker has no publish method. Its successful terminal state is `ready_for_review`.

Manual review UI:

`/admin/media.html`

The review screen exposes source metadata, transcript, Chinese/Dutch title and summary, Chinese/Dutch article, detected scripture and Sinan's uncertainty notes. Human confirmation is required before publication.

## 6. Sinan church media worker

The Sinan repository contains:

- `sinan/runtime/church_media_worker.py`
- `sinan/runtime/church_media_article.py`
- `scripts/start_church_media_autostart.ps1`
- `scripts/install_church_media_autostart.ps1`

It reuses the existing Home ASR entrypoint and therefore also reuses the existing ASR heavy lock/ledger instead of loading a second independent speech stack.

Required machine configuration:

- `EVKERK_API_URL=https://<deployed-evkerk-worker-origin>/`
- `.sinan/church-ops.token` containing the same Worker `SINAN_TOKEN`
- existing Home ASR runtime/config/models
- local Ollama OpenAI-compatible endpoint, default `http://127.0.0.1:11434/v1/chat/completions`
- default article model `qwen3:8b-64k`

Optional overrides:

- `EVKERK_OLLAMA_ENDPOINT`
- `EVKERK_OLLAMA_MODEL`
- `EVKERK_MEDIA_POLL_SECONDS` (default 30)
- `EVKERK_MEDIA_MAX_MB` (local download safety limit; default 500)

Install the Windows at-logon single-instance task only after the website API is deployed and the token file exists:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install_church_media_autostart.ps1 -ApiUrl "https://<worker-origin>/"
```

The scheduled task is named `Sinan_Church_Media` by default and uses `MultipleInstances IgnoreNew`.

## 7. Sermon editing policy

The article generator is instructed to:

- stay faithful to the transcript;
- remove filler/repetition/obvious ASR noise;
- preserve the speaker's argument and tone;
- never invent theology, stories, quotations, people or Bible references;
- use verified scripture hints from the ASR evidence when available;
- flag uncertain names/numbers/scripture/sentences instead of guessing;
- produce a readable Chinese article and a faithful Dutch version.

Initial publication policy is deliberately conservative:

`recording -> transcript -> generated draft -> human review -> publish`

No automatic publishing in v0.1.

## 8. Google Calendar

A dedicated calendar is recommended:

`Evangeliekerk / 福音教会`

The existing `CHURCH_CALENDAR_ICS_URL` integration is read-only and may mirror calendar state into D1 every 30 minutes. A private ICS URL must be treated as a secret.

An ICS feed cannot perform Google Calendar writes. Calendar intents created from QQ therefore become durable `pending_executor` jobs until the Calendar executor is configured. The API never pretends an external calendar write succeeded.

## 9. One-time account wiring still required

1. Connect `Fearsky2020/evkerk-website` to Cloudflare Workers Builds.
2. Create D1 `evkerk-website-db`, run migrations `0001` through `0003`, and bind it as `DB`.
3. Create private R2 bucket `evkerk-media` and bind it as `MEDIA`.
4. Configure Worker secrets `INGEST_TOKEN` and `SINAN_TOKEN`.
5. Put the same `SINAN_TOKEN` in `<SINAN_PROJECT_ROOT>/.sinan/church-ops.token` on the church machine.
6. Configure/restart the QQ gateway against the Church Ops endpoint.
7. Install/start `Sinan_Church_Media` against the same website API origin.
8. Upload one short test recording at `/admin/media.html` and verify it reaches `ready_for_review` but does not publish by itself.
9. Then configure the dedicated Google Calendar/external Calendar executor.

After items 1–7, ordinary QQ website operations and recording-to-article processing can run without day-to-day website administration.
