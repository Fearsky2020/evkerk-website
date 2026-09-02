# EVKERK Workboard

_Last updated: 2026-09-02_

This board records the current church website work and the boundaries with related church projects. It is intentionally operational: finish the active publication pipeline first, and do not let new ideas interrupt the current live validation.

## P0 — ACTIVE: Sinan church publishing automation

**Goal**

Make QQ the normal human entry point for church operations:

`QQ -> Xiaoguang/Qwen proposal -> Sinan deterministic validation -> Church Ops API -> D1/R2/Calendar -> evkerk.nl`

**Already implemented / substantially complete**

- Church Ops API and authenticated `/api/sinan/*` control plane.
- Public events, sermons and announcements APIs.
- One-command church-PC deployment wrapper.
- D1 production binding and migrations.
- Separate `SINAN_TOKEN` and `INGEST_TOKEN` handling.
- Safe QQ/Sinan runtime update flow using an isolated runtime/worktree.
- QQ gateway process health checks now treat launcher/child processes as one logical gateway.
- Public sermon article pages.
- Safe bilingual sermon renderer.
- Homepage links to published sermon articles.
- Media-ingest worker model with D1/R2 integration and safe refusal when required storage is unavailable.
- Manual `/admin/` remains only as backup/failsafe.

**Current live-validation sequence — do this before starting another major website task**

1. From private QQ, send one low-risk church announcement.
2. Confirm the announcement appears on the live website.
3. Confirm an operation id and audit record are created.
4. Test natural-language undo: `撤销刚才那个`.
5. Confirm the undo is reflected correctly on the website/audit trail.
6. After the announcement path is proven, wire the dedicated Google Calendar write executor.

**Important boundary**

- Group QQ messages have no website write authority in v0.1.
- High-risk actions remain approval-gated.
- Calendar writes must not be reported as successful until the real Calendar executor is connected.
- Do not start a second QQ bot or modify unrelated Python processes on the church PC.

## P1 — ACTIVE/CONTINUING: Website content automation

After the P0 live validation passes, continue hardening the content pipeline rather than adding unrelated features.

Target sermon flow:

`X32 recording -> upload/media job -> ASR -> Sinan metadata/summary -> Dutch translation -> review/publish -> Church Ops API -> website`

Near-term priorities:

- Validate live sermon/article publishing with real church content.
- Keep Chinese/Dutch rendering safe and readable.
- Confirm media processing only starts when live R2 storage is available.
- Keep rollback/audit behavior intact.

## NEW CHURCH PROJECT — Scripture Cards / 经文卡

**Status:** registered, not started in this repository.

**Ownership:** belongs under **Church Work / 教会工作**, but is a peer project to the church website, not a normal `evkerk-website` feature folder.

**Project direction**

Create an independent mobile-first Scripture Cards product that can later support:

- daily verse;
- random verse;
- Chinese / Dutch / bilingual display;
- shareable and downloadable scripture-card images;
- multiple visual card styles;
- favorites/history/theme categories;
- PWA installation;
- later devotional audio, memorization, youth cards and push/lock-screen style experiences.

**Architecture rule**

- Prefer a separate repository and independent iteration/deployment.
- Possible future subdomain: `verse.evkerk.nl`, `cards.evkerk.nl`, or `dagtekst.evkerk.nl`.
- `evkerk.nl` should only provide an entry point and optional content/API integration.
- Do **not** put the full Scripture Cards application into the main church website codebase.
- Do **not** interrupt the current Sinan/QQ publishing validation to start Scripture Cards development.

**Future integration points with evkerk.nl**

- Main-site navigation/card entry.
- Daily verse block on the homepage.
- Sermon/article -> related scripture links.
- Optional shared content/API layer.
- Cloudflare routing/subdomain configuration when the independent project is ready.

**Before implementation**

- Decide the independent repository name.
- Confirm Bible-translation licensing/copyright for Chinese and Dutch text before bulk ingestion.
- Define the MVP and verse data schema.

## SEPARATED PRODUCT: TAALVIA

TAALVIA has become an independent product/repository/domain and should not be re-expanded inside the church website project. Any remaining historical `learn-nl` productization tracker in this repository should be treated as migration/cleanup context, not as the current EVKERK website development priority.

## Current priority order

1. Finish live QQ -> Sinan -> evkerk.nl announcement validation and undo test.
2. Connect the real Google Calendar write executor.
3. Validate sermon/media automation with real church material.
4. Keep the main EVKERK site stable and bilingual.
5. Start Scripture Cards in its own project/repository when a separate work conversation is opened.

## Rule for future work conversations

When a new church project appears, record its relationship here, but do not automatically implement it inside `evkerk-website`. Keep project ownership, repositories and deployment boundaries explicit so multiple conversations/agents do not edit the same system blindly.
