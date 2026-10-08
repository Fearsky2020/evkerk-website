# AI Handoff — EVKERK Website

Snapshot date: 2026-09-15

## Baseline
- Formal branch: `main`
- Baseline at migration start: `9691486dc554f5a3dbb52e08f6545ab8c35caf9c`
- Claude migration docs are isolated on `claude-handoff-20260915` until reviewed/merged.

## Current known production state
- D1 migrations had reached `0029` in the last completed release cycle.
- Automated website QA had reached 102 passing checks in that release cycle.
- The last recorded Cloudflare production version in the handoff was `f229f20b-e7de-4296-9f71-a6137b25dc0d`.
- The site had entered post-release observation with no further source/database mutation authorized by that release handoff.

These values are a dated handoff snapshot. Re-check repository, migration and Cloudflare state before any new production action.

## Next safe step
For a new bug/feature, reproduce and scope it first, make the smallest source/test change, run the SINAN website quality gate, then request release approval if deployment or migration is needed.

Do not treat a code change as permission to execute D1 migrations or deploy production.