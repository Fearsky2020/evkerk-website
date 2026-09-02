# Nederlands leren — open-source and media notices

This module intentionally keeps third-party learning libraries and media separate from Church Ops.

## Runtime libraries

- **Fuse.js 7.5.0** — lightweight fuzzy search — Apache-2.0 — https://github.com/krisk/Fuse
- **ts-fsrs 5.4.1** — FSRS spaced-repetition scheduler — MIT — https://github.com/open-spaced-repetition/ts-fsrs
- **wavesurfer.js 7.12.11** — audio waveform and microphone recording UI — BSD-3-Clause — https://github.com/katspaugh/wavesurfer.js

The smart-practice preview loads these pinned browser modules from jsDelivr. The service worker caches successfully loaded jsDelivr modules for later offline use. No paid API is used by the local daily planner; it only reads existing local FSRS, notebook and weekly-task state.

## Dutch lexical data

- **OpenTaal/opentaal-wordlist** — Dutch word list — Revised BSD (3-clause) and/or CC BY 3.0.
- Upstream file version recorded by OpenTaal: **2.20.23 — 2023-03-10**.
- The complete `wordlist.txt` is about 5 MB and contains more than 400,000 entries.
- This preview deliberately does **not** ship the full list to mobile clients.
- The spelling helper lazily fetches only `elements/corrections.tsv` (about 288 KB; OpenTaal documents about 16,000 misspelled forms with suggested corrections).
- After a successful fetch, the corrections file is stored in the browser Cache API for later reuse. If it is unavailable, normal lesson/Fuse search still works.

Source: https://github.com/OpenTaal/opentaal-wordlist

### FrequencyWords corpus used by TAALVIA Lock

- **hermitdave/FrequencyWords** — Dutch OpenSubtitles 2018 frequency list.
- TAALVIA Lock reads `content/2018/nl/nl_50k.txt` and uses only the first **5,000** ranked entries as its canonical high-frequency corpus.
- FrequencyWords documents the generated/content data under **CC BY-SA 4.0**; its generator code is MIT.
- The upstream frequency data is based on the OpenSubtitles 2018 corpus distributed through OPUS.
- TAALVIA's Chinese glosses, learner-facing `de`/`het` display forms and example sentences are a separate curated learning layer. They are not copied from FrequencyWords.
- The Lock service worker may cache the fetched frequency list in the browser for offline reuse after a successful first load.

Source: https://github.com/hermitdave/FrequencyWords

## Easy Dutch / Easy Languages

Easy Dutch videos remain third-party copyrighted media owned/published by Easy Dutch / Easy Languages. This site embeds selected public videos using the official YouTube embedded player in privacy-enhanced mode.

The module does **not** copy, download, extract, re-host, or redistribute Easy Dutch video/audio, member transcripts, exercises, or other paid learning materials. Our Chinese study prompts and learning workflow beside the player are original to this site.

Selected public videos:

- `jSyrqH_MMOM` — 100 Words You Should Know When Coming to the Netherlands
- `iA61Z0BAI90` — Small Talk (in Slow Dutch)
- `w2xDfh3xQuA` — 50 Everyday Sentences with the Verb “kunnen”

Channel: https://www.youtube.com/@EasyDutch
