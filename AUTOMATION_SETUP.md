# EVKERK Automation Wiring

## Architecture

The normal human entry point is QQ, not the website admin.

`QQ -> Xiaoguang/Qwen proposal -> Sinan hard validation -> Church Ops API -> D1/R2/Calendar integration -> website`

The public website reads:

- `GET /api/events`
- `GET /api/sermons`
- `GET /api/announcements`

The Sinan control plane uses authenticated `/api/sinan/*` endpoints. The manual `/admin/` page remains a backup/failsafe interface.

## Fastest one-time deployment on the church PC

The church PC already has the existing scheduled QQ gateway task. From the `evkerk-website` repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-on-church-pc.ps1
```

This wrapper detects the SINAN root from the existing `Sinan_QQ_Gateway` scheduled task, then calls the Cloudflare bootstrap. It does **not** start a second QQ bot and does **not** kill unrelated Python processes. After successful wiring it restarts only `Sinan_QQ_Gateway` so the existing process loads the new endpoint/token configuration.

If running somewhere other than the church PC, use the lower-level command instead:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-cloudflare.ps1 -SinanProjectRoot "<PATH-TO-SINAN>"
```

The bootstrap script will:

1. install npm dependencies;
2. verify/login to Cloudflare;
3. create or reuse D1 `evkerk-website-db`;
4. create or reuse R2 `evkerk-website-media`;
5. write the `DB` and `MEDIA` bindings to `wrangler.toml`;
6. apply every D1 migration in `migrations/`;
7. generate separate random `SINAN_TOKEN` and `INGEST_TOKEN` secrets and store them in Cloudflare;
8. deploy the Worker;
9. write the QQ/SINAN local token + endpoint files when `-SinanProjectRoot` is provided;
10. run `scripts/smoke-test.ps1` so deployment is verified rather than assumed.

Secrets are never printed or committed to GitHub.

## 1. Cloudflare storage

The Worker needs both:

- D1 database: `evkerk-website-db`
- R2 bucket: `evkerk-website-media`

The current migrations are:

- `migrations/0001_init.sql`
- `migrations/0002_sinan_ops.sql`
- `migrations/0003_media_ingest.sql`

Expected bindings:

```toml
[[d1_databases]]
binding = "DB"
database_name = "evkerk-website-db"
database_id = "<D1 UUID>"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "evkerk-website-media"
```

Without D1, public `/api/events` intentionally falls back to the two regular Sunday services so the homepage never goes blank. Sinan write APIs refuse to operate without D1. Media ingest also refuses to operate without R2.

## 2. Control and ingest tokens

The Worker uses separate secrets:

- `SINAN_TOKEN`: trusted control-plane calls from Sinan/QQ and worker processing.
- `INGEST_TOKEN`: media upload/admin ingestion calls.

The bootstrap script generates both independently.

For QQ/SINAN, the control token is stored locally at:

`<SINAN_PROJECT_ROOT>/.sinan/church-ops.token`

The media ingest token is stored at:

`<SINAN_PROJECT_ROOT>/.sinan/church-ingest.token`

The endpoint is stored at:

`<SINAN_PROJECT_ROOT>/.sinan/church-ops.endpoint`

The script also persists these user environment variables when `-SinanProjectRoot` is supplied:

- `SINAN_CHURCH_OPS_ENDPOINT`
- `SINAN_CHURCH_OPS_TOKEN_FILE`

Qwen never receives the secret. The deterministic Sinan client owns authenticated calls.

## 3. Church Ops API

Primary intent endpoint:

`POST /api/sinan/intents`

Supported bounded types:

- `announcement.publish`
- `announcement.unpublish`
- `sermon.publish`
- `sermon.unpublish`
- `calendar.create`
- `calendar.update`
- `calendar.cancel`
- `media.publish`

The server calculates risk again. It does not trust a risk value proposed by the model.

High-risk actions create a 15-minute `CH-A-...` approval. Sunday/calendar changes, cancellations and destructive unpublishing are high risk.

Every completed write receives an `OP-...` operation id and an audit record. Reversible D1 operations can be undone through:

`POST /api/sinan/undo`

QQ can therefore support natural messages such as `撤销刚才那个` without guessing from conversation history.

## 4. Google Calendar

A dedicated calendar is recommended:

`Evangeliekerk / 福音教会`

`CHURCH_CALENDAR_ICS_URL` can mirror calendar state into D1 every 30 minutes. Treat a private ICS URL as a secret.

An ICS feed is read-only. Calendar intents created from QQ become durable `pending_executor` jobs until a separate Google Calendar write executor is configured. The API never pretends an external calendar write succeeded.

## 5. Sermon automation

Target path:

`X32 recording -> upload/media job -> ASR -> SINAN metadata/summary -> Dutch translation -> review/publish -> Church Ops API -> website`

The Worker already has a media-ingest job model backed by D1 + R2. Ordinary sermon publication is low risk. The Qwen layer proposes structured fields, deterministic validation bounds them, and the Church Ops API writes the authoritative record.

Legacy direct ingestion endpoints remain available for compatibility, but new QQ workflows should use `/api/sinan/intents`.

## 6. Publishing policy

- Ordinary sermon: direct publish + audit.
- Ordinary announcement: publish + report + audit.
- Major announcement: explicit approval.
- Sunday/calendar update or cancellation: explicit approval.
- Historical content unpublish: explicit approval.
- Group QQ messages: no church website write authority in v0.1.

## 7. Smoke test

After deployment:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Endpoint "https://<worker>.workers.dev" -SinanTokenFile "<SINAN_ROOT>\.sinan\church-ops.token"
```

The smoke test verifies:

- public health endpoint;
- D1 binding;
- SINAN secret presence;
- public events/sermons/announcements APIs;
- unauthenticated write rejection;
- authenticated control-plane reachability without creating durable content.

## 8. Remaining live validation

After `deploy-on-church-pc.ps1` succeeds:

1. send one low-risk private QQ announcement as an end-to-end test;
2. confirm it appears on the website and receives an operation id/audit record;
3. test `撤销刚才那个`;
4. then wire the dedicated Google Calendar write executor.

At that point announcements, sermons and media processing are operational from QQ. Calendar writes remain safely queued until the Calendar executor is explicitly connected.