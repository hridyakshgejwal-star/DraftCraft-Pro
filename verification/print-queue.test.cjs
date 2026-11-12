// 1.15.3 D-06: Export while the live PDF preview renders must wait, not fail with
// "Another print job is being prepared."; a queued preview is superseded by a newer one.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { installProductionPrint } = require('../desktop/production-print.cjs');
const pdf = Buffer.from('%PDF-1.7\n' + 'x'.repeat(200) + '\n%%EOF\n');
function harness(delay = 40) {
  let handler, active = 0, maxActive = 0; const renders = [];
  class BrowserWindow { constructor() { this.webContents = { setWindowOpenHandler() {}, on() {}, executeJavaScript: async () => true, printToPDF: async () => { active++; maxActive = Math.max(maxActive, active); renders.push(Date.now()); await new Promise((r) => setTimeout(r, delay)); active--; return pdf; } }; } async loadURL() {} destroy() {} }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-print-'));
  installProductionPrint({ ipcMain: { handle: (_n, fn) => { handler = fn; } }, BrowserWindow, dialog: { showSaveDialog: async () => ({ canceled: false, filePath: path.join(dir, 'Out.pdf') }) }, trusted: () => {}, getWindow: () => null });
  const call = (mode) => handler({}, { mode, html: '<!doctype html><html><head></head><body>x</body></html>', width: 8.5, height: 11, name: 'Out' });
  return { call, dir, stats: () => ({ maxActive, renders: renders.length }) };
}
test('export requested during a preview waits for it and still writes the PDF', async () => {
  const h = harness();
  const [preview, saved] = await Promise.all([h.call('preview'), h.call('save')]);
  assert.ok(preview.data.startsWith('data:application/pdf;base64,'));
  assert.equal(saved.saved, true);
  assert.equal(fs.readFileSync(path.join(h.dir, 'Out.pdf')).subarray(0, 5).toString(), '%PDF-');
  assert.equal(h.stats().maxActive, 1, 'jobs never render concurrently');
});
test('a queued preview is superseded by a newer preview', async () => {
  const h = harness();
  const first = h.call('preview');
  await new Promise((r) => setTimeout(r, 5)); // first preview is rendering
  const results = await Promise.all([first, h.call('preview'), h.call('preview')]);
  assert.ok(results[0].data, 'the running preview completes');
  assert.equal(results[1].superseded, true, 'a waiting preview is dropped');
  assert.ok(results[2].data, 'the newest preview renders');
  assert.equal(h.stats().renders, 2);
});
