# TAALVIA Product Roadmap

Status: working roadmap for the Dutch-learning product.

## Product direction

TAALVIA is a consumer Dutch-learning and practice website.

Primary goal:
> Help learners practise useful Dutch frequently enough that it actually sticks.

Core principles:
- start learning before registration;
- practical Dutch first;
- support language reduces friction but Dutch stays the target language;
- short sessions must still be useful;
- progress, review and repetition should be learner-driven;
- no advertising as the core business model;
- do not add unrelated business directions that distract from the learning product.

## Initial learners

1. Chinese-speaking learners in the Netherlands.
2. Absolute beginners and A0–A1 learners.
3. A1–A2 learners who need more everyday practice.
4. A2–B1 learners who want more natural vocabulary and sentence patterns.
5. People using TAALVIA alongside a class, textbook or self-study routine.

## Learning surfaces

TAALVIA should grow as one connected learning system rather than unrelated mini-tools.

Core surfaces:
- lessons;
- vocabulary;
- FSRS/spaced review;
- listening;
- sentence practice;
- shadowing/speaking;
- saved words/notebook;
- daily plan;
- TAALVIA Lock;
- future conversation and pronunciation practice.

Learning state should be reusable across surfaces: a weak word discovered in a lesson should be eligible for review, Lock and later speaking practice.

## TAALVIA Lock rules

Current Free release:
- default daily goal: 20 words;
- learner may choose 1–20 words/day;
- the selected set remains stable for that date and level;
- lowering the target keeps the prefix of the current set;
- increasing it adds words rather than reshuffling what the learner already saw;
- known words leave the fresh-word priority pool;
- difficult words receive future review priority.

Future paid release:
- no daily vocabulary-count cap;
- learner decides the target;
- entitlement removes the Free cap without replacing the learning engine.

The current curated layer is still small and must be expanded substantially before unlimited vocabulary practice is marketed as complete.

## Vocabulary content roadmap

### v0.1
- 90 curated high-value Dutch words;
- Chinese glosses;
- noun articles;
- short Dutch examples;
- 5,000-word external frequency ranking source.

### Next
- expand curated layer to at least 500 words;
- then 1,000+;
- verify articles, meanings and examples;
- add morphology/inflection where useful;
- connect words to lesson/sentence IDs;
- add topic tags and difficulty metadata.

Do not expose raw frequency-list tokens as polished learning cards without learner-facing review.

## Pronunciation

Current decision:
- remove browser/system TTS from TAALVIA Lock because its quality is not reliable enough for learning.

Future audio may return only when quality is good enough, using one or more of:
- reviewed native-speaker recordings;
- high-quality Dutch neural TTS;
- a curated pronunciation source with suitable rights.

Pronunciation quality is a learning requirement, not decoration.

## Language strategy

Dutch is always the target language.

Support-language rollout:
1. Chinese;
2. English;
3. additional languages based on actual learner demand.

Course IDs, Dutch source content, review state and progress should remain language-neutral where practical. Explanations/navigation can vary by support language.

## Commercial model

### Free
Purpose: let people genuinely learn and decide whether TAALVIA is useful.

Includes:
- useful first lesson without registration;
- starter learning path;
- local progress;
- basic review/listening/practice;
- TAALVIA Lock up to 20 words/day.

### Plus
Candidate value:
- account and cross-device sync;
- full content library;
- unlimited daily vocabulary practice;
- richer review and progress history;
- stronger personalization;
- better offline convenience.

Pricing remains a hypothesis until the product has enough real learning value to test.

### Pro
Only after expensive/high-value capabilities are genuinely ready:
- high-quality pronunciation feedback;
- conversation practice;
- advanced listening/shadowing;
- personalized error explanation.

Do not promise unlimited costly AI usage unless the economics genuinely support it.

## Account strategy

Guest mode remains first-class for initial learning.

Accounts should add:
- sync;
- backup;
- continuity across devices;
- subscription entitlement;
- richer history.

An account should not be required just to discover whether the learning experience is useful.

## Payments

Netherlands-first candidates can include iDEAL/Wero/cards through a suitable payment provider when paid plans are ready.

Do not implement billing before the learning value and plan boundaries are clear enough to charge for honestly.

## Privacy

Collect the minimum data needed for learning, sync, security and billing.

Avoid:
- advertising profiles;
- selling learner data;
- unnecessary identity fields;
- collecting sensitive personal data that has nothing to do with learning.

Voice recordings, if future pronunciation features upload them, require explicit disclosure and a clear retention/deletion policy.

## Quality gates

Before a public paid launch:
- first lesson works reliably;
- guest flow works;
- progress persists;
- vocabulary/review logic is tested;
- Lock works on real phones within platform limits;
- logo/brand assets match the approved identity;
- pronunciation audio, if present, passes a human quality bar;
- plan limits are truthful and enforced;
- backup/export/delete flows are defined for account data;
- payment and cancellation are clear.

## Near-term priorities

1. Finish TAALVIA Lock real-device testing.
2. Expand and clean the curated vocabulary layer.
3. Connect Lock learning state to the main vocabulary/review system.
4. Improve daily practice flow and progress feedback.
5. Add high-quality Dutch pronunciation only after a quality source is chosen.
6. Test whether learners actually return and complete useful practice before adding more product complexity.
