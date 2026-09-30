// Checks the quiz's topics and question bank against the owner's objectives
// doc (verify/objectives-netplus-2026-09-30.md, copied verbatim), then drives
// the custom quiz page in Chromium:
//   - window.OBJECTIVES is the doc's topics, in its order, numbered 1.1, 1.2 ...
//     per domain, each in its doc domain
//   - every question is filed under one of them, with that topic's domain and label
//   - every topic has at least 20 questions, except the ones in PENDING below
//     (still being written); a PENDING topic that has reached 20 fails too, so
//     the list is emptied as each batch lands
//   - every question is well formed: 4 options, a correct answer, an
//     explanation, and a "why" for every option; ids and question texts unique
//   - no question reuses the id of one of the A+ questions removed on 30 Sept
//   - the custom quiz page lists every topic that has questions, with its true
//     count, under its doc domain, and a quiz on one topic draws only that topic
//   - the newest questions play: answered right on the page, they're marked right
//   - no script errors
//   node verify/objectives.mjs [dir]    dir defaults to the repo
//   node verify/objectives.mjs --plant  proves each check can fail
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
const MIN = 20;
// Topics still short of 20 while new questions are written for them (30 Sept 2026).
// Remove a topic from this list in the same commit that fills it.
// Ids of the 20 A+ questions removed on 30 Sept 2026. Never reuse them: a paused
// quiz saved in a student's browser may still point at them.
const RETIRED = [650, 651, 652, 653, ...Array.from({ length: 16 }, (_, i) => 655 + i)];
const PENDING = ['5.1', '5.4'];

