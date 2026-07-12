:root {
  --sky-1: #0ea5e9;
  --sky-2: #38bdf8;
  --sky-3: #bae6fd;
  --ink: #0f172a;
  --card: #ffffff;
  --muted: #475569;
  --good: #15803d;
  --good-bg: #dcfce7;
  --bad: #b91c1c;
  --bad-bg: #fee2e2;
  --radius: 14px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  color: var(--ink);
  background: linear-gradient(180deg, var(--sky-1) 0%, var(--sky-2) 45%, var(--sky-3) 100%);
  background-attachment: fixed;
}

.wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 60px;
}

a { color: inherit; }

/* ---------- Header / disclaimer ---------- */

.site-header {
  text-align: center;
  color: #fff;
  padding: 28px 12px 18px;
}

.site-header h1 {
  margin: 0 0 6px;
  font-size: clamp(24px, 5vw, 36px);
  text-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
}

.site-header p {
  margin: 0;
  font-size: clamp(13px, 2.4vw, 16px);
  color: #e0f2fe;
}

.disclaimer {
  background: rgba(15, 23, 42, 0.85);
  color: #f8fafc;
  font-size: 12.5px;
  line-height: 1.5;
  border-radius: var(--radius);
  padding: 10px 16px;
  margin: 0 auto 18px;
  max-width: 1100px;
  text-align: center;
}

