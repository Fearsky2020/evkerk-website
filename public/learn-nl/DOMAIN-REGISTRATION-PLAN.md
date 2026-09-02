# Domain Registration Plan

Status: operational plan for the independent product brand. Domain purchase has **not** been performed yet.

## Recommended setup

Use separate providers for registration and DNS/hosting if that lowers long-term cost.

Preferred pattern:

- Registrar: OVHcloud (subject to live availability and final checkout price)
- DNS / CDN / site delivery: Cloudflare
- Product hosting: continue using the current Cloudflare-based architecture initially

A domain does not need to be registered at Cloudflare in order to use Cloudflare DNS/CDN.

## Why OVH is the current cost preference

Public pricing checked on 2026-09-02:

- OVH `.nl`: €4.38 excl. VAT first year; €5.84 excl. VAT renewal.
- OVH `.com`: €7.99 excl. VAT; €13.49 excl. VAT renewal.
- TransIP `.nl`: €0.49 excl. VAT first year promo; €16.50 excl. VAT renewal.
- TransIP `.com`: €8.99 excl. VAT first year promo; €27.99 excl. VAT renewal.
- Porkbun `.nl`: public page showed $7.90 everyday price; evaluate only if account/terms fit a Netherlands-first business.

This makes TransIP attractive for year one but substantially more expensive on renewal. For a brand domain expected to be held indefinitely, renewal cost matters more than a first-year promotion.

Prices can change; verify at checkout.

## Purchase set

If the preferred brand is cleared and both domains are available:

1. Register `brand.nl` — primary/canonical domain.
2. Register `brand.com` — defensive/international domain.
3. Do not buy unnecessary TLDs (`.eu`, `.app`, `.online`, etc.) at launch.

If only `.nl` is available, do not automatically abandon a strong Netherlands-first brand. Evaluate whether the `.com` owner is active/conflicting before deciding.

## Immediately after purchase

- Enable automatic renewal.
- Add recovery/contact email that is not dependent on the new domain itself.
- Enable registrar account 2FA.
- Move DNS to Cloudflare if registrar is elsewhere.
- Enable DNSSEC after nameserver configuration is stable.
- Create canonical product records.
- Reserve `www` redirect to the apex domain (or the reverse) consistently.
- Keep the existing `evkerk.nl/learn-nl/` path as temporary referral/preview only.

## Canonical routing target

Proposed:

```text
https://brand.nl/                 canonical product
https://www.brand.nl/             -> redirect to canonical
https://brand.com/                -> redirect to brand.nl initially
https://www.brand.com/            -> redirect to brand.nl initially
https://evkerk.nl/learn-nl/        -> redirect or referral to brand.nl once public
```

Before redirecting the church path, preserve any preview/debug path needed for development separately.

## Email

Do not purchase expensive mailbox bundles until needed.

Initial desired identities:

- `hello@brand.nl`
- `support@brand.nl`
- `partners@brand.nl`
- `privacy@brand.nl`

Start with forwarding or a low-cost mailbox setup if reliable; move to a full business email provider only when support volume/institutional sales justify it.

## Availability gate

Live availability must be checked at the registrar/RDAP immediately before purchase. Open-web search absence is **not** sufficient proof that a domain is free.

Current working first choice remains `TAALVIA`, pending live checks for:

- `taalvia.nl`
- `taalvia.com`

## Trademark gate

Domain ownership is not trademark clearance.

Before investing heavily in public branding:

- BOIP exact-word search.
- BOIP phonetic/visual similarity search.
- EUIPO search before broader EU expansion.

Do not use `®` unless the mark is registered.
