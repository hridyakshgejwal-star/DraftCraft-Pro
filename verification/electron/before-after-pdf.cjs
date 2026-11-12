'use strict';
// Before/after PDF sample in real Electron: opens a document (the element list one build produced from the same
// keystrokes, see ../before-after-browser.cjs, followed by the same filler so the script runs past page 1) in the given
// packaged app and exports it with File > Export PDF… > Export Screenplay PDF.
// Usage: xvfb-run -a node --import tsx before-after-pdf.cjs <app.asar> <before-after.json> <build label> <out.pdf>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.cjs');
const [appDir, summaryPath, label, outPdf] = process.argv.slice(2).map((v, i) => (i === 2 ? v : path.resolve(v)));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')), built = summary.builds[label];
  assert.ok(built, 'build ' + label + ' in ' + summaryPath);
  const filler = Array.from({ length: 60 }, (_, k) => ({ type: 'Action', text: 'The lantern light crosses the water again (' + (k + 1) + '), and the dock creaks under the weight of the tide.' }));
  const paragraphs = [...built.paragraphs, ...filler].map((p, i) => ({ id: 'ba' + i, type: p.type, text: p.text }));
  const ctx = await h.launch({ appDir });
  const { app, documents } = ctx;
  try {
    const project = path.join(documents, 'Before-After.draftcraft'), pdfPath = path.join(documents, 'Before-After.pdf');
    // The format is the one this build gave the new script (File > New) in ../before-after-browser.cjs.
    const doc = { id: 'before-after', ...(built.writingFormat ? { writingFormat: built.writingFormat } : {}), titlePage: { title: 'THE LAST KEEPER', author: 'QA', draftDate: '', contact: '', copyright: '', includeInPdf: false }, paragraphs, beats: [], flowLines: [], outlineLanes: [], outlineMarkers: [], characterHighlights: {}, productionMode: false, lockedPages: false, showScriptNotes: false, showSceneComments: false, lastSavedAt: new Date().toISOString() };
    fs.writeFileSync(project, JSON.stringify({ format: 'draftcraft-project', version: 1, document: doc }, null, 2));
    const win = await h.editorWindow(app); await pause(2000);
    await h.answer(app, { open: [project], save: [pdfPath] });
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Open…').click());
    await win.waitForFunction((first) => [...document.querySelectorAll('textarea[data-editor-paragraph]')].some((t) => t.value === first), paragraphs[0].text, { timeout: 30000 });
    await pause(2000);
    const f = built.writingFormat, format = f ? { templateVersion: f.templateVersion, parentheticalRight: f.elements.Parenthetical.right, transitionPunctuation: f.transitionPunctuation } : 'app default';
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Export PDF…').click());
    await win.getByRole('button', { name: 'Export Screenplay PDF' }).click({ timeout: 20000 });
    const deadline = Date.now() + 60000; while (!fs.existsSync(pdfPath) && Date.now() < deadline) await pause(300);
    assert.ok(fs.existsSync(pdfPath), 'PDF written'); await pause(500);
    fs.mkdirSync(path.dirname(outPdf), { recursive: true }); fs.copyFileSync(pdfPath, outPdf);
    console.log(JSON.stringify({ label, pdf: outPdf, bytes: fs.statSync(outPdf).size, format }));
  } finally { await app.close().catch(() => {}); }
})().catch((e) => { console.error(e); process.exit(1); });
