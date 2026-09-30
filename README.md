# Network+ Practice Hub

A mobile-friendly, static web app for practicing CompTIA Network+ (N10-009)
style questions. Open `index.html` (or serve the folder) to use it — no
build step, no backend, no dependencies.

**⚠️ Educational use only.** Not affiliated with, endorsed by, or sponsored
by CompTIA. CompTIA and Network+ are trademarks of CompTIA, Inc.

## Topics

The quiz's 34 topics come from the instructor's objectives list for
Network+ (V9), numbered in its order: domain 1.0 Networking Concepts holds
topics 1.1–1.9, and so on. The list gives no official sub-objective numbers,
so these numbers are this site's, not CompTIA's. A verbatim copy of the list
is in `verify/objectives-netplus-2026-09-30.md`.

Every question was read and filed under the topic it actually tests
(30 September 2026). Every topic has at least 20 questions; each topic that was short was topped up
to 25.

## What's here

- `index.html` — dashboard with 5 themed tiles: four Quick Quizzes
  (10 / 15 / 20 / 25 questions, all topics) plus the Full Custom Quiz.
- `custom.html` — pick 45–245 questions and choose which topics to include
  (all are selected by default).
- `quiz.html` — the quiz runner and results screen (score out of 100,
  per-topic breakdown, review of missed questions with explanations for both
  the correct and incorrect answers, and "Retake the ones I missed").
- `assets/questions.js` — the topic list (`window.OBJECTIVES`) and the
  question bank (`window.QUESTION_BANK`, 968 questions). Edit it directly.
  **Do not regenerate it** with `tools/build-questions.mjs`: that script
  rebuilds from the legacy files below and would throw away the topic
  filing and every question added since.
- `assets/common.js`, `assets/quiz.js`, `assets/style.css` — app logic and
  styling.
- `Net + Day *.html`, `Net + Review*.html` — the original standalone quiz
  files this site's question bank was first built from. Kept for reference.
- `verify/` — checks run before each change goes live (need Playwright; not
  needed to run the site). Each has a `--plant` mode that proves it can fail.
  - `objectives.mjs` — the topics match the list, every question is filed
    and well formed, every finished topic has 20+.
  - `retake.mjs` — the retake of missed questions, end to end.
  - `answers.mjs` — every answer key agrees with its explanation.

## Features

- Questions and answer order are re-randomized every attempt.
- Pause a quiz at any time — it's saved in your browser and a "Resume"
  banner appears on the dashboard next time you visit.
- Every answer choice, right or wrong, shows an explanation.
- Score is always shown out of 100, regardless of quiz length.
- After any quiz, retake just the questions you missed or skipped, round
  after round, until every one is right.
