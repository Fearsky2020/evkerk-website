# Nederlands leren — future API boundary

Status: design only. No endpoint in this document is implemented yet.

The Dutch-learning module must remain logically separate from Church Ops. Future learning endpoints live under `/api/learn-nl/*`; they must not be added as ad-hoc actions to `src/sinan-ops.js`.

## Principles

1. Static-first: vocabulary, scenes, dialogues, grammar notes and basic quizzes remain usable without a backend.
2. Optional AI: the page should still work when TTS/ASR/LLM services are unavailable.
3. Privacy by default: uploaded voice is not retained unless the learner explicitly enables a history feature.
4. No Church Ops authority: learning endpoints cannot publish announcements, sermons, calendar items or media.
5. Provider-neutral contracts: browser TTS can later be replaced by a natural Dutch voice without changing the page model.
6. Progressive accounts: v0.x keeps progress in `localStorage`; server progress is optional and comes later.

## Proposed endpoints

### POST `/api/learn-nl/tts`

Purpose: natural Dutch speech when browser `speechSynthesis` is not good enough.

Request:

```json
{
  "text": "Ik wil graag een afspraak maken.",
  "locale": "nl-NL",
  "voice": "default",
  "speed": 1.0
}
```

Response:

```json
{
  "audio_url": "https://...",
  "content_type": "audio/mpeg",
  "expires_at": "2026-09-02T12:00:00Z"
}
```

Notes:
- Validate maximum text length.
- Cache identical synthesis requests where licensing allows it.
- R2 may be used for short-lived/generated audio later, but is not required for v0.x.

### POST `/api/learn-nl/asr/evaluate`

Purpose: transcribe a learner recording and give pronunciation-oriented feedback.

Input: `multipart/form-data`

Fields:
- `audio`: recording file
- `target_text`: expected Dutch sentence
- `locale`: `nl-NL`
- `scene_id`: optional learning scene

Response:

```json
{
  "transcript": "Ik wil graag een afspraak maken.",
  "overall": 82,
  "words": [
    {"text": "afspraak", "score": 71, "note": "vowel/stress needs attention"}
  ],
  "feedback_zh": "整体很清楚，重点再练 afspraak 的重音。"
}
```

Notes:
- `overall` is coaching feedback, not a linguistic certification score.
- Delete raw audio after evaluation by default.
- Never infer identity, health, ethnicity or other sensitive attributes from voice.

### POST `/api/learn-nl/grammar`

Purpose: correct learner-written Dutch while explaining the minimum useful grammar in Chinese.

Request:

```json
{
  "text": "Ik wil maken een afspraak.",
  "context": "huisarts",
  "level": "A1"
}
```

Response:

```json
{
  "original": "Ik wil maken een afspraak.",
  "corrected": "Ik wil een afspraak maken.",
  "natural": "Ik wil graag een afspraak maken.",
  "explanation_zh": "情态动词 wil 后面的动词不定式通常放在句尾；加 graag 更自然礼貌。",
  "changes": [
    {"from": "maken een afspraak", "to": "een afspraak maken"}
  ]
}
```

### POST `/api/learn-nl/coach`

Purpose: Sinan/AI role-play for real-life Dutch scenarios.

Request:

```json
{
  "conversation_id": null,
  "scene_id": "doctor",
  "level": "A1",
  "learner_text": "Ik wil graag een afspraak maken.",
  "mode": "roleplay"
}
```

Response:

```json
{
  "conversation_id": "nlc_...",
  "reply_nl": "Natuurlijk. Wat zijn uw klachten?",
  "hint_zh": "对方在问你有什么症状。可以用 Ik heb ... 回答。",
  "correction": null,
  "next_action": "reply"
}
```

Rules:
- The coach is educational only; it must not make real appointments or contact third parties from this endpoint.
- Any future real-world action must go through a separate explicit tool/approval flow outside the learning API.
- Keep learner level and scene constraints in structured state rather than relying only on conversation text.

### GET `/api/learn-nl/progress`

Purpose: retrieve cross-device progress after optional sign-in is introduced.

Possible response:

```json
{
  "mastered": ["doctor::Ik wil graag een afspraak maken."],
  "visited_scenes": ["supermarket", "doctor"],
  "quiz_best": 5,
  "listening_best": 4,
  "updated_at": "2026-09-02T08:00:00+02:00"
}
```

### PUT `/api/learn-nl/progress`

Purpose: sync local learning progress.

The server should merge progress safely rather than blindly replacing a newer device state.

## Suggested future D1 separation

If server-side learning progress is added, use learning-specific tables, for example:

- `learn_nl_profiles`
- `learn_nl_progress`
- `learn_nl_attempts`
- `learn_nl_conversations`

Do not reuse Church Ops announcement/sermon/calendar tables.

## Frontend degradation path

1. Natural TTS unavailable → use browser `nl-NL` `speechSynthesis`.
2. ASR unavailable → keep listen/repeat practice without scoring.
3. Coach unavailable → static dialogues and quizzes still work.
4. Account unavailable → keep `localStorage` progress.

This keeps `/learn-nl/` useful even when every optional AI/backend service is offline.
