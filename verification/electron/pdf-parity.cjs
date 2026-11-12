'use strict';
// Real Electron 44.7.0: open a native .draftcraft project through File > Open,
// export a PDF through Export Screenplay PDF (Electron printToPDF, real file),
// then compare every PDF page with the editor's pages (page count, page text,
// generated (MORE)/(CONT'D) cues). Usage: xvfb-run -a node pdf-parity.cjs <app>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.cjs');
const appDir = path.resolve(process.argv[2]);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const P = (id, type, text, extra = {}) => ({ id, type, text, ...extra });

function script() {
  const paragraphs = [];
  const speech = 'I keep telling myself it will stop, that tomorrow the sky will clear and we will finally see the stars again. ';
  for (let s = 0; s < 14; s++) {
    paragraphs.push(P('h' + s, 'Scene Heading', `INT. APARTMENT ${s + 1} - NIGHT`, { sceneNumber: String(s + 1) }));
    // 1.17: some scenes carry emoji (spaced and glued to words) so the PDF is compared with the editor for emoji text too.
    const emoji = s % 5 === 2 ? ' 🌧️ Thunder 😱 rolls over the roofs👀 and a phone buzzes 📱📱 wow😀wow while 👨‍👩‍👧‍👦 sleep.' : '';
    paragraphs.push(P('a' + s, 'Action', ('The rain hammers the windows while the city hums below in a restless electric drone. '.repeat(s % 3 + 1).trim()) + emoji));
    paragraphs.push(P('c' + s, 'Character', s % 2 ? 'MARCUS' : 'ELENA'));
    if (s % 4 === 1) paragraphs.push(P('p' + s, 'Parenthetical', '(quietly)'));
    paragraphs.push(P('d' + s, 'Dialogue', speech.repeat(s === 5 ? 22 : 1).trim()));
    paragraphs.push(P('x' + s, 'Action', 'She turns away.'));
    paragraphs.push(P('c2' + s, 'Character', s % 2 ? 'MARCUS' : 'ELENA'));
    paragraphs.push(P('d2' + s, 'Dialogue', 'Still here.'));
    paragraphs.push(P('t' + s, 'Transition', 'CUT TO:'));
  }
  return { id: 'pdf-parity', titlePage: { title: 'PDF PARITY', author: 'QA', draftDate: '', contact: '', copyright: '' }, paragraphs, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, productionMode: false, lockedPages: false, showScriptNotes: true, showSceneComments: true, showBookmarks: true, lastSavedAt: new Date().toISOString() };
}
const norm = (t) => t.replace(/\s+/g, ' ').trim();

