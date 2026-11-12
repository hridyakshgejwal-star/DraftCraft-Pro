'use strict';
// Real Electron 44.7.0 Start Window and recent-project scenarios (1.18, Linux/Xvfb). Native open and save dialogs
// are answered by script; the main process (recent-projects.json, start-window.json, File › Open Recent), the IPC
// bridge, the save coordinator and the renderer are the real app.
// Usage: xvfb-run -a node start-window-scenarios.cjs <stagedAppDir> [scenario,...]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const h = require('./harness.cjs');
const appDir = path.resolve(process.argv[2] || '../../../desktop-build/app');
const only = new Set((process.argv[3] || '').split(',').filter(Boolean));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version;

const FOUNTAIN = (title, place) => 'Title: ' + title + '\n\nINT. ' + place + ' - DAY\n\nA quiet room. Nothing moves.\n\nANNA\nIs it working?\n';
async function waitFor(fn, ms = 15000, label = 'condition') { const end = Date.now() + ms; let last; while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await pause(150); } throw new Error('timeout waiting for ' + label + ' ' + (last instanceof Error ? last.message : JSON.stringify(last))); }
async function kill(app) { try { app.process().kill('SIGKILL'); } catch {} await pause(300); }
const startShown = (win) => win.locator('.dc-start').count().then((n) => n > 0);
const scriptHas = (win, text) => win.evaluate((t) => [...document.querySelectorAll('textarea[data-editor-paragraph]')].some((a) => a.value.includes(t)), text);
const recentFile = (profile) => { try { return JSON.parse(fs.readFileSync(path.join(profile, 'recent-projects.json'), 'utf8')); } catch { return null; } };
const prefFile = (profile) => { try { return JSON.parse(fs.readFileSync(path.join(profile, 'start-window.json'), 'utf8')); } catch { return null; } };
const seed = (profile, entries) => fs.writeFileSync(path.join(profile, 'recent-projects.json'), JSON.stringify({ version: 1, entries: entries.map((e, i) => ({ path: e.path, title: e.title, openedAt: new Date(Date.now() - i * 3600e3).toISOString() })) }));
const fileMenu = (app) => app.evaluate(({ Menu }) => { const items = Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items; return items.map((i) => ({ label: i.label, sub: i.submenu ? i.submenu.items.map((s) => ({ label: s.label, enabled: s.enabled, sublabel: s.sublabel || '' })) : null })); });
const clickFile = (app, label, sub) => app.evaluate(({ Menu }, a) => { const item = Menu.getApplicationMenu().items.find((i) => i.label === 'File').submenu.items.find((i) => i.label === a.label); (a.sub ? item.submenu.items.find((s) => s.label.startsWith(a.sub)) : item).click(); }, { label, sub });
const stored = (win) => win.evaluate(() => JSON.parse(localStorage.getItem('draftcraft_screenplay_doc_v1') || 'null'));

async function scenario(name, fn, { startWindow = true, setup } = {}) {
  if (only.size && !only.has(name)) return;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-profile-')), documents = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-docs-'));
  const extra = setup ? await setup({ profile, documents }) : {};
  const ctx = await h.launch({ appDir, profile, documents, startWindow, args: extra.args || [] });
  const started = Date.now();
  try {
    await fn({ ...ctx, ...extra, relaunch: async (opts = {}) => { await kill(ctx.app); const next = await h.launch({ appDir, profile, documents, startWindow: true, ...opts }); ctx.app = next.app; return next; } });
    const p = h.persisted(profile);
    assert.deepEqual(p.errors, [], 'main-process exceptions');
    results.push({ name, passed: true, ms: Date.now() - started });
    console.log('PASS', name);
  } catch (e) {
    const p = h.persisted(profile);
    results.push({ name, passed: false, error: e.message, mainErrors: p.errors, dialogs: p.dialogs });
    console.log('FAIL', name, e.message, JSON.stringify(p.errors).slice(0, 600));
  } finally { await kill(ctx.app); }
}

