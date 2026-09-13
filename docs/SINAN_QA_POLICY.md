# EVKERK Website SINAN QA Policy v1

SINAN is the automated quality gate and evidence recorder for the EVKERK website, API, D1 and R2 integration.

## Verdicts

- PASS: required checks pass, canonical branch is used, and relevant worktree changes are absent.
- PASS_WITH_RISK: required checks pass with documented non-blocking risks.
- BLOCKED: any required check fails, release evidence is missing, or the worktree is not release-ready.

## Authority and safety

SINAN may inspect, test, build and perform public/anonymous read-only API probes. It must not deploy, push, apply migrations, write D1/R2 production data, delete user data, or expose credentials without explicit owner approval.

## Required website gates

1. Record branch, commit and worktree state.
2. Run syntax checks and the complete automated test suite.
3. Verify daily devotional timezone and public response contract.
4. Verify anonymous denial for private endpoints.
5. Verify newcomer faith-status semantics and “海牙福音教会” normalization.
6. Verify sensitive fields are not written to ordinary logs.
7. Record migration inventory without applying it.
8. Produce a machine-readable report.

Website/API is the canonical source for mobile shared data. Android and iOS must not independently redefine the contract.