.disclaimer strong { color: #fde047; }

/* ---------- Resume banner ---------- */

.resume-banner {
  background: #fff7ed;
  border: 2px solid #f59e0b;
  border-radius: var(--radius);
  padding: 14px 18px;
  max-width: 1100px;
  margin: 0 auto 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
}

.resume-banner .text b { color: #92400e; }

.resume-banner .actions { display: flex; gap: 8px; }

/* ---------- Buttons ---------- */

button, .btn {
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--sky-1);
  color: #fff;
  transition: transform 0.05s ease, filter 0.15s ease;
  text-decoration: none;
  display: inline-block;
}

button:hover, .btn:hover { filter: brightness(1.08); }
button:active, .btn:active { transform: scale(0.97); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn.secondary { background: #64748b; }
.btn.danger { background: #dc2626; }
.btn.ghost { background: transparent; color: var(--ink); border: 2px solid rgba(15,23,42,0.15); }

/* ---------- Tile dashboard ---------- */

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.tile {
  border-radius: 20px;
  padding: 26px 20px;
  min-height: 190px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.tile:hover, .tile:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 20px 38px rgba(15, 23, 42, 0.35);
}

.tile .tile-icon { font-size: 34px; line-height: 1; }
.tile .tile-title { font-size: 22px; font-weight: 800; margin-top: 10px; }
.tile .tile-sub { font-size: 13px; opacity: 0.92; margin-top: 4px; }
.tile .tile-count {
  align-self: flex-start;
  margin-top: 14px;
  background: rgba(255,255,255,0.22);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12.5px;
  font-weight: 700;
}

/* Theme: Lightning (10Q) */
.theme-lightning { background: radial-gradient(circle at 20% 15%, #fde047 0%, transparent 40%), linear-gradient(160deg, #4c1d95 0%, #1e1b4b 100%); }
.theme-lightning .tile-count { color: #fde047; background: rgba(250, 204, 21, 0.18); }

/* Theme: Fire (15Q) */
.theme-fire { background: radial-gradient(circle at 80% 10%, #fed7aa 0%, transparent 35%), linear-gradient(160deg, #ea580c 0%, #7c2d12 100%); }

/* Theme: Storm cloud (20Q) */
.theme-storm { background: radial-gradient(circle at 25% 80%, #94a3b8 0%, transparent 45%), linear-gradient(160deg, #475569 0%, #1e293b 100%); }

/* Theme: Sun (25Q) */
.theme-sun { background: radial-gradient(circle at 75% 20%, #fef9c3 0%, transparent 45%), linear-gradient(160deg, #fbbf24 0%, #d97706 100%); color: #451a03; }
.theme-sun .tile-count { background: rgba(69, 26, 3, 0.15); color: #451a03; }

/* Theme: Green / full custom */
.theme-green { background: radial-gradient(circle at 20% 20%, #86efac 0%, transparent 40%), linear-gradient(160deg, #16a34a 0%, #064e3b 100%); }

/* Page-level theme wash used on quiz.html / custom.html header bars */
.theme-bar.theme-lightning { background: linear-gradient(120deg, #4c1d95, #1e1b4b); }
.theme-bar.theme-fire { background: linear-gradient(120deg, #ea580c, #7c2d12); }
.theme-bar.theme-storm { background: linear-gradient(120deg, #475569, #1e293b); }
.theme-bar.theme-sun { background: linear-gradient(120deg, #fbbf24, #d97706); color: #451a03; }
.theme-bar.theme-green { background: linear-gradient(120deg, #16a34a, #064e3b); }

/* ---------- Cards / panels ---------- */

.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
  padding: 20px 22px;
  margin-bottom: 18px;
}

.theme-bar {
  color: #fff;
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 18px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.theme-bar h2 { margin: 0; font-size: 20px; }
.theme-bar .pill { background: rgba(255,255,255,0.22); border-radius: 999px; padding: 5px 12px; font-size: 13px; font-weight: 700; }

/* ---------- Objective picker (custom.html) ---------- */

.obj-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }

.count-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: 14px 0; }
.count-row input[type="range"] { flex: 1; min-width: 180px; }
.count-row input[type="number"] { width: 80px; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 15px; }

.domain-group { margin-bottom: 16px; }
.domain-group h3 { font-size: 15px; margin: 0 0 8px; color: #0369a1; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px; }

.objective-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
}
.objective-row:hover { background: #f0f9ff; }
.objective-row input { width: 18px; height: 18px; flex-shrink: 0; }
.objective-row .obj-count { margin-left: auto; font-size: 12px; color: var(--muted); }
.objective-row.disabled { opacity: 0.45; }

.pool-status { font-size: 13.5px; padding: 10px 14px; border-radius: 8px; background: #f1f5f9; margin: 10px 0; }
.pool-status.warn { background: #fee2e2; color: #991b1b; font-weight: 600; }

/* ---------- Quiz runner ---------- */

.progress-wrap { background: #e2e8f0; border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 4px; }
.progress-bar { height: 100%; background: linear-gradient(90deg, var(--sky-1), var(--sky-2)); transition: width 0.25s ease; }

.question-text { font-size: 17px; font-weight: 600; margin: 16px 0; line-height: 1.45; }
.objective-tag {
  display: inline-block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 999px;
  padding: 3px 10px;
  font-weight: 700;
}

.option-list { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }

.option {
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 15px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  min-height: 44px;
}
.option:hover { border-color: var(--sky-1); }
.option input { margin-top: 2px; width: 18px; height: 18px; flex-shrink: 0; }
.option.selected { border-color: var(--sky-1); background: #f0f9ff; }
.option.correct { border-color: var(--good); background: var(--good-bg); }
.option.incorrect { border-color: var(--bad); background: var(--bad-bg); }
.option .why { display: none; font-size: 13px; margin-top: 6px; color: var(--muted); }
.option.reveal .why { display: block; }
.option.correct .why { color: var(--good); }
.option.incorrect .why { color: var(--bad); }

.quiz-controls { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; margin-top: 18px; }
.quiz-controls .left, .quiz-controls .right { display: flex; gap: 10px; flex-wrap: wrap; }

/* ---------- Results ---------- */

.score-hero {
  text-align: center;
  padding: 26px 10px;
}
.score-hero .big-score { font-size: clamp(48px, 12vw, 72px); font-weight: 800; color: var(--sky-1); }
.score-hero .big-score span { font-size: 0.4em; color: var(--muted); }

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #eef2f7;
  font-size: 14px;
}
.breakdown-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 0 10px; }
.breakdown-fill { height: 100%; background: var(--good); }

.missed-item { border-left: 4px solid var(--bad); border-radius: 8px; background: #fff7f7; padding: 12px 14px; margin-bottom: 12px; }
.missed-item .your-answer { color: var(--bad); font-size: 14px; margin: 6px 0 2px; }
.missed-item .correct-answer { color: var(--good); font-size: 14px; margin: 2px 0; }

footer.site-footer {
  text-align: center;
  color: #f0f9ff;
  font-size: 12px;
  margin-top: 30px;
  opacity: 0.9;
}

@media (max-width: 480px) {
  .tile { min-height: 160px; padding: 20px 16px; }
  .theme-bar { flex-direction: column; align-items: flex-start; }
}
