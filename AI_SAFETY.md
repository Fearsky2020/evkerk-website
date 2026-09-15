# AI Safety — EVKERK Website

## Read / audit
Allowed within approved SINAN scope: inspect code/config, Git state, migration lists, test output and privacy-safe logs.

## Development
When implementation is requested: edit scoped source/tests and run local/approved QA. Do not silently turn development into deployment.

## Explicit approval required
- production Cloudflare deployment
- production D1 migration or data mutation
- destructive database/file operations
- force push, destructive reset/clean, history rewrite or deletion of unknown work
- changes to authentication/security scopes that broaden access

## Privacy
Do not print or place in AI handoff documents church member/newcomer names, phones, addresses, photos, tokens, credentials or other private records. Use schema/IDs/redacted examples where possible.

## Workspace discipline
Verify branch, HEAD, dirty state and migration state before mutation. Preserve unexpected files/changes and report conflicts; do not automatically clean/reset/stash/rebase them away.

## Handoff
Record only verified test/migration/deployment facts in `AI_HANDOFF.md`. A passed local test is not evidence that production was deployed or migrated.