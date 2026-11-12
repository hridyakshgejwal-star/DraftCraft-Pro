'use strict';
// Real Electron: for each listed template, open a native project in that format, export a PDF with
// "Export Screenplay PDF" (printToPDF), and compare where every element's first line lands on the PDF page with the
// template definition and with the editor. Usage:
//   xvfb-run -a node --import tsx pdf-geometry.cjs <app dir or app.asar> [template names...]
// Set PDF_GEOMETRY_KEEP=<dir> to keep each exported PDF as <dir>/<template id>.pdf.
// Writes pdf-geometry-results.json next to this script and exits non-zero when any element is off by more than the
// tolerance (2 pt horizontally, 3 pt vertically). It also checks the page header band (above the top margin): page 1
// carries nothing there, and every later page carries only its page number, right-aligned — no title or other text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.cjs');
const { FORMAT_TEMPLATES } = require('../../src/formats/catalog.ts');
const { paragraphGap, styleFor } = require('../../src/formats/model.ts');
const appDir = path.resolve(process.argv[2]);
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['Standard Feature Screenplay', 'BBC Screenplay', 'Shooting Script', 'Multi-Camera Sitcom', 'One-Hour TV Drama', 'Stageplay', 'Graphic Novel', 'Podcast Script'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const TEXT = { 'Scene Heading': 'INT. STATION {n} - NIGHT', Action: 'Rain taps the window {n}. A traveler sets down a worn suitcase and studies the board.', Character: 'ALEX {n}', Parenthetical: '(quietly {n})', Dialogue: 'There is still time {n} to change our plans if we leave before the last train goes.', Transition: 'CUT TO {n}:', Shot: 'CLOSE ON CLOCK {n}', 'New Act': 'ACT {n}', 'End of Act': 'END OF ACT {n}', 'Stage Direction': '(Alex looks up {n}.)', 'Comic Page': 'PAGE {n}', Panel: 'PANEL {n}', 'Panel Description': 'A traveler {n} stands under the station clock.', Caption: 'The last departure {n}.', 'Sound Effect': 'CLACK {n}', Narration: 'It was late {n}.', 'Song Title': 'THE ROAD HOME {n}', Lyrics: 'One more mile {n} along the line', 'Centered Text': 'THE END {n}' };
const ORDER = ['New Act', 'Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Shot', 'Action', 'Character', 'Dialogue', 'Transition', 'Scene Heading', 'Stage Direction', 'Character', 'Dialogue', 'Song Title', 'Lyrics', 'Comic Page', 'Panel', 'Panel Description', 'Caption', 'Character', 'Dialogue', 'Sound Effect', 'Narration', 'End of Act'];
const norm = (t) => t.replace(/\s+/g, ' ').trim();

async function measure(template) {
  const f = structuredClone(template.format);
  const types = ORDER.filter((e) => f.supported.includes(e));
  const paragraphs = types.map((type, i) => ({ id: 'g' + i, type, text: (TEXT[type] || type + ' {n}').replace('{n}', String(i + 1)) }));
  // Filler after the measured elements so every template produces at least three pages for the header check.
  const fillerType = ['Action', 'Stage Direction', 'Panel Description', 'General'].find((e) => f.supported.includes(e)) || types[0];
  const filler = Array.from({ length: 70 }, (_, k) => ({ id: 'f' + k, type: fillerType, text: 'Filler paragraph number ' + (k + 1) + ' keeps the page count above two.' }));
  const doc = { id: 'pdf-geometry-' + template.id, titlePage: { title: 'GEOMETRY', author: 'QA', draftDate: '', contact: '', copyright: '', includeInPdf: false }, paragraphs: [...paragraphs, ...filler], writingFormat: f, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, productionMode: false, lockedPages: false, showScriptNotes: false, showSceneComments: false, showBookmarks: false, lastSavedAt: new Date().toISOString() };
  const ctx = await h.launch({ appDir });
  const { app, documents, profile } = ctx;
  try {
    const project = path.join(documents, 'Geometry.draftcraft'), pdfPath = path.join(documents, 'Geometry.pdf');
    fs.writeFileSync(project, JSON.stringify({ format: 'draftcraft-project', version: 1, document: doc }, null, 2));
    const win = await h.editorWindow(app); await pause(2000);
    await h.answer(app, { open: [project], save: [pdfPath] });
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Open…').click());
    await win.waitForFunction((first) => [...document.querySelectorAll('textarea[data-editor-paragraph]')].some((t) => t.value === first), paragraphs[0].text, { timeout: 30000 });
    await pause(2000);
    const editor = await win.evaluate((ids) => ids.map((id) => { const t = document.getElementById('input-' + id); if (!t) return null; const page = t.closest('.script-page'), pr = page.getBoundingClientRect(), r = t.getBoundingClientRect(); return { left: (r.left - pr.left) / 96 * 72, right: (pr.right - r.right) / 96 * 72, page: [...document.querySelectorAll('.script-page')].indexOf(page) }; }), paragraphs.map((p) => p.id));
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Export PDF…').click());
    await win.getByRole('button', { name: 'Export Screenplay PDF' }).click({ timeout: 20000 });
    const deadline = Date.now() + 60000; while (!fs.existsSync(pdfPath) && Date.now() < deadline) await pause(300);
    assert.ok(fs.existsSync(pdfPath), 'PDF written');
    await pause(500);
    const bytes = fs.readFileSync(pdfPath);
    if (process.env.PDF_GEOMETRY_KEEP) { fs.mkdirSync(process.env.PDF_GEOMETRY_KEEP, { recursive: true }); fs.writeFileSync(path.join(process.env.PDF_GEOMETRY_KEEP, template.id + '.pdf'), bytes); }
    const pdfjs = await import(process.env.PDFJS_MODULE || '/home/claude/draftcraft/vendor/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true }).promise;
    const lines = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const pg = await pdf.getPage(n), c = await pg.getTextContent();
      const items = c.items.filter((i) => i.str.trim()).map((i) => ({ x: i.transform[4], y: pg.view[3] - i.transform[5], w: i.width, s: i.str }));
      items.sort((a, b) => a.y - b.y || a.x - b.x);
      for (const it of items) { const line = lines.find((l) => l.page === n && Math.abs(l.y - it.y) < 2); if (line) { line.items.push(it); } else lines.push({ page: n, y: it.y, items: [it] }); }
    }
    for (const l of lines) { l.items.sort((a, b) => a.x - b.x); l.x = l.items[0].x; l.right = Math.max(...l.items.map((i) => i.x + i.w)); l.text = norm(l.items.map((i) => i.s).join(' ')); }
    const pageWidthPt = f.page.width * 72;
    const rows = []; let prev = null;
    for (const [i, p] of paragraphs.entries()) {
      const s = styleFor(f, p), want = norm((s.caps ? p.text.toUpperCase() : p.text)).split(' ').slice(0, 5).join(' ');
      const line = lines.find((l) => !l.used && l.text.startsWith(want)) || lines.find((l) => !l.used && l.text.includes(want)); if (line) line.used = true;
      const expectLeft = (f.page.left + s.left + (s.first > 0 ? s.first : 0)) * 72, expectRight = (f.page.width - f.page.right - s.right) * 72;
      const row = { type: p.type, align: s.align, found: !!line };
      if (line) {
        row.pdfLeft = +line.x.toFixed(1); row.pdfRight = +line.right.toFixed(1); row.page = line.page; row.y = +line.y.toFixed(1);
        row.expectLeft = +expectLeft.toFixed(1); row.expectRight = +expectRight.toFixed(1);
        row.editorLeft = editor[i] ? +(editor[i].left).toFixed(1) : null; row.editorRightMargin = editor[i] ? +(editor[i].right).toFixed(1) : null;
        if (s.align === 'left' || s.align === 'justify') row.dx = +(line.x - expectLeft).toFixed(1);
        else if (s.align === 'right') row.dx = +(line.right - expectRight).toFixed(1);
        else row.dx = +(((line.x + line.right) / 2) - ((f.page.left + s.left) * 72 + (expectRight - (f.page.left + s.left) * 72) / 2)).toFixed(1);
        if (prev && prev.line && prev.line.page === line.page) { const prevLines = lines.filter((l) => l.page === line.page && l.y >= prev.line.y - 0.5 && l.y < line.y - 0.5).length; const pitch = styleFor(f, prev.p).line; row.gapPt = +(line.y - prev.line.y - prevLines * pitch).toFixed(1); row.expectGapPt = paragraphGap(prev.p, p, f, false); row.dy = +(row.gapPt - row.expectGapPt).toFixed(1); }
      }
      rows.push(row); prev = { p, line };
    }
    const problems = rows.filter((r) => !r.found || Math.abs(r.dx) > 2 || (r.dy !== undefined && Math.abs(r.dy) > 3));
    // Header band: everything above the top margin on each page.
    const header = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const band = lines.filter((l) => l.page === n && l.y < f.page.top * 72 - 2);
      const text = band.map((l) => l.text).join(' | ');
      const only = band.length === 1 ? band[0] : null;
      const numberOnly = !!only && /^[A-Z0-9][A-Z0-9.\-]*$/i.test(only.text) && /\d/.test(only.text) && only.right > pageWidthPt / 2 && Math.abs(only.right - (f.page.width - f.page.right) * 72) <= 3;
      const ok = n === 1 ? band.length === 0 : numberOnly;
      header.push({ page: n, text, right: only ? +only.right.toFixed(1) : null, ok });
      if (!ok) problems.push({ type: 'header band', page: n, text, expected: n === 1 ? 'empty' : 'page number only, right edge ' + ((f.page.width - f.page.right) * 72).toFixed(1) + 'pt' });
    }
    if (pdf.numPages < 3) problems.push({ type: 'header band', pages: pdf.numPages, expected: 'at least 3 pages' });
    const errors = h.persisted(profile).errors;
    return { template: template.name, paper: [pdf.numPages ? (await pdf.getPage(1)).view.slice(2) : []], pages: pdf.numPages, pageWidthPt, rows, header, problems, errors };
  } finally { await app.close().catch(() => {}); }
}

(async () => {
  const results = [];
  for (const name of names) {
    const t = FORMAT_TEMPLATES.find((x) => x.name === name);
    if (!t) { console.log('SKIP unknown template', name); continue; }
    const r = await measure(t); results.push(r);
    console.log((r.problems.length || r.errors.length ? 'DIFF ' : 'OK   ') + name + ' ' + JSON.stringify(r.paper));
    for (const p of r.problems) console.log('     ', JSON.stringify(p));
    for (const e of r.errors) console.log('      error:', e.slice(0, 200));
  }
  fs.writeFileSync(path.join(__dirname, 'pdf-geometry-results.json'), JSON.stringify(results, null, 1));
  if (results.some((r) => r.problems.length || r.errors.length)) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });
