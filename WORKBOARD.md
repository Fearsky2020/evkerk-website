# EVKERK Workboard

_Last updated: 2026-09-02_

This board records the current church website work plus the boundaries/status of closely related projects. Status claims follow this evidence order: executable code/live behavior → executed test or live validation → repository documentation → roadmap.

## P0 — ACTIVE: Sinan church publishing automation

**Goal**

`QQ -> Xiaoguang/Qwen proposal -> Sinan deterministic validation -> Church Ops API -> D1/R2/Calendar -> evkerk.nl`

**Verified in repository**

- Church Ops API and authenticated `/api/sinan/*` control plane are documented in `AUTOMATION_SETUP.md`.
- Public events, sermons and announcements APIs are documented.
- One-command church-PC deployment wrapper is documented.
- D1/R2 bindings, separate `SINAN_TOKEN` / `INGEST_TOKEN`, smoke test and QQ runtime wiring are documented.
- Public sermon article work and bilingual renderer exist in recent repository commits.
- QQ runtime health logic counts launcher/child processes as one logical gateway.

**Remaining live validation documented by the project**

1. Send one low-risk church announcement from private QQ.
2. Confirm it appears on the live website.
3. Confirm operation id and audit record.
4. Test `撤销刚才那个`.
5. Confirm undo is reflected correctly.
6. Then wire the dedicated Google Calendar write executor.

**Boundary**

- Group QQ messages have no website write authority in v0.1.
- Calendar writes are not complete until the real Calendar executor exists.

## P1 — ACTIVE/CONTINUING: Website content automation

Documented target sermon flow:

`X32 recording -> upload/media job -> ASR -> Sinan metadata/summary -> Dutch translation -> review/publish -> Church Ops API -> website`

This remains a continuing workflow; real-content end-to-end validation is still required.

## INDEPENDENT CHURCH PROJECT — Scripture Cards / 经文卡

**Verified repository:** `Fearsky2020/evkerk-scripture-cards` (private; independent of `evkerk-website`).

**Current verified status:** v0.1 source is committed on `main`; the first **50/50 Chinese + Dutch launch references are synchronized and promoted to the runtime dataset**. The project is still **not deployed** and has **not passed browser/real-device preview validation**.

**Ownership:** Church Work / 教会工作, as a peer project to `evkerk-website`, not normal website feature code.

### Verified implementation

The repository contains:

- Cloudflare Worker + static-assets skeleton;
- deterministic daily verse;
- no-repeat random verse;
- Chinese / Dutch / bilingual display;
- topic filtering;
- four visual card styles;
- local favorites;
- copy/share;
- PNG export with optional `modern-screenshot` and Canvas fallback;
- installable PWA and offline support;
- bilingual Chinese/Dutch core UI labels;
- curated-plan/runtime validation scripts;
- Midvash pinned-data importer and batch API sync script.

### Curation/data status — verified

- `public/data/featured-plan.json`: **50 curated references**.
- `public/data/featured.json`: **50/50 synchronized runtime cards**.
- Runtime and curated-plan IDs are required to match exactly.
- Chinese translation: CUVS 1919; Dutch: De Heilige Schrift 1917; both recorded as public-domain for this launch dataset.
- Pinned Midvash reference revision: `d9fe1779447717bbfcb578e505b893125cad581c`.
- Synchronized bilingual source-corpus SHA-256: `1590dceca5c999cd3b8be2e427c0ef5e2487387884cdddb1f54d5663e7f5f81a`.
- Accepted UTF-8 one-shot sync: `Fearsky2020/sinan` Actions run `33669942321` on self-hosted Windows runner `SINAN-LIVINGROOM-DESKTOP-AG066HP`.
- Accepted artifact digest: `sha256:7634958dfe56ce508acfb008ded0befb7118f62c54e52d1260d3a085a6b8d343`.
- Full provenance and the rejected PowerShell-encoding incident are recorded in `docs/DATA-PROVENANCE.md`.

### Data/cache hardening

- Runtime `featured.json` is compact and does not duplicate the full raw API response.
- `scripts/sync-midvash-api.mjs` now regenerates the compact runtime format and records a SHA-256 over original bilingual source text.
- `scripts/check.mjs` requires exact 50/50 ID parity, public-domain licenses, matching source revision and valid provenance SHA.
- Service Worker cache is `v2`; Scripture JSON uses network-first with offline fallback so already-installed PWAs do not stay stuck on the old 5-card cache.

