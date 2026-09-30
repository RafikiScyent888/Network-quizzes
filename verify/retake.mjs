// Drives "Retake the ones I missed" in Chromium, the way a student meets it:
//   - after a quiz, the retake holds exactly the questions answered wrong
//     (no correct ones, none missing), with the answers reshuffled
//   - each round is labelled on every question and on the results
//   - rounds repeat until nothing is missed, then say "Every one right" and
//     offer no further retake
//   - a retake round survives Pause & Exit and Resume
//   - the Full Custom Quiz offers it too
//   - the new text meets WCAG AAA on painted pixels (7:1 body, 4.5:1 large)
//   - no script errors
// The quiz keeps its state in memory, so this reads what is on screen: the
// question shown, looked up in QUESTION_BANK, and Pause & Exit's saved state.
//   node verify/retake.mjs [dir]      dir defaults to the repo
//   node verify/retake.mjs --plant    proves each check can fail
// Needs Playwright. Not needed to run the site. Exit 1 on any failure.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PW = process.env.PW || '/opt/node22/lib/node_modules/playwright/index.mjs';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const lum = c => { const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Text inside `selector`, against the pixels painted under it (glyphs hidden,
// sample area pulled in 2px from each edge so a neighbour's edge isn't read).
async function contrast(page, selector) {
  const runs = await page.evaluate(sel => {
    const out = [];
    for (const root of document.querySelectorAll(sel)) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement, cs = getComputedStyle(el);
        let op = 1; for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (r.width > 6 && r.height > 6)
          out.push({ t: n.textContent.trim().slice(0, 40), c: cs.color, op, s: parseFloat(cs.fontSize), b: parseInt(cs.fontWeight) >= 700, x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height });
      }
    }
    return out;
  }, selector);
  await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' });
  const png = (await page.screenshot({ fullPage: true })).toString('base64');
  await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
  const grounds = await page.evaluate(async ({ png, runs }) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    return runs.map(r => { const x0 = Math.floor(r.x) + 2, y0 = Math.floor(r.y) + 2;
      const d = g.getImageData(x0, y0, Math.max(1, Math.floor(r.w) - 4), Math.max(1, Math.floor(r.h) - 4)).data;
      const px = []; for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2]]); return px; });
  }, { png, runs });
  const bad = [];
  runs.forEach((r, i) => {
    const m = r.c.match(/\d+(\.\d+)?/g).map(Number); const a = (m.length > 3 ? m[3] : 1) * r.op;
    const need = (r.s >= 24 || (r.b && r.s >= 18.66)) ? 4.5 : 7;
    let worst = 99; for (const bg of grounds[i]) { const fg = [0, 1, 2].map(k => m[k] * a + bg[k] * (1 - a)); worst = Math.min(worst, ratio(fg, bg)); }
    if (worst < need) bad.push(`${worst.toFixed(2)}:1 < ${need} "${r.t}"`);
  });
  return { n: runs.length, bad };
}

