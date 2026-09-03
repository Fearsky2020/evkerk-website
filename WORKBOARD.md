# EVKERK Workboard

_Last updated: 2026-09-03_

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

**Current verified status:** the v0.1 launch corpus has completed pastoral/context approval and contains **50/50 synchronized Chinese + Dutch cards** in five 10-card runtime chunks. The six pastor-approved context resolutions are present in the runtime dataset and the curated plan is marked `pastor-approved-synchronized`. The current synchronized source-corpus SHA-256 is `ef767a248feebea3e33fef3a27a4ff6ac81b51444692e1b8bcbd7a27ffa36d95`.

Post-approval validation evidence is recorded in `docs/POST-APPROVAL-VALIDATION.md` in the Scripture Cards repository, committed as `0e5c5962263de0c2b45c1b360d1089cd9c8c0dd4`.

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
- Midvash pinned-data importer and batch API sync script;
- deterministic card-display cleanup rules in `scripts/text-cleanup.mjs`;
- schema-v2 runtime manifest + five-chunk loader/writer in `scripts/runtime-dataset.mjs`.

### Curation/data status — verified

- `public/data/featured-plan.json`: **50 curated references**, status `pastor-approved-synchronized`.
- `public/data/featured.json`: schema-v2 runtime manifest/provenance file, count 50, chunk size 10, five chunks.
- `public/data/cards-01.json` … `cards-05.json`: **50/50 synchronized Chinese + Dutch launch cards**.
- Chinese translation: CUVS 1919; Dutch: De Heilige Schrift / Statenvertaling 1917; both recorded as public-domain for this launch dataset.
- Pinned Midvash reference revision: `d9fe1779447717bbfcb578e505b893125cad581c`.
- Current source-corpus SHA-256: `ef767a248feebea3e33fef3a27a4ff6ac81b51444692e1b8bcbd7a27ffa36d95`.
- Synchronized launch-corpus commit: `64729b7384de8d5c870206f237dc2ce069d55da8`.
- Pastor approval record: `e9ef942365f4cf2ddddcdf9c021fbabb9714dff1`.
- Final metadata/reference-label fix before validation: `f0fd92fb6282b353fc0083bc52e3692a145ef092`.

The six approved resolutions are:

1. `PHP.4.6` → `PHP.4.6-7`
2. `JER.29.11` → `ROM.5.5`
3. `MAT.6.33` → `MAT.6.31-33`
4. `MAT.7.7` → `MAT.6.9-10`
5. `MAT.19.26` → `MAT.19.25-26`
6. `PHP.4.13` → `PHP.4.12-13`

### Editorial/pastoral review — verified

- CUVS editorial square brackets are removed from card display while their words remain.
- Chinese standalone-card quotation artifacts are removed.
- Selected Psalm/acrostic superscriptions are removed from card display where they would read like accidental verse text.
- Embedded Statenvertaling verse markers such as `(55:23)` are removed from Dutch card display.
- Dutch-facing references reflect Statenvertaling Psalm versification where superscriptions shift the displayed verse number: `诗篇 46:1 ↔ Psalm 46:2`, `诗篇 55:22 ↔ Psalm 55:23`, `诗篇 56:3 ↔ Psalm 56:4`.
- `Colossians 3:23` was previously expanded to `Colossians 3:23–24` because verse 23 alone ended as an incomplete sentence in both launch translations.
- The pastor approved the six-card context-resolution proposal on 2026-09-03. Pastoral/context review is therefore no longer an open v0.1 gate.

### Data/cache hardening

- Runtime content is a manifest plus five 10-card chunks, designed to scale toward the planned 300–500-card pool.
- `scripts/sync-midvash-api.mjs` and the pinned repository importer regenerate the chunked runtime format.
- `scripts/check.mjs` requires schema-v2 manifest integrity, declared chunks, exact 50/50 ID parity, public-domain licenses, matching source revision and a valid provenance SHA.
- Service Worker Scripture JSON uses network-first with offline fallback to avoid installed PWAs remaining stuck on stale Scripture data.

### Post-approval validation — executed evidence

- A cached ZIP labelled as current was explicitly rejected as current evidence after it was tested and found to contain the older `6aba66858bb8706cf5fac3a5752bede6729082dfd1c6831505486240c08653cc` corpus and all six superseded IDs.
- The post-approval dataset was reconstructed from the actual Git diffs and matched the GitHub blob IDs byte-for-byte for all changed runtime files plus the final curated plan.
- Executed structural checks passed: **50 runtime cards / 50 curated refs**, five chunks of 10, 50 unique IDs, exact runtime/plan parity, all six new IDs present, all six old IDs absent, bilingual fields present, public-domain license guards intact, matching source revision and valid provenance SHA.
- Core JavaScript behavior was executed successfully: deterministic daily verse, no-repeat random selection, bilingual sharing and Worker `/health`.
- `app.js`, `app-core.js`, `sw.js` and `src/worker.js` passed Node syntax checks.
- A local HTTP server returned the current manifest with count 50 and SHA prefix `ef767a248feebea3`.
- `2CO.12.9` is currently labelled correctly as `哥林多后书 12:9`.

