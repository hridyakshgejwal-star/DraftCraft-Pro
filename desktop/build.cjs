'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const output = path.resolve(project, '..', 'desktop-build', 'app');
const modulePaths = [__dirname, project, path.resolve(project, '..', 'desktop-tools')];
const resolve = (name) => require.resolve(name, { paths: modulePaths });

const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: project, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(project, 'dist'), path.join(output, 'dist'), { recursive: true });
for (const file of ['dictation-ipc.cjs','window-registry.cjs','production-print.cjs','table-read-audio-worker.cjs','table-read.cjs','table-read-audio.cjs','table-read-ipc.cjs','main.cjs', 'project-files.cjs', 'recent-projects.cjs', 'save-coordinator.cjs', 'preload.cjs', 'settings-preload.cjs', 'self-test.cjs', 'ai-settings.html', 'ai-settings.css', 'ai-settings.js', 'Getting-Started.txt']) fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
fs.copyFileSync(path.join(project,'src/files/documentGraph.mjs'),path.join(output,'document-graph.mjs'));
if(process.platform==='darwin'){const native=spawnSync('/bin/bash',[path.join(__dirname,'native/build.sh')],{stdio:'inherit'});if(native.status!==0)throw Error('Native dictation helper build failed.');}fs.cpSync(path.join(__dirname,'native'),path.join(output,'native'),{recursive:true,filter:src=>!/[\\/](bin|DraftCraftDictation)$/.test(src)});/* The compiled helper is not usable from inside app.asar: package.mjs puts it in Contents/Resources. */
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({ name: 'draftcraft-pro', productName: 'DraftCraft Pro', version: '1.18.0', main: 'main.cjs', description: 'Local screenplay editor', private: true, author: 'DraftCraft Pro', license: 'MIT' }, null, 2));

// Reuse the supplied service routes without bundling the Vite dev server.
const originalServer = fs.readFileSync(path.join(project, 'server.ts'), 'utf8');
const marker = '\nasync function startServer()';
if (!originalServer.includes(marker)) throw new Error('The server entry point changed; review the desktop API extraction.');
const apiSource = originalServer.slice(0, originalServer.indexOf(marker))
  .replace(/^import \{ createServer as createViteServer \} from 'vite';\r?\n/m, '')
  .replace(/^import dotenv from 'dotenv';\r?\n/m, '')
  .replace(/^import path from 'path';\r?\n/m, '')
  .replace(/^dotenv\.config\(\);\r?\n/m, '')
  .replace(/^const PORT = 3000;\r?\n/m, '') + '\nexport { app as apiApp };\n';
require(resolve('esbuild')).buildSync({ stdin: { contents: apiSource, loader: 'ts', resolveDir: project, sourcefile: 'server.ts' }, outfile: path.join(output, 'api.cjs'), platform: 'node', format: 'cjs', bundle: true, target: 'node22', sourcemap: false, logLevel: 'info' });

const fontDir = path.join(output, 'dist', 'fonts');
const licenseDir = path.join(output, 'Font-Licenses');
fs.mkdirSync(fontDir, { recursive: true });
fs.mkdirSync(licenseDir, { recursive: true });
let fontCss = '';
for (const [slug, family, weights, styles] of [
  ['courier-prime', 'Courier Prime', [400, 700], ['normal', 'italic']],
  ['inter', 'Inter', [300, 400, 500, 600, 700], ['normal']],
  ['jetbrains-mono', 'JetBrains Mono', [400, 500, 600], ['normal']],
]) {
  const root = path.dirname(resolve('@fontsource/' + slug + '/package.json'));
  const license = ['LICENSE', 'LICENSE.txt', 'OFL.txt'].find((name) => fs.existsSync(path.join(root, name)));
  if (license) fs.copyFileSync(path.join(root, license), path.join(licenseDir, slug + '.txt'));
  for (const weight of weights) for (const style of styles) {
    // Fontsource's Unicode ranges keep extended Latin from masking Latin glyphs.
    for (const subset of ['latin-ext', 'latin']) {
      const file = `${slug}-${subset}-${weight}-${style}.woff2`;
      const fontPath = path.join(root, 'files', file);
      if (!fs.existsSync(fontPath)) continue;
      fs.copyFileSync(fontPath, path.join(fontDir, file));
      const range = subset === 'latin' ? 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF,U+FEFF,U+FFFD' : 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0300-0303,U+0305-0307,U+0309-0328,U+032A-036F,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
      fontCss += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url('./fonts/${file}') format('woff2');unicode-range:${range}}\n`;
    }
  }
}
fontCss += '\n@media screen{.dc-desktop .dc-titlebar{-webkit-app-region:drag}.dc-desktop .dc-titlebar button,.dc-desktop .dc-titlebar [role="group"]{-webkit-app-region:no-drag}}\n';
fs.writeFileSync(path.join(output, 'dist', 'desktop.css'), fontCss);
const indexPath = path.join(output, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, '')
  .replace('</head>', '  <link rel="stylesheet" href="/desktop.css">\n  </head>');
fs.writeFileSync(indexPath, html);
if (!fs.readFileSync(indexPath, 'utf8').includes('/desktop.css')) throw new Error('Offline desktop stylesheet was not staged.');
console.log('Desktop application staged at ' + output);

fs.mkdirSync(path.join(output, 'Spelling-Licenses'), {recursive:true});
for (const name of ['en-US-LICENSE.txt','en-GB-LICENSE.txt','nspell-LICENSE.txt']) fs.copyFileSync(path.join(project, 'src/writing/dictionaries', name), path.join(output, 'Spelling-Licenses', name));

// Keep only the JavaScript/CSS import closure of the generated entry point.
// Some incremental filesystems retain old hashed chunks after Vite cleans dist.
const assetsDirectory=path.join(output,'dist/assets');
const assetNames=fs.readdirSync(assetsDirectory).filter(name=>/\.(js|css)$/.test(name));
const retained=new Set(),pending=assetNames.filter(name=>html.includes(name));
while(pending.length){
 const name=pending.pop();
 if(retained.has(name))continue;
 retained.add(name);
 const source=fs.readFileSync(path.join(assetsDirectory,name),'utf8');
 for(const dependency of assetNames)
  if(!retained.has(dependency)&&source.includes(dependency))pending.push(dependency);
}
for(const name of assetNames)
 if(!retained.has(name))fs.unlinkSync(path.join(assetsDirectory,name));
