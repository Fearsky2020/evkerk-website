# EVKERK Automation Wiring

## Architecture

- Public website reads:
  - `GET /api/events`
  - `GET /api/sermons`
  - `GET /api/announcements`
- Google Calendar sync runs every 30 minutes through the Worker scheduled handler.
- SINAN / church PC can publish sermons through `POST /api/ingest/sermon`.
- Manual exceptions can be handled from `/admin/`.

## 1. Cloudflare D1

Create a database named:

`evkerk-website-db`

Apply:

`migrations/0001_init.sql`

Then add the binding to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "evkerk-website-db"
database_id = "<D1 UUID>"
```

Without D1, the public `/api/events` endpoint intentionally falls back to the two regular Sunday services so the homepage never goes blank.

## 2. Dedicated Google Calendar

Create one separate Google Calendar:

`Evangeliekerk / 福音教会`

Do not use a personal calendar as the website source.

Obtain its private iCal/ICS URL and configure this Worker secret/variable:

`CHURCH_CALENDAR_ICS_URL`

The URL must be treated as a secret because a private iCal URL grants read access to calendar data.

## 3. Write tokens

Configure two Worker secrets:

- `INGEST_TOKEN` — sermon and announcement ingestion
- `SYNC_TOKEN` — manual calendar sync from `/admin/`

Use long random values. Do not commit either token to GitHub.

## 4. Sermon automation contract

SINAN / church PC sends JSON to:

`POST /api/ingest/sermon`

Authorization:

`Bearer <INGEST_TOKEN>`

Example fields:

```json
{
  "sermon_date": "2026-09-06",
  "title_zh": "讲道标题",
  "title_nl": "Preektitel",
  "speaker": "讲员",
  "scripture": "Matthew 6:25-34",
  "summary_zh": "中文摘要",
  "summary_nl": "Nederlandse samenvatting",
  "youtube_url": "https://...",
  "audio_url": "https://...",
  "transcript_url": "https://...",
  "status": "published"
}
```

Recommended pipeline:

`X32 recording -> ASR -> SINAN metadata/summary -> NL translation -> ingest API -> website`

## 5. Publishing policy

- Calendar events: automatic publication.
- Sermons: can be automatic after the transcript pipeline is trusted.
- Announcements: default to human approval for important church notices.

## 6. Current one-time account actions

These are account-level actions, not code changes:

1. Connect this GitHub repository to Cloudflare Workers Builds.
2. Create the D1 database and add its binding.
3. Create the dedicated Google Calendar and obtain its private ICS URL.
4. Add Worker secrets/variables listed above.
5. Test `/api/health`, then `/admin/`, then one test calendar event.

After these are done, normal content maintenance should no longer require editing website code.