// ---- the doc: domains in order, each with its topics in order ----
const DOC = [];
for (const line of fs.readFileSync(path.join(HERE, 'objectives-netplus-2026-09-30.md'), 'utf8').split('\n')) {
  let m;
  if ((m = line.match(/^### \*\*(.+) \((\d+)%\)\*\*/))) DOC.push({ name: m[1], topics: [] });
  else if ((m = line.match(/^\s+- \*\*(.+?):\*\*/)) && DOC.length) DOC[DOC.length - 1].topics.push(m[1]);
}

function read(dir) {
  const lines = fs.readFileSync(path.join(dir, 'assets', 'questions.js'), 'utf8').split('\n');
  const grab = p => JSON.parse(lines.find(l => l.startsWith(p)).slice(p.length).replace(/;\s*$/, ''));
  return { O: grab('window.OBJECTIVES = '), B: grab('window.QUESTION_BANK = ') };
}

async function run(dir, pending = PENDING) {
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  let O = [], B = [];
  try { ({ O, B } = read(dir)); } catch (e) { fails.push('question bank does not parse: ' + e.message); }

  // topics are the doc's, in order
  const want = DOC.flatMap((d, i) => d.topics.map((t, j) => ({ id: `${i + 1}.${j + 1}`, domain: d.name, label: t })));
  ok(O.length === want.length, `${O.length} topics, doc has ${want.length}`);
  want.forEach((w, k) => {
    const o = O[k];
    ok(o && o.id === w.id && o.label === w.label && o.domain.replace(/^\d\.0 /, '').toLowerCase() === w.domain.toLowerCase() && o.domain.startsWith(w.id[0] + '.0 '),
      `topic ${k + 1} is ${JSON.stringify(o)}, doc says ${w.id} "${w.label}" in "${w.domain}"`);
  });

  // every question filed, well formed; every topic >= MIN unless pending
  const topic = Object.fromEntries(O.map(o => [o.id, o]));
  const ids = new Set(), texts = new Set(), count = {};
  for (const q of B) {
    ok(!ids.has(q.id), `duplicate question id ${q.id}`); ids.add(q.id);
    ok(!RETIRED.includes(q.id), `${q.id} reuses the id of a removed A+ question`);
    ok(!texts.has(q.question), `${q.id}: question text repeats another question word for word`); texts.add(q.question);
    const t = topic[q.objectiveId];
    ok(t, `${q.id} is filed under "${q.objectiveId}", which isn't a topic`);
    if (t) ok(q.domain === t.domain && q.objective === t.label, `${q.id} says "${q.domain}" / "${q.objective}" but topic ${t.id} is "${t.domain}" / "${t.label}"`);
    ok(Array.isArray(q.options) && q.options.length === 4 && q.options.every(c => typeof c === 'string' && c.trim()), `${q.id}: options malformed`);
    ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4, `${q.id}: correct answer index ${q.correctIndex}`);
    ok(typeof q.explanation === 'string' && q.explanation.trim(), `${q.id}: no explanation`);
    ok(Array.isArray(q.optionExplanations) && q.optionExplanations.length === 4 && q.optionExplanations.every(w => typeof w === 'string' && w.trim()), `${q.id}: an option has no "why"`);
    count[q.objectiveId] = (count[q.objectiveId] || 0) + 1;
  }
  for (const o of O) {
    const n = count[o.id] || 0;
    if (pending.includes(o.id)) ok(n < MIN, `topic ${o.id} has ${n} questions but is still listed as PENDING — take it off the list`);
    else ok(n >= MIN, `topic ${o.id} has ${n} questions, fewer than ${MIN}`);
  }

  const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' }); r.end(e ? '' : b); }); }).listen(0);
  const URL = `http://127.0.0.1:${srv.address().port}`;
  const pw = await import(PW); const { chromium } = pw.default || pw;
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${URL}/custom.html`);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload();

    // the page lists every topic that has questions, with its true count, under its domain
    const shown = await page.$$eval('.domain-group', gs => gs.flatMap(g => [...g.querySelectorAll('.objective-row')].map(r => ({
      domain: g.querySelector('h3').textContent.trim(), id: r.dataset.obj,
      text: r.querySelector('span').textContent.replace(/\s+/g, ' ').trim(), n: r.querySelector('.obj-count').textContent.trim() }))));
    const listed = O.filter(o => count[o.id]);
    ok(shown.length === listed.length, `the custom quiz lists ${shown.length} topics, ${listed.length} have questions`);
    for (const s of shown) {
      const o = topic[s.id];
      ok(o && s.domain === o.domain && s.text === `${o.id} — ${o.label}` && s.n === `${count[o.id]} questions`,
        `custom quiz shows ${JSON.stringify(s)}, bank has ${o && `${o.domain} / ${o.id} — ${o.label} / ${count[o.id]}`}`);
    }

    // a quiz on one topic draws only from it (1.3 is the biggest, so it clears the 45 minimum alone)
    await page.click('#selectNoneBtn');
    await page.check('.objective-row[data-obj="1.3"] input');
    await page.click('#startBtn');
    await page.waitForURL(/quiz\.html/);
    const cfg = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nq_config')));
    ok(JSON.stringify(cfg.objectiveIds) === '["1.3"]', `a 1.3-only quiz was configured with ${JSON.stringify(cfg.objectiveIds)}`);
    const tag = await page.$eval('.objective-tag', e => e.textContent.replace(/\s+/g, ' ').trim());
    ok(tag === `1.3 · ${topic['1.3'].label}`, `the question header reads "${tag}"`);
    const text = await page.$eval('.question-text', e => e.textContent);
    const q = B.find(x => x.question === text);
    ok(q && q.objectiveId === '1.3', `a 1.3-only quiz showed a ${q && q.objectiveId} question`);

    // the newest questions play: a quiz on the newest topics, answered right, is marked right
    const newest = B.filter(x => x.source && x.source.startsWith('written 30 Sept 2026'));
    const topics = [...new Set(newest.map(x => x.objectiveId))];
    await page.evaluate(t => { localStorage.clear(); sessionStorage.setItem('nq_config', JSON.stringify({ mode: 'custom', count: 12, objectiveIds: t, theme: 'theme-green', label: 'New questions' })); }, topics);
    await page.goto(`${URL}/quiz.html`);
    let played = 0;
    for (let i = 0; i < 12 && (await page.$('.question-text')); i++) {
      const qt = await page.$eval('.question-text', e => e.textContent);
      const x = B.find(y => y.question === qt);
      const opts = await page.$$eval('.option > span > div:first-child', ds => ds.map(d => d.textContent));
      const want = opts.indexOf(x.options[x.correctIndex]);
      ok(want >= 0, `${x.id}: its correct answer isn't among the options on screen`);
      await page.locator('.option').nth(want).click();
      await page.click('#primaryBtn');
      const cls = await page.locator('.option').nth(want).getAttribute('class');
      ok(/\bcorrect\b/.test(cls) && !/\bincorrect\b/.test(cls), `${x.id}: picking its right answer is marked wrong`);
      if (newest.includes(x)) played++;
      await page.click('#primaryBtn');
    }
    ok(played >= 6, `only ${played} of 12 questions on the newest topics were new ones`);
    ok(await page.$eval('body', b => /100/.test(b.textContent)), 'twelve right answers did not score 100');
  } catch (e) { fails.push('could not drive the page — ' + String(e.message).split('\n')[0]); }
  ok(!errors.length, 'script errors: ' + errors.join(' | '));
  await browser.close(); srv.close();
  return fails;
}

