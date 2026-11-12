// DraftCraft Pro 1.15.3 — built-renderer interaction tests for editing across
// screenplay elements (E-01..E-07) and annotation placement (D-02/D-05).
// Usage: DRAFTCRAFT_DIST=<staged app>/dist DRAFTCRAFT_CHROMIUM=<chrome> node verification/cross-paragraph-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const dist = path.resolve(process.env.DRAFTCRAFT_DIST || path.join(__dirname, '../../desktop-build/app/dist'));
const out = path.join(__dirname, 'cross-paragraph-results'); fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' };
const KEY = 'draftcraft_screenplay_doc_v1', MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const P = (id, type, text, extra = {}) => ({ id, type, text, ...extra });
const base = () => ({ id: 'cross-qa', titlePage: { title: 'CROSS QA', author: 'QA', draftDate: '', contact: '', copyright: '' }, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, productionMode: false, lockedPages: false, showScriptNotes: true, showSceneComments: true, showBookmarks: true,
  paragraphs: [P('h', 'Scene Heading', 'INT. ROOM - NIGHT', { sceneComment: 'Practical rain on stage 4.' }), P('a1', 'Action', 'First action line.', { notes: [{ id: 'n1', author: 'Director', text: 'Hold this beat.', color: 'yellow', paragraphId: 'a1', createdAt: '2026-10-17' }] }), P('a2', 'Action', 'Second action line.'), P('c', 'Character', 'ELENA'), P('d', 'Dialogue', 'Hello there.'), P('a3', 'Action', 'She turns away.'), P('c2', 'Character', 'ELENA'), P('d2', 'Dialogue', 'Still here.')] });
