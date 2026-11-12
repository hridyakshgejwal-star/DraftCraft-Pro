'use strict';
// Real-Electron harness (Linux, Xvfb). Launches the staged desktop app with the
// official Electron runtime of the same version as the macOS build (44.7.0),
// replaces only native dialogs with scripted answers, and records main-process
// exceptions, renderer console errors and crashes.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || '/home/claude/.npm-global/lib/node_modules/playwright');
const ELECTRON = process.env.ELECTRON_BIN || '/home/claude/draftcraft/electron-linux/electron-v44.7.0/electron';

async function launch({ appDir, profile, documents, args = [], env = {}, startWindow = false } = {}) {
  profile = profile || fs.mkdtempSync(path.join(os.tmpdir(), 'dc-profile-'));
  // 1.18: the Start Window opens at launch. Scenarios that are not about it start with it switched off (as a writer
  // who unticked "Show this window when DraftCraft Pro opens"); an existing preference in the profile is kept.
  const startPref = path.join(profile, 'start-window.json');
  if (!startWindow && !fs.existsSync(startPref)) fs.writeFileSync(startPref, JSON.stringify({ showAtLaunch: false }) + '\n');
  documents = documents || fs.mkdtempSync(path.join(os.tmpdir(), 'dc-docs-'));
  const stderr = [];
  const app = await _electron.launch({ executablePath: ELECTRON, args: ['--no-sandbox', '--disable-gpu', appDir, ...args], env: { ...process.env, DRAFTCRAFT_TEST_PROFILE: profile, HOME: documents, ...env }, timeout: 60000 });
  app.process().stderr.on('data', (d) => stderr.push(String(d)));
  app.process().stdout.on('data', (d) => stderr.push(String(d)));
  await app.evaluate(({ dialog, app: electronApp }, { documents, profile }) => {
    globalThis.__dc = { errors: [], dialogs: [], answers: [], saveAnswers: [], openAnswers: [] };
    const fs = process.mainModule.require('node:fs');
    const record = (kind, e) => { const text = kind + ': ' + String(e && e.stack || e); globalThis.__dc.errors.push(text); try { fs.appendFileSync(profile + '/__harness-errors.log', text + '\n'); } catch {} };
    process.on('uncaughtException', (e) => record('uncaughtException', e));
    process.on('unhandledRejection', (e) => record('unhandledRejection', e));
    electronApp.setPath('documents', documents);
    dialog.showMessageBox = async (_w, o) => { const opts = o || _w; globalThis.__dc.dialogs.push({ kind: 'message', message: opts.message, buttons: opts.buttons }); const r = globalThis.__dc.answers.shift(); return { response: r === undefined ? (opts.cancelId ?? 0) : r, checkboxChecked: false }; };
    dialog.showMessageBoxSync = (_w, o) => { const opts = o || _w; globalThis.__dc.dialogs.push({ kind: 'message-sync', message: opts.message }); const r = globalThis.__dc.answers.shift(); return r === undefined ? (opts.cancelId ?? 0) : r; };
    dialog.showSaveDialog = async (_w, o) => { const opts = o || _w; globalThis.__dc.dialogs.push({ kind: 'save', title: opts.title, defaultPath: opts.defaultPath }); const r = globalThis.__dc.saveAnswers.shift(); return r ? { canceled: false, filePath: r } : { canceled: true, filePath: '' }; };
    dialog.showOpenDialog = async (_w, o) => { const opts = o || _w; globalThis.__dc.dialogs.push({ kind: 'open', title: opts.title }); const r = globalThis.__dc.openAnswers.shift(); return r ? { canceled: false, filePaths: [r] } : { canceled: true, filePaths: [] }; };
    dialog.showErrorBox = (title, content) => { globalThis.__dc.dialogs.push({ kind: 'error', title, content }); try { fs.appendFileSync(profile + '/__harness-dialogs.log', JSON.stringify({ kind: 'error', title, content }) + '\n'); } catch {} };
    const log = (d) => { try { fs.appendFileSync(profile + '/__harness-dialogs.log', JSON.stringify(d) + '\n'); } catch {} };
    for (const name of ['showMessageBox', 'showSaveDialog', 'showOpenDialog']) { const original = dialog[name]; dialog[name] = async (...a) => { const r = await original(...a); log({ kind: name, args: (a[1] || a[0])?.message || (a[1] || a[0])?.title, result: r }); return r; }; }
  }, { documents, profile });
  return { app, profile, documents, stderr };
}
function persisted(profile) {
  const read = (f) => { try { return fs.readFileSync(path.join(profile, f), 'utf8').split('\n').filter(Boolean); } catch { return []; } };
  return { errors: read('__harness-errors.log'), dialogs: read('__harness-dialogs.log').map((l) => JSON.parse(l)) };
}
async function state(app) { return app.evaluate(() => ({ errors: globalThis.__dc.errors.slice(), dialogs: globalThis.__dc.dialogs.slice() })); }
async function answer(app, { message = [], save = [], open = [] } = {}) {
  await app.evaluate((_e, a) => { globalThis.__dc.answers.push(...a.message); globalThis.__dc.saveAnswers.push(...a.save); globalThis.__dc.openAnswers.push(...a.open); }, { message, save, open });
}
async function editorWindow(app) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const w of app.windows()) { try { if ((await w.url()).startsWith('draftcraft://app')) { await w.waitForLoadState('domcontentloaded'); return w; } } catch {} }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('editor window did not open');
}
module.exports = { launch, state, answer, editorWindow, persisted, ELECTRON };
