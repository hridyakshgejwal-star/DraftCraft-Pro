// Offline replacement for `vite build` used when the npm registry is not
// reachable. It bundles the unchanged renderer source (index.html -> src/main.tsx)
// with esbuild 0.28.2 and compiles src/index.css with Tailwind CSS 4.3.3, while
// reproducing the Vite features the source relies on:
//   - `?raw` text imports and `?url` asset imports (pdf.js worker)
//   - `new Worker(new URL('./x.worker.ts', import.meta.url), {type:'module'})`
//   - JSON imports, CSS imports in module-graph order, public/ copying
//   - hashed /assets/* output names and the generated index.html tags
// Dependencies come from vendor/node_modules (see build-offline/README.md):
// each bare specifier is resolved through an explicit allow-list so that no
// unrelated package on the build machine can leak into the bundle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
const args = isMain ? Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('='))) : {};
let project = path.resolve(args.project || process.cwd());
let vendor = path.resolve(args.vendor || path.join(project, '..', 'vendor', 'node_modules'));
let deps = path.resolve(args.deps || path.join(project, '..', 'deps-src'));
let outDir = path.resolve(args.out || path.join(project, 'dist'));
const minify = args.minify !== 'false';
const require = createRequire(import.meta.url);
let esbuild, tailwind, exact, prefix;
function loadTools() {
  esbuild = require(path.join(vendor, 'esbuild'));
  tailwind = require(path.join(vendor, 'tailwindcss/dist/lib.js'));
  exact = dependencyMap();
  prefix = { 'lib0/': path.join(deps, 'lib0') };
}
/** Configure paths when this module is imported (e.g. by dev-server.mjs). */
export function configure(options) {
  project = path.resolve(options.project); vendor = path.resolve(options.vendor); deps = path.resolve(options.deps);
  outDir = path.resolve(options.out || path.join(project, 'dist'));
  loadTools();
  return { esbuild, plugins: { resolvePlugin, typeOnlyImports, queryPlugin, workerPlugin, cssPlugin }, sharedOptions: sharedOptions(), compileTailwind };
}

// ---- explicit dependency map (bare specifier -> file) ----------------------
const dependencyMap = () => ({
  'react': path.join(vendor, 'react/index.js'),
  'react/jsx-runtime': path.join(vendor, 'react/jsx-runtime.js'),
  'react/jsx-dev-runtime': path.join(vendor, 'react/jsx-dev-runtime.js'),
  'react-dom': path.join(vendor, 'react-dom/index.js'),
  'react-dom/client': path.join(vendor, 'react-dom/client.js'),
  'scheduler': path.join(vendor, 'scheduler/index.js'),
  'lucide-react': path.join(vendor, 'lucide-react/src/lucide-react.ts'),
  '@lucide/shared': path.join(vendor, 'lucide-react/shared/index.ts'),
  'motion/react': path.join(deps, 'motion/packages/motion/src/react.ts'),
  'framer-motion': path.join(deps, 'motion/packages/framer-motion/src/index.ts'),
  'motion-dom': path.join(deps, 'motion/packages/motion-dom/src/index.ts'),
  'motion-utils': path.join(deps, 'motion/packages/motion-utils/src/index.ts'),
  'yjs': path.join(deps, 'yjs/src/index.js'),
  'isomorphic.js': path.join(deps, 'isomorphic.js/browser.mjs'),
  'compromise': path.join(deps, 'compromise/src/three.js'),
  'efrt': path.join(deps, 'efrt/src/index.js'),
  'grad-school': path.join(deps, 'grad-school/builds/grad-school.mjs'),
  'suffix-thumb': path.join(deps, 'suffix-thumb/src/index.js'),
  'nspell': path.join(deps, 'nspell/lib/index.js'),
  'is-buffer': path.join(deps, 'is-buffer/index.js'),
  'jspdf': path.join(deps, 'jspdf/dist/jspdf.es.min.js'),
  'fflate': path.join(deps, 'fflate/src/index.ts'),
  'fast-png': path.join(deps, 'fast-png/src/index.ts'),
  'iobuffer': path.join(deps, 'iobuffer/src/IOBuffer.ts'),
  'pako': path.join(deps, 'pako/dist/pako.esm.mjs'),
  'html2canvas': path.join(deps, 'html2canvas/src/index.ts'),
  'css-line-break': path.join(deps, 'css-line-break/src/index.ts'),
  'text-segmentation': path.join(deps, 'text-segmentation/src/index.ts'),
  'utrie': path.join(deps, 'utrie/src/index.ts'),
  'base64-arraybuffer': path.join(deps, 'base64-arraybuffer/src/index.ts'),
  'dompurify': path.join(deps, 'dompurify/dist/purify.es.mjs'),
  'canvg': path.join(deps, 'canvg/src/index.ts'),
  'raf': path.join(deps, 'raf/index.js'),
  'performance-now': path.join(vendor, 'performance-now/lib/performance-now.js'),
  'rgbcolor': path.join(deps, 'node-rgbcolor/index.js'),
  'stackblur-canvas': path.join(deps, 'stackblur-canvas/src/stackblur.js'),
  'svg-pathdata': path.join(deps, 'svg-pathdata/src/SVGPathData.ts'),
  'svg-pathdata/lib/types': path.join(deps, 'svg-pathdata/src/types.ts'),
  'pdfjs-dist': path.join(vendor, 'pdfjs-dist/build/pdf.mjs'),
  '@babel/runtime/helpers/slicedToArray': path.join(deps, 'babel/packages/babel-helpers/src/helpers/slicedToArray.ts'),
  '@babel/runtime/helpers/typeof': path.join(deps, 'babel/packages/babel-helpers/src/helpers/typeof.ts'),
});
// lib0's package.json "exports" point at committed source files (see `prefix`).
const forbidden = new Set(['firebase/app', 'firebase/auth']);