async function run(dir) {
  const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' }); r.end(e ? '' : b); }); }).listen(0);
  const URL = `http://127.0.0.1:${srv.address().port}`;
  const pw = await import(PW); const { chromium } = pw.default || pw;
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.setDefaultTimeout(6000);
  page.on('dialog', d => d.accept());
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const errors = []; page.on('pageerror', e => errors.push(e.message));

  // The question on screen, looked up in the bank.
  const current = () => page.evaluate(() => {
    const text = document.querySelector('.question-text').textContent;
    const q = window.QUESTION_BANK.find(x => x.question === text);
    return q ? { id: q.id, correct: q.options[q.correctIndex] } : { id: null, text };
  });
  // Answer every question of the round: wrong on the ids in `wrong`.
  // Returns the ids seen, in order.
  async function play(wrong) {
    const seen = [];
    for (let guard = 0; guard < 300; guard++) {
      if (!(await page.$('.question-text'))) break;
      const q = await current();
      if (q.id === null) { fails.push(`question on screen isn't in the bank: "${q.text.slice(0, 60)}"`); break; }
      seen.push(q.id);
      const opts = await page.$$eval('.option > span > div:first-child', ds => ds.map(d => d.textContent));
      const ci = opts.indexOf(q.correct);
      const pick = wrong.has(q.id) ? (ci + 1) % opts.length : ci;
      await page.locator('.option').nth(pick).click();
      await page.click('#primaryBtn');   // submit
      await page.click('#primaryBtn');   // next, or finish
    }
    return seen;
  }
  const paused = () => page.evaluate(() => JSON.parse(localStorage.getItem('nq_paused_state')));
  const pauseAndResume = async () => {
    await page.click('#pauseBtn'); await page.waitForURL(/index\.html/);
    const s = await paused();
    await page.click('#resumeBtn'); await page.waitForURL(/resume=1/);
    return s;
  };
  const sameSet = (a, b) => [...a].sort().join() === [...b].sort().join();

  try {
    await page.goto(`${URL}/index.html`); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.click('.tile[data-count="10"]'); await page.waitForURL(/quiz\.html/);
    ok(!(await page.$('.retake-banner')), 'a first attempt is labelled as a retake');
    const first = [];
    // decide misses as we go: every third question
    let n = 0; const wrong1 = new Set();
    for (let guard = 0; guard < 10; guard++) {
      if (!(await page.$('.question-text'))) break;
      const q = await current(); first.push(q.id);
      if (n % 3 === 0) wrong1.add(q.id); n++;
      const opts = await page.$$eval('.option > span > div:first-child', ds => ds.map(d => d.textContent));
      const ci = opts.indexOf(q.correct);
      await page.locator('.option').nth(wrong1.has(q.id) ? (ci + 1) % opts.length : ci).click();
      await page.click('#primaryBtn'); await page.click('#primaryBtn');
    }
    ok(first.length === 10, `quick quiz showed ${first.length} questions`);

    const btn = await page.$('#retakeMissedBtn');
    ok(btn, 'no "Retake the ones I missed" button after missing questions');
    ok(btn && (await btn.textContent()).trim() === `Retake the ${wrong1.size} I missed`, `button reads "${btn && (await btn.textContent()).trim()}"`);
    ok(await page.$('#retakeBtn'), 'the existing "Retake (New Random Set)" button is gone');
    const rc = await contrast(page, '#retakeMissedBtn, .retake-note');
    rc.bad.forEach(b => fails.push('contrast, results: ' + b)); ok(rc.n >= 2, 'contrast sweep measured nothing on the results screen');
    await btn.click();

    const banner = await page.$eval('.retake-banner', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
    ok(banner.startsWith('Retake round 1'), `question banner reads "${banner}"`);
    const bc = await contrast(page, '.retake-banner');
    bc.bad.forEach(b => fails.push('contrast, retake banner: ' + b)); ok(bc.n >= 1, 'contrast sweep did not see the retake banner');

    const r2 = await pauseAndResume();
    ok(r2 && r2.round === 2, `retake round saved as ${r2 && r2.round}, expected 2`);
    ok(r2 && sameSet(r2.questions.map(q => q.id), wrong1), `round 1 retake holds [${r2 && r2.questions.map(q => q.id)}], expected exactly the missed [${[...wrong1]}]`);
    ok(r2 && r2.answers.every(a => a === null), 'retake round starts with answers filled in');
    const orig = await page.evaluate(() => Object.fromEntries(window.QUESTION_BANK.map(q => [q.id, q.options.join('|')])));
    ok(r2 && r2.questions.some(q => q.options.join('|') !== orig[q.id]), 'retake round keeps the answers in their original order');
    ok((await page.$eval('.retake-banner', e => e.textContent).catch(() => '')).includes('Retake round 1'), 'resuming loses the retake round');

    const oneWrong = new Set([r2.questions[0].id]);
    const seen2 = await play(oneWrong);
    ok(sameSet(seen2, wrong1), `round 1 retake showed [${seen2}]`);
    const h2 = await page.$eval('.theme-bar h2', e => e.textContent.replace(/\s+/g, ' ').trim());
    ok(h2.endsWith('Results — retake round 1'), `results heading reads "${h2}"`);
    ok(!(await page.$('.retake-banner')), '"Every one right" shown while one is still missed');
    const btn2 = await page.$('#retakeMissedBtn');
    ok(btn2 && (await btn2.textContent()).trim() === 'Retake the 1 I missed', `second retake button reads "${btn2 && (await btn2.textContent()).trim()}"`);
    await btn2.click();
    const r3 = await pauseAndResume();
    ok(r3 && r3.round === 3 && r3.questions.length === 1 && r3.questions[0].id === r2.questions[0].id, `round 2 retake is [${r3 && r3.questions.map(q => q.id)}] in round ${r3 && r3.round}`);

    await play(new Set());
    ok(!(await page.$('#retakeMissedBtn')), 'a retake is still offered with nothing missed');
    const done = await page.$eval('.retake-banner', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
    ok(done.startsWith('Every one right.'), `finish message reads "${done}"`);
    const dc = await contrast(page, '.retake-banner'); dc.bad.forEach(b => fails.push('contrast, finish message: ' + b));

    // the Full Custom Quiz offers it too
    await page.goto(`${URL}/custom.html`);
    await page.click('#startBtn'); await page.waitForURL(/quiz\.html/);
    const firstQ = await current();
    const wrongC = new Set([firstQ.id]);
    const seenC = await play(wrongC);
    ok(seenC.length === 45, `full custom quiz showed ${seenC.length} questions, default 45`);
    const cb = await page.$('#retakeMissedBtn');
    ok(cb && (await cb.textContent()).trim() === 'Retake the 1 I missed', `custom quiz retake button reads "${cb && (await cb.textContent()).trim()}"`);
    if (cb) { await cb.click(); const rc2 = await pauseAndResume();
      ok(rc2 && rc2.questions.length === 1 && rc2.questions[0].id === firstQ.id, 'custom quiz retake does not hold exactly its miss'); }

    // a perfect quiz offers no retake of misses
    await page.goto(`${URL}/index.html`); await page.evaluate(() => localStorage.clear());
    await page.click('.tile[data-count="10"]'); await page.waitForURL(/quiz\.html/);
    await play(new Set());
    ok(!(await page.$('#retakeMissedBtn')), 'a perfect quiz offers a retake of misses');
    ok(!(await page.$('.retake-banner')), 'a perfect first quiz shows the retake finish message');
  } catch (e) { fails.push('could not drive the page — ' + String(e.message).split('\n')[0]); }
  ok(!errors.length, 'script errors: ' + errors.join(' | '));
  await browser.close(); srv.close();
  return fails;
}

if (process.argv.includes('--plant')) {
  const quiz = fs.readFileSync(path.join(ROOT, 'assets', 'quiz.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8');
  const PLANTS = {
    'retake uses the whole quiz': ['quiz.js', 'const ids = new Set(missedIds);', 'const ids = new Set(state.questions.map((q) => q.id));'],
    'retake drops one missed question': ['quiz.js', 'const ids = new Set(missedIds);', 'const ids = new Set(missedIds.slice(1));'],
    'round not counted': ['quiz.js', '        round: round + 1,', '        round: 1,'],
    'no retake button': ['quiz.js', '${missed.length ? `<button class="btn retake-missed"', '${false ? `<button class="btn retake-missed"'],
    'finish message too early': ['quiz.js', '${round > 1 && missed.length === 0 ?', '${round > 1 ?'],
    'button in the standard sky blue': ['style.css', '.btn.retake-missed { background: #075985; color: #fff; }', '.btn.retake-missed { background: #0ea5e9; color: #fff; }'],
    'answers not reshuffled on retake': ['quiz.js', 'questions: NQ.buildQuizQuestions(pool, pool.length),', 'questions: pool.map((q) => ({ id: q.id, question: q.question, domain: q.domain, objectiveId: q.objectiveId, objective: q.objective, options: q.options, optionExplanations: q.optionExplanations || q.options.map(() => ""), correctIndex: q.correctIndex })),'],
  };
  let missed = 0;
  for (const [name, [file, a, b]] of Object.entries(PLANTS)) {
    const src = file === 'quiz.js' ? quiz : css;
    if (!src.includes(a)) { console.log(`STALE  ${name}: its target text is no longer in ${file}`); missed++; continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nq-plant-'));
    fs.cpSync(ROOT, tmp, { recursive: true, filter: s => !s.includes(`${path.sep}.git`) });
    fs.writeFileSync(path.join(tmp, 'assets', file), src.replace(a, b));
    const f = await run(tmp);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${f.length ? 'CAUGHT' : 'MISSED'} ${name.padEnd(34)} ${(f[0] || '').slice(0, 110)}`);
    if (!f.length) missed++;
  }
  console.log(missed ? `${missed} plant(s) got through` : `all ${Object.keys(PLANTS).length} plants caught`);
  process.exit(missed ? 1 : 0);
} else {
  const fails = await run(process.argv[2] || ROOT);
  if (fails.length) { console.log('FAIL ' + fails.length); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('PASS — retake holds exactly the missed questions, answers reshuffled, rounds repeat and are labelled, Pause & Resume keeps the round, the Full Custom Quiz offers it, AAA on the new text, no script errors');
}
