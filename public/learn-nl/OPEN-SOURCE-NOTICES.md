# Nederlands leren — open-source and media notices

This module intentionally keeps third-party learning libraries and media separate from Church Ops.

## Runtime libraries

- **Fuse.js 7.5.0** — lightweight fuzzy search — Apache-2.0 — https://github.com/krisk/Fuse
- **ts-fsrs 5.4.1** — FSRS spaced-repetition scheduler — MIT — https://github.com/open-spaced-repetition/ts-fsrs
- **wavesurfer.js 7.12.11** — audio waveform and microphone recording UI — BSD-3-Clause — https://github.com/katspaugh/wavesurfer.js

The v0.3 preview loads these pinned browser modules from jsDelivr. A later production-hardening pass may vendor/self-host the exact pinned builds after integrity and bundle-size checks.

## Dutch lexical data

- **OpenTaal/opentaal-wordlist** — Dutch word list — available under Revised BSD (3-clause) and/or CC BY 3.0.

The complete OpenTaal word list is approximately 5 MB. v0.3 does **not** load the whole list on mobile. Search currently indexes the lesson content already shipped by this module. The intended next step is a small build-time index with attribution retained here.

## Easy Dutch / Easy Languages

Easy Dutch videos remain third-party copyrighted media owned/published by Easy Dutch / Easy Languages. This site embeds selected public videos using the official YouTube embedded player in privacy-enhanced mode.

The module does **not** copy, download, extract, re-host, or redistribute Easy Dutch video/audio, member transcripts, exercises, or other paid learning materials. Our Chinese study prompts and learning workflow beside the player are original to this site.

Selected public videos in v0.3:

- `jSyrqH_MMOM` — 100 Words You Should Know When Coming to the Netherlands
- `iA61Z0BAI90` — Small Talk (in Slow Dutch)
- `w2xDfh3xQuA` — 50 Everyday Sentences with the Verb “kunnen”

Channel: https://www.youtube.com/@EasyDutch