if (process.argv.includes('--plant')) {
  const orig = read(ROOT);
  const custom = fs.readFileSync(path.join(ROOT, 'custom.html'), 'utf8');
  const clone = () => JSON.parse(JSON.stringify(orig));
  const data = f => { const d = clone(); f(d.O, d.B); return { data: d }; };
  const PLANTS = {
    'topic renamed': data(O => { O.find(o => o.id === '4.3').label = 'Deception technology'; }),
    'topic dropped': data(O => { O.splice(O.findIndex(o => o.id === '3.3'), 1); }),
    'topics out of order': data(O => { const i = O.findIndex(o => o.id === '2.1'); [O[i].label, O[i + 1].label] = [O[i + 1].label, O[i].label]; }),
    'topic in the wrong domain': data(O => { O.find(o => o.id === '5.2').domain = '4.0 Network Security'; }),
    'question on an old topic': data((O, B) => { B[0].objectiveId = '6.1'; }),
    'question with a stale label': data((O, B) => { B.find(q => q.objectiveId === '1.2').objective = 'Networking Appliances & Applications'; }),
    'topic below 20': data((O, B) => { const drop = new Set(B.filter(q => q.objectiveId === '5.2').slice(0, 1).map(q => q.id)); for (let i = B.length - 1; i >= 0; i--) if (drop.has(B[i].id)) B.splice(i, 1); }),
    'pending topic filled but still listed': data((O, B) => { const o = O.find(o => o.id === '5.1'); B.filter(q => q.objectiveId === '5.5').slice(0, 6).forEach(q => { q.objectiveId = '5.1'; q.objective = o.label; q.domain = o.domain; }); }),
    'option left without a why': data((O, B) => { B[B.length - 1].optionExplanations[1] = ''; }),
    'correct answer out of range': data((O, B) => { B[10].correctIndex = 4; }),
    'duplicate id': data((O, B) => { B[B.length - 1].id = B[0].id; }),
    'removed A+ id reused': data((O, B) => { B[B.length - 1].id = 657; }),
    'answers shuffled, key not moved': { common: 'correctIndex: order.indexOf(q.correctIndex),|correctIndex: q.correctIndex,' },
    'duplicate question text': data((O, B) => { B[5].question = B[4].question; }),
    'page miscounts': { custom: custom.replace('countsByObjective[q.objectiveId] = (countsByObjective[q.objectiveId] || 0) + 1;', 'if (q.id !== 1) countsByObjective[q.objectiveId] = (countsByObjective[q.objectiveId] || 0) + 1;') },
    'page hides a topic': { custom: custom.replace('(o) => countsByObjective[o.id] > 0)', '(o) => countsByObjective[o.id] > 0 && o.id !== "3.7")') },
    'one-topic quiz ignores the choice': { custom: custom.replace('const objectiveIds = selectedObjectiveIds();', 'const objectiveIds = window.OBJECTIVES.map((o) => o.id);') },
  };
  let missed = 0;
  for (const [name, p] of Object.entries(PLANTS)) {
    if (p.custom === custom) { console.log(`STALE  ${name}: the plant changed nothing`); missed++; continue; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nq-obj-'));
    fs.cpSync(ROOT, tmp, { recursive: true, filter: s => !s.includes(`${path.sep}.git`) });
    if (p.custom) fs.writeFileSync(path.join(tmp, 'custom.html'), p.custom);
    if (p.common) {
      const f = path.join(tmp, 'assets', 'common.js'), [from, to] = p.common.split('|'), src = fs.readFileSync(f, 'utf8');
      if (!src.includes(from)) { console.log(`STALE  ${name}: the plant changed nothing`); missed++; fs.rmSync(tmp, { recursive: true, force: true }); continue; }
      fs.writeFileSync(f, src.replace(from, to));
    }
    if (p.data) {
      const file = path.join(tmp, 'assets', 'questions.js');
      const lines = fs.readFileSync(file, 'utf8').split('\n').map(l =>
        l.startsWith('window.OBJECTIVES = ') ? 'window.OBJECTIVES = ' + JSON.stringify(p.data.O) + ';' :
        l.startsWith('window.QUESTION_BANK = ') ? 'window.QUESTION_BANK = ' + JSON.stringify(p.data.B) + ';' : l);
      fs.writeFileSync(file, lines.join('\n'));
    }
    const f = await run(tmp);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${f.length ? 'CAUGHT' : 'MISSED'} ${name.padEnd(38)} ${(f[0] || '').slice(0, 110)}`);
    if (!f.length) missed++;
  }
  console.log(missed ? `${missed} plant(s) got through` : `all ${Object.keys(PLANTS).length} plants caught`);
  process.exit(missed ? 1 : 0);
} else {
  const fails = await run(process.argv[2] || ROOT);
  if (fails.length) { console.log('FAIL ' + fails.length); fails.slice(0, 30).forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log(`PASS — ${DOC.reduce((a, d) => a + d.topics.length, 0)} topics from the doc, every question filed and well formed, every finished topic at ${MIN}+ (${PENDING.length} still being filled: ${PENDING.join(' ')}), no removed A+ id reused, the custom quiz lists true counts, a one-topic quiz draws only from it, the newest questions answered right are marked right, no script errors`);
}
