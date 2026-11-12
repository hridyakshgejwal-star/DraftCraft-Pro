'use strict';
// Real Electron 44.7.0 window-lifecycle scenarios (Linux/Xvfb). Native dialogs
// are answered by script; every other part (main process, IPC, save
// coordinator, atomic writes, renderer close transaction) is the real app.
// Usage: xvfb-run -a node lifecycle-scenarios.cjs <stagedAppDir> [scenario,...]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./harness.cjs');
const appDir = path.resolve(process.argv[2] || '../../../desktop-build/app');
const only = new Set((process.argv[3] || '').split(',').filter(Boolean));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function windowsOf(app) { return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).map((w) => w.id).sort((a, b) => a - b)); }
async function closeWindow(app, index = 0) { await app.evaluate(({ BrowserWindow }, i) => { const all = BrowserWindow.getAllWindows().sort((a, b) => a.id - b.id); all[i].close(); }, index); }
async function newDocumentWindow(app) { await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'New Document Window').click()); }
// Types at the end of the first Action paragraph (Scene Headings are auto-capitalized).
async function actionInput(win) {
  const id = await win.evaluate(() => { const doc = JSON.parse(localStorage.getItem('draftcraft_screenplay_doc_v1') || 'null'); const a = doc?.paragraphs?.find((p) => p.type === 'Action'); return a ? 'input-' + a.id : null; });
  return id ? win.locator('#' + id) : win.locator('textarea[id^="input-"]').nth(1);
}
async function typeInto(win, text) {
  const input = await actionInput(win);
  await input.click();
  await win.keyboard.press('End');
  await win.keyboard.type(text, { delay: 5 });
  await pause(400);
}
async function waitFor(fn, ms = 15000, label = 'condition') { const end = Date.now() + ms; let last; while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await pause(150); } throw new Error('timeout waiting for ' + label + ' ' + (last instanceof Error ? last.message : JSON.stringify(last))); }
async function kill(app) { try { app.process().kill('SIGKILL'); } catch {} await pause(300); }
async function exited(app) { try { await app.evaluate(() => 1); return false; } catch { return true; } }

async function scenario(name, fn) {
  if (only.size && !only.has(name)) return;
  const ctx = await h.launch({ appDir });
  const started = Date.now();
  try {
    await fn(ctx);
    const p = h.persisted(ctx.profile);
    assert.deepEqual(p.errors, [], 'main-process exceptions');
    results.push({ name, passed: true, ms: Date.now() - started });
    console.log('PASS', name);
  } catch (e) {
    const p = h.persisted(ctx.profile);
    results.push({ name, passed: false, error: e.message, mainErrors: p.errors, dialogs: p.dialogs });
    console.log('FAIL', name, e.message, JSON.stringify(p.errors).slice(0, 600));
  } finally { await kill(ctx.app); }
}

