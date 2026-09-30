# Network+ quizzes — project context

Read with `/root/.claude/CLAUDE.md`, which sets the rules and wins over this
file: push to GitHub after each verified change, AAA contrast on painted
pixels, objectives from the owner's Google Doc, 20+ questions per topic.

## What this is

A static Network+ (N10-009 / V9) practice site: `index.html` (dashboard and
quick quizzes), `custom.html` (the Full Custom Quiz setup), `quiz.html`
(runner and results). The topic list and question bank are in
`assets/questions.js`, three lines long:

1. a comment
2. `window.OBJECTIVES`
3. `window.QUESTION_BANK`

Both are single-line JSON. Question ids are integers. GitHub Pages serves
`main`.

**Never run `tools/build-questions.mjs`.** It rebuilds the bank from the
legacy `Net + Day *.html` files and would wipe out the topic filing, the
answer-key fixes and every question added since.

## Topics (30 September 2026)

- **Source:** the 34 topics come from the owner's "All updated Objectives" doc
  (Network+ V9), numbered in its order. They are not CompTIA's numbers.
- **Filing:** all 670 questions were read and filed one by one. The owner saw
  the preview first and approved it.
- **Removed:** 20 questions tagged "6.1", ids 650–653 and 655–670. They were
  A+ Core 1 hardware questions (printers, RAID, cables, mobile), and the owner
  said "Remove them."
  - 654 (PAT) is kept: it is a genuine Network+ question, now under 2.1.
- **Question format** for new questions:
  - four options, with `correctIndex` varied
  - an `optionExplanations` entry for every option, and an `explanation`
    equal to the correct option's
  - the `domain`, `objectiveId` and `objective` of its topic
  - a `source` note saying it was written for the doc topic
  - stays inside the items the doc names for that topic
- **The floor:** each short topic is topped up to 25 (the 20 floor plus the
  standing five extra scenarios).
  - Topics still short are listed in `PENDING` in `verify/objectives.mjs`.
  - Take a topic off that list in the same commit that fills it; the check
    fails if a PENDING topic has reached 20.
  - The owner set the order: Network security (4.x) first, then the rest.
  - Ids 650–653 and 655–670 are retired; new questions start at 671.
- **Batches written:**
  - 30 Sept 2026, Network security: 145 questions, ids 671–815. 4.1 +15,
    4.2 +25, 4.3 +24, 4.4 +24, 4.5 +24, 4.6 +22, 4.8 +11, so every 4.x topic
    is at 25 (4.7 already had 31).
    - Distractors are near misses.
    - Option lengths are balanced: the right answer is the longest option in
    35 of 145, which is about chance.
  - Still to write: 1.5 +24, 1.7 +15, 1.8 +6, 2.2 +6, 2.4 +7, 3.2 +24,
    3.3 +24, 3.4 +23, 3.8 +20, 5.1 +10, 5.4 +14 (173 questions).

## Checks: `verify/` (need Playwright; not needed to run the site)

- `node verify/objectives.mjs`
  - Checks the bank against `verify/objectives-netplus-2026-09-30.md` (the
    doc, verbatim).
  - Drives `custom.html`.
  - Checks that no removed A+ id is reused, and plays a quiz on the newest
    topics, answering right and confirming each one is marked right.
  - `--plant` runs 17 plants.
- `node verify/retake.mjs`
  - Drives "Retake the ones I missed" end to end.
  - `--plant` runs 7 plants.
- `node verify/answers.mjs`
  - Checks that no wrong option carries the explanation, and that the three
    keys fixed on 30 Sept (169, 173, 175) are right on the page.
  - `--plant` runs 4 plants.

## Known, not yet fixed

- **Contrast:** the standard buttons measure about 2.8:1, under the AAA
  floor. The fix is a colour change, so it needs a preview for the owner
  first.
- **Footer:** it reads "Network+ Practice Hub · For educational purposes
  only · Not affiliated with CompTIA", which is shorter than the program's
  short form. It is waiting for the owner's go-ahead to change it.