(async () => {
  await scenario('fresh launch shows the Start Window; Escape continues with the new script', async ({ app, profile }) => {
    const win = await h.editorWindow(app);
    await waitFor(() => startShown(win), 20000, 'Start Window at launch');
    const dialog = win.getByRole('dialog');
    await waitFor(async () => new RegExp('^Welcome to DraftCraft Pro\\s*' + version.replace(/\./g, '\\.') + '$').test(await dialog.locator('h2').textContent()), 5000, 'heading with the version');
    await waitFor(() => win.evaluate(() => document.activeElement?.textContent?.includes('New Screenplay')), 5000, 'New Screenplay has focus');
    assert.equal(await win.locator('.dc-start-tile').count(), 6, 'six quick-start formats');
    assert.equal(await win.locator('.dc-start-empty').textContent(), 'Projects you open or save will appear here.');
    assert.equal(await win.getByLabel('Show this window when DraftCraft Pro opens').isChecked(), true);
    const menu = await fileMenu(app);
    assert.deepEqual(menu.find((i) => i.label === 'Open Recent').sub.map((s) => s.label), ['No Recent Projects', '', 'Clear Menu']);
    assert.ok(menu.some((i) => i.label === 'Start Window…'));
    await win.keyboard.press('Escape');
    await waitFor(async () => !(await startShown(win)), 5000, 'Start Window closed');
    assert.ok(await win.locator('textarea[data-editor-paragraph]').count() > 0, 'the new script is there');
    assert.equal(recentFile(profile)?.entries?.length ?? 0, 0, 'nothing recorded for an unsaved new script');
  });

  await scenario('Open… on the Start Window opens a file and records it in File › Open Recent', async ({ app, profile, documents }) => {
    const file = path.join(documents, 'Harbor Lights.fountain'); fs.writeFileSync(file, FOUNTAIN('HARBOR LIGHTS', 'HARBOR OFFICE'));
    const win = await h.editorWindow(app);
    await waitFor(() => startShown(win), 20000, 'Start Window at launch');
    await h.answer(app, { open: [file] });
    await win.locator('.dc-start-secondary').click();
    await waitFor(() => scriptHas(win, 'HARBOR OFFICE'), 20000, 'opened script');
    await waitFor(async () => !(await startShown(win)), 5000, 'Start Window closed after opening');
    const recent = await waitFor(() => recentFile(profile)?.entries?.length && recentFile(profile), 5000, 'recent-projects.json');
    assert.equal(recent.entries[0].path, file);
    assert.equal((fs.statSync(path.join(profile, 'recent-projects.json')).mode & 0o777), 0o600, 'private file');
    const sub = await waitFor(async () => { const m = (await fileMenu(app)).find((i) => i.label === 'Open Recent').sub; return m[0].label !== 'No Recent Projects' && m; }, 5000, 'File › Open Recent updated');
    assert.match(sub[0].label, /Harbor Lights\.fountain/); assert.equal(sub[0].enabled, true); assert.equal(sub[0].sublabel, documents);
  });

  await scenario('recent projects: open one; a missing one is marked and removed; the launch preference is kept', async ({ app, profile, documents, relaunch, a, b }) => {
    let win = await h.editorWindow(app);
    await waitFor(() => startShown(win), 20000, 'Start Window at launch');
    const rows = win.locator('[data-recent-open]');
    await waitFor(async () => (await rows.count()) === 2, 5000, 'two recent rows');
    assert.match(await rows.nth(0).getAttribute('aria-label'), /^NIGHT FERRY, Night Ferry\.fountain, in .*, opened (Today|Yesterday)/);
    assert.match(await rows.nth(1).getAttribute('aria-label'), /^LOST DRAFT, Lost Draft\.fountain, in .*, missing$/);
    // The renderer only ever sees ids, never paths.
    const info = await win.evaluate(() => window.draftcraftDesktop.startWindow.info());
    assert.ok(info.recent.every((r) => /^[a-f0-9]{16}$/.test(r.id) && !('path' in r)), 'ids only');
    assert.match(await win.evaluate(() => window.draftcraftDesktop.startWindow.openRecent('0000000000000000').then((r) => JSON.stringify(r), (e) => String(e))), /no longer in the recent list/, 'an unknown id opens nothing');
    assert.match(await win.evaluate(() => window.draftcraftDesktop.startWindow.openRecent('../../etc/passwd').then((r) => JSON.stringify(r), (e) => String(e))), /no longer in the recent list/, 'a path is not an id');
    await rows.nth(1).click();
    assert.match(await win.locator('.dc-start-message').textContent(), /no longer where it was/);
    await win.getByRole('button', { name: 'Remove “LOST DRAFT” from the list' }).click();
    await waitFor(async () => (await rows.count()) === 1, 5000, 'missing row removed');
    assert.deepEqual(recentFile(profile).entries.map((e) => e.path), [a], 'removed from recent-projects.json');
    assert.ok(fs.existsSync(a), 'Remove does not touch the file');
    await win.getByLabel('Show this window when DraftCraft Pro opens').uncheck();
    await waitFor(() => prefFile(profile)?.showAtLaunch === false, 5000, 'start-window.json saved');
    await rows.nth(0).click();
    await waitFor(() => scriptHas(win, 'FERRY DECK'), 20000, 'recent project opened');
    await waitFor(async () => !(await startShown(win)), 5000, 'Start Window closed after opening');
    // Relaunch: the preference is kept, so no Start Window; File › Start Window… still opens it.
    const next = await relaunch({ startWindow: true });
    win = await h.editorWindow(next.app);
    await waitFor(() => win.locator('textarea[data-editor-paragraph]').count().then((n) => n > 0), 30000, 'editor after relaunch');
    await pause(3000);
    assert.equal(await startShown(win), false, 'no Start Window when switched off');
    await clickFile(next.app, 'Start Window…');
    await waitFor(() => startShown(win), 5000, 'File › Start Window…');
    await waitFor(async () => (await win.locator('[data-recent-open]').count()) === 1, 5000, 'the recent list loaded');
    assert.equal(await win.getByLabel('Show this window when DraftCraft Pro opens').isChecked(), false, 'the checkbox shows the saved preference');
    void b; void documents;
  }, { setup: ({ profile, documents }) => { const a = path.join(documents, 'Night Ferry.fountain'), b = path.join(documents, 'Lost Draft.fountain'); fs.writeFileSync(a, FOUNTAIN('NIGHT FERRY', 'FERRY DECK')); seed(profile, [{ path: a, title: 'NIGHT FERRY' }, { path: b, title: 'LOST DRAFT' }]); return { a, b }; } });

  await scenario('a launch that opens a file skips the Start Window', async ({ app }) => {
    const win = await h.editorWindow(app);
    await waitFor(() => scriptHas(win, 'ROOFTOP'), 30000, 'file from the command line');
    await pause(2500);
    assert.equal(await startShown(win), false);
  }, { setup: ({ documents }) => { const f = path.join(documents, 'Rooftop.fountain'); fs.writeFileSync(f, FOUNTAIN('ROOFTOP', 'ROOFTOP')); return { args: [f] }; } });

  await scenario('File › Open Recent opens a project; Clear Menu empties the list', async ({ app, profile }) => {
    const win = await h.editorWindow(app);
    await waitFor(() => win.locator('textarea[data-editor-paragraph]').count().then((n) => n > 0), 30000, 'editor');
    await pause(2000);
    const sub = (await fileMenu(app)).find((i) => i.label === 'Open Recent').sub;
    assert.equal(sub[0].label, 'GARDEN PARTY — Garden Party.fountain');
    await clickFile(app, 'Open Recent', 'GARDEN PARTY');
    await waitFor(() => scriptHas(win, 'GARDEN SHED'), 20000, 'opened from File › Open Recent');
    await clickFile(app, 'Open Recent', 'Clear Menu');
    await waitFor(() => recentFile(profile)?.entries?.length === 0, 5000, 'list cleared');
    const after = (await fileMenu(app)).find((i) => i.label === 'Open Recent').sub;
    assert.equal(after[0].label, 'No Recent Projects'); assert.equal(after.at(-1).enabled, false);
  }, { startWindow: false, setup: ({ profile, documents }) => { const f = path.join(documents, 'Garden Party.fountain'); fs.writeFileSync(f, FOUNTAIN('GARDEN PARTY', 'GARDEN SHED')); seed(profile, [{ path: f, title: 'GARDEN PARTY' }]); fs.writeFileSync(path.join(profile, 'start-window.json'), '{"showAtLaunch":false}'); return {}; } });

  await scenario('unsaved changes are resolved before a Start Window format replaces the script', async ({ app }) => {
    const win = await h.editorWindow(app);
    await waitFor(() => win.locator('textarea[data-editor-paragraph]').count().then((n) => n > 0), 30000, 'editor');
    await pause(2500);
    const id = await win.evaluate(() => { const doc = JSON.parse(localStorage.getItem('draftcraft_screenplay_doc_v1') || 'null'); const a = doc?.paragraphs?.find((p) => p.type === 'Action'); return a ? 'input-' + a.id : null; });
    const input = id ? win.locator('#' + id) : win.locator('textarea[id^="input-"]').nth(1);
    await input.click(); await win.keyboard.press('End'); await win.keyboard.type(' Words worth keeping.', { delay: 5 }); await pause(600);
    await clickFile(app, 'Start Window…');
    await waitFor(() => startShown(win), 5000, 'Start Window');
    await h.answer(app, { message: [2] }); // Cancel
    await win.getByRole('button', { name: 'New Television Pilot (One-hour drama)' }).click();
    await pause(2000);
    let st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message' && d.message === 'Save Your Screenplay?').length, 1, 'one Save prompt');
    assert.equal(await startShown(win), true, 'Cancel keeps the Start Window open');
    assert.ok(await scriptHas(win, 'Words worth keeping.'), 'Cancel keeps the text');
    await h.answer(app, { message: [1] }); // Don't Save
    await win.getByRole('button', { name: 'New Television Pilot (One-hour drama)' }).click();
    await waitFor(async () => !(await startShown(win)), 8000, 'Start Window closed after creating');
    await waitFor(async () => (await stored(win))?.appliedTemplateId === 'television-pilot', 8000, 'Television Pilot format');
    assert.equal(await scriptHas(win, 'Words worth keeping.'), false);
    st = await h.state(app);
    assert.equal(st.dialogs.filter((d) => d.kind === 'message' && d.message === 'Save Your Screenplay?').length, 2);
  }, { startWindow: false });

  const out = path.join(__dirname, 'start-window-results.json');
  fs.writeFileSync(out, JSON.stringify({ electron: '44.7.0', version, results }, null, 2));
  const failed = results.filter((r) => !r.passed);
  console.log(results.length - failed.length + '/' + results.length + ' Start Window scenarios passed');
  process.exit(failed.length ? 1 : 0);
})();
