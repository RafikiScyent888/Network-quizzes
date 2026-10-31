// Shared helpers used by index.html, custom.html, and quiz.html.
(function () {
  const STORAGE = {
    config: "nq_config",       // sessionStorage: {mode, count, objectiveIds, theme, label}
    paused: "nq_paused_state", // localStorage: full in-progress quiz snapshot
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function lowerFirst(s) {
    return s.length ? s[0].toLowerCase() + s.slice(1) : s;
  }

  // When the source data didn't include a hand-written explanation for a
  // specific wrong option, synthesize one from the correct answer's
  // explanation so every option still gets "why" feedback.
  function optionExplanationsFor(q) {
    if (q.optionExplanations) return q.optionExplanations;
    const correctText = q.options[q.correctIndex];
    return q.options.map((opt, idx) => {
      if (idx === q.correctIndex) return q.explanation;
      return `Incorrect — "${opt}" does not fit this scenario. The correct answer is "${correctText}" because ${lowerFirst(q.explanation)}`;
    });
  }

  // Builds a quiz: picks `count` questions at random from the pool (or the
  // first `count` when `prepicked`). With Shuffle order on (`mix`, the
  // default) the questions come in a random order and each question's answers
  // are shuffled too; off, they come in the bank's order with the answers as
  // written. `order` keeps each answer's place in the bank's question.
  function buildQuizQuestions(pool, count, mix = true, prepicked = false) {
    let picked = prepicked ? pool.slice(0, count) : shuffle(pool).slice(0, count);
    if (mix && prepicked) picked = shuffle(picked);
    if (!mix) {
      const pos = new Map(window.QUESTION_BANK.map((q, i) => [q.id, i]));
      picked = picked.slice().sort((a, b) => pos.get(a.id) - pos.get(b.id));
    }
    return picked.map((q) => {
      const optionExplanations = optionExplanationsFor(q);
      const order = mix ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i);
      return {
        id: q.id,
        question: q.question,
        domain: q.domain,
        objectiveId: q.objectiveId,
        objective: q.objective,
        options: order.map((i) => q.options[i]),
        optionExplanations: order.map((i) => optionExplanations[i]),
        correctIndex: order.indexOf(q.correctIndex),
        order,
      };
    });
  }

  function poolForObjectives(objectiveIds) {
    const set = new Set(objectiveIds);
    return window.QUESTION_BANK.filter((q) => set.has(q.objectiveId));
  }

  function saveConfig(cfg) {
    sessionStorage.setItem(STORAGE.config, JSON.stringify(cfg));
  }
  function loadConfig() {
    const raw = sessionStorage.getItem(STORAGE.config);
    return raw ? JSON.parse(raw) : null;
  }

  function savePaused(state) {
    localStorage.setItem(STORAGE.paused, JSON.stringify(state));
  }
  // Security+ used to save its paused quiz under this same key (both sites
  // live at rafikiscyent888.github.io). A paused quiz whose questions are not all
  // this bank's belongs to another site: ignore it, never resume it here.
  function loadPaused() {
    const raw = localStorage.getItem(STORAGE.paused);
    if (!raw) return null;
    let s = null;
    try { s = JSON.parse(raw); } catch (e) { return null; }
    const mine = new Map(window.QUESTION_BANK.map((q) => [q.id, q.question]));
    if (!s || !Array.isArray(s.questions) || !s.questions.length || !s.questions.every((q) => mine.get(q.id) === q.question)) return null;
    return s;
  }
  function clearPaused() {
    localStorage.removeItem(STORAGE.paused);
  }

  function renderDisclaimer() {
    return `<div class="disclaimer">
      <strong>Educational use only.</strong> This site is a self-study practice tool built from
      original study questions. It is not affiliated with, endorsed by, or sponsored by CompTIA®.
      CompTIA and Network+ are trademarks of CompTIA, Inc. Objective tagging is an informal study
      aid, not an official exam blueprint — always confirm current exam content on comptia.org.
    </div>`;
  }

  function renderFooter() {
    return `<footer class="site-footer">
      Network+ Practice Hub &middot; For educational purposes only &middot; Not affiliated with CompTIA
    </footer>`;
  }

  function renderResumeBanner(targetElId) {
    const el = document.getElementById(targetElId);
    if (!el) return;
    const state = loadPaused();
    if (!state) { el.innerHTML = ""; return; }
    const total = state.questions.length;
    const answered = state.answers.filter((a) => a !== null && a !== undefined).length;
    el.innerHTML = `
      <div class="resume-banner">
        <div class="text">
          You have a paused quiz &mdash; <b>${escapeHtml(state.config.label)}</b>
          (question ${Math.min(state.currentIndex + 1, total)} of ${total}, ${answered} answered).
        </div>
        <div class="actions">
          <button class="btn" id="resumeBtn">Resume Quiz</button>
          <button class="btn danger" id="discardBtn">Discard</button>
        </div>
      </div>`;
    document.getElementById("resumeBtn").addEventListener("click", () => {
      window.location.href = "quiz.html?resume=1";
    });
    document.getElementById("discardBtn").addEventListener("click", () => {
      if (confirm("Discard your paused quiz? This cannot be undone.")) {
        clearPaused();
        renderResumeBanner(targetElId);
      }
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  window.NQ = {
    shuffle, buildQuizQuestions, poolForObjectives,
    saveConfig, loadConfig, savePaused, loadPaused, clearPaused,
    renderDisclaimer, renderFooter, renderResumeBanner, escapeHtml,
  };
})();
