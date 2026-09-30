// Checks that the answer key and the "why" text agree, question by question:
//   - no wrong option carries the question's explanation (which would mean the whys are
//     shuffled against the options, or the answer key points at the wrong one)
//   - the three answer keys repaired on 30 September 2026 (169, 173, 175)
//     mark the genuinely right option
// Then drives the page: a student who picks the right answer on 169, 173 and
// 175 is marked correct.
//   node verify/answers.mjs [dir]     dir defaults to the repo
//   node verify/answers.mjs --plant   proves each check can fail
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
const RIGHT = { 169: 'Access control list (ACL)', 173: 'Geo-Domain Name System (DNS) / latency-based routing', 175: 'Cloud provider representational state transfer' };

function bank(dir) {
  const line = fs.readFileSync(path.join(dir, 'assets', 'questions.js'), 'utf8').split('\n').find(l => l.startsWith('window.QUESTION_BANK = '));
  return JSON.parse(line.slice('window.QUESTION_BANK = '.length).replace(/;\s*$/, ''));
}

async function run(dir) {
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const B = bank(dir);
  for (const q of B) {
    const ex = q.explanation.trim(), oe = q.optionExplanations.map(s => s.trim());
    oe.forEach((w, i) => { if (i !== q.correctIndex) ok(w !== ex, `${q.id}: option ${i} ("${q.options[i].slice(0, 30)}") carries the explanation, so the key or the whys are misaligned`); });
  }
  for (const [id, text] of Object.entries(RIGHT)) {
    const q = B.find(x => x.id === +id);
    ok(q && q.options[q.correctIndex].startsWith(text), `${id}: answer key marks "${q && q.options[q.correctIndex].slice(0, 40)}", should be "${text}"`);
  }

  const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' }); r.end(e ? '' : b); }); }).listen(0);
  const URL = `http://127.0.0.1:${srv.address().port}`;
  const pw = await import(PW); const { chromium } = pw.default || pw;
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    // a quiz of just the three repaired questions, answered the right way
    await page.goto(`${URL}/index.html`);
    const objs = [...new Set(Object.keys(RIGHT).map(id => B.find(x => x.id === +id).objectiveId))];
    await page.evaluate(objs => { localStorage.clear(); sessionStorage.setItem('nq_config', JSON.stringify({ mode: 'custom', count: 999, objectiveIds: objs, theme: 'theme-green', label: 'Answer check' })); }, objs);
    await page.goto(`${URL}/quiz.html`);
    const seen = new Set();
    for (let guard = 0; guard < 400 && (await page.$('.question-text')); guard++) {
      const text = await page.$eval('.question-text', e => e.textContent);
      const q = B.find(x => x.question === text);
      const opts = await page.$$eval('.option > span > div:first-child', ds => ds.map(d => d.textContent));
      const want = RIGHT[q.id] ? opts.findIndex(o => o.startsWith(RIGHT[q.id])) : opts.indexOf(q.options[q.correctIndex]);
      await page.locator('.option').nth(want).click();
      await page.click('#primaryBtn');
      if (RIGHT[q.id]) {
        seen.add(q.id);
        const marked = await page.locator('.option').nth(want).getAttribute('class');
        ok(/\bcorrect\b/.test(marked) && !/\bincorrect\b/.test(marked), `${q.id}: picking "${RIGHT[q.id].slice(0, 30)}" is marked wrong on the page`);
      }
      await page.click('#primaryBtn');
    }
    ok(seen.size === 3, `the page only showed ${seen.size} of the three repaired questions`);
  } catch (e) { fails.push('could not drive the page — ' + String(e.message).split('\n')[0]); }
  ok(!errors.length, 'script errors: ' + errors.join(' | '));
  await browser.close(); srv.close();
  return fails;
}

if (process.argv.includes('--plant')) {
  const orig = bank(ROOT);
  const edit = f => { const B = JSON.parse(JSON.stringify(orig)); f(B); return B; };
  const PLANTS = {
    '175 key back to the KVM console': edit(B => { B.find(q => q.id === 175).correctIndex = 1; B.find(q => q.id === 175).explanation = B.find(q => q.id === 175).optionExplanations[1]; }),
    '169 key back to any/any': edit(B => { const q = B.find(q => q.id === 169); q.correctIndex = 1; q.explanation = q.optionExplanations[1]; }),
    'whys shuffled on one question': edit(B => { const q = B.find(q => q.id === 121); const o = q.optionExplanations; [o[0], o[1]] = [o[1], o[0]]; }),
    'explanation copied onto a wrong option': edit(B => { const q = B.find(q => q.id === 400); q.optionExplanations[(q.correctIndex + 1) % 4] = q.explanation; }),
  };
  let missed = 0;
  for (const [name, B] of Object.entries(PLANTS)) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nq-ans-'));
    fs.cpSync(ROOT, tmp, { recursive: true, filter: s => !s.includes(`${path.sep}.git`) });
    const file = path.join(tmp, 'assets', 'questions.js');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const i = lines.findIndex(l => l.startsWith('window.QUESTION_BANK = '));
    lines[i] = 'window.QUESTION_BANK = ' + JSON.stringify(B) + ';';
    fs.writeFileSync(file, lines.join('\n'));
    const f = await run(tmp);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${f.length ? 'CAUGHT' : 'MISSED'} ${name.padEnd(40)} ${(f[0] || '').slice(0, 100)}`);
    if (!f.length) missed++;
  }
  console.log(missed ? `${missed} plant(s) got through` : `all ${Object.keys(PLANTS).length} plants caught`);
  process.exit(missed ? 1 : 0);
} else {
  const fails = await run(process.argv[2] || ROOT);
  if (fails.length) { console.log('FAIL ' + fails.length); fails.slice(0, 20).forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('PASS — every answer key agrees with its explanation, no explanation sits on a wrong option, and picking the right answer on 169, 173 and 175 is marked correct on the page');
}
