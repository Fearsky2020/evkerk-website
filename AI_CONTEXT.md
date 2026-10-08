# AI Context — EVKERK Website

## Formal source
- Repository: `Fearsky2020/evkerk-website`
- Formal branch: `main`
- Migration baseline observed on 2026-09-15: `9691486dc554f5a3dbb52e08f6545ab8c35caf9c`
- Baseline commit: `chore(qa): add SINAN website quality gate`

## Runtime / stack
- Cloudflare Workers
- D1
- R2

Known development checkout: `home-01` -> `C:\SINAN\evkerk-site`.

## Product role
The website is the formal data/API source for EVKERK app features. Existing API areas include account/session flows, My Group, newcomer reception, group questions and daily devotionals.

## Data/privacy rule
The system handles church member/newcomer information. AI work must avoid emitting names, phone numbers, addresses, photos or other personal records in logs, chat output or handoff documents unless a specific authorized task requires narrowly handling that record.

## Migration discipline
D1 migrations are production-sensitive. Inspect migration state before work and never assume a migration should be executed merely because a file exists.