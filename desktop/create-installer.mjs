// Generate fresh integrity manifests and an installer beside a finished app.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const release = path.resolve(process.argv[2] || path.join(here, '../../desktop-build/packages/DraftCraft Pro-darwin-arm64'));
const app = path.join(release, 'DraftCraft Pro.app');
if (!fs.existsSync(app) || !fs.lstatSync(app).isDirectory()) throw new Error('Provide a directory containing the finished DraftCraft Pro.app.');
const support = path.join(release, 'Support');
fs.mkdirSync(support, { recursive: true });
const files = [];
const links = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const relative = path.relative(release, file).split(path.sep).join('/');
    if (/[\r\n\t\\]/.test(relative)) throw new Error('Unsupported bundle filename: ' + relative);
    if (entry.isSymbolicLink()) links.push([relative, fs.readlinkSync(file)]);
    else if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && entry.name !== '.DS_Store') files.push(relative);
  }
}
walk(app);
files.sort();
links.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(path.join(support, 'File-Paths.txt'), files.join('\n') + '\n');
fs.writeFileSync(path.join(support, 'Package-SHA256.txt'), files.map(file => digest(path.join(release, file)) + '  ' + file).join('\n') + '\n');
fs.writeFileSync(path.join(support, 'Bundle-Links.txt'), links.map(link => link.join('\t')).join('\n') + '\n');
fs.copyFileSync(path.join(here, 'sign-macos.sh'), path.join(support, 'Sign-macOS.sh'));
let script = fs.readFileSync(path.join(here, 'installer-template.command'), 'utf8');
for (const [marker, filename] of [['MANIFEST_HASH', 'Package-SHA256.txt'], ['FILES_HASH', 'File-Paths.txt'], ['LINKS_HASH', 'Bundle-Links.txt'], ['SIGNER_HASH', 'Sign-macOS.sh']]) {
  script = script.replace('@@' + marker + '@@', digest(path.join(support, filename)));
}
if (script.includes('@@')) throw new Error('An installer template placeholder was not populated.');
const installer = path.join(release, 'Install-DraftCraft.command');
fs.writeFileSync(installer, script);
fs.chmodSync(installer, 0o755);
fs.copyFileSync(path.join(here, 'Getting-Started.txt'), path.join(release, 'Getting-Started.txt'));
console.log(JSON.stringify({ installer, files: files.length, symlinks: links.length }));
