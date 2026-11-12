// ASAR writer compatible with @electron/asar 4.x (header JSON with per-file
// SHA-256 integrity and 4 MiB block hashes, Chromium Pickle framing). Used for
// the offline release because @electron/asar cannot be installed from npm here.
// Usage: node asar-pack.mjs <source dir> <output app.asar>
// Prints {headerSha256, files, bytes}. The header SHA-256 is the value Electron
// expects in Info.plist ElectronAsarIntegrity.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BLOCK = 4 * 1024 * 1024;
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export function pack(source, output) {
  const chunks = [];
  let offset = 0, count = 0;
  const walk = (dir) => {
    const node = { files: {} };
    // Same ordering as @electron/asar: entries in sorted order, directories recursed.
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name), st = fs.lstatSync(full);
      if (st.isSymbolicLink()) throw new Error('Symbolic links are not expected in the app payload: ' + full);
      if (st.isDirectory()) { node.files[name] = walk(full); continue; }
      const data = fs.readFileSync(full);
      const blocks = [];
      for (let at = 0; at < data.length || (at === 0 && blocks.length === 0); at += BLOCK) blocks.push(sha(data.subarray(at, at + BLOCK)));
      node.files[name] = { size: data.length, ...(st.mode & 0o100 ? { executable: true } : {}), offset: String(offset), integrity: { algorithm: 'SHA256', hash: sha(data), blockSize: BLOCK, blocks } };
      chunks.push(data); offset += data.length; count++;
    }
    return node;
  };
  const header = walk(source);
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  // Pickle: header pickle = [payload size][string length][string bytes][pad to 4].
  const padded = json.length + ((4 - (json.length % 4)) % 4);
  const headerPickle = Buffer.alloc(8 + padded);
  headerPickle.writeUInt32LE(4 + padded, 0);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  const fd = fs.openSync(output, 'w');
  try { fs.writeSync(fd, sizePickle); fs.writeSync(fd, headerPickle); for (const c of chunks) fs.writeSync(fd, c); } finally { fs.closeSync(fd); }
  return { headerSha256: sha(json), files: count, bytes: fs.statSync(output).size };
}
if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [source, output] = process.argv.slice(2);
  if (!source || !output) throw new Error('usage: asar-pack.mjs <source dir> <output.asar>');
  console.log(JSON.stringify(pack(path.resolve(source), path.resolve(output))));
}
