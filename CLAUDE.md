# Claude operating instructions

Before changing this repository, read `AI_CONTEXT.md`, `AI_HANDOFF.md` and `AI_SAFETY.md`.

This project uses GitHub `main` as the formal code source and SINAN as the execution/QA control layer.

Rules:
- Verify branch, HEAD, workspace state and pending migrations before mutation.
- Treat production database/schema changes and deployment as release actions, not ordinary development.
- Never expose member/newcomer names, phone numbers, addresses, photos or other personal data in AI output or repository handoff files.
- Do not run production D1 migrations, destructive data commands or redeploy without explicit approval.
- Use approved SINAN profiles/roots for remote work; do not bypass them with a broader remote shell.
- Do not clean/reset/stash/rebase/delete unknown work as a shortcut.
- Update `AI_HANDOFF.md` after accepted work with the actual test/migration/deployment state.

If repository/device/production evidence conflicts with these documents, preserve state and report the discrepancy before mutating anything.