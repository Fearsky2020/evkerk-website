# Privacy Skeleton — Independent Dutch Learning Product

Status: internal drafting skeleton only. Replace `[BRAND]`, controller details, processors and retention periods before publication. This is not legal advice.

## 1. Scope

This privacy notice applies to the independent Dutch-learning product currently prototyped under `public/learn-nl/`.

The learning product must remain operationally and logically separate from church membership, pastoral, donation, attendance, volunteer or ministry records.

**Hard rule:** product user data must never be merged with church member/pastoral data merely because the product is temporarily hosted or linked from a church domain.

## 2. Controller

To be completed before public account launch:

- Legal entity / sole proprietor: `[CONTROLLER]`
- Trade name: `[BRAND]`
- Address: `[ADDRESS]`
- Chamber of Commerce (KvK): `[KVK]`
- Privacy contact: `privacy@[brand].nl`

## 3. Guest learning

The product should remain usable without an account for the initial learning experience.

Current guest-mode data is intended to remain in the learner's browser/local storage where possible, including items such as:

- selected learning level;
- completed lesson state;
- saved words;
- local FSRS review state;
- local preferences;
- weekly learning/progress state.

Guest learning should not require email, name, address, BSN, passport details, immigration status or church affiliation.

## 4. Account data — future

When accounts are introduced, collect only what is needed for authentication and sync.

Initial target fields:

- account ID;
- email address or selected authentication identifier;
- authentication-provider identifiers/tokens as technically required;
- account creation / security timestamps;
- synchronized learning progress.

Do not collect full date of birth, postal address, BSN, nationality, immigration route, religion or employer unless a separately documented product need and legal basis exists.

## 5. Learning data

Possible synchronized data:

- support language;
- self-selected level;
- lesson completion;
- FSRS scheduling state;
- saved vocabulary;
- quiz/listening results;
- learning activity timestamps;
- institutional cohort ID where applicable.

Do not describe self-selected or AI-recommended level as an official certification.

## 6. Voice / microphone

Current direction:

- microphone access only after user action;
- browser/local processing preferred;
- raw recordings not uploaded by default;
- if future pronunciation evaluation uploads audio, that must be clearly disclosed before recording/upload;
- define deletion timing for uploaded voice data;
- do not infer health, ethnicity, emotion, religion or other sensitive traits from voice.

## 7. Analytics

Privacy-first target:

- measure activation, retention and feature use with the minimum data needed;
- avoid cross-site advertising trackers;
- avoid selling user data;
- avoid building advertising profiles;
- institution reporting should be aggregated by default.

Before analytics launch document:

- tool/provider;
- cookies/local identifiers used;
- purpose;
- legal basis;
- retention;
- opt-out/consent requirements.

## 8. Payments — future

Payment details should be handled by the payment provider where possible.

The product should store only billing/subscription references needed to manage access and accounting, rather than raw card data.

Processor list must include the chosen payment provider before paid launch.

## 9. Institutional customers

For schools, employers, foundations or municipalities:

- define controller/processor roles per contract;
- provide a Data Processing Agreement when acting as processor;
- isolate organisation/tenant data;
- only expose learner-level reporting when contractually needed and legally justified;
- aggregated engagement reporting is preferred for pilots;
- define offboarding/export/deletion when an institution contract ends.

## 10. Children / minors

Do not market the first commercial release specifically to children until age/consent requirements, school deployments and parental/legal bases have been separately reviewed.

If schools later use the product with minors, create a dedicated education/minor privacy assessment.

## 11. Data retention

Retention schedule must be filled before account launch.

Suggested design questions:

- inactive free account deletion/anonymisation period;
- paid-account accounting retention vs learning-data retention;
- deleted-account grace period;
- institutional learner offboarding;
- security logs;
- support tickets;
- uploaded voice recordings.

Local guest data remains under the user's browser/device controls unless synced.

## 12. User rights / product controls

Account edition should support:

- export learning data;
- delete account;
- correct basic profile data;
- disconnect institutional affiliation where appropriate;
- unsubscribe from marketing independently from service email;
- contact privacy support.

## 13. Security commitments

Before institutional launch document at least:

- encryption in transit;
- credential/auth handling;
- access control;
- tenant separation;
- backups;
- incident response;
- admin access logging;
- subprocessors;
- data hosting region.

## 14. Product/church separation

The following must remain separate unless the learner explicitly uses two unrelated services and each service has its own legal basis:

- church member lists;
- pastoral notes;
- prayer requests;
- donations;
- attendance;
- ministry/volunteer information;
- product learning accounts;
- product billing;
- institutional cohorts.

The product must not use church affiliation or religious data for product personalization, advertising, pricing or institutional reporting.

## 15. Publication gate

Do not publish this skeleton as a final privacy notice until:

- independent brand selected;
- controller legal identity confirmed;
- domain purchased;
- auth provider selected;
- hosting/data location confirmed;
- email provider confirmed;
- analytics choice confirmed;
- payment provider confirmed if paid;
- retention schedule completed;
- subprocessors listed;
- Dutch/English public versions reviewed.
