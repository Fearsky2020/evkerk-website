# Dutch Learning Productization Roadmap

Status: working product plan for the current isolated `public/learn-nl/` prototype.

## Product direction

Turn the current Dutch-learning module into an independent multilingual product brand. The church website may continue to host or link to it during the early phase, but the product identity, domain, privacy/legal documents, analytics, customer accounts and future billing must be separate from church operations and church member data.

Working positioning:

> A multilingual Dutch learning platform for newcomers and international residents. Learn practical Dutch through the language you already understand.

Short English promise:

> Learn Dutch in your language.

Product principle:

- Start learning before registration.
- First lesson first; registration value is explained after an early success.
- Free users must still be able to learn something genuinely useful.
- Paid plans sell convenience, sync, personalization, advanced practice and institutional tooling — not access to basic dignity or basic language learning.

## Brand and domain architecture

Target state:

- `brand.nl` = canonical public product domain.
- `.com` = defensive registration / international redirect when affordable.
- `evkerk.nl/learn-nl/` = temporary host or referral route only.
- Once the independent domain is live, avoid duplicate indexed copies: use a redirect or canonical URL.
- Product email addresses should use the brand domain, e.g. `hello@brand.nl`, `support@brand.nl`, `partners@brand.nl`.
- Do not use church email addresses for institutional sales or public product support.

The code may remain in the current repository temporarily, but the eventual architecture should allow extraction into its own repository without changing product URLs or user accounts.

## Audience

Primary B2C:

1. Newcomers in the Netherlands.
2. International residents and workers.
3. Partners/family members of Dutch residents.
4. People preparing for practical Dutch use before or alongside formal NT2 study.

Primary B2B/B2G:

1. NT2 / inburgering schools that need a digital homework and practice layer.
2. Municipalities and newcomer/integration programmes.
3. Employers with multilingual staff.
4. Foundations and NGOs working with newcomers.
5. Adult education / ROC partners.

## Language strategy

Dutch is always the target language. The support/explanation language becomes a selectable layer.

Suggested rollout:

1. Chinese + English.
2. Arabic + Turkish.
3. Polish + Ukrainian.
4. Expand based on pilot demand rather than translating every language in advance.

Do not clone the whole application per language. Course IDs, Dutch source sentences, FSRS state and progress remain language-neutral; only explanations, navigation and coaching copy vary by support language.

## Learning product model

Keep the current 3-tier learner choice as a lightweight onboarding preference, not an official assessment:

- Start / A0–A1
- Daily / A1–A2
- Natural / A2–B1

AI may recommend a level later, but the learner must be able to change it. Do not position automated level selection as an official educational assessment without a separate compliance review.

## Commercial model

### Free

Goal: acquisition, trust, social value and pilot reach.

Includes:

- No-registration first lesson.
- Practical starter scenarios.
- Limited but useful FSRS review.
- Basic listening / speaking / shadowing.
- Local progress.
- Current-level learning path.

No advertising.

### Plus — initial target price

Target test price: **€6.99/month** or **€59–69/year**.

Potential paid value:

- Account and cross-device sync.
- Full A0–B1 content library.
- Full progress history.
- Unlimited saved vocabulary / review.
- Offline convenience and richer personalization.
- All supported explanation languages.

Pricing is a hypothesis and must be tested with real users before being fixed.

### Pro — later

Target test range: **€12.99–€17.99/month**.

Only introduce once costly AI features exist and usage economics are known.

Potential features:

- Pronunciation feedback.
- AI conversation practice.
- Personalized error explanation.
- Advanced shadowing / speech coaching.
- B1/B2 / exam-oriented practice.
- Work-sector language packs.

Do not promise unlimited expensive AI usage inside a low-cost plan.

### Institution

This is expected to be the strongest long-term revenue channel.

Possible pricing model:

- Sponsored learner access paid by municipality, school or employer.
- Initial hypothesis: €3–6 per active learner/month, with minimum contract value for small cohorts.
- Custom pilots / sector packs can be priced separately.

Institutional value is not merely access to language content. It is:

- Cohort onboarding.
- Engagement / active learner reporting.
- Completion and learning activity dashboards.
- Multi-language learner entry.
- Tenant administration.
- CSV/PDF reporting.
- DPA / privacy documentation.
- Accessibility documentation.
- Optional custom work-sector content.

## Employer packages

Create sector-specific Dutch packs once the content system is stable:

