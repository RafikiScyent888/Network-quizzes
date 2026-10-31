// Score card, question map, filters and the lasting Missed list (31 October
// 2026), shared by index.html, custom.html and quiz.html. Built to the owner's
// decisions in "Test banks: score card, question map and filters (plan)".
(function () {
  // ---------- this site ----------
  const KEYS = {
    missed: "nq_missed_v1",           // the lasting Missed list: {id: {n: misses, at: when}}
    shuffle: "nq_shuffle_v1",         // Shuffle order: "1" on (the default), "0" off
    easier: "cwp-easier-reading",     // shared by every test bank on rafikiscyent888.github.io
  };
  // Questions written for the updated objectives (30 September 2026).
  const NEW_SOURCE = "written 30 Sept 2026";
  const NEW_CHIP = "New for the updated objectives";
  // "Review in CertMaster Learn" opens CompTIA's CertMaster Learn sign-in until
  // the owner confirms the address their students use. No lesson numbers: the
  // N10-009 lesson list is not public, so none are guessed.
  const CERTMASTER_URL = "https://learn.comptia.org/login";
  const TOPIC_Q = 25;   // questions in a "Practise this topic" quiz
  // Each topic's own colour: the rainbow, in topic order, chosen by the owner on
  // 31 October 2026, in deep shades for this light page. White lettering on
  // every one is over 7:1, and a colour always goes with its topic's number.
  const TOPIC_COLOR = {
    "1.1": "#8c364f", "1.2": "#711a2b", "1.3": "#8f3735", "1.4": "#721e0b", "1.5": "#8d3d15",
    "1.6": "#633004", "1.7": "#7e4a0a", "1.8": "#593800", "1.9": "#70520b",
    "2.1": "#4f3e00", "2.2": "#61580c", "2.3": "#414303", "2.4": "#535a41",
    "3.1": "#2c4a02", "3.2": "#376130", "3.3": "#014e21", "3.4": "#3c5e4c", "3.5": "#074b3a",
    "3.6": "#2a6056", "3.7": "#0a4a46", "3.8": "#255f62",
    "4.1": "#094851", "4.2": "#045f73", "4.3": "#05465d", "4.4": "#3b5b6f", "4.5": "#004271",
    "4.6": "#265698", "4.7": "#23397e", "4.8": "#484f9a",
    "5.1": "#3d317b", "5.2": "#5f4792", "5.3": "#502a71", "5.4": "#714085", "5.5": "#5e2361",
  };

  const OBJ = window.OBJECTIVES;
  const ALL = OBJ.map((o) => o.id);
  const LABEL = {};
  OBJ.forEach((o) => { LABEL[o.id] = o.label; });
  // Question ids are numbers; the Missed list keeps them as text (object keys),
  // so look-ups go by the id as text.
  const BY_ID = new Map(window.QUESTION_BANK.map((q) => [String(q.id), q]));

  const esc = (s) => NQ.escapeHtml(s == null ? "" : s);
  const question = (id) => BY_ID.get(String(id));
  const isNew = (q) => typeof q.source === "string" && q.source.indexOf(NEW_SOURCE) === 0;
  const topicText = (id) => `${id} ${esc(LABEL[id] || "")}`;
  const tc = (id) => `--tc:${TOPIC_COLOR[id] || "#334155"}`;
  const dot = (id) => `<span class="dot" style="${tc(id)}" aria-hidden="true"></span>`;

  // ---------- settings that last ----------
  function shuffleOn() { try { return localStorage.getItem(KEYS.shuffle) !== "0"; } catch (e) { return true; } }
  function setShuffle(on) { try { localStorage.setItem(KEYS.shuffle, on ? "1" : "0"); } catch (e) { /* storage off */ } }
  function shuffleBox(id, long) {
    return `<label class="${long ? "check" : "shuf"}"><input type="checkbox" id="${id}" ${shuffleOn() ? "checked" : ""}/> ${long ? "<span><strong>Shuffle order</strong>: the questions, and the answers within each question</span>" : "Shuffle order"}</label>`;
  }
  function wireShuffle(id, after) {
    const box = document.getElementById(id);
    if (box) box.addEventListener("change", () => { setShuffle(box.checked); if (after) after(box.checked); });
  }

  // ---------- the lasting Missed list ----------
  function loadMissed() {
    try {
      const m = JSON.parse(localStorage.getItem(KEYS.missed) || "{}");
      if (m && typeof m === "object" && !Array.isArray(m)) return m;
    } catch (e) { /* unreadable: start empty */ }
    return {};
  }
  function saveMissed(m) { try { localStorage.setItem(KEYS.missed, JSON.stringify(m)); } catch (e) { /* storage off */ } }
  function recordAnswer(id, right) {
    const m = loadMissed();
    if (right) delete m[id];
    else m[id] = { n: ((m[id] && m[id].n) || 0) + 1, at: new Date().toISOString() };
    saveMissed(m);
  }
  function missedList() { return Object.keys(loadMissed()).filter((k) => BY_ID.has(k)).map((k) => BY_ID.get(k).id); }
  // "Study these first": the topics in the Missed list, most missed first.
  function studyTopics() {
    const c = {};
    missedList().forEach((id) => { const s = question(id).objectiveId; c[s] = (c[s] || 0) + 1; });
    return ALL.filter((id) => c[id]).map((id) => ({ id, n: c[id] }))
      .sort((a, b) => b.n - a.n || ALL.indexOf(a.id) - ALL.indexOf(b.id));
  }
  // "Practise this topic": up to 25 of its questions, every missed one among them.
  function topicPick(sub) {
    const missed = new Set(missedList().map(String));
    const all = window.QUESTION_BANK.filter((q) => q.objectiveId === sub).map((q) => q.id);
    const first = NQ.shuffle(all.filter((id) => missed.has(String(id))));
    const rest = NQ.shuffle(all.filter((id) => !missed.has(String(id))));
    return first.concat(rest).slice(0, Math.max(TOPIC_Q, first.length));
  }

  // ---------- starting a quiz from the Missed list ----------
  function startMissedAll() {
    const n = missedList().length;
    if (!n) return;
    NQ.saveConfig({ mode: "missed", count: n, objectiveIds: ALL, theme: "theme-storm", label: `Your Missed list (${n} question${n === 1 ? "" : "s"})` });
    window.location.href = "quiz.html";
  }
  function startTopic(sub) {
    NQ.saveConfig({ mode: "topic", topic: sub, count: TOPIC_Q, objectiveIds: [sub], theme: "theme-green", label: `Practise ${sub} ${LABEL[sub] || ""}` });
    window.location.href = "quiz.html";
  }

  // ---------- confirm before anything that throws work away ----------
  function ensureDialog() {
    if (document.getElementById("confirmDlg")) return;
    const d = document.createElement("dialog");
    d.id = "confirmDlg"; d.className = "confirm";
    d.setAttribute("aria-labelledby", "confirmTitle"); d.setAttribute("aria-describedby", "confirmBody");
    d.innerHTML = `<h2 id="confirmTitle"></h2><p id="confirmBody"></p>
      <div class="dlg-actions"><button type="button" class="btn" id="confirmYes"></button><button type="button" class="btn ghost" id="confirmNo"></button></div>`;
    document.body.appendChild(d);
  }
  function askConfirm(o) {
    ensureDialog();
    return new Promise((resolve) => {
      const d = document.getElementById("confirmDlg");
      if (typeof d.showModal !== "function") { resolve(window.confirm(o.title + "\n\n" + o.body)); return; }
      const yes = document.getElementById("confirmYes"), no = document.getElementById("confirmNo");
      document.getElementById("confirmTitle").textContent = o.title;
      document.getElementById("confirmBody").textContent = o.body;
      yes.textContent = o.yes; no.textContent = o.no;
      let settled = false;
      const done = (v) => {
        if (settled) return; settled = true;
        d.removeEventListener("close", onClose); yes.onclick = null; no.onclick = null;
        if (d.open) d.close();
        resolve(v);
      };
      const onClose = () => done(false);
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
      d.addEventListener("close", onClose);
      d.showModal();
      no.focus();
    });
  }

  // ---------- Easier reading: on stays on, across pages, visits and test banks ----------
  function initEasier(after) {
    const b = document.getElementById("easierBtn"), root = document.documentElement;
    if (!b) return;
    const paint = () => { const on = root.classList.contains("easier"); b.setAttribute("aria-pressed", String(on)); b.textContent = "Easier reading: " + (on ? "on" : "off"); };
    b.addEventListener("click", () => {
      const on = !root.classList.contains("easier");
      root.classList.toggle("easier", on);
      try { localStorage.setItem(KEYS.easier, on ? "1" : "0"); } catch (e) { /* storage off */ }
      paint();
      fitParts();
      if (after) after(on);
    });
    paint();
  }

  // ---------- the score card, "Study these first" and their buttons ----------
  // items: [{id, sub}] in quiz order; st: 'right' | 'wrong' | 'none' for each.
  function topicsIn(items) { const set = new Set(items.map((x) => x.sub)); return ALL.filter((id) => set.has(id)); }
  function scorePanel(items, st) {
    const right = st.filter((x) => x === "right").length;
    const answered = st.filter((x) => x !== "none").length;
    const left = st.length - answered;
    const pct = answered ? Math.round((right / answered) * 100) + "%" : "&mdash;";
    const rows = topicsIn(items).map((id) => {
      let r = 0, t = 0;
      items.forEach((x, i) => { if (x.sub === id) { t++; if (st[i] === "right") r++; } });
      return `<li class="sc-item" style="${tc(id)}">
        <div class="sc-row">${dot(id)}<span class="sc-name">${topicText(id)}</span><span class="sc-n">${r}/${t} right</span></div>
        <div class="sc-bar" aria-hidden="true"><span class="sc-fill" style="width:${t ? ((r / t) * 100).toFixed(1) : 0}%"></span></div>
      </li>`;
    }).join("");
    return `<section class="panel-sec scorecard" aria-labelledby="scHead">
      <h2 id="scHead">Your score</h2>
      <div class="sc-big">${pct}</div>
      <div class="sc-sub">${right} right of ${answered} answered &middot; ${left} left</div>
      <ul class="sc-list">${rows}</ul>
    </section>`;
  }
  function studyPanel() {
    const list = studyTopics();
    const items = list.map((t) => `<li class="st-item" style="${tc(t.id)}">
        <div class="st-head">${dot(t.id)}<span class="st-name">${topicText(t.id)}</span><span class="st-n">${t.n} missed</span></div>
        <div class="st-links">
          <button type="button" class="linkish" data-practise="${t.id}">Practise this topic<span class="sr"> (${topicText(t.id)})</span></button>
          <a class="linkish" href="${CERTMASTER_URL}" target="_blank" rel="noopener">Review in CertMaster Learn<span class="sr"> (${topicText(t.id)}; opens in a new tab)</span><span aria-hidden="true">&nbsp;&#8599;</span></a>
        </div>
      </li>`).join("");
    return `<section class="panel-sec study" aria-labelledby="stHead">
      <h2 id="stHead">Study these first</h2>
      ${list.length
        ? `<p class="note">The topics in your Missed list, most missed first. A question leaves the list when you answer it right.</p><ol class="st-list">${items}</ol>`
        : `<p class="note">Nothing in your Missed list yet. A question you answer wrong is kept here, under its topic, until you answer it right.</p>`}
    </section>`;
  }
  function panelButtons(withReset) {
    const n = missedList().length;
    return `<div class="panel-foot">
      <button type="button" class="btn" id="missedAllBtn" ${n ? "" : "disabled"}>Retake all missed (${n})</button>
      ${withReset ? `<button type="button" class="btn ghost" id="resetBtn">Reset this quiz</button>` : ""}
    </div>`;
  }
  // wire the panel: start(fn) runs fn, after asking if a quiz would be lost
  function wirePanel(root, start, onReset) {
    root.querySelectorAll("[data-practise]").forEach((b) => b.addEventListener("click", () => start(() => startTopic(b.dataset.practise))));
    const m = root.querySelector("#missedAllBtn");
    if (m) m.addEventListener("click", () => start(startMissedAll));
    const r = root.querySelector("#resetBtn");
    if (r && onReset) r.addEventListener("click", onReset);
  }
  // The dashboard's Missed card, shown when the list has anything on it.
  function renderMissedCard(slotId) {
    const el = document.getElementById(slotId);
    if (!el) return;
    if (!missedList().length) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="card missed-card">${studyPanel()}${panelButtons(false)}</div>`;
    wirePanel(el, (fn) => fn(), null);
  }

  // ---------- the parts bar, the chips and the question map ----------
  function partsHtml(items, st, filter) {
    const segs = topicsIn(items).map((id) => {
      let a = 0, t = 0;
      items.forEach((x, i) => { if (x.sub === id) { t++; if (st[i] !== "none") a++; } });
      return `<button type="button" class="seg" style="${tc(id)};flex-grow:${t}" data-filter="${id}" data-long="${id} ${a}/${t}" data-short="${id}" aria-pressed="${filter === id}" aria-label="${topicText(id)}: ${a} of ${t} answered. Show only this topic."><span class="seg-l">${id} ${a}/${t}</span></button>`;
    }).join("");
    return `<div class="parts" role="group" aria-label="Topics in this quiz, each as wide as its share of the questions">${segs}</div>`;
  }
  // Each part's label is as long as its part has room for: "1.1 2/3", "1.1",
  // or nothing (its chip always has the number and count).
  function fitParts() {
    document.querySelectorAll(".seg").forEach((s) => {
      const l = s.querySelector(".seg-l");
      l.textContent = s.dataset.long;
      if (l.scrollWidth > l.clientWidth) { l.textContent = s.dataset.short; if (l.scrollWidth > l.clientWidth) l.textContent = ""; }
    });
  }
  window.addEventListener("resize", fitParts);

  function matches(items, i, st, f) {
    if (f === "all") return true;
    if (f === "new") return isNew(question(items[i].id));
    if (f === "missed") return st[i] === "wrong";
    return items[i].sub === f;
  }
  function visibleIn(items, st, f) { return items.map((_, i) => i).filter((i) => matches(items, i, st, f || "all")); }

  function chipsHtml(items, st, filter) {
    const f = filter || "all";
    const all = items.map((_, i) => i);
    const answered = (ix) => ix.filter((i) => st[i] !== "none").length;
    const chip = (key, label, count, style, disabled, name) =>
      `<button type="button" class="chip${f === key ? " on" : ""}" data-filter="${key}" aria-pressed="${f === key}" ${style ? `style="${style}"` : ""} ${disabled ? "disabled" : ""}${name ? ` title="${name}" aria-label="${name}, ${count} answered"` : ""}>${f === key ? '<span class="chk" aria-hidden="true">&#10003;</span>' : ""}${label} <span class="chip-n">${count}</span></button>`;
    let h = chip("all", "All", `${answered(all)}/${all.length}`);
    // A topic's chip carries its number; the full name is beside it in the score card.
    topicsIn(items).forEach((id) => {
      const ix = all.filter((i) => items[i].sub === id);
      h += chip(id, `${dot(id)}${id}`, `${answered(ix)}/${ix.length}`, tc(id), false, topicText(id));
    });
    const nw = all.filter((i) => isNew(question(items[i].id)));
    if (nw.length) h += chip("new", NEW_CHIP, `${answered(nw)}/${nw.length}`);
    const ms = all.filter((i) => st[i] === "wrong").length;
    h += chip("missed", "Missed", String(ms), "", ms === 0 && f !== "missed");
    return `<div class="chips" role="group" aria-label="Show which questions">${h}</div>`;
  }

  function mapHtml(items, st, vis, cur, review, mapOpen) {
    const tiles = vis.map((i) => {
      const s = st[i], sub = items[i].sub;
      const word = s === "right" ? "right" : s === "wrong" ? "wrong" : "not answered";
      const mark = s === "right" ? '<span class="mk" aria-hidden="true">&#10003;</span>' : s === "wrong" ? '<span class="mk" aria-hidden="true">&#10007;</span>' : "";
      return `<button type="button" class="qtile st-${s}${i === cur ? " cur" : ""}" style="${tc(sub)}" data-pos="${i}" title="${topicText(sub)}" aria-label="Question ${i + 1}, ${topicText(sub)}, ${word}"${i === cur ? ' aria-current="step"' : ""}><span class="qn">${i + 1}</span>${mark}</button>`;
    }).join("");
    const open = mapOpen !== undefined ? mapOpen : items.length <= 60;
    const n = vis.length === items.length ? `${vis.length}` : `showing ${vis.length} of ${items.length}`;
    return `<details class="qmap" id="qmap" ${open ? "open" : ""}>
      <summary>${review ? "Review any question" : "Jump to any question"} <span class="qmap-n">(${n})</span></summary>
      <div class="qmap-grid">${tiles}</div>
      <p class="qmap-key"><span>Border: the question's topic colour.</span> <span><span class="kbox k-right">&#10003;</span> right</span> <span><span class="kbox k-wrong"><s>7</s></span> wrong, struck through</span> <span><span class="kbox k-none"></span> not answered</span>${review ? "" : ' <span><span class="kbox k-cur"></span> this question</span>'}</p>
    </details>`;
  }

  window.TB = {
    KEYS, TOPIC_COLOR, NEW_CHIP, CERTMASTER_URL, ALL, LABEL,
    question, isNew, topicText, tc, dot,
    shuffleOn, setShuffle, shuffleBox, wireShuffle,
    loadMissed, recordAnswer, missedList, studyTopics, topicPick,
    startMissedAll, startTopic, askConfirm, ensureDialog, initEasier,
    topicsIn, scorePanel, studyPanel, panelButtons, wirePanel, renderMissedCard,
    partsHtml, fitParts, chipsHtml, mapHtml, visibleIn,
  };
})();
