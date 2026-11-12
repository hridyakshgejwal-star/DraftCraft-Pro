// Linux/offline equivalent of desktop/build.cjs. It stages exactly the same
// desktop application layout, but:
//   - the renderer is built with build-offline/build-renderer.mjs instead of
//     `npm run build` (the npm registry is unavailable on the build host);
//   - the offline web fonts (dist/fonts, dist/desktop.css, Font-Licenses) are
//     copied from the verified previous application payload, because
//     @fontsource 5.3.0 cannot be installed offline. The font files are data,
//     produced by the identical desktop/build.cjs step in the previous release;
//   - api.cjs (the bundled server.ts routes) is reused from the previous payload
//     only when server.ts is byte-identical to the source it was built from.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const project = path.resolve(args.project || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const output = path.resolve(args.out || path.join(project, '..', 'desktop-build', 'app'));
const previous = path.resolve(args.previous || path.join(project, '..', 'original-asar'));
const baselineServerSha = args.serverSha || '';
const version = args.version || JSON.parse(fs.readFileSync(path.join(project, 'desktop/package.json'), 'utf8')).version;
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
execFileSync(process.execPath, [path.join(project, 'build-offline/build-renderer.mjs'), `--project=${project}`, `--out=${path.join(output, 'dist')}`, ...(args.vendor ? [`--vendor=${args.vendor}`] : []), ...(args.deps ? [`--deps=${args.deps}`] : [])], { stdio: 'inherit' });
fs.renameSync(path.join(output, 'renderer-metafile.json'), path.join(project, '..', 'renderer-metafile.json'));
// Identical list to desktop/build.cjs.
for (const file of ['dictation-ipc.cjs', 'window-registry.cjs', 'production-print.cjs', 'table-read-audio-worker.cjs', 'table-read.cjs', 'table-read-audio.cjs', 'table-read-ipc.cjs', 'main.cjs', 'project-files.cjs', 'recent-projects.cjs', 'save-coordinator.cjs', 'preload.cjs', 'settings-preload.cjs', 'self-test.cjs', 'ai-settings.html', 'ai-settings.css', 'ai-settings.js', 'Getting-Started.txt'])
  fs.copyFileSync(path.join(project, 'desktop', file), path.join(output, file));
fs.copyFileSync(path.join(project, 'src/files/documentGraph.mjs'), path.join(output, 'document-graph.mjs'));
fs.cpSync(path.join(project, 'desktop/native'), path.join(output, 'native'), { recursive: true, filter: src => !/[\\/](bin|DraftCraftDictation)$/.test(src) });
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({ name: 'draftcraft-pro', productName: 'DraftCraft Pro', version, main: 'main.cjs', description: 'Local screenplay editor', private: true, author: 'DraftCraft Pro', license: 'UNLICENSED' }, null, 2));

// server.ts -> api.cjs
const serverSha = sha(path.join(project, 'server.ts'));
if (baselineServerSha && serverSha === baselineServerSha) fs.copyFileSync(path.join(previous, 'api.cjs'), path.join(output, 'api.cjs'));
else throw new Error(`server.ts changed (${serverSha}); api.cjs must be rebuilt with @google/genai/express, which are unavailable offline.`);

// Offline fonts (data) from the previous payload.
fs.cpSync(path.join(previous, 'dist/fonts'), path.join(output, 'dist/fonts'), { recursive: true });
fs.copyFileSync(path.join(previous, 'dist/desktop.css'), path.join(output, 'dist/desktop.css'));
fs.cpSync(path.join(previous, 'Font-Licenses'), path.join(output, 'Font-Licenses'), { recursive: true });

const indexPath = path.join(output, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, '').replace('</head>', '  <link rel="stylesheet" href="/desktop.css">\n  </head>');
fs.writeFileSync(indexPath, html);
if (!fs.readFileSync(indexPath, 'utf8').includes('/desktop.css')) throw new Error('Offline desktop stylesheet was not staged.');
fs.mkdirSync(path.join(output, 'Spelling-Licenses'), { recursive: true });
for (const name of ['en-US-LICENSE.txt', 'en-GB-LICENSE.txt', 'nspell-LICENSE.txt']) fs.copyFileSync(path.join(project, 'src/writing/dictionaries', name), path.join(output, 'Spelling-Licenses', name));
console.log('Desktop application staged at ' + output);