### Actions / Cloudflare / browser boundary

- There is **no 2026-09-03 GitHub Actions run** corresponding to the post-approval `ef767...` corpus. Earlier run `33676610510` and related artifacts belong to the older pre-approval corpus and are not cited as proof of the new dataset.
- Current repo-native `check.yml` is manual (`workflow_dispatch`) and uses `ubuntu-latest`; no new run was started during this validation.
- Earlier temporary Cloudflare external smoke proved the Worker routing approach for the older corpus, including the `global_fetch_strictly_public` routing fix. It does **not** prove that the current `ef767...` corpus is deployed externally.
- A fresh post-approval Cloudflare temporary Preview has **not yet been run** in the current environment because no Cloudflare deployment credentials are available here.
- Headless Chromium in the current container timed out and produced no DOM. Therefore real browser rendering is **not marked passed**.
- iPhone Safari and Android Chrome interaction/PWA validation remain open.
- The project is not yet production-attached to an EVKERK subdomain.

### Open-source research incorporated

- `midvash/bible-data` — public-domain Bible data/provenance.
- `midvash/bible-api` — batch passage synchronization.
- `modern-screenshot` — PNG rendering enhancement.
- `VerseCraft` — product/UX reference only.
- `BibleLockScreen` — later Android/native lock-screen reference only.
- `cf-workers-og` — later server-side OG image candidate.
- `midvash/bible-cross-references` — later curated related-verses candidate (CC-BY 4.0), not v0.1.

### Next gate

1. Create a fresh temporary Cloudflare deployment from current `main`.
2. Verify `/health`, `featured.json` = current `ef767...` corpus, all five chunks / 50 cards, the six approved new IDs, PWA manifest, `app.js` and `sw.js`.
3. Run real-device smoke on iPhone Safari and Android Chrome: card rendering, daily/random, language switch, themes, favorites, PNG, share, PWA install and offline refresh.
4. Fix any device-only behavior found in that smoke.
5. Choose and attach the final EVKERK subdomain only after real-device validation.
6. Run final-origin smoke after production attachment.
7. Only then ask `evkerk-website` to add the main-site entry/homepage daily-verse integration/routing.

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
4. Scripture Cards: fresh current-main Cloudflare temporary Preview, then iPhone/Android real-device smoke before choosing the final subdomain.
5. TAALVIA: run repository checks/preview and smoke-test `/`, `/learn/`, `/lock/`.
6. TAALVIA Lock: decide later whether true unlock-trigger behavior warrants a native Android component/widget.

## Rule for future updates

Do not mark a feature complete merely because a README/roadmap says it exists. Prefer:

1. executable code / actual route / actual file;
2. executed test or live validation;
3. repository documentation;
4. roadmap/planned work.

If only documentation or a plan exists, label it as such.


---

## Session closeout — homepage SVG identity and photo handoff

```text
PROJECT / TRACK: EVKERK Website / Homepage visual cleanup
SESSION ROLE: Executor
STATUS: WAITING
USER DECISION: Continue the existing approved church homepage work; use the user's newer real church photos for the homepage and do not expand scope.
WORK COMPLETED: Added an Evangeliekerk SVG mark (open doorway + cross) for header, footer and favicon; removed public construction/placeholder wording from the Chinese and Dutch homepage copy; opened a bounded preview PR without merging or deploying.
EVIDENCE: PR #3 contains exactly four changed files; church-site-check run #196 completed successfully; PR #3 was verified mergeable; no production deployment was performed.
OPEN RISKS: The hero still has an abstract background until the user supplies the newer real photos; visual/browser and real-device acceptance have not been completed; PR is not merged and evkerk.nl production state is unchanged.
LAST VERIFIED: 2026-09-03T08:54:12Z
EXACT NEXT ACTION: Receive the user's new original church photos, select and optimize the strongest horizontal image, add it to PR #3, then run visual/mobile acceptance before requesting merge or deployment approval.
MACHINE / LOCATION REQUIREMENT: Current GitHub-connected environment is sufficient for source work; user must upload the original photo files into this conversation.
BLOCKER / WAIT CONDITION: Waiting for the user's new church photos.
REQUIRES USER APPROVAL: Yes — final visual acceptance, merge and production deployment.
ISSUE / PR / COMMIT / CI: Fearsky2020/evkerk-website PR #3; head 3607bbf51ac1a34e230c894209a1e768415736e2; church-site-check run #196 success.
```
