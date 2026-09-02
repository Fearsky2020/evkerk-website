# Authentication Decision — Local-first, Low-fixed-cost

Status: architecture decision for the independent product. **Design only for now.** Do not modify the existing Church Ops Worker or deploy auth until the independent domain/brand is owned and the backend isolation boundary is explicitly opened.

Decision date: 2026-09-02.

## Decision

Use:

- **Better Auth** as the authentication framework.
- **A dedicated Cloudflare D1 database** for product authentication/account data.
- **Email OTP** as the primary universal passwordless login method.
- **Google OAuth** as an optional convenience method, not the only way to create an account.
- **Cloudflare Turnstile** on OTP/auth abuse-sensitive endpoints.
- Better Auth's built-in rate limiting, stored in persistent storage rather than isolate memory when productionized.
- A transactional email provider with a free pilot tier initially; current first candidate is **Resend**, subject to deliverability and quota testing after domain registration.

Do **not** start with email/password on the Cloudflare Workers Free tier.

## Why Better Auth

Better Auth is open source and avoids a recurring per-user authentication SaaS tax. Current Better Auth releases support Cloudflare D1 directly as a first-class database option.

This keeps the account layer portable and under product control while still allowing later social login, passkeys, organizations and other plugins if needed.

## Why not password-first

Better Auth's email/password flow uses `scrypt` password hashing. Strong password hashing is intentionally CPU/memory expensive.

Cloudflare Workers Free currently allows only 10 ms CPU per Worker invocation. The product should not weaken password hashing merely to fit a free serverless CPU budget.

Therefore the initial product should use passwordless email OTP instead of maintaining passwords.

This also removes:

- password creation friction after the first lesson;
- password-reset support burden;
- password breach/reuse risk;
- CPU-heavy password hashing from the Free Worker path.

A password option can be reconsidered later on a paid/runtime tier if user research shows a real need.

## Proposed sign-up UX

The existing product rule remains authoritative:

1. Visitor opens product.
2. Visitor selects a lightweight learning level.
3. Visitor completes the first useful lesson without an account.
4. Product explains the value of an account: sync/progress across devices.
5. User chooses:
   - `Continue as guest`, or
   - `Save my progress`.
6. For `Save my progress`:
   - enter email;
   - complete Turnstile when required;
   - receive a short OTP;
   - enter OTP;
   - account is created automatically if new;
   - existing local learning state is attached/synced only after successful authentication.

No real name should be required for ordinary B2C learning.

Optional secondary button:

- `Continue with Google`

Do not make Google mandatory because the target population includes newcomers with varied account ecosystems.

## Email OTP defaults

Initial security/product intent:

- 6–8 digit OTP.
- Short expiry (approximately 5–10 minutes).
- Low allowed-attempt count.
- Rate limit OTP sends by IP and email-address hash/key.
- Protect the OTP-send endpoint with Cloudflare Turnstile.
- Never disclose whether an email already has an account.
- Do not block guest learning if email delivery fails.

Better Auth supports automatic account creation during OTP sign-in, which fits the post-first-lesson registration flow.

## Email provider

Current pilot candidate: **Resend**.

Public pricing checked 2026-09-02:

- Free: 3,000 emails/month.
- Free daily cap: 100 emails/day.
- Up to 3 domains.

This is sufficient for a small controlled beta but the 100/day cap is a real operational ceiling.

Architecture rule:

- wrap email delivery behind a small internal `sendTransactionalEmail()` interface;
- do not couple authentication logic to Resend-specific objects;
- make switching to another email provider possible without migrating user accounts.

Google OAuth can reduce email OTP volume for users who prefer it.

Do not buy a paid email plan before the beta actually approaches the free quota or deliverability requires a change.

## Abuse protection

Use both application and edge protections.

### Better Auth rate limiting

Better Auth has built-in per-route/IP rate limiting and allows custom rules. Production serverless rate-limit state should not rely only on in-memory isolate state.

### Cloudflare Turnstile

Turnstile Free currently allows unlimited challenges/verification requests and supports production use. Better Auth has a CAPTCHA plugin with native Cloudflare Turnstile support.

Protect at minimum:

- OTP send;
- suspicious repeated sign-in attempts;
- future invitation/access-code redemption if abused.

Do not show a challenge on every normal authenticated request.

## Database isolation

**Never put product auth tables in the Church Ops D1 database.**

Create a dedicated product D1 database, working name until brand finalization:

`learn-nl-auth`

or after brand ownership:

`<brand>-auth`

Better Auth core account/session tables stay in the auth database.

Product learning sync data should also be product-only. It may live in the same product D1 during the beta, but use clearly separate tables/domain services. For larger institution deployments, auth and learning/tenant data can later be separated if operationally useful.