const resolvePlugin = {
  name: 'offline-resolve',
  setup(build) {
    build.onResolve({ filter: /^[^./]|^\.\.?\/.*\.ts$/ }, (a) => {
      if (a.path.startsWith('.')) {
        // Babel helpers import "./x.ts" where only "./x.js" exists.
        const f = path.resolve(a.resolveDir, a.path);
        if (!fs.existsSync(f) && fs.existsSync(f.replace(/\.ts$/, '.js'))) return { path: f.replace(/\.ts$/, '.js') };
        return undefined;
      }
      if (a.path.includes('?')) return undefined;
      if (a.path.startsWith('node:') || ['path', 'fs', 'crypto', 'stream', 'zlib', 'http', 'https', 'url', 'util', 'buffer'].includes(a.path)) return { path: a.path, external: true };
      if (forbidden.has(a.path)) return { errors: [{ text: `${a.path} must not be reachable from the desktop renderer (imported by ${a.importer})` }] };
      if (exact[a.path]) return { path: exact[a.path] };
      if (a.path === 'lib0') return { path: path.join(prefix['lib0/'], 'index.js') };
      for (const [p, dir] of Object.entries(prefix)) if (a.path.startsWith(p)) {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        const key = './' + a.path.slice(p.length);
        let target = pkg.exports?.[key] ?? pkg.exports?.[key + '.js'];
        if (target && typeof target === 'object') target = target.browser?.import ?? target.browser ?? target.module ?? target.import ?? target.default;
        if (target && typeof target === 'object') target = target.default;
        if (typeof target === 'string') return { path: path.join(dir, target) };
        return { errors: [{ text: `Unmapped ${a.path}` }] };
      }
      // Anything else inside a vendored package resolves relative to that package.
      if (a.importer.startsWith(deps) || a.importer.startsWith(vendor)) return undefined;
      return { errors: [{ text: `Bare import "${a.path}" from ${path.relative(project, a.importer)} is not in the offline dependency allow-list` }] };
    });
  },
};

// canvg's presets import the `DOMParser` *interface* while also using the global
// DOMParser value; the TypeScript compiler elides that import, esbuild cannot.
const typeOnlyImports = {
  name: 'type-only-imports',
  setup(build) {
    build.onLoad({ filter: /canvg[\\/]src[\\/]presets[\\/](offscreen|node)\.ts$/ }, (a) => ({
      contents: fs.readFileSync(a.path, 'utf8').replace(/import\s*\{\s*DOMParser\s*\}\s*from\s*'\.\/types';/, "import type { DOMParser } from './types';"),
      loader: 'ts',
    }));
  },
};

