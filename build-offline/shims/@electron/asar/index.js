'use strict';
// Offline, read-only stand-in for the parts of @electron/asar used by
// verification/verify-dmg-asar.mjs (listPackage, statFile, extractFile,
// getRawHeader). The npm registry was unavailable on the 1.15.3 build host.
// Format: Chromium Pickle size header, then the JSON header, then file data.
const fs = require('node:fs');
const path = require('node:path');
const cache = new Map();
function read(archive) {
  const key = path.resolve(archive);
  if (cache.has(key)) return cache.get(key);
  const fd = fs.openSync(key, 'r');
  try {
    const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
    const headerSize = head.readUInt32LE(4), jsonLength = head.readUInt32LE(12);
    const json = Buffer.alloc(jsonLength); fs.readSync(fd, json, 0, jsonLength, 16);
    const headerString = json.toString('utf8');
    const value = { header: JSON.parse(headerString), headerString, headerSize, base: 8 + headerSize };
    cache.set(key, value); return value;
  } finally { fs.closeSync(fd); }
}
function node(archive, name) {
  let current = read(archive).header;
  for (const part of name.split(/[\\/]/).filter(Boolean)) { current = current.files && current.files[part]; if (!current) throw new Error('"' + name + '" was not found in this archive'); }
  return current;
}
exports.getRawHeader = (archive) => { const r = read(archive); return { header: r.header, headerString: r.headerString, headerSize: r.headerSize }; };
exports.statFile = (archive, name) => node(archive, name);
exports.listPackage = (archive) => {
  const out = [];
  const walk = (n, prefix) => { for (const [k, v] of Object.entries(n.files || {})) { const p = prefix + path.sep + k; out.push(p); if (v.files) walk(v, p); } };
  walk(read(archive).header, '');
  return out;
};
exports.extractFile = (archive, name) => {
  const n = node(archive, name);
  if (n.files) throw new Error(name + ' is a directory');
  if (n.unpacked) return fs.readFileSync(path.join(archive + '.unpacked', name));
  const r = read(archive), buffer = Buffer.alloc(n.size);
  const fd = fs.openSync(archive, 'r');
  try { if (n.size) fs.readSync(fd, buffer, 0, n.size, r.base + Number(n.offset)); } finally { fs.closeSync(fd); }
  return buffer;
};
