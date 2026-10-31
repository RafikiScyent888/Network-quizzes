(function () {
  const params = new URLSearchParams(window.location.search);
  const isResume = params.get("resume") === "1";

  let state = null;

  // The questions for a new quiz, by mode: a quick or custom quiz draws from
  // the chosen objectives; "missed" is the whole lasting Missed list; "topic"
  // is "Practise this topic" (its missed questions first, up to 25 in all).
  function buildFor(config) {
    if (config.mode === "missed") {
      const pool = TB.missedList().map(TB.question);
      return NQ.buildQuizQuestions(pool, pool.length, TB.shuffleOn());
    }
    if (config.mode === "topic") {
      const pool = TB.topicPick(config.topic).map(TB.question);
      return NQ.buildQuizQuestions(pool, pool.length, TB.shuffleOn(), true);
    }
    const pool = NQ.poolForObjectives(config.objectiveIds);
    const count = Math.min(config.count, pool.length);
    return NQ.buildQuizQuestions(pool, count, TB.shuffleOn());
  }

  function init() {
    if (isResume) {
      state = NQ.loadPaused();
      if (!state) { window.location.href = "index.html"; return; }
    } else {
      const config = NQ.loadConfig();
      if (!config) { window.location.href = "index.html"; return; }
      const questions = buildFor(config);
      if (!questions.length) { window.location.href = "index.html"; return; }
      state = {
        config,
        questions,
        answers: new Array(questions.length).fill(null),
        currentIndex: 0,
        finished: false,
        filter: "all",
        startedAt: Date.now(),
      };
    }
    if (!state.filter) state.filter = "all";
    TB.ensureDialog();
    TB.initEasier();
    applyTheme(state.config.theme);
    if (state.finished) {
      renderResults();
    } else {
      renderQuiz();
    }
  }

  function applyTheme(themeClass) {
    document.querySelectorAll(".theme-bar").forEach((el) => {
      el.classList.remove("theme-lightning", "theme-fire", "theme-storm", "theme-sun", "theme-green");
      el.classList.add(themeClass || "theme-green");
    });
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function correctCount() {
    return state.questions.reduce(
      (acc, q, i) => acc + (state.answers[i] === q.correctIndex ? 1 : 0), 0
    );
  }
  function answeredCount() {
    return state.answers.filter((a) => a !== null && a !== undefined).length;
  }
  // Where each question stands: 'right', 'wrong' or 'none'.
  function states() {
    return state.questions.map((q, i) => {
      const a = state.answers[i];
      if (a === null || a === undefined) return "none";
      return a === q.correctIndex ? "right" : "wrong";
    });
  }
  const items = () => state.questions.map((q) => ({ id: q.id, sub: q.objectiveId }));

  // Turning Shuffle order on or off part-way through keeps every answer given
  // and stays on the same question.
  function reorder(mix) {
    const curId = state.questions[state.currentIndex].id;
    const chosen = new Map(state.questions.map((q, i) => {
      const a = state.answers[i];
      return [q.id, a === null || a === undefined ? null : (q.order ? q.order[a] : a)];
    }));
    const pool = state.questions.map((q) => TB.question(q.id));
    const qs = NQ.buildQuizQuestions(pool, pool.length, mix, true);
    state.questions = qs;
    state.answers = qs.map((q) => { const o = chosen.get(q.id); return o === null ? null : q.order.indexOf(o); });
    state.currentIndex = qs.findIndex((q) => q.id === curId);
  }

  function quizUnderway() {
    return !state.finished && state.answers.some((a) => a !== null && a !== undefined) && state.answers.some((a) => a === null || a === undefined);
  }
  async function leaveThenStart(start) {
    if (quizUnderway()) {
      const ok = await TB.askConfirm({
        title: "Leave the quiz you are on?",
        body: `You have answered ${answeredCount()} of ${state.questions.length} questions. Starting something new ends this quiz here. Every answer you gave is already counted in your Missed list.`,
        yes: "Leave and start", no: "Stay on this quiz",
      });
      if (!ok) return;
    }
    start();
  }

  async function resetQuiz() {
    const n = state.questions.length;
    const ok = await TB.askConfirm({
      title: "Reset this quiz?",
      body: `Your answers to these ${n} questions are cleared and you start again at question 1${TB.shuffleOn() ? ", in a new order" : ""}. Your Missed list stays as it is.`,
      yes: "Reset this quiz", no: "Keep my answers",
    });
    if (!ok) return;
    const pool = state.questions.map((q) => TB.question(q.id));
    state.questions = NQ.buildQuizQuestions(pool, pool.length, TB.shuffleOn(), true);
    state.answers = new Array(pool.length).fill(null);
    state.currentIndex = 0;
    state.finished = false;
    state.filter = "all";
    renderQuiz("q");
  }

  function banner() {
    const round = state.round || 1;
    if (round > 1) return `<div class="retake-banner" role="note"><strong>Retake round ${round - 1}</strong> &mdash; only the questions you missed last time.</div>`;
    if (state.config.mode === "missed") return `<div class="retake-banner" role="note"><strong>Your Missed list</strong> &mdash; every question you have answered wrong and not yet answered right. Each one you get right comes off the list.</div>`;
    if (state.config.mode === "topic") return `<div class="retake-banner" role="note"><strong>Practising ${TB.topicText(state.config.topic)}</strong> &mdash; every question you have missed on this topic is included.</div>`;
    return "";
  }

  // ---------------- Quiz view ----------------

  function renderQuiz(focus) {
    const root = document.getElementById("app");
    const total = state.questions.length;
    const st = states();
    const its = items();
    let vis = TB.visibleIn(its, st, state.filter);
    if (!vis.length) { state.filter = "all"; vis = TB.visibleIn(its, st, "all"); }
    if (vis.indexOf(state.currentIndex) < 0) state.currentIndex = vis[0];
    const idx = state.currentIndex;
    const q = state.questions[idx];
    const answered = state.answers[idx];
    const alreadyAnswered = answered !== null && answered !== undefined;
    const review = !!state.finished;
    const k = vis.indexOf(idx), prevPos = vis[k - 1], nextPos = vis[k + 1];
    const pct = Math.round((answeredCount() / total) * 100);
    const nTopics = TB.topicsIn(its).length;
    const nNew = its.filter((x) => TB.isNew(TB.question(x.id))).length;
    const nextLabel = nextPos !== undefined ? "Next &rarr;" : state.filter !== "all" ? "Show all questions" : review ? "Back to results" : "Finish &amp; See Results";

    root.innerHTML = `
      <div class="theme-bar">
        <h2>${NQ.escapeHtml(state.config.label)}${review ? " &mdash; review" : ""}</h2>
        <div style="display:flex; gap:8px;">
          <div class="pill">Question ${idx + 1} / ${total}</div>
          <div class="pill">Score: ${correctCount()} / ${answeredCount()}</div>
        </div>
      </div>
      ${banner()}
      <div class="quiz-grid">
        <div class="main-col">
          <div class="card tb-head">
            <p class="intro">${total} question${total === 1 ? "" : "s"} in ${nTopics} colour-coded topic${nTopics === 1 ? "" : "s"}${nNew ? `, ${nNew} of them new for the updated objectives` : ""}. ${review ? "Choose a question to see your answer and why." : "Choose an answer to see whether you&rsquo;re right and why."}</p>
            ${TB.partsHtml(its, st, state.filter)}
            <div class="chips-row">
              ${TB.chipsHtml(its, st, state.filter)}
              ${review ? "" : TB.shuffleBox("shuffleQuiz", false)}
            </div>
          </div>
          ${TB.mapHtml(its, st, vis, idx, review, state.mapOpen)}
          <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="card">
            <span class="objective-tag">${q.objectiveId} &middot; ${NQ.escapeHtml(q.objective)}</span>
            <div class="question-text" id="qtext" tabindex="-1">${NQ.escapeHtml(q.question)}</div>
            <div class="option-list" id="optionList"></div>
          </div>
          <div class="quiz-controls">
            <div class="left">
              ${review ? '<button class="btn secondary" id="backBtn">Back to results</button>' : '<button class="btn secondary" id="pauseBtn">⏸ Pause &amp; Exit</button>'}
              <button class="btn ghost" id="prevBtn" ${prevPos === undefined ? "disabled" : ""}>&larr; Previous</button>
            </div>
            <div class="right">
              <button class="btn" id="primaryBtn" disabled>${alreadyAnswered || review ? nextLabel : "Submit Answer"}</button>
            </div>
          </div>
        </div>
        <aside class="side-col" aria-label="Your score and what to study">
          ${TB.scorePanel(its, st)}
          ${TB.studyPanel()}
          ${TB.panelButtons(true)}
        </aside>
      </div>
    `;
    applyTheme(state.config.theme);

    const optionList = document.getElementById("optionList");
    const locked = alreadyAnswered || review;
    let selected = alreadyAnswered ? answered : null;

    q.options.forEach((opt, i) => {
      const isCorrect = i === q.correctIndex;
      const isSelected = i === selected;
      const row = el(`
        <label class="option ${isSelected ? "selected" : ""} ${locked && isCorrect ? "correct" : ""} ${locked && isSelected && !isCorrect ? "incorrect" : ""} ${locked ? "reveal" : ""}">
          <input type="radio" name="opt" value="${i}" ${isSelected ? "checked" : ""} ${locked ? "disabled" : ""} />
          <span>
            <div>${NQ.escapeHtml(opt)}</div>
            <div class="why">${NQ.escapeHtml(q.optionExplanations[i])}</div>
          </span>
        </label>
      `);
      if (!locked) {
        row.addEventListener("click", () => {
          selected = i;
          [...optionList.children].forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
          document.getElementById("primaryBtn").disabled = false;
        });
      }
      optionList.appendChild(row);
    });
    if (review && !alreadyAnswered) {
      optionList.insertAdjacentHTML("beforebegin", `<p class="not-answered"><strong>Not answered.</strong> This quiz was finished before this question was answered.</p>`);
    }

    const go = (pos) => { state.currentIndex = pos; renderQuiz("q"); };
    const primaryBtn = document.getElementById("primaryBtn");
    if (locked) primaryBtn.disabled = false;

    primaryBtn.addEventListener("click", () => {
      if (!locked) {
        if (selected === null || selected === undefined) return;
        state.answers[idx] = selected;
        TB.recordAnswer(q.id, selected === q.correctIndex);
        renderQuiz("primary"); // re-render in revealed state
        return;
      }
      if (nextPos !== undefined) { go(nextPos); return; }
      if (state.filter !== "all") {
        state.filter = "all";
        const firstOpen = states().indexOf("none");
        go(review || firstOpen < 0 ? idx : firstOpen);
        return;
      }
      if (review) renderResults();
      else finishQuiz();
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      if (prevPos !== undefined) go(prevPos);
    });

    if (review) {
      document.getElementById("backBtn").addEventListener("click", () => renderResults());
    } else {
      document.getElementById("pauseBtn").addEventListener("click", () => {
        NQ.savePaused(state);
        window.location.href = "index.html";
      });
      TB.wireShuffle("shuffleQuiz", (on) => { reorder(on); renderQuiz("#shuffleQuiz"); });
    }
    wireMapAndChips(root, true);
    TB.wirePanel(root, leaveThenStart, resetQuiz);
    TB.fitParts();

    if (focus === "q") {
      const t = document.getElementById("qtext");
      t.focus({ preventScroll: true });
      const r = t.closest(".card").getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight - 140) t.closest(".card").scrollIntoView({ block: "start" });
    } else if (focus === "primary") {
      primaryBtn.focus({ preventScroll: true });
    } else if (focus) {
      const f = root.querySelector(focus);
      if (f) f.focus({ preventScroll: true });
    }
  }

  function wireMapAndChips(root, inQuiz) {
    root.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.filter;
      state.filter = (state.filter === f && f !== "all") ? "all" : f;  // pressing a chosen chip again shows all
      const v = TB.visibleIn(items(), states(), state.filter);
      if (v.indexOf(state.currentIndex) < 0) state.currentIndex = v[0];
      renderQuiz((b.classList.contains("seg") ? ".seg" : ".chip") + `[data-filter="${f}"]`);
    }));
    root.querySelectorAll(".qtile").forEach((b) => b.addEventListener("click", () => {
      state.currentIndex = parseInt(b.dataset.pos, 10);
      renderQuiz("q");
    }));
    const det = document.getElementById("qmap");
    if (det) det.addEventListener("toggle", () => { state.mapOpen = det.open; });
  }

  async function finishQuiz() {
    const st = states();
    const left = st.filter((x) => x === "none").length;
    if (left) {
      const ok = await TB.askConfirm({
        title: `Finish with ${left} unanswered?`,
        body: `${left} question${left === 1 ? " is" : "s are"} not answered yet. Unanswered questions count as wrong in your score and are offered again in "Retake the ones I missed", but they are not added to your Missed list.`,
        yes: "Finish anyway", no: "Go to the first unanswered",
      });
      if (!ok) {
        state.filter = "all";
        state.currentIndex = st.indexOf("none");
        renderQuiz("q");
        return;
      }
    }
    state.finished = true;
    NQ.clearPaused();
    renderResults();
  }

  // ---------------- Results view ----------------

  function renderResults() {
    const root = document.getElementById("app");
    const total = state.questions.length;
    const correct = correctCount();
    const score100 = Math.round((correct / total) * 100);

    const missed = state.questions
      .map((q, i) => ({ q, i, ans: state.answers[i] }))
      .filter((x) => x.ans !== x.q.correctIndex);

    const round = state.round || 1;
    const missedIds = missed.map((x) => x.q.id);
    state.filter = "all";
    const st = states(), its = items();
    const listEmpty = round === 1 && state.config.mode === "missed" && missed.length === 0 && TB.missedList().length === 0;
    root.innerHTML = `
      <div class="theme-bar">
        <h2>${NQ.escapeHtml(state.config.label)} &mdash; Results${round > 1 ? ` &mdash; retake round ${round - 1}` : ""}</h2>
      </div>
      ${round > 1 && missed.length === 0 ? `<div class="retake-banner" role="status"><strong>Every one right.</strong> You have now answered every question you missed on your original quiz correctly.</div>` : ""}
      ${listEmpty ? `<div class="retake-banner" role="status"><strong>Every one right.</strong> Your Missed list is empty.</div>` : ""}
      <div class="quiz-grid">
        <div class="main-col">
          <div class="card score-hero">
            <div class="big-score">${score100}<span>/100</span></div>
            <p style="color:#475569; margin:6px 0 0;">${correct} of ${total} correct</p>
          </div>
          <div class="results-actions">
            ${missed.length ? `<button class="btn retake-missed" id="retakeMissedBtn">Retake the ${missed.length} I missed</button>` : ""}
            <button class="btn" id="retakeBtn">🔀 Retake (New Random Set)</button>
            <a href="index.html" class="btn ghost" id="dashboardBtn">Back to Dashboard</a>
          </div>
          ${missed.length ? `<p class="retake-note">&ldquo;Retake the ${missed.length} I missed&rdquo; gives you only the questions you got wrong or didn&rsquo;t answer${TB.shuffleOn() ? ", in a new order with the answers reshuffled" : ""}. You can keep retaking until you&rsquo;ve got every one right.</p>` : ""}
          ${TB.mapHtml(its, st, its.map((_, i) => i), -1, true, state.mapOpen)}
          ${missed.length ? `
          <div class="card">
            <h3 style="margin-top:0;">Review Missed Questions (${missed.length})</h3>
            <div id="missedList"></div>
          </div>` : `<div class="card"><p style="margin:0;">🎉 No missed questions &mdash; perfect score!</p></div>`}
        </div>
        <aside class="side-col" aria-label="Your score and what to study">
          ${TB.scorePanel(its, st)}
          ${TB.studyPanel()}
          ${TB.panelButtons(true)}
        </aside>
      </div>
    `;
    applyTheme(state.config.theme);

    if (missed.length) {
      const missedList = document.getElementById("missedList");
      missed.forEach(({ q, ans }) => {
        const yourAnswerText = ans !== null && ans !== undefined ? q.options[ans] : "(not answered)";
        const yourWhy = ans !== null && ans !== undefined ? q.optionExplanations[ans] : "You did not answer this question in time.";
        missedList.appendChild(el(`
          <div class="missed-item">
            <div><span class="objective-tag">${q.objectiveId} &middot; ${NQ.escapeHtml(q.objective)}</span></div>
            <div style="margin-top:6px;"><b>${NQ.escapeHtml(q.question)}</b></div>
            <div class="your-answer">Your answer: ${NQ.escapeHtml(yourAnswerText)} &mdash; ${NQ.escapeHtml(yourWhy)}</div>
            <div class="correct-answer">Correct answer: ${NQ.escapeHtml(q.options[q.correctIndex])} &mdash; ${NQ.escapeHtml(q.optionExplanations[q.correctIndex])}</div>
          </div>
        `));
      });
    }

    // Retake the missed: a new round of only the questions missed this round
    // (wrong or unanswered), in a new order when Shuffle order is on. Rounds
    // repeat until nothing is left to retake.
    const retakeMissedBtn = document.getElementById("retakeMissedBtn");
    if (retakeMissedBtn) retakeMissedBtn.addEventListener("click", () => {
      const ids = new Set(missedIds);
      const pool = window.QUESTION_BANK.filter((q) => ids.has(q.id));
      state = {
        config: state.config,
        questions: NQ.buildQuizQuestions(pool, pool.length, TB.shuffleOn()),
        answers: new Array(pool.length).fill(null),
        currentIndex: 0,
        finished: false,
        round: round + 1,
        filter: "all",
        startedAt: Date.now(),
      };
      renderQuiz();
    });

    document.getElementById("retakeBtn").addEventListener("click", () => {
      const questions = buildFor(state.config);
      state = {
        config: state.config,
        questions,
        answers: new Array(questions.length).fill(null),
        currentIndex: 0,
        finished: false,
        filter: "all",
        startedAt: Date.now(),
      };
      renderQuiz();
    });

    root.querySelectorAll(".qtile").forEach((b) => b.addEventListener("click", () => {
      state.currentIndex = parseInt(b.dataset.pos, 10);
      renderQuiz("q");
    }));
    const det = document.getElementById("qmap");
    if (det) det.addEventListener("toggle", () => { state.mapOpen = det.open; });
    TB.wirePanel(root, (fn) => fn(), resetQuiz);
  }

  // A read-only copy of the quiz in progress, for verify/scorecard.mjs (the quiz
  // lives in memory until Pause, so the check reads it here).
  window.quizState = () => JSON.parse(JSON.stringify(state));

  document.addEventListener("DOMContentLoaded", init);
})();
