# EVKERK Automation Wiring

## Architecture

The normal human entry point is QQ, not the website admin.

`QQ -> Xiaoguang/Qwen proposal -> Sinan hard validation -> Church Ops API -> D1/R2/Calendar integration -> website`

The public website reads:

- `GET /api/events`
- `GET /api/sermons`
- `GET /api/announcements`

The Sinan control plane uses authenticated `/api/sinan/*` endpoints. The manual `/admin/` page remains a backup/failsafe interface.

## 1. Cloudflare D1

Create a database named:

`evkerk-website-db`

Apply both migrations in order:

- `migrations/0001_init.sql`
- `migrations/0002_sinan_ops.sql`

Then add the binding to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "evkerk-website-db"
database_id = "<D1 UUID>"
```

The second migration adds durable jobs, approvals and audit/undo records. Without D1, the public `/api/events` endpoint intentionally falls back to the two regular Sunday services so the homepage never goes blank; Sinan write APIs intentionally refuse to operate without D1.

## 2. Sinan control token

Create one long random secret and configure it in the EVKERK Worker as:

`SINAN_TOKEN`

Store the same value on the machine running the QQ gateway in:

`<SINAN_PROJECT_ROOT>/.sinan/church-ops.token`

Never commit the token to GitHub.

Set this environment variable for the QQ gateway:

`SINAN_CHURCH_OPS_ENDPOINT=https://<deployed-evkerk-worker-origin>`

Optional token-file override:

`SINAN_CHURCH_OPS_TOKEN_FILE=<path>`

Qwen never receives the token. The deterministic Sinan client owns the authenticated call.

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

A dedicated calendar is still recommended:

`Evangeliekerk / 福音教会`

The existing `CHURCH_CALENDAR_ICS_URL` integration is read-only and may mirror calendar state into D1 every 30 minutes. A private ICS URL must be treated as a secret.

Important: an ICS feed cannot perform Google Calendar writes. Calendar intents created from QQ therefore become durable `pending_executor` jobs until the separate Calendar executor is configured. The API never pretends an external calendar write succeeded.

## 5. Sermon automation

Recommended path:

`X32 recording -> ASR -> SINAN metadata/summary -> Dutch translation -> Church Ops API -> website`

Ordinary sermon publication is low risk. The Qwen layer proposes structured fields, deterministic validation bounds them, and the Church Ops API writes the authoritative record.

Legacy direct ingestion endpoints (`/api/ingest/sermon`, `/api/ingest/announcement`) remain available for compatibility, but new QQ workflows should use `/api/sinan/intents`.

## 6. Publishing policy

- Ordinary sermon: direct publish + audit.
- Ordinary announcement: publish + report + audit.
- Major announcement: explicit approval.
- Sunday/calendar update or cancellation: explicit approval.
- Historical content unpublish: explicit approval.
- Group QQ messages: no church website write authority in v0.1.

## 7. One-time account wiring still required

1. Connect `Fearsky2020/evkerk-website` to Cloudflare Workers Builds.
2. Create D1 `evkerk-website-db`, run both migrations and bind it as `DB`.
3. Configure Worker secret `SINAN_TOKEN`.
4. Configure `SINAN_CHURCH_OPS_ENDPOINT` and local `.sinan/church-ops.token` on the machine running the QQ gateway.
5. Restart the QQ gateway and test an ordinary announcement from private QQ.
6. Then configure the dedicated Google Calendar / external calendar executor.

After the first four items, announcements and sermons can already be controlled from QQ. Calendar writes wait safely in the executor queue until the Calendar connector is wired.
