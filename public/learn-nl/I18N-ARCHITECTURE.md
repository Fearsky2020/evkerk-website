# Multilingual Support-Language Architecture

Goal: Dutch remains the single target language; learners can choose the language used to explain Dutch.

## Core rule

Do not duplicate the app per support language.

A Dutch learning item should have one stable language-neutral identity, while translations/explanations live in support-language resources.

Example concept:

```json
{
  "id": "supermarket.where-find",
  "level": "start",
  "scene": "supermarket",
  "nl": "Waar kan ik dit vinden?"
}
```

Support-language resource:

```json
{
  "supermarket.where-find": {
    "meaning": "我在哪里可以找到这个？",
    "note": "在商店、车站等场景都能使用。"
  }
}
```

English resource:

```json
{
  "supermarket.where-find": {
    "meaning": "Where can I find this?",
    "note": "Useful in shops, stations and many service situations."
  }
}
```

## Why this matters

FSRS, progress, saved items, lesson completion and institutional reporting must reference stable Dutch/content IDs, not translated strings.

Changing from Chinese to English must not:

- reset progress;
- create duplicate cards;
- change review schedules;
- change account identity;
- create separate learner histories.

## Suggested support-language rollout

1. `zh-CN`
2. `en`
3. `ar`
4. `tr`
5. `pl`
6. `uk`

Only add languages based on validated user or partner demand.

## Resource split

Recommended future structure:

```text
public/learn-nl/
  data/
    content/
      scenes.json
      phrases.json
      vocab.json
    i18n/
      zh-CN.json
      en.json
      ar.json
      tr.json
```

Dutch source content remains in content data. UI labels and learner explanations live in i18n resources.

## UI language vs learning support language

Initially they may be the same, but architecture should distinguish them conceptually:

- UI language: menus, buttons, settings.
- Support language: translations and explanations of Dutch learning content.

This allows future institutional deployments where an organisation may require an English admin UI while learners use Arabic or Turkish explanations.

## Fallbacks

If a translation is missing:

1. use English support text if available;
2. otherwise show Dutch source content;
3. never hide the entire lesson because one translation key is missing.

Development/debug mode should make missing keys obvious.

## Translation quality

Do not rely on unreviewed machine translation for safety-sensitive scenarios such as:

- healthcare;
- emergencies;
- employment rights;
- government procedures.

Machine assistance can draft translations, but production packs should have human review appropriate to the use case.

## Right-to-left support

Before Arabic launch:

- test `dir="rtl"` at document/component level;
- do not mirror Dutch-language strings themselves;
- check progress bars, icons, arrows and mixed Dutch/Arabic text;
- test mobile layouts with real Arabic content, not lorem ipsum.

## Search

Search should index:

- Dutch phrase;
- current support-language meaning;
- scene/title labels;
- useful aliases.

Changing support language should rebuild or switch the local search index without changing source item IDs.

## Accounts / sync

Store only language codes in account preference state, e.g.:

```json
{
  "uiLanguage": "zh-CN",
  "supportLanguage": "zh-CN"
}
```

Do not create separate accounts by language.

## Institutional reporting

Support-language distribution may be useful as an aggregated metric for municipalities/schools/employers.

Avoid exposing a learner's native/support language at individual level unless the institution genuinely needs it and the contract/privacy design permits it.

## Migration from current prototype

Current prototype contains substantial Chinese copy inside JS/HTML. Migration should be incremental:

### Step 1
Create stable content IDs for existing scenes/phrases without changing user-facing behavior.

### Step 2
Move repeated UI strings into `zh-CN` resource.

### Step 3
Add English resource and a hidden/debug language switch.

### Step 4
Expose language choice to learners once parity is acceptable.

### Step 5
Move remaining Chinese lesson explanations out of code.

Do not attempt a single giant i18n rewrite immediately before production; migrate module-by-module and preserve localStorage compatibility.

## Revenue connection

All supported languages should be available in the Free first lesson.

Do not charge users merely because they need Arabic/Chinese/Turkish explanations. Paid value should be sync, advanced content, personalization, AI and institutional services — not linguistic accessibility itself.
