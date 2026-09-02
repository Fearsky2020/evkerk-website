# EVKERK Workboard

_Last updated: 2026-09-02_

This board records the current church website work plus the boundaries/status of closely related projects. Statements below should distinguish **verified implementation**, **repository documentation**, and **planned/not yet verified** work.

## P0 — ACTIVE: Sinan church publishing automation

**Goal**

Make QQ the normal human entry point for church operations:

`QQ -> Xiaoguang/Qwen proposal -> Sinan deterministic validation -> Church Ops API -> D1/R2/Calendar -> evkerk.nl`

**Verified in repository**

- Church Ops API and authenticated `/api/sinan/*` control plane are documented in `AUTOMATION_SETUP.md`.
- Public events, sermons and announcements APIs are documented.
- One-command church-PC deployment wrapper is documented.
- D1/R2 bindings, separate `SINAN_TOKEN` / `INGEST_TOKEN`, smoke test and QQ runtime wiring are documented.
- Public sermon article work and bilingual renderer are present in recent repository commits.
- Latest QQ runtime fix counts launcher/child processes as one logical gateway.

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

This remains a target/continuing workflow; real-content end-to-end validation is still required.

## INDEPENDENT CHURCH PROJECT — Scripture Cards / 经文卡

**Verified repository:** `Fearsky2020/evkerk-scripture-cards` (private, independent of `evkerk-website`).

**Verified development status:** the v0.1 starter is now committed on the repository `main` branch. It is source-controlled, but it is **not deployed** and has **not passed real-device/browser preview validation yet**.

**Ownership:** belongs under **Church Work / 教会工作**, but remains a peer project to `evkerk-website`, not normal website feature code.

**Verified repository implementation**

The repository physically contains:

- Cloudflare Worker + static-assets skeleton;
- deterministic daily verse;
- no-repeat random verse;
- Chinese / Dutch / bilingual verse display;
- topic filtering;
- four visual card styles;
- local favorites;
- copy/share;
- PNG export with optional `modern-screenshot` enhancement and Canvas fallback;
- PWA manifest + service-worker offline caching;
- bilingual Chinese/Dutch core UI labels;
- JavaScript/data/core-behavior checks;
- Midvash pinned-data importer and batch API sync script;
- a GitHub Actions check workflow, currently manual-only while a hosted runner is not available to the account/repository.

**Curation/data status — verified in GitHub**

- `public/data/featured-plan.json` contains **50 curated references**.
- `public/data/featured.json` currently contains **5 references with Chinese + Dutch source text actually synchronized/verified**.
- The product deliberately distinguishes planned references from live/verified text; the UI reports both counts.
- Current translations are CUVS 1919 and De Heilige Schrift 1917, both recorded as public-domain in the selected Midvash data source.
- The selected Midvash reference revision is `d9fe1779447717bbfcb578e505b893125cad581c`.
- `scripts/sync-midvash-api.mjs` is present and resolves up to 50 curated references per translation through Midvash `/v1/passages`, failing closed if a reference cannot be resolved.
- Full **50/50 bilingual text synchronization has not yet been executed**, so do not describe the 50-card content corpus as complete.

**Check/CI status — important distinction**

- The starter passed its local repository/core-behavior checks before the GitHub import.
- The first GitHub Actions run for commit `72e45e5` ended in failure before a runner was assigned: the job reported `runner_id: 0`, empty runner name and `steps: []`.
- Therefore that red run is **not evidence of a code/test failure**; no workflow step actually executed.
- Automatic push/PR triggering was paused to avoid generating repeated meaningless red runs while the hosted runner is unavailable. The workflow remains available through `workflow_dispatch` for later re-validation.

**Open-source research already incorporated**

- `midvash/bible-data` — public-domain Bible data source/provenance.
- `midvash/bible-api` — batch passage synchronization (up to 50 refs/request).
- `modern-screenshot` — share-card PNG rendering, with local fallback.
- `VerseCraft` — product/UX reference only.
- `BibleLockScreen` — later Android/native lock-screen reference only.
- `cf-workers-og` — later server-side Open Graph image candidate.
- `midvash/bible-cross-references` — later curated related-verses candidate (CC-BY 4.0), not v0.1.

**Still not verified / next gate**

- execute full 50-reference bilingual sync from an execution environment with outbound access to Midvash;
- review all launch verses for exact text and pastoral suitability;
- run repository checks again after the 50-card corpus is generated;
- run Worker preview;
- smoke-test on desktop/iPhone/Android, including PWA/share/PNG/offline behavior;
- choose final EVKERK subdomain only after preview validation.

The main `evkerk-website` repository should only later provide the entry point, optional homepage daily-verse integration, sermon-to-scripture links, and final routing/subdomain work.

