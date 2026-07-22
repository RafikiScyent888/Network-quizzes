# Network+ Practice Hub

A mobile-friendly, static web app for practicing CompTIA Network+ (N10-009)
style questions. Open `index.html` (or serve the folder) to use it — no
build step, no backend, no dependencies.

**⚠️ Educational use only.** Not affiliated with, endorsed by, or sponsored
by CompTIA. CompTIA and Network+ are trademarks of CompTIA, Inc. The
objective tagging here is an informal study aid, not an official exam
blueprint.

## What's here

- `index.html` — dashboard with 5 themed tiles: four Quick Quizzes
  (10 / 15 / 20 / 25 questions, all objectives) plus the Full Custom Quiz.
- `custom.html` — pick 45–245 questions and choose which objectives to
  include (all are selected by default).
- `quiz.html` — the quiz runner and results screen (score out of 100,
  per-objective breakdown, review of missed questions with explanations
  for both the correct and incorrect answers).
- `assets/questions.js` — the generated question bank (507 questions)
  tagged by objective. Regenerate it with `node tools/build-questions.mjs`
  after editing any of the legacy `Net + Day *.html` source files.
- `assets/common.js`, `assets/quiz.js`, `assets/style.css` — app logic and
  styling.
- `Net + Day *.html`, `Net + Review*.html` — the original standalone quiz
  files this site's question bank was built from. Kept for reference.

## Features

- Questions and answer order are re-randomized every attempt.
- Pause a quiz at any time — it's saved in your browser and a "Resume"
  banner appears on the dashboard next time you visit.
- Every answer choice, right or wrong, shows an explanation.
- Score is always shown out of 100, regardless of quiz length.