Never reuse:

- church member tables;
- pastoral/contact records;
- donation records;
- Church Ops state/cases;
- church admin identities as implicit product accounts.

## Proposed product data model boundary

Authentication-owned examples:

- `user`
- `session`
- `account`
- `verification`
- `rateLimit` (if database-backed)

Product-owned examples:

- `learner_profile`
- `learner_progress`
- `learner_fsrs_cards`
- `learner_vocab`
- `learner_activity`

Future institution-owned domain tables:

- `organization`
- `organization_member`
- `cohort`
- `cohort_learner`
- `sponsored_entitlement`

Do not create institution tables until the B2B pilot design is concrete.

## Guest-to-account migration

Guest mode remains local-first.

On first authenticated sync:

1. Read the existing allowed `learn-nl-*` local state.
2. Create a versioned sync payload.
3. Upload only product learning data.
4. Server merges by stable content IDs and timestamps/review states.
5. Return canonical synchronized state.
6. Preserve a local cached copy for offline use.

Never require an account merely to recover the current page.

Conflict rule must be designed explicitly before sync implementation; do not use blind last-write-wins for FSRS cards when two devices have both reviewed the same card.

## Failure behavior

Authentication is an enhancement layer, not a learning dependency.

If any of the following fail:

- Better Auth endpoint;
- D1 quota;
- email provider;
- Google OAuth;

then:

- existing guest/local learning remains available;
- show a compact `Sync temporarily unavailable` message;
- do not lose local progress;
- retry sync later after explicit/user-safe recovery.

This matters because Cloudflare D1 Free limits are hard daily limits: exceeding them causes D1 operations to fail until the limit resets or the account upgrades.

## Free-tier capacity envelope

Cloudflare public limits checked 2026-09-02:

### Workers Free

- 100,000 dynamic Worker requests/day.
- 10 ms CPU per invocation.
- Static asset requests are free/unlimited under the documented static-asset model.

### D1 Free

- 5,000,000 rows read/day.
- 100,000 rows written/day.
- 5 GB total included storage.
- No D1 egress charge.

These limits are suitable for an early public beta if queries are indexed and sync is not excessively chatty.

Do not perform one D1 write for every UI tap. Batch/aggregate learning activity where sensible, while preserving correctness of review state.

## Session design

Use secure HTTP-only session cookies from Better Auth on the canonical product domain.

Avoid cross-domain authentication between the church domain and product domain. Once the independent domain exists, product sessions should belong to the product domain only.

The church site should link/redirect to the product; it should not share product cookies.

## Future organizations / institutions

Do not make the first consumer account model depend on an institution.

A learner account should be portable: the user may later join/leave a school/employer/municipal sponsored cohort without changing account identity or losing personal progress.

Institution membership is an association/entitlement, not the learner's identity.

## Alternatives considered

### Supabase Auth

Pros:

- fast implementation;
- generous free MAU allowance;
- mature hosted Postgres/auth ecosystem.

Cons for this product direction:

- another core hosted platform/provider dependency;
- free-tier lifecycle/limits can change;
- moving identity/session behavior later is more work;
- less aligned with the existing Cloudflare-first stack.

Keep as fallback if Better Auth on Workers proves operationally unreliable in real load testing.

### Clerk

Excellent hosted developer experience, but a core identity SaaS creates more future per-user/pricing dependency than desired for a municipality/school scale product.

Not first choice.

### Custom auth

Rejected. Authentication/session/security code is not a useful place to reinvent primitives.

Use a mature auth framework and customize product behavior around it.

## Known technical risk

Better Auth + Cloudflare Workers/D1 has evolved quickly. Better Auth announced first-class D1 support in v1.5, but upstream Workers-specific issues have existed historically and newer edge-runtime issues continue to appear.

Therefore before public account launch, run a dedicated auth proof-of-concept against the exact pinned Better Auth version and real Cloudflare Worker/D1 environment:

- OTP signup/sign-in;
- session refresh/get-session;
- concurrent requests;
- aborted client requests;
- logout/revoke;
- D1 migration/schema;
- Turnstile-protected OTP send;
- local-to-server first sync;
- Worker CPU timing;
- failure fallback.

Pin package versions for the beta. Do not auto-upgrade Better Auth in production without regression tests.

## Implementation gate

Do not implement backend auth yet under the current learning-page isolation rule.

Implementation begins only after:

1. independent brand/domain is selected and owned;
2. product backend data separation is approved;
3. a dedicated D1 binding/database is created;
4. transactional sender domain is configured;
5. the existing static first-lesson/guest flow has passed real-device smoke testing.

At that point the current placeholder `Create free account` button can be connected without changing the successful no-registration first lesson.
