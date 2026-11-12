'use strict';
// Recent projects and the Start Window preference (1.18). The list holds file paths and titles only (never document
// contents), newest first, at most 20, written atomically to recent-projects.json in the profile. The renderer only
// ever sees entry ids: opening, revealing and removing look the path up here, so a page cannot ask for any other path.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const LIMIT = 20;
const OPENABLE = /\.(draftcraft|fdx|fdxt|fountain|txt|rtf|pdf)$/i;
const idFor = file => crypto.createHash('sha256').update(file).digest('hex').slice(0, 16);
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  fs.writeFileSync(temp, text, { mode: 0o600 }); fs.renameSync(temp, file);
}
class RecentProjects {
  constructor(file, { limit = LIMIT, onChange } = {}) { this.file = file; this.limit = limit; this.onChange = onChange; this.entries = this.load(); }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')), seen = new Set();
      if (!raw || raw.version !== 1 || !Array.isArray(raw.entries)) return [];
      return raw.entries.filter(e => e && typeof e.path === 'string' && path.isAbsolute(e.path) && e.path.length < 4096 && OPENABLE.test(e.path) && typeof e.openedAt === 'string' && !seen.has(e.path) && seen.add(e.path))
        .map(e => ({ path: e.path, title: typeof e.title === 'string' ? e.title.slice(0, 200) : '', openedAt: e.openedAt })).slice(0, this.limit);
    } catch { return []; }
  }
  persist() { writeAtomic(this.file, JSON.stringify({ version: 1, entries: this.entries }, null, 1) + '\n'); this.onChange?.(this.entries.map(e => e.path)); }
  /** Records an opened or saved project at the top of the list. Returns false when nothing changed. */
  touch(file, title = '') {
    if (typeof file !== 'string' || !path.isAbsolute(file) || !OPENABLE.test(file)) return false;
    const resolved = path.resolve(file), clean = String(title || '').slice(0, 200), first = this.entries[0];
    if (first && first.path === resolved && first.title === clean) return false;
    this.entries = [{ path: resolved, title: clean, openedAt: new Date().toISOString() }, ...this.entries.filter(e => e.path !== resolved)].slice(0, this.limit);
    this.persist(); return true;
  }
  /** Retitles an entry without moving it (the open project's title changed). */
  retitle(file, title) { const e = this.entries.find(v => v.path === path.resolve(file)), clean = String(title || '').slice(0, 200); if (!e || e.title === clean) return false; e.title = clean; this.persist(); return true; }
  list() {
    return this.entries.map(e => {
      let exists = false, modifiedAt = null;
      try { const s = fs.statSync(e.path); exists = s.isFile(); modifiedAt = s.mtime.toISOString(); } catch { /* missing or unreadable */ }
      return { id: idFor(e.path), title: e.title || path.basename(e.path).replace(/\.[^.]+$/, ''), name: path.basename(e.path), folder: path.dirname(e.path), openedAt: e.openedAt, modifiedAt, exists, kind: path.extname(e.path).slice(1).toLowerCase() };
    });
  }
  pathFor(id) { if (typeof id !== 'string' || !/^[a-f0-9]{16}$/.test(id)) return null; const e = this.entries.find(v => idFor(v.path) === id); return e ? e.path : null; }
  remove(id) { const file = this.pathFor(id); if (!file) return false; this.entries = this.entries.filter(e => e.path !== file); this.persist(); return true; }
  clear() { if (!this.entries.length) return false; this.entries = []; this.persist(); return true; }
}
class StartPreference {
  constructor(file) { this.file = file; this.value = { showAtLaunch: true }; try { const raw = JSON.parse(fs.readFileSync(file, 'utf8')); if (typeof raw?.showAtLaunch === 'boolean') this.value.showAtLaunch = raw.showAtLaunch; } catch { /* default: on */ } }
  get showAtLaunch() { return this.value.showAtLaunch; }
  set(showAtLaunch) { if (typeof showAtLaunch !== 'boolean') throw new Error('Choose on or off.'); this.value = { showAtLaunch }; writeAtomic(this.file, JSON.stringify(this.value) + '\n'); return this.value; }
}
module.exports = { RecentProjects, StartPreference, idFor, LIMIT };