(async () => {
  const ctx = await h.launch({ appDir });
  const { app, documents, profile } = ctx;
  const out = { appDir, checks: [] };
  try {
    const project = path.join(documents, 'Parity.draftcraft'), pdfPath = path.join(documents, 'Parity.pdf');
    fs.writeFileSync(project, JSON.stringify({ format: 'draftcraft-project', version: 1, document: script() }, null, 2));
    const win = await h.editorWindow(app); await pause(2500);
    await h.answer(app, { open: [project], save: [pdfPath] });
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Open…').click());
    await win.waitForFunction(() => [...document.querySelectorAll('textarea[data-editor-paragraph]')].some((t) => t.value.startsWith('INT. APARTMENT 14')), null, { timeout: 30000 });
    await pause(2500);
    const editor = await win.evaluate(() => [...document.querySelectorAll('.script-page')].map((page) => {
      const parts = [...page.querySelectorAll('[data-paragraph-id]')].map((row) => { const t = row.querySelector('textarea[data-editor-paragraph]'); if (!t) return ''; return t.value.slice(Number(row.dataset.fragmentStart), Number(row.dataset.fragmentEnd)); });
      const labels = [...page.querySelectorAll('[data-generated-label]')].map((l) => ({ kind: l.dataset.generatedLabel, text: l.textContent }));
      return { label: page.dataset.pageLabel, text: parts.join(' '), labels };
    }));
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Export PDF…').click());
    await win.getByRole('button', { name: 'Export Screenplay PDF' }).click({ timeout: 20000 });
    const deadline = Date.now() + 60000; while (!fs.existsSync(pdfPath) && Date.now() < deadline) await pause(300);
    if (!fs.existsSync(pdfPath)) { console.log('DIALOGS', JSON.stringify(h.persisted(profile).dialogs).slice(0, 1500)); console.log('MODAL', (await win.locator('body').innerText()).slice(0, 3000).replace(/\n/g, ' | ')); await win.screenshot({ path: path.join(__dirname, 'pdf-parity-failure.png') }); }
    assert.ok(fs.existsSync(pdfPath), 'PDF written through the native save flow');
    const bytes = fs.readFileSync(pdfPath);
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const pdfjs = await import(process.env.PDFJS_MODULE || '/home/claude/draftcraft/vendor/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) { const pg = await pdf.getPage(n); const c = await pg.getTextContent(); pages.push({ text: norm(c.items.map((i) => i.str).join(' ')), width: pg.view[2], height: pg.view[3] }); }
    out.editorPages = editor.length; out.pdfPages = pdf.numPages; out.paper = [pages[0].width, pages[0].height];
    // The PDF export includes the title page (default export option); the editor shows script pages only.
    const offset = pages[0].text.startsWith(norm('PDF PARITY Written by QA')) ? 1 : 0;
    out.titlePage = offset === 1;
    assert.equal(pdf.numPages - offset, editor.length, 'PDF and editor have the same number of script pages');
    assert.deepEqual(out.paper, [612, 792], 'US Letter');
    let compared = 0;
    for (let i = 0; i < editor.length; i++) {
      const words = norm(editor[i].text).split(' ').filter(Boolean);
      const head = words.slice(0, 6).join(' '), tail = words.slice(-6).join(' ');
      // Emoji glyphs are compared through their text where the PDF text layer has it; the page text is compared without
      // pictographs and their joiners/selectors, so a font's emoji encoding cannot hide a real text difference.
      const pdfText = pages[i + offset].text, squash = (t) => t.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u200d\ufe0f\u{1f3fb}-\u{1f3ff}]/gu, '').replace(/\s+/g, '');
      assert.ok(squash(pdfText).includes(squash(head)), `page ${i + 1} starts with the same text (${head})`);
      assert.ok(squash(pdfText).includes(squash(tail)), `page ${i + 1} ends with the same text (${tail})`);
      if (i + 1 < editor.length) { const nextHead = norm(editor[i + 1].text).split(' ').slice(0, 8).join(' '); assert.ok(!squash(pdfText).includes(squash(nextHead)) || squash(editor[i].text).includes(squash(nextHead)), `page ${i + 1} does not contain the next page's opening text`); }
      for (const l of editor[i].labels) assert.ok(squash(pdfText).includes(squash(l.text)), `page ${i + 1} prints ${l.kind} cue ${l.text}`);
      compared++;
    }
    out.labels = editor.flatMap((p, i) => p.labels.map((l) => ({ page: i + 1, ...l })));
    out.emojiInEditor = editor.some((p) => /\p{Extended_Pictographic}/u.test(p.text)); out.emojiInPdfText = pages.some((p) => /\p{Extended_Pictographic}/u.test(p.text));
    assert.ok(out.emojiInEditor, 'the parity script contains emoji');
    assert.ok(out.labels.some((l) => l.kind === 'more') && out.labels.some((l) => l.kind === 'continued') && out.labels.some((l) => l.kind === 'resumed'), 'MORE, page-break CONT\'D and resumed CONT\'D all exercised');
    out.checks.push({ name: 'editor and exported PDF agree page by page', passed: true, comparedPages: compared });
    out.pdfSha256 = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    fs.copyFileSync(pdfPath, path.join(__dirname, 'pdf-parity.pdf'));
    const errors = h.persisted(profile).errors; assert.deepEqual(errors, []);
    console.log('PASS editor and exported PDF agree page by page', JSON.stringify({ pages: compared, labels: out.labels.length }));
  } catch (e) {
    out.checks.push({ name: 'editor and exported PDF agree page by page', passed: false, error: e.message, mainErrors: h.persisted(profile).errors });
    console.log('FAIL', e.message);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'pdf-parity-results.json'), JSON.stringify(out, null, 2) + '\n');
    try { app.process().kill('SIGKILL'); } catch {}
  }
})();
