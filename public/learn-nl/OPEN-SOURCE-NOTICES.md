# Nederlands leren — open-source and media notices

This module intentionally keeps third-party learning libraries and media separate from Church Ops.

## Runtime libraries

- **Fuse.js 7.5.0** — lightweight fuzzy search — Apache-2.0 — https://github.com/krisk/Fuse
- **ts-fsrs 5.4.1** — FSRS spaced-repetition scheduler — MIT — https://github.com/open-spaced-repetition/ts-fsrs
- **wavesurfer.js 7.12.11** — audio waveform and microphone recording UI — BSD-3-Clause — https://github.com/katspaugh/wavesurfer.js

The smart-practice preview loads these pinned browser modules from jsDelivr. A later production-hardening pass may vendor/self-host the exact pinned builds after integrity and bundle-size checks.

## Dutch lexical data

- **OpenTaal/opentaal-wordlist** — Dutch word list and spelling resources — available under Revised BSD (3-clause) and/or CC BY 3.0.
- Source repository: https://github.com/OpenTaal/opentaal-wordlist
- Source version reported by `datetimeversion.txt`: **2.20.23 — 2023-03-10**.

The complete OpenTaal word list is approximately 5 MB and contains more than 400,000 entries. This learning module deliberately does **not** load that full list on mobile.

Starting in v0.6, the search box can lazily load OpenTaal's `elements/corrections.tsv` spelling-correction resource (approximately 288 KB, roughly 16,000 common incorrect forms). The file is requested only when a Dutch-looking search token needs spelling help, then cached by the browser for later/offline use. If the file is unavailable, the existing local lesson search continues to work normally.

The spelling helper only offers OpenTaal correction suggestions. It does not claim to be a complete Dutch dictionary, CEFR classifier, grammar checker, or proof that a word is valid/invalid.

## Easy Dutch / Easy Languages

Easy Dutch videos remain third-party copyrighted media owned/published by Easy Dutch / Easy Languages. This site embeds selected public videos using the official YouTube embedded player in privacy-enhanced mode and links to public podcast episodes.

The module does **not** copy, download, extract, re-host, or redistribute Easy Dutch video/audio, member transcripts, exercises, vocab helpers, or other paid learning materials. Our Chinese study prompts and learning workflow beside the player are original to this site.

Selected public videos:

- `jSyrqH_MMOM` — 100 Words You Should Know When Coming to the Netherlands
- `iA61Z0BAI90` — Small Talk (in Slow Dutch)
- `w2xDfh3xQuA` — 50 Everyday Sentences with the Verb “kunnen”

Channel: https://www.youtube.com/@EasyDutch
