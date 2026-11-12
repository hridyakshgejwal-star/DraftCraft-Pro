// Visual probe: serves a staged dist and seeds a document, takes screenshots.
const { chromium } = require('playwright'); const fs = require('fs'), http = require('http'), path = require('path');
const dist = process.argv[2], out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' };
const P = (id, type, text, extra = {}) => ({ id, type, text, ...extra });
const doc = (paragraphs, extra = {}) => ({ id: 'probe-doc', titlePage: { title: 'PROBE', author: 'Writer', draftDate: '', contact: '', copyright: '' }, paragraphs, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, productionMode: false, lockedPages: false, showScriptNotes: true, showSceneComments: true, showBookmarks: true, activeRevisionColor: 'White', ...extra });
const long = 'The rain hammers the windows while the city hums below in a restless electric drone that never quite sleeps. ';
const scenes = [];
for (let s = 0; s < 6; s++) {
  scenes.push(P('h' + s, 'Scene Heading', `INT. APARTMENT ${s} - NIGHT`, { sceneNumber: String(s + 1), sceneComment: s === 0 ? 'Practical rain on stage 4; key light from the window.' : undefined }));
  scenes.push(P('a' + s, 'Action', long.repeat(s === 2 ? 6 : 2), { notes: s === 0 ? [{ id: 'n1', author: 'Director', text: 'Hold on this beat longer.', color: 'yellow', paragraphId: 'a0', createdAt: '2026-10-17' }] : undefined }));
  scenes.push(P('c' + s, 'Character', s % 2 ? 'MARCUS' : 'ELENA'));
  scenes.push(P('p' + s, 'Parenthetical', '(quietly)'));
  scenes.push(P('d' + s, 'Dialogue', 'I keep telling myself it will stop, that tomorrow the sky will clear and we will finally see the stars again. '.repeat(s === 3 ? 6 : 1)));
  scenes.push(P('x' + s, 'Action', 'She turns away.'));
  scenes.push(P('c2' + s, 'Character', s % 2 ? 'MARCUS' : 'ELENA'));
  scenes.push(P('d2' + s, 'Dialogue', 'Still here.'));
  scenes.push(P('t' + s, 'Transition', 'CUT TO:'));
}
(async () => {
  const server = http.createServer((req, res) => { const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html'); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const shots = JSON.parse(process.argv[4] || '[]');
  for (const shot of shots.length ? shots : [{ name: 'default', width: 1440, height: 1000 }]) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const d = doc(scenes, shot.doc || {});
    await page.addInitScript((d) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('draftcraft_screenplay_doc_v1', d); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(d));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.locator('.script-page').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    if (shot.scrollTo) await page.evaluate((n) => document.querySelector(`[data-page-number="${n}"]`)?.scrollIntoView(), shot.scrollTo);
    if (shot.focus) { await page.locator('#input-' + shot.focus).click(); }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, shot.name + '.png') });
    const geo = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-paragraph-id]')];
      const overlaps = [];
      const boxes = rows.map((r) => ({ id: r.dataset.paragraphId, rect: r.getBoundingClientRect(), inner: [...r.querySelectorAll('*')].map((e) => e.getBoundingClientRect()).reduce((m, b) => ({ top: Math.min(m.top, b.top), bottom: Math.max(m.bottom, b.bottom) }), { top: Infinity, bottom: -Infinity }) }));
      for (const a of boxes) for (const b of boxes) if (a !== b && a.inner.bottom > b.rect.top + 1 && a.rect.top < b.rect.top && Math.min(a.rect.right, b.rect.right) > Math.max(a.rect.left, b.rect.left)) overlaps.push(a.id + '->' + b.id + ' by ' + Math.round(a.inner.bottom - b.rect.top) + 'px');
      return { pages: document.querySelectorAll('.script-page').length, overlaps: [...new Set(overlaps)].slice(0, 20) };
    });
    console.log(shot.name, JSON.stringify(geo), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
    await page.close();
  }
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
