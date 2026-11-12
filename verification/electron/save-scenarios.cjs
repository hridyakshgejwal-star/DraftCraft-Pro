'use strict';
// Save and persistence scenarios in the real Electron app (Linux: run under Xvfb). Each scenario launches the app with
// an isolated profile and documents folder; only native dialogs are scripted. Exits non-zero when an assertion fails.
// Usage: xvfb-run -a node save-scenarios.cjs <app dir or app.asar> [scenario,...]
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.cjs');
const appDir = path.resolve(process.argv[2]);
const only = new Set((process.argv[3] || '').split(',').filter(Boolean));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const menu = (app, top, label) => app.evaluate(({ Menu }, a) => Menu.getApplicationMenu().items.find((i) => i.label === a.top).submenu.items.find((i) => i.label === a.label).click(), { top, label });
const status = (win) => win.evaluate(() => { const s = document.querySelector('.dc-save-status'); return s ? s.innerText.replace(/\s+/g, ' ').trim() : '(no status)'; });
const stored = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('draftcraft_screenplay_doc_v1') || 'null'));
const project = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).document; } catch { return null; } };
const has = (f, t) => JSON.stringify(project(f)?.paragraphs || []).includes(t);
const recoveryHas = (profile, t) => { const dir = path.join(profile, 'Project Recovery'); try { return fs.readdirSync(dir).some((n) => fs.readFileSync(path.join(dir, n), 'utf8').includes(t)); } catch { return false; } };
let failures = 0, passed = 0;
function check(ok, label, detail = '') { if (ok) { passed++; console.log('   ok   ' + label); } else { failures++; console.log('   FAIL ' + label + (detail ? ' — ' + detail : '')); } }
async function until(fn, ms = 8000) { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await pause(150); } return v; }
async function typeAtEnd(win, text) {
  const d = await stored(win); const p = [...d.paragraphs].reverse().find((x) => ['Action', 'General'].includes(x.type)) || d.paragraphs.at(-1);
  const input = win.locator('#input-' + p.id); await input.click(); await win.keyboard.press('End'); await win.keyboard.type(text, { delay: 8 }); await pause(400);
}
async function savedOnce(ctx, name) {
  const win = await h.editorWindow(ctx.app); await pause(2500);
  const file = path.join(ctx.documents, name);
  await typeAtEnd(win, ' Saved once.'); await h.answer(ctx.app, { save: [file] }); await menu(ctx.app, 'File', 'Save Project…');
  await until(async () => (await status(win)) === 'Saved' && has(file, 'Saved once.'));
  return { win, file };
}
async function run(name, fn) {
  if (only.size && !only.has(name)) return;
  const ctx = await h.launch({ appDir });
  try { console.log('== ' + name); await fn(ctx); } catch (e) { failures++; console.log('   FAIL scenario error: ' + e.message.split('\n')[0]); }
  finally { const p = h.persisted(ctx.profile); if (p.errors.length) { failures++; console.log('   FAIL main-process errors: ' + JSON.stringify(p.errors).slice(0, 400)); } try { ctx.app.process().kill('SIGKILL'); } catch {} await pause(300); }
}
(async () => {
  await run('saved-only-after-write', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Slow.draftcraft');
    await ctx.app.evaluate(() => { const fs = process.mainModule.require('node:fs'); const rename = fs.promises.rename; globalThis.__dcRestoreRename = () => { fs.promises.rename = rename; }; fs.promises.rename = async (...a) => { await new Promise((r) => setTimeout(r, 2500)); return rename(...a); }; });
    await typeAtEnd(win, ' Slow write.'); check(/Unsaved Changes/.test(await status(win)), 'edit shows Unsaved Changes', await status(win));
    await menu(ctx.app, 'File', 'Save Project…');
    const during = await until(async () => /Saving/.test(await status(win)) && (await status(win)), 2000);
    check(/Saving/.test(during || ''), 'a save in progress shows Saving…', during);
    check(!has(file, 'Slow write.'), 'the file does not contain the edit before the write completes');
    check(!/^Saved/.test(await status(win)), 'Saved is not shown before the write completes', await status(win));
    const after = await until(async () => (await status(win)) === 'Saved' && has(file, 'Slow write.'), 8000);
    check(!!after, 'Saved appears once the file contains the edit', await status(win));
    await ctx.app.evaluate(() => globalThis.__dcRestoreRename());
  });
  await run('autosave-and-reopen', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Auto.draftcraft');
    await typeAtEnd(win, ' Autosaved later.');
    check(/Unsaved Changes/.test(await status(win)), 'typing shows Unsaved Changes');
    check(!!await until(() => has(file, 'Autosaved later.'), 20000), 'autosave writes the latest text');
    check(!!await until(async () => (await status(win)) === 'Saved'), 'status returns to Saved');
    const doc = await stored(win), saved = project(file);
    check(JSON.stringify(saved.paragraphs.map((p) => [p.type, p.text])) === JSON.stringify(doc.paragraphs.map((p) => [p.type, p.text])), 'file has the same element types and text as the editor');
    check(saved.titlePage.title === doc.titlePage.title && JSON.stringify(saved.writingFormat) === JSON.stringify(doc.writingFormat), 'file has the same title and format');
    const fresh = await h.launch({ appDir, documents: ctx.documents });
    try {
      const w = await h.editorWindow(fresh.app); await pause(2500);
      await h.answer(fresh.app, { open: [file], message: [1, 1] }); await menu(fresh.app, 'File', 'Open…');
      const opened = await until(async () => { const d = await stored(w); return d && JSON.stringify(d.paragraphs).includes('Autosaved later.') && d; }, 10000);
      check(!!opened, 'the file opens in a new session with the latest text');
      check(opened && JSON.stringify(opened.paragraphs.map((p) => [p.type, p.text])) === JSON.stringify(doc.paragraphs.map((p) => [p.type, p.text])), 'reopened element types and text match');
      check(opened && opened.titlePage.title === doc.titlePage.title && JSON.stringify(opened.writingFormat) === JSON.stringify(doc.writingFormat), 'reopened title and format match');
      check(/Saved/.test(await status(w)) && !/Unsaved/.test(await status(w)), 'a freshly opened file is Saved', await status(w));
    } finally { try { fresh.app.process().kill('SIGKILL'); } catch {} }
  });
  await run('failed-save-and-retry', async (ctx) => {
    const dir = path.join(ctx.documents, 'Drive'); fs.mkdirSync(dir);
    const { win } = await savedOnce(ctx, 'Drive/Locked.draftcraft'); const file = path.join(dir, 'Locked.draftcraft');
    const away = path.join(ctx.documents, 'unplugged', 'elsewhere'); fs.mkdirSync(path.dirname(away)); fs.renameSync(dir, away); // the drive or folder disappears
    await typeAtEnd(win, ' While unavailable.'); await h.answer(ctx.app, { message: [1, 1, 1] }); await menu(ctx.app, 'File', 'Save Project…');
    const failed = await until(async () => /Save Failed/.test(await status(win)) && (await status(win)), 8000);
    check(!!failed, 'an unavailable save location shows Save Failed', await status(win));
    check(/folder that contains “Locked.draftcraft” is unavailable/.test(failed || ''), 'the message names the file and the cause', failed);
    check(await win.getByRole('button', { name: /^retry$/i }).count() === 1 && await win.getByRole('button', { name: /save as/i }).count() >= 1, 'Retry and Save As are offered');
    check(recoveryHas(ctx.profile, 'While unavailable.'), 'the unsaved edit is kept in a recovery copy');
    check(JSON.stringify((await stored(win)).paragraphs).includes('While unavailable.'), 'the edit stays in the editor');
    fs.renameSync(away, dir);
    await win.getByRole('button', { name: /^retry$/i }).click();
    check(!!await until(async () => (await status(win)) === 'Saved' && has(file, 'While unavailable.')), 'Retry saves once the folder is back', await status(win));
  });
  await run('renamed-while-open', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Draft.draftcraft'); const renamed = path.join(ctx.documents, 'Draft renamed.draftcraft');
    fs.renameSync(file, renamed);
    await typeAtEnd(win, ' Two after rename.');
    check(!!await until(() => has(renamed, 'Two after rename.'), 20000), 'autosave follows the renamed file');
    check(!fs.existsSync(file), 'the old name is not recreated');
    check(!!await until(async () => (await status(win)) === 'Saved'), 'status is Saved', await status(win));
    await typeAtEnd(win, ' Three.'); await menu(ctx.app, 'File', 'Save Project…');
    check(!!await until(() => has(renamed, 'Three.')), 'manual save writes the renamed file');
  });
  await run('folder-renamed-while-open', async (ctx) => {
    const dir = path.join(ctx.documents, 'Season 1'); fs.mkdirSync(dir);
    const { win } = await savedOnce(ctx, 'Season 1/Pilot.draftcraft'); const moved = path.join(ctx.documents, 'Season One', 'Pilot.draftcraft');
    fs.renameSync(dir, path.dirname(moved));
    await typeAtEnd(win, ' Folder renamed.');
    check(!!await until(() => has(moved, 'Folder renamed.'), 20000), 'autosave follows the renamed folder');
    check(!fs.existsSync(dir), 'the old folder is not recreated');
  });
  await run('moved-away-while-open', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Gone.draftcraft');
    const elsewhere = path.join(ctx.documents, 'Archive'); fs.mkdirSync(elsewhere); fs.renameSync(file, path.join(elsewhere, 'Gone.draftcraft'));
    await typeAtEnd(win, ' After the move.'); await h.answer(ctx.app, { message: [1, 1, 1] }); await menu(ctx.app, 'File', 'Save Project…');
    const failed = await until(async () => /Save Failed/.test(await status(win)) && (await status(win)), 8000);
    check(/“Gone.draftcraft” was moved, renamed or deleted outside DraftCraft/.test(failed || ''), 'a project moved elsewhere fails with an accurate message', failed || await status(win));
    check(!fs.existsSync(file), 'no new file is created at the old location');
    check(recoveryHas(ctx.profile, 'After the move.'), 'the edit is kept in a recovery copy');
  });
  await run('external-reserialization', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Ext.draftcraft');
    fs.writeFileSync(file, JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')))); // same content, different bytes
    await typeAtEnd(win, ' After touch.');
    check(!!await until(() => has(file, 'After touch.'), 20000), 'a byte-different file with the same content is not a conflict');
    check(!!await until(async () => (await status(win)) === 'Saved'), 'status is Saved', await status(win));
  });
  await run('external-real-change', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Shared.draftcraft');
    const j = JSON.parse(fs.readFileSync(file, 'utf8')); j.document.paragraphs.push({ id: 'external-1', type: 'Action', text: 'Written by another app.' }); fs.writeFileSync(file, JSON.stringify(j, null, 2));
    await typeAtEnd(win, ' Mine.'); await h.answer(ctx.app, { message: [1, 1, 1] }); await menu(ctx.app, 'File', 'Save Project…');
    const failed = await until(async () => /Save Failed/.test(await status(win)) && (await status(win)), 8000);
    check(/“Shared.draftcraft” was changed by another app/.test(failed || ''), 'a real outside change is refused with an accurate message', failed || await status(win));
    check(has(file, 'Written by another app.') && !has(file, 'Mine.'), 'the other app’s version is not overwritten');
    check(recoveryHas(ctx.profile, 'Mine.'), 'this window’s edit is kept in a recovery copy');
  });
  await run('stale-save-rejected', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Race.draftcraft');
    await typeAtEnd(win, ' Older.'); await pause(300);
    await win.evaluate(() => { window.__old = localStorage.getItem('draftcraft_screenplay_doc_v1'); });
    await typeAtEnd(win, ' Newer.'); await menu(ctx.app, 'File', 'Save Project…');
    await until(() => has(file, 'Newer.'));
    const result = await win.evaluate(async () => { try { const r = await window.draftcraftDesktop.saveProject(window.__old, false, { sessionId: 'stale', revision: 1 }); return 'accepted ' + JSON.stringify(r).slice(0, 80); } catch (e) { return 'rejected ' + String(e.message || e); } });
    check(/^rejected/.test(result), 'an older snapshot cannot be saved over a newer one', result);
    check(has(file, 'Newer.'), 'the file keeps the newer text');
    for (let i = 0; i < 6; i++) { await win.keyboard.type(' Burst' + i + '.', { delay: 0 }); if (i % 2) void menu(ctx.app, 'File', 'Save Project…'); }
    await pause(500); await menu(ctx.app, 'File', 'Save Project…');
    check(!!await until(() => has(file, 'Burst5.'), 20000), 'overlapping manual and automatic saves end with the latest text');
    const doc = await stored(win); check(JSON.stringify(project(file).paragraphs.map((p) => p.text)) === JSON.stringify(doc.paragraphs.map((p) => p.text)), 'file equals the editor after overlapping saves');
  });
  await run('focus-after-save', async (ctx) => {
    const { win } = await savedOnce(ctx, 'Focus.draftcraft');
    await typeAtEnd(win, ' Second');
    const before = await win.evaluate(() => ({ id: document.activeElement.id, start: document.activeElement.selectionStart }));
    await menu(ctx.app, 'File', 'Save Project…'); await until(async () => (await status(win)) === 'Saved');
    const after = await win.evaluate(() => ({ id: document.activeElement.id, start: document.activeElement.selectionStart }));
    check(after.id === before.id && after.start === before.start, 'Save keeps the caret where it was', JSON.stringify({ before, after }));
    await win.keyboard.type(' keeps typing'); await pause(400);
    check(JSON.stringify((await stored(win)).paragraphs).includes('Second keeps typing'), 'typing right after Save continues in the same element');
  });
  await run('relaunch-restores', async (ctx) => {
    const { win, file } = await savedOnce(ctx, 'Relaunch.draftcraft');
    await typeAtEnd(win, ' Typed just before quit.'); const before = await stored(win);
    await h.answer(ctx.app, { message: [0, 0, 0] }); await ctx.app.evaluate(({ app }) => app.quit()); await pause(4000);
    check(has(file, 'Typed just before quit.'), 'quitting saves the last edit to the file');
    const again = await h.launch({ appDir, profile: ctx.profile, documents: ctx.documents });
    try { const w = await h.editorWindow(again.app); await pause(3000); const after = await stored(w);
      check(after.id === before.id && JSON.stringify(after.paragraphs).includes('Typed just before quit.'), 'relaunch restores the same project with the last edit');
      check((await status(w)) === 'Saved', 'relaunched project is Saved', await status(w));
    } finally { try { again.app.process().kill('SIGKILL'); } catch {} }
  });
  console.log(`\n${passed} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