// ---- asset helpers ---------------------------------------------------------
const assetsDir = () => path.join(outDir, 'assets');
const contentHash = (buf) => crypto.createHash('sha256').update(buf).digest('base64url').replace(/[-_]/g, 'x').slice(0, 8);
function emitAsset(name, ext, buf) {
  const file = `${name}-${contentHash(buf)}${ext}`;
  fs.mkdirSync(assetsDir(), { recursive: true });
  fs.writeFileSync(path.join(assetsDir(), file), buf);
  return '/assets/' + file;
}

const sharedOptions = () => ({
  bundle: true,
  minify,
  target: ['chrome111', 'edge111', 'firefox114', 'safari16.4'],
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.MODE': '"production"', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.SSR': 'false', 'import.meta.env.BASE_URL': '"/"', __DEV__: 'false' },
  jsx: 'automatic',
  tsconfig: path.join(project, 'tsconfig.json'),
  logLevel: 'warning',
  logOverride: { 'direct-eval': 'silent', 'unsupported-dynamic-import': 'silent', 'commonjs-variable-in-esm': 'silent', 'empty-import-meta': 'silent', 'tsconfig.json': 'silent' },
  loader: { '.svg': 'file', '.woff2': 'file', '.png': 'file' },
});

const queryPlugin = {
  name: 'vite-queries',
  setup(build) {
    build.onResolve({ filter: /\?(raw|url)$/ }, (a) => {
      const [spec, query] = a.path.split('?');
      let file;
      if (spec.startsWith('.')) file = path.resolve(a.resolveDir, spec);
      else if (spec === 'pdfjs-dist/build/pdf.worker.min.mjs') file = path.join(vendor, 'pdfjs-dist/build/pdf.worker.min.mjs');
      else return { errors: [{ text: `Unsupported ${a.path}` }] };
      return { path: file, namespace: 'q-' + query };
    });
    build.onLoad({ filter: /.*/, namespace: 'q-raw' }, (a) => ({ contents: fs.readFileSync(a.path, 'utf8'), loader: 'text' }));
    build.onLoad({ filter: /.*/, namespace: 'q-url' }, (a) => {
      const base = path.basename(a.path).replace(/\.[^.]+$/, '');
      const url = emitAsset(base, path.extname(a.path), fs.readFileSync(a.path));
      return { contents: `export default ${JSON.stringify(url)};`, loader: 'js' };
    });
  },
};

