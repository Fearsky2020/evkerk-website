# Nederlands leren — open-source and media notices

This module intentionally keeps third-party learning libraries and media separate from Church Ops.

## Runtime libraries

- **Fuse.js 7.5.0** — lightweight fuzzy search — Apache-2.0 — https://github.com/krisk/Fuse
- **ts-fsrs 5.4.1** — FSRS spaced-repetition scheduler — MIT — https://github.com/open-spaced-repetition/ts-fsrs
- **wavesurfer.js 7.12.11** — audio waveform and microphone recording UI — BSD-3-Clause — https://github.com/katspaugh/wavesurfer.js

The smart-practice preview loads these pinned browser modules from jsDelivr. A later production-hardening pass may vendor/self-host the exact pinned builds after integrity and bundle-size checks.

`ts-fsrs` is used both for built-in lesson review and for the local notebook learning loop. Notebook review state is stored locally under a separate `learn-nl-*` key so it remains included in the existing JSON backup/export flow. This does not require an account, D1, a paid API, or a server-side sync service.

## Dutch lexical data

- **OpenTaal/opentaal-wordlist** — Dutch word list — available under Revised BSD (3-clause) and/or CC BY 3.0.
- Upstream version marker currently used for this integration: **2.20.23**, dated **2023-03-10**.
- Source file used at runtime: `elements/corrections.tsv` (about 288 KB; upstream documentation describes about 16,000 misspelled forms with suggested corrections).

The complete OpenTaal word list is approximately 5 MB and contains more than 400,000 words. This learning page intentionally does **not** load the complete list on mobile. The spelling helper lazily requests only `corrections.tsv` when a Dutch-looking query is entered, caches a successful copy in the browser, and gracefully falls back to the built-in lesson/Fuse search if the resource is unavailable.

## Easy Dutch / Easy Languages

Easy Dutch videos remain third-party copyrighted media owned/published by Easy Dutch / Easy Languages. This site embeds selected public videos using the official YouTube embedded player in privacy-enhanced mode.

The module does **not** copy, download, extract, re-host, or redistribute Easy Dutch video/audio, member transcripts, exercises, or other paid learning materials. Our Chinese study prompts and learning workflow beside the player are original to this site.

Selected public videos in v0.3:

- `jSyrqH_MMOM` — 100 Words You Should Know When Coming to the Netherlands
- `iA61Z0BAI90` — Small Talk (in Slow Dutch)
- `w2xDfh3xQuA` — 50 Everyday Sentences with the Verb “kunnen”

Channel: https://www.youtube.com/@EasyDutch