- Dutch for hospitality.
- Dutch for logistics / warehouse work.
- Dutch for healthcare support roles.
- Dutch for construction / carpentry.
- Dutch for cleaning services.
- Dutch for salons / personal services.
- Dutch for office communication.

A paid sector pack should be based on real employer workflows and phrases, not generic vocabulary lists.

## Government / school positioning

Early positioning should be "digital Dutch-learning and practice platform", not "official inburgering school".

Do not claim official accreditation, official CEFR certification or government endorsement.

If the company later wants to directly deliver government-funded inburgering routes as a provider, perform a separate legal/procurement review and determine whether Blik op Werk Keurmerk Inburgeren and municipality-specific requirements apply.

Near-term route: partner with already-qualified language schools and municipalities as the digital practice layer.

## Compliance backlog

Treat these as product requirements, not launch-day paperwork:

### Privacy / GDPR

- Separate product data from church/member data.
- Data minimisation.
- Clear retention and deletion policy.
- Export/delete account capability once accounts exist.
- EU/EEA processor review for auth, email, analytics and payments.
- DPA template for institutional customers.
- Avoid collecting BSN, passport, immigration status, religion or other sensitive data unless strictly necessary and separately reviewed.

### Accessibility

Build toward WCAG 2.2 AA / EN 301 549 compatibility:

- Keyboard navigation.
- Screen-reader semantics.
- Focus visibility.
- Contrast.
- Captions/transcripts or alternatives for learning media where rights permit.
- No color-only status communication.
- Mobile zoom and responsive layouts.

### Security / institutional readiness

Later institutional edition should be able to document:

- Tenant/data separation.
- Access controls.
- Audit logging.
- Backups and recovery.
- Encryption in transit / at rest where applicable.
- Incident process.
- Processor/subprocessor list.
- Data location.

If selling to Dutch government bodies, review BIO2-related procurement/security expectations at that stage.

### Consumer subscriptions

Before paid B2C launch:

- Show full recurring price and billing period clearly.
- Easy online cancellation.
- Clear renewal terms.
- Refund/cooling-off treatment reviewed for digital services.
- Confirm Dutch VAT treatment with an accountant; do not assume a language-learning SaaS subscription is automatically VAT-exempt education.

## Payment strategy

Early Netherlands-first option: Mollie (iDEAL/Wero and cards), subject to final fee review when billing is implemented.

International expansion can add Stripe or another provider later.

Billing code must stay provider-neutral enough to migrate.

## Pilot strategy

Do not approach institutions with only a polished demo. First produce outcome/usage evidence.

Initial target:

- 50–100 real learners.
- 6–8 week observation window.
- Measure activation: first lesson completed.
- Registration conversion after first lesson.
- D1 / D7 / D30 return rate.
- Weekly active learning days.
- FSRS reviews completed.
- Level distribution and level changes.
- Support-language distribution.
- Most-used practical scenarios.
- Drop-off points.

For privacy, reporting should be aggregated for institutional demos unless learner-level reporting is contractually required and legally justified.

## Execution phases

### Phase 0 — now

- Select independent brand.
- Register `.nl`; defensively register `.com` if sensible.
- Reserve product social/account names where useful.
- Keep current code isolated and do not deploy brand changes until domain is owned.
- Prepare product Privacy / Terms skeletons.

### Phase 1 — independent public beta

- Make brand domain canonical.
- Chinese + English support-language architecture.
- Free first lesson and guest mode.
- Real free account/auth solution.
- Cross-device progress sync.
- Basic consent/privacy flows.
- Accessibility baseline review.

### Phase 2 — paid B2C

- Plus subscription.
- Mollie payment integration.
- Online cancellation and subscription self-service.
- Cost limits for AI features.
- Conversion and retention metrics.

### Phase 3 — pilot-ready institution edition

- Organisation / cohort model.
- Sponsored access codes or invitations.
- Aggregated dashboard.
- Exports.
- DPA / security / accessibility package.
- One NT2-school pilot + one employer pilot.

### Phase 4 — public-sector sales

- Use pilot evidence to approach municipalities and funded newcomer programmes.
- Monitor tenders, grants and pilot calls.
- Review procurement/security/accreditation requirements for each opportunity.

## Guardrails

- Never mix church pastoral/member data with product user data.
- Never imply government endorsement.
- Never call AI-generated pronunciation/level output a formal certificate.
- Never paywall the first useful learning experience.
- Avoid advertising as a revenue model.
- Keep expensive AI usage metered or fair-use controlled.
- Preserve guest/local-first learning even after accounts launch where technically possible.