// `new Worker(new URL('./x.worker.ts', import.meta.url), ...)` -> separate bundle.
const workerCache = new Map();
async function buildWorker(file) {
  if (workerCache.has(file)) return workerCache.get(file);
  const result = await esbuild.build({ ...sharedOptions(), loader: {}, entryPoints: [file], outdir: assetsDir(), format: 'iife', write: false, plugins: [resolvePlugin, typeOnlyImports, queryPlugin] });
  const url = emitAsset(path.basename(file).replace(/\.[jt]sx?$/, ''), '.js', Buffer.from(result.outputFiles[0].contents));
  workerCache.set(file, url);
  return url;
}
const workerPlugin = {
  name: 'vite-workers',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/].*\.tsx?$/ }, async (a) => {
      let source = fs.readFileSync(a.path, 'utf8');
      const re = /new Worker\(\s*new URL\(\s*(['"])(\.[^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g;
      if (!re.test(source)) return undefined;
      re.lastIndex = 0;
      const replacements = [];
      for (const m of source.matchAll(re)) replacements.push([m[0], await buildWorker(path.resolve(path.dirname(a.path), m[2]))]);
      for (const [match, url] of replacements) source = source.replace(match, `new Worker(new URL(${JSON.stringify(url)}, '' + import.meta.url)`);
      return { contents: source, loader: a.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

// ---- Tailwind CSS ------------------------------------------------------------
function scanCandidates() {
  const ignored = ['node_modules', '.git', 'dist', 'crates', 'screenplay-workspace', 'build-offline'];
  const skipExt = /\.(png|jpe?g|gif|webp|ico|icns|woff2?|ttf|otf|pdf|zip|dmg|gz|lock|css|map|aff|dic|wasm|patch|log)$/i;
  const tokens = new Set();
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (!(dir === project && ['public', 'verification', 'licenses', 'Font-Licenses', 'Spelling-Licenses', 'collaboration', 'migrations', 'scripts', 'desktop'].includes(entry.name))) visit(full); continue; }
      if (skipExt.test(entry.name) || entry.name === 'package-lock.json') continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const raw of text.split(/[\s"'`]+/)) {
        if (!raw || raw.length > 200) continue;
        tokens.add(raw);
        for (const piece of raw.split(/[{}();,<>=]+/)) if (piece) tokens.add(piece);
        const trimmed = raw.replace(/^[^a-zA-Z0-9!@\[\-*]+|[^a-zA-Z0-9\]%)*]+$/g, ''); if (trimmed) tokens.add(trimmed);
      }
    }
  };
  visit(project);
  return [...tokens];
}
async function compileTailwind(file) {
  const base = path.dirname(file);
  const compiler = await tailwind.compile(fs.readFileSync(file, 'utf8'), {
    base,
    loadStylesheet: async (id, from) => {
      const target = id === 'tailwindcss' ? path.join(vendor, 'tailwindcss/index.css') : id.startsWith('tailwindcss/') ? path.join(vendor, id + (id.endsWith('.css') ? '' : '.css')) : path.resolve(from, id);
      return { path: target, base: path.dirname(target), content: fs.readFileSync(target, 'utf8') };
    },
    loadModule: async (id) => { throw new Error(`Tailwind plugin/config modules are not supported offline: ${id}`); },
  });
  return compiler.build(scanCandidates());
}
const cssPlugin = {
  name: 'tailwind',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]index\.css$/ }, async (a) => ({ contents: await compileTailwind(a.path), loader: 'css', resolveDir: path.dirname(a.path) }));
  },
};

// ---- main build --------------------------------------------------------------
export async function buildRenderer() {
const assets = assetsDir();
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(assets, { recursive: true });
// pdf.js ships pdf.worker.mjs; the npm package also carries the minified copy.
const workerMin = path.join(vendor, 'pdfjs-dist/build/pdf.worker.min.mjs');
if (!fs.existsSync(workerMin)) throw new Error('vendor pdf.worker.min.mjs is missing; run setup-vendor.mjs');

const html = fs.readFileSync(path.join(project, 'index.html'), 'utf8');
const entry = /<script type="module" src="\/(src\/main\.tsx)"><\/script>/.exec(html);
if (!entry) throw new Error('index.html entry script changed');
const result = await esbuild.build({
  ...sharedOptions(),
  entryPoints: { index: path.join(project, entry[1]) },
  outdir: assets,
  format: 'esm',
  splitting: true,
  metafile: true,
  entryNames: '[name]-[hash]',
  chunkNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  publicPath: '/assets',
  plugins: [resolvePlugin, typeOnlyImports, queryPlugin, workerPlugin, cssPlugin],
});
fs.writeFileSync(path.join(outDir, '..', 'renderer-metafile.json'), JSON.stringify(result.metafile));
const outputs = Object.entries(result.metafile.outputs).filter(([, o]) => o.entryPoint && o.entryPoint.endsWith('main.tsx'));
const js = path.basename(outputs[0][0]);
const css = outputs[0][1].cssBundle ? path.basename(outputs[0][1].cssBundle) : null;
let out = html.replace(entry[0], '').replace('</head>', `  <script type="module" crossorigin src="/assets/${js}"></script>\n${css ? `    <link rel="stylesheet" crossorigin href="/assets/${css}">\n` : ''}  </head>`);
fs.writeFileSync(path.join(outDir, 'index.html'), out);
if (fs.existsSync(path.join(project, 'public'))) fs.cpSync(path.join(project, 'public'), outDir, { recursive: true });
const inputs = Object.keys(result.metafile.inputs);
console.log(JSON.stringify({ entry: js, css, assets: fs.readdirSync(assets), inputs: inputs.length, firebaseReachable: inputs.some((i) => i.includes('firebase')) }, null, 1));
}
if (isMain) { loadTools(); await buildRenderer(); }