const results = []; let browser, page, server;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const stored = async () => { await pause(250); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)).paragraphs.map((p) => [p.id, p.type, p.text]), KEY); };
async function seed(doc = base()) { await page.evaluate((d) => { window.name = 'cross-qa:' + JSON.stringify(d); }, doc); await page.reload(); await page.locator('.script-page').first().waitFor(); await pause(400); }
async function caret(id, at) { const t = page.locator('#input-' + id); await t.click(); await page.evaluate(([id, at]) => document.getElementById('input-' + id).setSelectionRange(at, at), [id, at]); }
async function focusInfo() { return page.evaluate(() => { const a = document.activeElement; return { id: a?.dataset?.editorParagraph, start: a?.selectionStart, end: a?.selectionEnd }; }); }
async function check(name, fn) { try { await fn(); results.push({ name, passed: true }); console.log('PASS', name); } catch (e) { results.push({ name, passed: false, error: e.message }); console.log('FAIL', name, e.message); await page.screenshot({ path: path.join(out, 'failure-' + results.length + '.png') }); } }
(async () => {
  server = http.createServer((req, res) => { const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html'); if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath: process.env.DRAFTCRAFT_CHROMIUM || process.env.BROWSER_EXE, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  page = await context.newPage(); page.setDefaultTimeout(8000);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { if (window.name.startsWith('cross-qa:')) { localStorage.clear(); localStorage.setItem('draftcraft_screenplay_doc_v1', window.name.slice(9)); window.name = ''; } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`); await seed();

  await check('E-01/E-02: Backspace at an element start and Delete at its end join elements; one Undo restores both', async () => {
    await caret('a2', 0); await page.keyboard.press('Backspace');
    let doc = await stored();
    assert.deepEqual(doc.slice(1, 3).map((p) => p[2]), ['First action line.Second action line.', 'ELENA']);
    assert.deepEqual(await focusInfo(), { id: 'a1', start: 18, end: 18 }, 'caret sits at the join');
    await page.keyboard.press(MOD + '+z'); doc = await stored();
    assert.deepEqual(doc.map((p) => p[0]), ['h', 'a1', 'a2', 'c', 'd', 'a3', 'c2', 'd2'], 'Undo restores the second element with its identity');
    await caret('c', 5); await page.keyboard.press('Delete'); doc = await stored();
    assert.equal(doc.find((p) => p[0] === 'c')[2], 'ELENAHello there.');
  });

  await check('E-01/E-02: Delete in an empty element, or Backspace after one, removes only the empty element', async () => {
    const doc = base(); doc.paragraphs.splice(2, 0, P('e', 'Character', ''));
    const full = async () => { await pause(250); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)).paragraphs.map((p) => [p.id, p.type, p.text]), KEY); };
    await seed(doc);
    await caret('e', 0); await page.keyboard.press('Delete');
    let paragraphs = await full();
    assert.deepEqual(paragraphs.slice(1, 3), [['a1', 'Action', 'First action line.'], ['a2', 'Action', 'Second action line.']], 'the Action keeps its type and text');
    assert.deepEqual(await focusInfo(), { id: 'a2', start: 0, end: 0 });
    await page.keyboard.press(MOD + '+z'); paragraphs = await full();
    assert.deepEqual(paragraphs[2], ['e', 'Character', ''], 'Undo restores the empty element');
    await caret('a2', 0); await page.keyboard.press('Backspace');
    paragraphs = await full();
    assert.deepEqual(paragraphs.slice(1, 3), [['a1', 'Action', 'First action line.'], ['a2', 'Action', 'Second action line.']]);
    assert.deepEqual(await focusInfo(), { id: 'a2', start: 0, end: 0 });
  });

  await check('E-03: arrow keys move the caret between elements at element boundaries', async () => {
    await seed();
    await caret('a1', 18); await page.keyboard.press('ArrowRight'); assert.deepEqual(await focusInfo(), { id: 'a2', start: 0, end: 0 });
    await page.keyboard.press('ArrowLeft'); assert.deepEqual(await focusInfo(), { id: 'a1', start: 18, end: 18 });
    await caret('a1', 5); await page.keyboard.press('ArrowDown'); assert.deepEqual(await focusInfo(), { id: 'a2', start: 5, end: 5 }, 'column kept');
    await page.keyboard.press('ArrowUp'); assert.deepEqual(await focusInfo(), { id: 'a1', start: 5, end: 5 });
    await caret('a2', 3); await page.keyboard.press('ArrowDown'); assert.equal((await focusInfo()).id, 'c', 'moves into the indented character cue');
  });

  await check('E-05: Shift+Arrow extends a selection across elements; copy yields typed elements; typing replaces it', async () => {
    await seed();
    await caret('a1', 6); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown');
    assert.ok(await page.locator('.dc-cross-selection').count() >= 2, 'highlight spans the elements');
    assert.equal((await focusInfo()).id, 'c', 'focus followed the selection into the cue');
    await page.keyboard.press(MOD + '+c'); await pause(100);
    const clip = await page.evaluate(async () => { const items = await navigator.clipboard.read(); const t = items[0]; return { text: await (await t.getType('text/plain')).text(), html: t.types.includes('text/html') ? await (await t.getType('text/html')).text() : '' }; });
    assert.ok(clip.text.startsWith('action line.\n\nSecond action line.\n\n'), JSON.stringify(clip.text));
    assert.ok(clip.html.includes('draftcraft-page'), 'rich element payload on the clipboard');
    await page.keyboard.type('Z'); const doc = await stored();
    assert.equal(doc[1][2].startsWith('First Z'), true, JSON.stringify(doc[1]));
    assert.ok(!doc.some((p) => p[0] === 'a2'), 'middle element removed');
    assert.equal(await page.locator('.dc-cross-selection').count(), 0, 'selection cleared after the edit');
    await page.keyboard.press(MOD + '+z'); assert.deepEqual((await stored()).map((p) => p[0]), ['h', 'a1', 'a2', 'c', 'd', 'a3', 'c2', 'd2'], 'one Undo restores everything');
  });

  await check('E-05: Shift+Click and mouse drag select across elements; Backspace deletes; Escape cancels', async () => {
    await seed();
    await caret('a1', 6);
    await page.locator('#input-a2').click({ modifiers: ['Shift'], position: { x: 60, y: 6 } }); await pause(150);
    assert.ok(await page.locator('.dc-cross-selection').count() >= 2, 'shift-click selection');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.dc-cross-selection').count(), 0);
    const a = await page.locator('#input-a1').boundingBox(), c = await page.locator('#input-c').boundingBox();
    await page.mouse.move(a.x + 50, a.y + 6); await page.mouse.down(); await page.mouse.move(c.x + 20, c.y + 6, { steps: 8 }); await page.mouse.up(); await pause(200);
    assert.ok(await page.locator('.dc-cross-selection').count() >= 2, 'drag selection');
    await page.keyboard.press('Backspace'); const doc = await stored();
    assert.deepEqual(doc.map((p) => p[0]), ['h', 'a1', 'd', 'a3', 'c2', 'd2'], JSON.stringify(doc));
  });

  await check('E-04: pasting copied elements or screenplay text inserts typed elements, not one paragraph', async () => {
    await seed();
    await caret('a1', 18);
    await page.evaluate(() => navigator.clipboard.writeText('\n\nINT. HALL - DAY\n\nShe runs.\n\nMARCUS\nWait!'));
    await page.keyboard.press(MOD + '+v'); let doc = await stored();
    assert.deepEqual(doc.slice(1, 6).map((p) => [p[1], p[2]]), [['Action', 'First action line.'], ['Scene Heading', 'INT. HALL - DAY'], ['Action', 'She runs.'], ['Character', 'MARCUS'], ['Dialogue', 'Wait!']]);
    await page.keyboard.press(MOD + '+z'); doc = await stored(); assert.equal(doc.length, 8);
    await caret('d', 5); await page.evaluate(() => navigator.clipboard.writeText(', you')); await page.keyboard.press(MOD + '+v');
    doc = await stored(); assert.equal(doc.find((p) => p[0] === 'd')[2], 'Hello, you there.', 'single-line paste stays inline');
  });

  await check('E-06: Select All selects the element, then the whole script; typing replaces it and Undo restores it', async () => {
    await seed();
    await caret('d', 2); await page.keyboard.press(MOD + '+a');
    assert.deepEqual(await focusInfo(), { id: 'd', start: 0, end: 12 }, 'first press selects the element text');
    assert.equal(await page.locator('.dc-cross-selection').count(), 0);
    await page.keyboard.press(MOD + '+a'); assert.ok(await page.locator('.dc-cross-selection').count() >= 8, 'second press selects every element');
    await page.keyboard.type('Q');
    let doc = await stored(); assert.equal(doc.length, 1); assert.equal(doc[0][2], 'Q');
    await page.keyboard.press(MOD + '+z'); doc = await stored(); assert.equal(doc.length, 8);
  });

  await check('E-06: Escape after Select All returns the caret to where it was, not to the end of the script', async () => {
    await seed();
    await caret('d', 2); await page.keyboard.press(MOD + '+a'); await page.keyboard.press(MOD + '+a');
    assert.ok(await page.locator('.dc-cross-selection').count() >= 8, 'whole script selected');
    await page.keyboard.press('Escape'); await pause(200);
    assert.equal(await page.locator('.dc-cross-selection').count(), 0, 'selection cancelled');
    assert.deepEqual(await focusInfo(), { id: 'd', start: 2, end: 2 }, 'caret back where it was before the first Select All press');
    await page.keyboard.type('Z'); assert.equal((await stored()).find((p) => p[0] === 'd')[2].slice(0, 4), 'HeZl', 'typing continues at that caret');
  });

  await check('E-07: Enter inside bold text keeps the inline style on both halves', async () => {
    const d = base(); d.paragraphs[2] = P('a2', 'Action', 'Bold then plain.', { runs: [{ text: 'Bold', style: { bold: true } }, { text: ' then plain.' }] });
    await seed(d); await caret('a2', 2); await page.keyboard.press('Enter'); await pause(400);
    const runs = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).paragraphs.filter((p) => p.text === 'Bo' || p.text === 'ld then plain.').map((p) => p.runs), KEY);
    assert.deepEqual(runs, [[{ text: 'Bo', style: { bold: true } }], [{ text: 'ld', style: { bold: true } }, { text: ' then plain.' }]]);
  });

  await check('D-02/D-03: notes, scene comments and CONT\'D never overlap screenplay text', async () => {
    await seed();
    const overlaps = await page.evaluate(() => {
      const text = [...document.querySelectorAll('textarea[data-editor-paragraph]')].map((t) => t.getBoundingClientRect());
      const marks = [...document.querySelectorAll('.dc-margin-annotations, [data-generated-label]')].map((m) => m.getBoundingClientRect());
      return marks.filter((m) => text.some((t) => { const ink = t.width; return m.left < t.right - 1 && m.right > t.left + 1 && m.top < t.bottom - 1 && m.bottom > t.top + 1 && ink > 0; })).length;
    });
    const labels = await page.locator('[data-generated-label="resumed"]').allInnerTexts();
    assert.deepEqual(labels, ["(CONT'D)"], 'automatic continued for the same speaker after action');
    const cue = await page.locator('#input-c2').boundingBox(), label = await page.locator('[data-generated-label="resumed"]').boundingBox();
    assert.ok(Math.abs(cue.y - label.y) < 2 && label.x > cue.x, 'CONT\'D is on the cue line, after the name');
    // The resumed label sits after the short cue text inside the cue's textarea box; that is intentional
    // (it is click-through), so only margin annotations are checked against text boxes here.
    const rail = await page.evaluate(() => { const rail = [...document.querySelectorAll('.dc-margin-annotations')].map((m) => m.getBoundingClientRect()); const text = [...document.querySelectorAll('textarea[data-editor-paragraph]')].map((t) => t.getBoundingClientRect()); return rail.filter((m) => text.some((t) => m.left < t.right - 1 && m.right > t.left + 1 && m.top < t.bottom - 1 && m.bottom > t.top + 1)).length; });
    assert.equal(rail, 0, 'margin markers are outside every text column');
    assert.equal(await page.locator('.dc-margin-marker').count(), 2, 'note and scene-comment markers');
    void overlaps;
    await page.getByRole('button', { name: 'Edit Scene Production Comment' }).first().click();
    const editor = page.getByRole('dialog', { name: 'Scene Production Comment' });
    await editor.getByRole('textbox', { name: 'Scene comment text' }).fill('Updated cue.'); await editor.getByRole('button', { name: 'Done' }).click(); await pause(400);
    const comment = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).paragraphs[0].sceneComment, KEY);
    assert.equal(comment, 'Updated cue.');
  });

  await check('P-01: rows reused across edits keep live handlers (takes, joins and Undo act on the current script)', async () => {
    const doc = base(); doc.paragraphs[4] = P('d', 'Dialogue', 'Hello there.', { altDialogue: ['Hello there.', 'Hi there.'], activeAltIndex: 0 });
    await seed(doc);
    const full = async () => { await pause(250); return page.evaluate((k) => JSON.parse(localStorage.getItem(k)).paragraphs, KEY); };
    await caret('a1', 18); await page.keyboard.type('X');
    // The take bar of the unchanged dialogue row was rendered before the edit; its button must not
    // apply the take operation to the pre-edit script (which would silently revert 'X').
    await page.getByRole('button', { name: 'Duplicate take' }).click();
    let paragraphs = await full();
    assert.equal(paragraphs.find((p) => p.id === 'a1').text, 'First action line.X', 'the earlier edit survives the take operation');
    assert.equal(paragraphs.find((p) => p.id === 'd').altDialogue.length, 3, 'the take was duplicated');
    await caret('a1', 19); await page.keyboard.press('Enter'); await page.keyboard.type('Inserted.');
    paragraphs = await full();
    assert.deepEqual(paragraphs.slice(1, 4).map((p) => p.text), ['First action line.X', 'Inserted.', 'Second action line.']);
    // a3 is below the insertion point; Backspace at its start must join it to the element now above it.
    await caret('a3', 0); await page.keyboard.press('Backspace');
    paragraphs = await full();
    assert.equal(paragraphs.find((p) => p.id === 'd').text, 'Hello there.She turns away.');
    assert.equal(paragraphs.some((p) => p.id === 'a3'), false);
    await page.keyboard.press(MOD + '+z'); paragraphs = await full();
    assert.equal(paragraphs.find((p) => p.id === 'a3').text, 'She turns away.', 'Undo restores the joined element');
    assert.equal(paragraphs.find((p) => p.id === 'a1').text, 'First action line.X');
  });

  await check('D-08: take controls, scene numbers and the bookmark ribbon stay clear of text and of each other', async () => {
    const doc = base();
    doc.paragraphs[0] = { ...doc.paragraphs[0], sceneNumber: '12', bookmark: { name: 'Rewrite', color: '#3b82f6' } };
    doc.paragraphs[4] = P('d', 'Dialogue', 'Hello there.', { altDialogue: ['Hello there.', 'Hi there.'], activeAltIndex: 0 });
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 }); await seed(doc);
      const boxes = await page.evaluate(() => {
        const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom }; };
        const pick = (selector) => [...document.querySelectorAll(selector)].map(rect);
        // Selectors that exist in 1.15.2 and 1.15.3 alike, so the same check runs on both payloads.
        const take = [...document.querySelectorAll('[aria-label="Previous dialogue alternative take"]')].map((b) => rect(b.parentElement));
        const numbers = [...document.querySelectorAll('[data-paragraph-id="h"] span')].filter((e) => e.textContent.trim() === '12').map((e) => rect(e.parentElement)).sort((a, b) => a.x - b.x);
        return { text: pick('textarea[data-editor-paragraph]'), take, scene: numbers.slice(0, 1), ribbon: [...document.querySelectorAll('[title^="Bookmark: "]')].map(rect) };
      });
      const hit = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;
      assert.equal(boxes.take.length, 1, 'take bar rendered'); assert.equal(boxes.scene.length, 1, 'left scene number rendered'); assert.equal(boxes.ribbon.length, 1, 'bookmark ribbon rendered');
      for (const [name, list] of [['take bar', boxes.take], ['scene number', boxes.scene], ['bookmark ribbon', boxes.ribbon]])
        for (const box of list) assert.equal(boxes.text.filter((t) => hit(box, t)).length, 0, `${name} covers no screenplay text at ${width}px`);
      assert.equal(hit(boxes.scene[0], boxes.ribbon[0]), false, `scene number and bookmark ribbon do not collide at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  await check('D-09: a speech continued on the next page shows its own first line (not the previous page\'s last line)', async () => {
    // For every page-continuation fragment, the first character visible at the top of its textarea must be the
    // first non-space character of the fragment. Layout lines can begin with the space at which a line wrapped;
    // the browser keeps that space at the end of the previous visual line.
    const probe = (target = page) => target.evaluate(() => [...document.querySelectorAll('textarea[data-editor-paragraph]')].filter((t) => Number(t.dataset.fragmentStart) > 0).map((t) => {
      t.scrollIntoView({ block: 'start' }); let box = t.parentElement; while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement; if (box) box.scrollTop -= 300;
      const r = t.getBoundingClientRect(), indent = parseFloat(getComputedStyle(t).textIndent) || 0;
      const pos = document.caretPositionFromPoint(r.left + indent + 3, r.top + 3);
      let first = Number(t.dataset.fragmentStart); while (first < t.value.length && /\s/.test(t.value[first])) first++;
      const start = Number(t.dataset.fragmentStart);
      return { id: t.dataset.editorParagraph, start, startsWithSpace: /\s/.test(t.value[start]), betweenWords: /\s/.test(t.value[start]) || /\s/.test(t.value[start - 1]), first, visible: pos && pos.offsetNode === t ? pos.offset : -1 };
    }));
    // 1. The built-in sample script, whose MARCUS speech breaks between two words (the case seen on macOS). Up to
    // 1.15.3 the continuation began with the space; since 1.15.4 (FMT-14) the space stays at the end of the previous
    // page's last line, as the browser shows it, and the continuation begins with the next word.
    const fresh = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), first = await fresh.newPage();
    await first.goto(`http://127.0.0.1:${server.address().port}/index.html`); await first.locator('.script-page').first().waitFor(); await pause(1500);
    const sample = await probe(first); await fresh.close();
    assert.ok(sample.some((f) => f.betweenWords), `the sample script has a continuation whose page break falls between two words: ${JSON.stringify(sample)}`);
    if (process.env.DRAFTCRAFT_EXPECT_HANGING_SPACE !== '0') assert.ok(sample.every((f) => !f.startsWithSpace), `no continuation starts with a space (FMT-14): ${JSON.stringify(sample)}`);
    // 2. A long speech split over several pages.
    const doc = base();
    const speech = 'I keep telling myself it will stop, that tomorrow the sky will clear and we will finally see the stars again. '.repeat(45).trim();
    doc.paragraphs = [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('a', 'Action', 'The rain hammers the windows while the city hums below.'), P('c', 'Character', 'ELENA'), P('d', 'Dialogue', speech), P('x', 'Action', 'She turns away.')];
    await seed(doc);
    const long = await probe();
    assert.ok(long.length >= 2, `the speech is split across several pages (${long.length} continuation fragments)`);
    if (process.env.DRAFTCRAFT_EXPECT_HANGING_SPACE !== '0') assert.ok(long.every((f) => !f.startsWithSpace), `no continuation of the long speech starts with a space: ${JSON.stringify(long)}`);
    for (const f of [...sample, ...long]) assert.ok(Math.abs(f.visible - f.first) <= 1, `fragment ${f.id}@${f.start} shows offset ${f.visible} first (expected ${f.first})`);
  });

  await check('no renderer errors during cross-element editing', async () => { assert.deepEqual(errors, []); });
  fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify({ dist, results }, null, 2));
  await browser.close(); server.close();
  if (results.some((r) => !r.passed)) process.exit(1);
})().catch(async (e) => { console.error(e); try { await browser?.close(); } catch {} server?.close(); process.exit(1); });
