import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function handlers() {
  const source = fs.readFileSync(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf("ipcMain.handle('desktop:clipboard-read'"), source.indexOf('function settingsSender'));
  const calls = new Map<string, (...args: any[]) => Promise<any>>(), writes: any[] = [];
  const bytes = Buffer.from('89504e470d0a1a0a', 'hex');
  const clipboard = {read: async () => [{types: ['text/plain', 'image/png'], getType: async (type: string) => new Blob([type === 'text/plain' ? 'Actual clipboard text' : bytes], {type})}], write: async (items: any[]) => { writes.push(items); }};
  class Item {constructor(public payload: Record<string, unknown>) {}}
  vm.runInNewContext(code, {ipcMain: {handle: (name: string, fn: any) => calls.set(name, fn)}, clipboardSender: (event: any) => event.trusted === true, clipboard, ClipboardItem: Item, Blob, Buffer});
  return {read: calls.get('desktop:clipboard-read')!, write: calls.get('desktop:clipboard-write')!, writes, clipboard, bytes};
}

test('actual clipboard IPC source allowlists image MIME types, bounds bytes and commits text/image together', async () => {
  const h = handlers(), event = {trusted: true};
  const plain = await h.read(event); assert.equal(plain.text, 'Actual clipboard text'); assert.equal(plain.image, undefined);
  const image = (await h.read(event, {images: true})).image;
  assert.equal(image.type, 'image/png'); assert.deepEqual(Buffer.from(image.base64, 'base64'), h.bytes);
  await h.write(event, {text: 'Reusable image record', image});
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].length, 1);
  assert.equal(h.writes[0][0].payload['text/plain'], 'Reusable image record');
  assert.deepEqual(Buffer.from(await h.writes[0][0].payload['image/png'].arrayBuffer()), h.bytes);
  await assert.rejects(() => h.write(event, {text: '', image: {type: 'text/uri-list', base64: image.base64}}), /Invalid clipboard image/);
  await assert.rejects(() => h.write(event, {text: '', image: {type: 'image/png', base64: 'invalid!'}}), /Invalid clipboard image/);
  await assert.rejects(() => h.read({trusted: false}, {images: true}), /Main editor required/);
});

test('native clipboard write errors propagate before a successful image Cut acknowledgement', async () => {
  const h = handlers();
  h.clipboard.write = async () => { throw Error('Pasteboard unavailable'); };
  await assert.rejects(() => h.write({trusted: true}, {text: 'Image record', image: {type: 'image/png', base64: h.bytes.toString('base64')}}), /Pasteboard unavailable/);
  assert.equal(h.writes.length, 0);
});