(async () => {
  await scenario('close unmodified window (red button / Cmd+W) with another window open', async ({ app }) => {
    await h.editorWindow(app); await pause(2500);
    await newDocumentWindow(app); await waitFor(async () => (await windowsOf(app)).length === 2, 20000, 'second window');
    await pause(2500);
    await closeWindow(app, 0);
    await waitFor(async () => (await windowsOf(app)).length === 1, 10000, 'first window closed');
    await pause(1500);
    const st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message').length, 0, 'unmodified close must not prompt');
    // The surviving window keeps working and the app can still open a new window.
    await newDocumentWindow(app); await waitFor(async () => (await windowsOf(app)).length === 2, 20000, 'window after close');
  });

  await scenario('modified new document: Cancel keeps window, Don\'t Save closes', async ({ app, profile }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Unsaved closing words.');
    await h.answer(app, { message: [2] }); // Cancel
    await closeWindow(app, 0); await pause(3000);
    assert.equal((await windowsOf(app)).length, 1, 'Cancel must keep the window');
    let st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message' && d.message === 'Save Your Screenplay?').length, 1, 'exactly one Save prompt');
    assert.ok((await (await actionInput(win)).inputValue()).includes('Unsaved closing words.'), 'text kept after cancel');
    await h.answer(app, { message: [1] }); // Don't Save
    await closeWindow(app, 0);
    await waitFor(() => exited(app), 15000, 'app exit after last window (Linux)');
    const dialogs = h.persisted(profile).dialogs.filter((d) => d.kind === 'showMessageBox');
    assert.equal(dialogs.length, 2, 'one prompt per close attempt');
  });

  await scenario('modified new document: Save writes a real project file and remembers it', async ({ app, profile, documents }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Saved on close.');
    const target = path.join(documents, 'Closing Test.draftcraft');
    await h.answer(app, { message: [0], save: [target] });
    await closeWindow(app, 0);
    await waitFor(() => exited(app), 20000, 'app exit after save');
    const file = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.equal(file.format, 'draftcraft-project');
    assert.ok(JSON.stringify(file.document.paragraphs).includes('Saved on close.'));
    const locations = JSON.parse(fs.readFileSync(path.join(profile, 'project-locations.json'), 'utf8'));
    assert.equal(Object.values(locations)[0], target);
    // Relaunch with the same profile: the project reopens from its file without prompting.
    const again = await h.launch({ appDir, profile, documents });
    try {
      const w2 = await h.editorWindow(again.app); await pause(3000);
      const text = await w2.evaluate(() => [...document.querySelectorAll('textarea[id^="input-"]')].map((t) => t.value).join('\n'));
      assert.ok(text.includes('Saved on close.'), 'content restored on relaunch');
      await typeInto(w2, ' Second session.');
      await closeWindow(again.app, 0);
      await waitFor(() => exited(again.app), 20000, 'exit after autosaved close');
      const st2 = h.persisted(profile);
      assert.equal(st2.dialogs.filter((d) => d.kind === 'showSaveDialog').length, 1, 'no second first-save location prompt');
      assert.ok(JSON.stringify(JSON.parse(fs.readFileSync(target, 'utf8')).document).includes('Second session.'), 'existing project saved automatically on close');
      assert.deepEqual(st2.errors, []);
    } finally { await kill(again.app); }
  });

  await scenario('Quit (Cmd+Q) with two modified windows prompts once per window and can be canceled', async ({ app }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' First window edit.');
    await newDocumentWindow(app); await waitFor(async () => (await windowsOf(app)).length === 2, 20000, 'second window');
    await pause(3000);
    await h.answer(app, { message: [2] }); // Cancel the first prompt
    await app.evaluate(({ app: a }) => a.quit());
    await pause(4000);
    assert.equal((await windowsOf(app)).length, 2, 'canceling a quit keeps every window');
    let st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message').length, 1, 'one prompt for the modified window');
    await h.answer(app, { message: [1] }); // Don't Save
    await app.evaluate(({ app: a }) => a.quit());
    await waitFor(() => exited(app), 20000, 'quit completes');
  });

  await scenario('close requested twice quickly shows a single dialog', async ({ app }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Double close.');
    await h.answer(app, { message: [2] });
    await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.close(); w.close(); });
    await pause(3500);
    const st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message').length, 1);
    assert.equal((await windowsOf(app)).length, 1);
  });

  await scenario('closing while an autosave is in flight keeps the latest text', async ({ app, documents }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Prepare.');
    const target = path.join(documents, 'Flight.draftcraft');
    await h.answer(app, { save: [target] });
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === 'Save Project…').click());
    await waitFor(() => fs.existsSync(target), 15000, 'first save');
    await pause(800);
    await typeInto(win, ' Typed right before closing.');
    await closeWindow(app, 0);
    await waitFor(() => exited(app), 20000, 'exit');
    assert.ok(JSON.stringify(JSON.parse(fs.readFileSync(target, 'utf8')).document).includes('Typed right before closing.'));
  });

  await scenario('renderer crash: Reload Editor restores the latest received text', async ({ app, profile }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Survives a renderer crash.');
    await win.evaluate(() => window.dispatchEvent(new Event('blur'))); await pause(2500); // autosave/recovery flush to main
    await h.answer(app, { message: [0] }); // Reload Editor
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer());
    await waitFor(async () => h.persisted(profile).dialogs.some((d) => d.args === 'The editor stopped unexpectedly'), 15000, 'crash dialog');
    // Playwright's Page object does not survive a renderer crash; read the reloaded
    // renderer through the main process instead.
    const text = await waitFor(async () => { const t = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript("[...document.querySelectorAll('textarea[id^=\\'input-\\']')].map(t=>t.value).join('\\n')")); return t && t.length ? t : null; }, 30000, 'reloaded editor');
    assert.ok(text.includes('Survives a renderer crash.'), 'reloaded editor shows the latest text');
  });

  await scenario('renderer crash: Close Window keeps a recovery copy and closes', async ({ app, profile }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Recovery after crash.');
    await win.evaluate(() => window.dispatchEvent(new Event('blur'))); await pause(2500);
    await h.answer(app, { message: [1] }); // Close Window
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer());
    await waitFor(() => exited(app), 20000, 'window closes after crash');
    const dir = path.join(profile, 'Project Recovery');
    const copies = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')) : [];
    assert.ok(copies.some((c) => c.includes('Recovery after crash.')), 'recovery copy contains the latest text');
  });

  await scenario('relaunch after a crash offers the recovery copy and Restore brings the text back', async ({ app, profile, documents }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Restored after relaunch.');
    await win.evaluate(() => window.dispatchEvent(new Event('blur'))); await pause(2500);
    await h.answer(app, { message: [1] }); // Close Window after the crash
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer());
    await waitFor(() => exited(app), 20000, 'closed after crash');
    const again = await h.launch({ appDir, profile, documents });
    try {
      const w2 = await h.editorWindow(again.app); await pause(3000);
      await w2.getByText('Interrupted work is available for review.').waitFor({ timeout: 15000 });
      await w2.getByRole('button', { name: 'Review Recovery' }).first().click();
      await w2.getByRole('button', { name: 'Restore', exact: true }).first().click();
      await h.answer(again.app, { message: [1] }); // Don't Save the current (unchanged) document if asked
      await waitFor(async () => (await w2.evaluate(() => [...document.querySelectorAll('textarea[id^="input-"]')].map((t) => t.value).join('\n'))).includes('Restored after relaunch.'), 20000, 'restored text');
      assert.deepEqual(h.persisted(profile).errors, []);
    } finally { await kill(again.app); }
  });

  await scenario('close with an unavailable save folder offers Save As and loses nothing', async ({ app, profile, documents }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Survives a failed write.');
    const bad = path.join(documents, 'Unplugged Drive', 'Lost.draftcraft'), good = path.join(documents, 'Rescued.draftcraft');
    await h.answer(app, { message: [0, 1], save: [bad, good] }); // Save -> (write fails) -> Save As…
    await closeWindow(app, 0);
    await waitFor(() => exited(app), 30000, 'exit after rescue save');
    const dialogs = h.persisted(profile).dialogs.map((d) => d.args);
    assert.ok(dialogs.includes('The screenplay could not be saved'), 'failure dialog shown: ' + JSON.stringify(dialogs));
    assert.ok(!fs.existsSync(bad));
    assert.ok(JSON.stringify(JSON.parse(fs.readFileSync(good, 'utf8')).document).includes('Survives a failed write.'));
  });

  await scenario('hung editor: close watchdog offers Close Window and keeps a recovery copy', async ({ app, profile }) => {
    const win = await h.editorWindow(app); await pause(2500);
    await typeInto(win, ' Hung editor text.');
    await win.evaluate(() => window.dispatchEvent(new Event('blur'))); await pause(2500);
    await h.answer(app, { message: [1] }); // Close Window in the watchdog dialog
    void win.evaluate(() => { const end = Date.now() + 60000; while (Date.now() < end) {} }).catch(() => {});
    await pause(500);
    await closeWindow(app, 0);
    await waitFor(() => exited(app), 40000, 'watchdog close');
    const dialogs = h.persisted(profile).dialogs.map((d) => d.args);
    assert.ok(dialogs.includes('The editor has not responded'), 'watchdog asked the writer');
    const dir = path.join(profile, 'Project Recovery');
    const copies = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')) : [];
    assert.ok(copies.some((c) => c.includes('Hung editor text.')), 'recovery copy kept');
  });

  await scenario('Dock activate after the last window closed opens a new editor window (macOS app-stays-open branch)', async ({ app }) => {
    await h.editorWindow(app); await pause(2500);
    // macOS keeps the app running when its last window closes (main.cjs window-all-closed checks the
    // platform at event time). Only that branch is emulated here; Linux Electron has no Dock 'activate'
    // event, so it is emitted directly. This is not a macOS test.
    await app.evaluate(() => { Object.defineProperty(process, 'platform', { value: 'darwin' }); });
    await closeWindow(app, 0);
    await waitFor(async () => (await windowsOf(app)).length === 0, 15000, 'last window closed');
    await pause(800);
    assert.equal(await exited(app), false, 'the app keeps running with no windows');
    await app.evaluate(({ app }) => { app.emit('activate'); });
    await waitFor(async () => (await windowsOf(app)).length === 1, 20000, 'a new window after activate');
    const win = await h.editorWindow(app);
    await win.locator('.script-page').first().waitFor({ timeout: 20000 });
  });

  await scenario('right-click: script text opens the page and text menu, other text fields get the standard editing menu', async ({ app }) => {
    const win = await h.editorWindow(app); await win.locator('.script-page').first().waitFor({ timeout: 20000 }); await pause(1500);
    await app.evaluate(({ Menu }) => { globalThis.__dc.menus = []; Menu.prototype.popup = function () { globalThis.__dc.menus.push(this.items.map((i) => i.type === 'separator' ? '-' : (i.role || i.label))); }; });
    const input = await actionInput(win); await input.click({ button: 'right' });
    const menu = win.getByRole('menu'); await menu.waitFor({ timeout: 5000 });
    for (const name of ['Copy Selected Text', 'Paste Text at Caret', 'Insert ScriptNote…', 'Element ▸']) assert.equal(await menu.getByRole('menuitem', { name, exact: true }).count(), 1, name);
    await menu.getByRole('menuitem', { name: 'Element ▸' }).click(); await menu.getByRole('menuitemradio', { name: /^Character$/ }).click(); await pause(700);
    assert.equal(await win.evaluate((id) => JSON.parse(localStorage.getItem('draftcraft_screenplay_doc_v1')).paragraphs.find((p) => 'input-' + p.id === id)?.type, await input.getAttribute('id')), 'Character', 'the picked element is applied');
    assert.deepEqual(await app.evaluate(() => globalThis.__dc.menus), [], 'the script menu replaces the native one');
    const field = win.getByPlaceholder(/^Filter /).first(); await field.click(); await win.keyboard.type('kit'); await field.click({ button: 'right' }); await pause(600);
    const menus = await app.evaluate(() => globalThis.__dc.menus);
    // Electron reports roles in lower case.
    assert.deepEqual(menus.at(-1)?.map((r) => String(r).toLowerCase()), ['undo', 'redo', '-', 'cut', 'copy', 'paste', '-', 'selectall'], JSON.stringify(menus));
  });

  fs.writeFileSync(path.join(__dirname, 'lifecycle-results.json'), JSON.stringify({ appDir, electron: '44.7.0 linux-x64', results }, null, 2) + '\n');
  const failed = results.filter((r) => !r.passed);
  console.log(JSON.stringify({ total: results.length, failed: failed.length }));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