### Check/CI status

- The exact promoted blobs were locally checked successfully: **50 verified cards / 50 curated refs**, plus deterministic daily verse, no-repeat random and bilingual-sharing behavior.
- Earlier hosted Actions red runs were not code-test failures: the job had `runner_id: 0`, empty runner name and `steps: []`.
- GitHub subsequently confirmed the account had used **2,278 / 2,000 included Actions minutes**; automatic hosted push/PR checks remain paused for this billing cycle.

### Open-source research incorporated

- `midvash/bible-data` — public-domain Bible data/provenance.
- `midvash/bible-api` — batch passage synchronization.
- `modern-screenshot` — PNG rendering enhancement.
- `VerseCraft` — product/UX reference only.
- `BibleLockScreen` — later Android/native lock-screen reference only.
- `cf-workers-og` — later server-side OG image candidate.
- `midvash/bible-cross-references` — later curated related-verses candidate (CC-BY 4.0), not v0.1.

### Next gate

1. Human-review the 50 launch cards for exact text presentation and pastoral suitability.
2. Run a Cloudflare Worker preview.
3. Smoke-test desktop + iPhone + Android: card rendering, random/daily, language switch, PNG, share, PWA install and offline refresh behavior.
4. Choose final EVKERK subdomain only after preview validation.
5. Only then ask `evkerk-website` to add the main-site entry/homepage daily-verse integration/routing.

## INDEPENDENT PRODUCT — TAALVIA Dutch Learning

**Verified repository:** `Fearsky2020/taalvia`.

### Verified structure

The repository physically contains `public/index.html`, `public/learn/`, `public/lock/`, `public/shared/`, `src/router.js` and `wrangler.jsonc`. `src/router.js` routes `/learn` -> `/learn/` and `/lock` -> `/lock/`.

### TAALVIA Learn — verified code-level implementation

`public/learn/` includes daily phrase, practical scenes, dialogue/role practice, listening, quiz, local progress and PWA support. Repository code also includes or attempts to load Fuse.js search, OpenTaal correction data, FSRS review via `ts-fsrs`, WaveSurfer recording/waveform, browser Dutch speech synthesis and local backup/offline support. Real-device behavior still requires preview/smoke testing.

### Shared TAALVIA state — verified with limitation

- Shared vocabulary/content exists under `public/shared/`.
- Shared quota defines `FREE_DAILY_NEW_LIMIT = 20`; quota tests cover canonical deduplication and the shared cap.
- Learn/Lock have a bridge/shared state, but their progress internals are not literally one identical structure: Learn retains FSRS/mastered/notebook-specific state while Lock has `known` / `hard` / `seen` behavior.

### TAALVIA Lock — verified implementation and boundary

`public/lock/` contains the PWA, daily card set, previous/next navigation, Dutch TTS, known/hard feedback, notification support, PNG lock-screen export and offline caching.

It does **not** receive Android/iOS system unlock events and does **not** automatically change the word every time the phone is unlocked. Current approach: iPhone exported lock-screen images; Android PWA + notifications. `stableCards()` keeps a date/level-stable card set rather than generating a fresh random card on every unlock.

### Domain/production status

Repository documentation records `taalvia.nl` / `taalvia.com`, Cloudflare nameservers/DNSSEC and Worker `taalvia-web`, but also says the standalone Worker is not yet production-attached and requires checks + preview + desktop/iPhone/Android smoke tests. Treat that as repository-recorded status until independently revalidated.

## Current evidence-based next steps

1. EVKERK: finish the private-QQ announcement + undo live validation.
2. EVKERK: connect Google Calendar write executor after that path is proven.
3. EVKERK: validate sermon/media automation with real material.
4. Scripture Cards: human-review the synchronized 50-card corpus, then Worker preview and real-device smoke tests.
5. TAALVIA: run repository checks/preview and smoke-test `/`, `/learn/`, `/lock/`.
6. TAALVIA Lock: decide later whether true unlock-trigger behavior warrants a native Android component/widget.

## Rule for future updates

Do not mark a feature complete merely because a README/roadmap says it exists. Prefer:

1. executable code / actual route / actual file;
2. executed test or live validation;
3. repository documentation;
4. roadmap/planned work.

If only documentation or a plan exists, label it as such.
