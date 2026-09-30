(function () {
  const params = new URLSearchParams(window.location.search);
  const isResume = params.get("resume") === "1";

  let state = null;

  function init() {
    if (isResume) {
      state = NQ.loadPaused();
      if (!state) { window.location.href = "index.html"; return; }
    } else {
      const config = NQ.loadConfig();
      if (!config) { window.location.href = "index.html"; return; }
      const pool = NQ.poolForObjectives(config.objectiveIds);
      const count = Math.min(config.count, pool.length);
      state = {
        config,
        questions: NQ.buildQuizQuestions(pool, count),
        answers: new Array(count).fill(null),
        currentIndex: 0,
        finished: false,
        startedAt: Date.now(),
      };
    }
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

  // ---------------- Quiz view ----------------

  function renderQuiz() {
    const root = document.getElementById("app");
    const total = state.questions.length;
    const idx = state.currentIndex;
    const q = state.questions[idx];
    const answered = state.answers[idx];
    const pct = Math.round((idx / total) * 100);

    root.innerHTML = `
      <div class="theme-bar">
        <h2>${NQ.escapeHtml(state.config.label)}</h2>
        <div style="display:flex; gap:8px;">
          <div class="pill">Question ${idx + 1} / ${total}</div>
          <div class="pill">Score: ${correctCount()} / ${answeredCount()}</div>
        </div>
      </div>
      ${(state.round || 1) > 1 ? `<div class="retake-banner" role="note"><strong>Retake round ${state.round - 1}</strong> &mdash; only the questions you missed last time.</div>` : ""}
      <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="card">
        <span class="objective-tag">${q.objectiveId} &middot; ${NQ.escapeHtml(q.objective)}</span>
        <div class="question-text">${NQ.escapeHtml(q.question)}</div>
        <div class="option-list" id="optionList"></div>
      </div>
      <div class="quiz-controls">
        <div class="left">
          <button class="btn secondary" id="pauseBtn">⏸ Pause &amp; Exit</button>
          <button class="btn ghost" id="prevBtn" ${idx === 0 ? "disabled" : ""}>&larr; Previous</button>
        </div>
        <div class="right">
          <button class="btn" id="primaryBtn" disabled>${answered !== null && answered !== undefined ? (idx === total - 1 ? "Finish &amp; See Results" : "Next &rarr;") : "Submit Answer"}</button>
        </div>
      </div>
    `;
    applyTheme(state.config.theme);

    const optionList = document.getElementById("optionList");
    const alreadyAnswered = answered !== null && answered !== undefined;
    let selected = alreadyAnswered ? answered : null;

    q.options.forEach((opt, i) => {
      const isCorrect = i === q.correctIndex;
      const isSelected = i === selected;
      const row = el(`
        <label class="option ${isSelected ? "selected" : ""} ${alreadyAnswered && isCorrect ? "correct" : ""} ${alreadyAnswered && isSelected && !isCorrect ? "incorrect" : ""} ${alreadyAnswered ? "reveal" : ""}">
          <input type="radio" name="opt" value="${i}" ${isSelected ? "checked" : ""} ${alreadyAnswered ? "disabled" : ""} />
          <span>
            <div>${NQ.escapeHtml(opt)}</div>
            <div class="why">${NQ.escapeHtml(q.optionExplanations[i])}</div>
          </span>
        </label>
      `);
      if (!alreadyAnswered) {
        row.addEventListener("click", () => {
          selected = i;
          [...optionList.children].forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
          document.getElementById("primaryBtn").disabled = false;
        });
      }
      optionList.appendChild(row);
    });

    const primaryBtn = document.getElementById("primaryBtn");
    if (alreadyAnswered) primaryBtn.disabled = false;

    primaryBtn.addEventListener("click", () => {
      if (!alreadyAnswered && (selected === null || selected === undefined)) return;
      if (!alreadyAnswered) {
        state.answers[idx] = selected;
        renderQuiz(); // re-render in revealed state
        return;
      }
      if (idx === total - 1) {
        finishQuiz();
      } else {
        state.currentIndex++;
        renderQuiz();
      }
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      state.currentIndex = Math.max(0, idx - 1);
      renderQuiz();
    });

    document.getElementById("pauseBtn").addEventListener("click", () => {
      NQ.savePaused(state);
      window.location.href = "index.html";
    });
  }

  function finishQuiz() {
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

    const byObjective = {};
    state.questions.forEach((q, i) => {
      const key = q.objectiveId;
      if (!byObjective[key]) byObjective[key] = { label: q.objective, total: 0, correct: 0 };
      byObjective[key].total++;
      if (state.answers[i] === q.correctIndex) byObjective[key].correct++;
    });
    const objectiveIds = Object.keys(byObjective).sort();

    const missed = state.questions
      .map((q, i) => ({ q, i, ans: state.answers[i] }))
      .filter((x) => x.ans !== x.q.correctIndex);

    const round = state.round || 1;
    const missedIds = missed.map((x) => x.q.id);
    root.innerHTML = `
      <div class="theme-bar">
        <h2>${NQ.escapeHtml(state.config.label)} &mdash; Results${round > 1 ? ` &mdash; retake round ${round - 1}` : ""}</h2>
      </div>
      ${round > 1 && missed.length === 0 ? `<div class="retake-banner" role="status"><strong>Every one right.</strong> You have now answered every question you missed on your original quiz correctly.</div>` : ""}
      <div class="card score-hero">
        <div class="big-score">${score100}<span>/100</span></div>
        <p style="color:#475569; margin:6px 0 0;">${correct} of ${total} correct</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Score by Objective</h3>
        <div id="breakdown"></div>
      </div>
      ${missed.length ? `
      <div class="card">
        <h3 style="margin-top:0;">Review Missed Questions (${missed.length})</h3>
        <div id="missedList"></div>
      </div>` : `<div class="card"><p style="margin:0;">🎉 No missed questions &mdash; perfect score!</p></div>`}
      <div style="text-align:center; margin: 10px 0 20px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        ${missed.length ? `<button class="btn retake-missed" id="retakeMissedBtn">Retake the ${missed.length} I missed</button>` : ""}
        <button class="btn" id="retakeBtn">🔀 Retake (New Random Set)</button>
        <a href="index.html" class="btn ghost" id="dashboardBtn">Back to Dashboard</a>
      </div>
      ${missed.length ? `<p class="retake-note">&ldquo;Retake the ${missed.length} I missed&rdquo; gives you only the questions you got wrong or didn&rsquo;t answer, in a new order with the answers reshuffled. You can keep retaking until you&rsquo;ve got every one right.</p>` : ""}
    `;
    applyTheme(state.config.theme);

    const breakdown = document.getElementById("breakdown");
    objectiveIds.forEach((id) => {
      const o = byObjective[id];
      const pct = Math.round((o.correct / o.total) * 100);
      breakdown.appendChild(el(`
        <div class="breakdown-row">
          <span style="min-width:220px;">${id} &mdash; ${NQ.escapeHtml(o.label)}</span>
          <span class="breakdown-bar"><span class="breakdown-fill" style="width:${pct}%"></span></span>
          <span>${o.correct}/${o.total}</span>
        </div>
      `));
    });

    if (missed.length) {
      const missedList = document.getElementById("missedList");
      missed.forEach(({ q, ans }) => {
        const yourAnswerText = ans !== null && ans !== undefined ? q.options[ans] : "(not answered)";
        const yourWhy = ans !== null && ans !== undefined ? q.optionExplanations[ans] : "You did not answer this question in time.";
        missedList.appendChild(el(`
          <div class="missed-item">
            <div><b>${NQ.escapeHtml(q.question)}</b></div>
            <div class="your-answer">Your answer: ${NQ.escapeHtml(yourAnswerText)} &mdash; ${NQ.escapeHtml(yourWhy)}</div>
            <div class="correct-answer">Correct answer: ${NQ.escapeHtml(q.options[q.correctIndex])} &mdash; ${NQ.escapeHtml(q.optionExplanations[q.correctIndex])}</div>
          </div>
        `));
      });
    }

    // Retake the missed: a new round of only the questions missed this round
    // (wrong or unanswered), reshuffled, answers reshuffled too. Rounds repeat
    // until nothing is left to retake.
    const retakeMissedBtn = document.getElementById("retakeMissedBtn");
    if (retakeMissedBtn) retakeMissedBtn.addEventListener("click", () => {
      const ids = new Set(missedIds);
      const pool = window.QUESTION_BANK.filter((q) => ids.has(q.id));
      state = {
        config: state.config,
        questions: NQ.buildQuizQuestions(pool, pool.length),
        answers: new Array(pool.length).fill(null),
        currentIndex: 0,
        finished: false,
        round: round + 1,
        startedAt: Date.now(),
      };
      renderQuiz();
    });

    document.getElementById("retakeBtn").addEventListener("click", () => {
      const pool = NQ.poolForObjectives(state.config.objectiveIds);
      const count = Math.min(state.config.count, pool.length);
      state = {
        config: state.config,
        questions: NQ.buildQuizQuestions(pool, count),
        answers: new Array(count).fill(null),
        currentIndex: 0,
        finished: false,
        startedAt: Date.now(),
      };
      renderQuiz();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
