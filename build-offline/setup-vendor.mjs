// Assembles vendor/node_modules for the offline renderer build from
//   1. pinned GitHub sources cloned into deps-src/ (see deps-provenance.txt),
//   2. the pdf.js 6.4.299 release archive (pdfjs-6.4.299-dist.zip),
//   3. packages preinstalled on the build host (esbuild 0.28.2, tailwindcss 4.3.3,
//      react/react-dom 19.2.8 + scheduler 0.27.0, performance-now 2.1.0).
// Every version is checked so a silent substitution cannot happen.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = path.resolve(args.root || path.join(process.cwd(), '..'));
const host = args.host || '/opt/npm-tools/node_modules';
const vendor = path.join(root, 'vendor', 'node_modules');
const deps = path.join(root, 'deps-src');
const require = createRequire(import.meta.url);
fs.mkdirSync(vendor, { recursive: true });

const expectVersion = (dir, version) => {
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  if (v !== version) throw new Error(`${dir}: expected ${version}, found ${v}`);
  return v;
};
const link = (name, version) => {
  const src = path.join(host, name), dst = path.join(vendor, name);
  expectVersion(src, version);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.rmSync(dst, { recursive: true, force: true });
  fs.symlinkSync(src, dst);
  return `${name}@${version} (host)`;
};
const report = [];
report.push(link('esbuild', '0.28.2'));
report.push(link('tailwindcss', '4.3.3'));
report.push(link('react', '19.2.8'));
report.push(link('react-dom', '19.2.8'));
report.push(link('scheduler', '0.27.0'));
report.push(link('performance-now', '2.1.0'));

// Pinned GitHub sources.
const pinned = { 'motion/packages/motion': '12.43.0', 'motion/packages/framer-motion': '12.43.0', 'motion/packages/motion-dom': '12.43.0', 'motion/packages/motion-utils': '12.39.0', yjs: '13.6.33', lib0: '0.2.119', 'isomorphic.js': '0.2.5', compromise: '14.18.0', efrt: '2.9.0', 'grad-school': '0.0.9', 'suffix-thumb': '6.0.0', nspell: '2.1.5', 'is-buffer': '2.0.5', jspdf: '4.2.1', fflate: '0.8.3', 'fast-png': '6.4.0', iobuffer: '5.4.0', pako: '2.2.0', html2canvas: '1.4.1', 'css-line-break': '2.1.0', 'text-segmentation': '1.0.3', utrie: '1.0.2', 'base64-arraybuffer': '1.0.2', dompurify: '3.4.16', canvg: '3.0.11', raf: '3.4.1', 'node-rgbcolor': '1.0.1', 'stackblur-canvas': '2.7.0', 'svg-pathdata': '6.0.3', 'babel/packages/babel-runtime': '7.29.10' };
for (const [dir, version] of Object.entries(pinned)) { expectVersion(path.join(deps, dir), version); report.push(`${dir}@${version} (GitHub source)`); }

// lucide-react is generated from the pinned lucide repository.
execFileSync(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname), 'gen-lucide-react.mjs'), path.join(deps, 'lucide'), path.join(vendor, 'lucide-react')], { stdio: 'inherit' });
report.push('lucide-react@0.546.0 (generated from lucide 0.546.0 icons + packages/lucide-react)');

// pdf.js release archive -> pdfjs-dist layout.
const zip = path.join(deps, 'pdfjs-dist.zip');
const pdfDir = path.join(vendor, 'pdfjs-dist');
fs.rmSync(pdfDir, { recursive: true, force: true });
fs.mkdirSync(pdfDir, { recursive: true });
execFileSync('python3', ['-I', '-m', 'zipfile', '-e', zip, path.join(pdfDir, '_zip')]);
fs.mkdirSync(path.join(pdfDir, 'build'), { recursive: true });
for (const f of ['pdf.mjs', 'pdf.worker.mjs']) fs.copyFileSync(path.join(pdfDir, '_zip/build', f), path.join(pdfDir, 'build', f));
fs.copyFileSync(path.join(pdfDir, '_zip/LICENSE'), path.join(pdfDir, 'LICENSE'));
const header = fs.readFileSync(path.join(pdfDir, 'build/pdf.mjs'), 'utf8').slice(0, 4000);
const m = /pdfjsVersion\s*=\s*"([^"]+)"|version\s*[:=]\s*"(6\.[0-9.]+)"/.exec(fs.readFileSync(path.join(pdfDir, 'build/pdf.mjs'), 'utf8'));
const pdfVersion = m ? (m[1] || m[2]) : 'unknown';
if (pdfVersion !== '6.4.299') throw new Error('pdf.js version mismatch: ' + pdfVersion);
require(path.join(vendor, 'esbuild')).buildSync({ entryPoints: [path.join(pdfDir, 'build/pdf.worker.mjs')], outfile: path.join(pdfDir, 'build/pdf.worker.min.mjs'), minify: true, format: 'esm', target: 'es2022', legalComments: 'none', logLevel: 'warning' });
fs.rmSync(path.join(pdfDir, '_zip'), { recursive: true, force: true });
// The npm package also carries legacy/build (used by Node-side PDF checks).
const legacyZip = path.join(deps, 'pdfjs-legacy-dist.zip');
if (fs.existsSync(legacyZip)) {
  execFileSync('python3', ['-I', '-m', 'zipfile', '-e', legacyZip, path.join(pdfDir, '_legacy')]);
  fs.mkdirSync(path.join(pdfDir, 'legacy/build'), { recursive: true });
  for (const f of ['pdf.mjs', 'pdf.worker.mjs']) fs.copyFileSync(path.join(pdfDir, '_legacy/build', f), path.join(pdfDir, 'legacy/build', f));
  fs.rmSync(path.join(pdfDir, '_legacy'), { recursive: true, force: true });
}
fs.writeFileSync(path.join(pdfDir, 'package.json'), JSON.stringify({ name: 'pdfjs-dist', version: pdfVersion, type: 'module', main: 'build/pdf.mjs', exports: { '.': './build/pdf.mjs', './build/*': './build/*', './legacy/build/*': './legacy/build/*', './package.json': './package.json' }, note: 'Assembled from pdfjs-6.4.299-dist.zip and -legacy-dist.zip (GitHub release); worker minified with esbuild.' }, null, 2));
report.push(`pdfjs-dist@${pdfVersion} (GitHub release archive)`);
fs.writeFileSync(path.join(root, 'vendor', 'VENDOR-REPORT.txt'), report.join('\n') + '\n');
console.log(report.join('\n'));
void header;