## INDEPENDENT PRODUCT — TAALVIA Dutch Learning

**Verified repository:** `Fearsky2020/taalvia`.

### Verified structure

The repository physically contains:

- `public/index.html`
- `public/learn/`
- `public/lock/`
- `public/shared/`
- `src/router.js`
- `wrangler.jsonc`

`src/router.js` explicitly routes `/learn` -> `/learn/` and `/lock` -> `/lock/`.

### TAALVIA Learn — verified implementation

`public/learn/index.html` contains a real learning UI with:

- daily phrase;
- practical scenes;
- dialogue / role practice;
- listening practice;
- quiz;
- local progress display;
- PWA manifest.

Additional code in the repository implements or attempts to load:

- Fuse.js search;
- OpenTaal correction data;
- FSRS review via `ts-fsrs`;
- WaveSurfer recording/waveform;
- browser Dutch speech synthesis;
- local backup/PWA/offline support.

These are code-level facts. Real-device behavior still needs preview/smoke testing.

### Shared TAALVIA state — verified, with an important limitation

Verified shared pieces:

- `public/shared/data.js` provides shared vocabulary/content data.
- `public/shared/quota.js` defines `FREE_DAILY_NEW_LIMIT = 20`.
- `scripts/test-quota.mjs` tests canonical deduplication and the shared 20/day cap.
- `public/learn/shared-bridge.js` bridges profile/progress/FSRS/quota-related localStorage into `taalvia:*` keys.
- `public/lock/lock.js` reads shared vocabulary plus `public/shared/state.js` / quota state.

**Do not overstate this:** Learn and Lock are intended to be one system, but their current progress internals are not literally one identical structure. Learn still has FSRS/mastered/notebook-specific state while Lock has `known` / `hard` / `seen` behavior. The bridge synchronizes/canonicalizes parts of them, but full behavioral equivalence across all progress fields has not yet been verified.

### TAALVIA Lock / 单词卡 — verified implementation

`public/lock/` physically contains:

- `index.html`
- `lock.js`
- `lock.css`
- `manifest.webmanifest`
- `sw.js`

Verified capabilities from code:

- installable standalone PWA metadata;
- daily card set;
- previous/next card navigation;
- Dutch TTS through browser speech synthesis;
- known / hard feedback;
- system notification support through the service worker;
- PNG lock-screen image export;
- shared 20/day new-content quota;
- service-worker caching for core Lock assets.

### What TAALVIA Lock does NOT currently do

This is important:

- It does **not** receive Android/iOS system unlock events.
- It does **not** automatically change the word every time the phone is unlocked.
- The code explicitly tells users that ordinary web pages cannot listen to the system's phone-unlock event.
- On iPhone the current approach is exported lock-screen images / OS photo behavior.
- On Android the current approach is PWA + notifications.
- `stableCards()` stores a stable daily card list keyed by date + level; this is not a fresh random card generated on every unlock.

Therefore the accurate status is: **a working web/PWA lock-screen reinforcement prototype exists; the original “every unlock shows a different word” behavior is not implemented yet.**

### Domain / production status

Repository documentation (`docs/DOMAIN-STATUS.md`) records:

- `taalvia.nl` and `taalvia.com` were moved to Cloudflare nameservers;
- both zones were shown active and DNSSEC was enabled during setup;
- Worker name is `taalvia-web`;
- canonical routes are `/learn/` and `/lock/`.

The same document explicitly says the standalone TAALVIA Worker is **not yet production-attached** to `taalvia.nl` and requires repository checks, preview deployment and desktop/iPhone/Android smoke tests first.

Treat this as repository-recorded status unless independently revalidated against Cloudflare.

## Current evidence-based next steps

1. EVKERK: finish the documented private-QQ announcement + undo live validation.
2. EVKERK: wire Google Calendar write executor only after that path is proven.
3. EVKERK: validate sermon/media automation with real material.
4. TAALVIA: execute repository checks in a real checkout/build environment.
5. TAALVIA: deploy isolated Worker preview and smoke-test `/`, `/learn/`, `/lock/` on desktop/iPhone/Android.
6. TAALVIA Lock: decide whether the original true unlock-trigger behavior requires a native Android component/widget; the current web implementation cannot do it.
7. Scripture Cards: execute the 50-reference bilingual sync, re-run checks, then preview/smoke-test before any EVKERK domain integration.

## Rule for future updates

Do not mark a feature as complete merely because a README/roadmap says it exists. Prefer this evidence order:

1. executable code / actual route / actual file;
2. executed test or live validation;
3. repository documentation;
4. roadmap/planned work.

If only documentation or a plan exists, label it as such.