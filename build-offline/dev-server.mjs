// Minimal stand-in for Vite's `createServer` used by verification harnesses
// (production-codecs.cjs) when Vite cannot be installed. It serves the project
// root, bundles requested .ts/.tsx modules on demand with the same offline
// dependency allow-list as build-renderer.mjs, and supports Vite-style
// `configureServer(server)` middleware plugins.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { configure } from './build-renderer.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
export async function createServer({ root, server: options = {}, plugins = [] } = {}) {
  const project = path.resolve(root);
  const draftcraft = path.resolve(project, '..');
  const out = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'dc-dev-'));
  const tools = configure({ project, vendor: process.env.DRAFTCRAFT_VENDOR || path.join(draftcraft, 'vendor/node_modules'), deps: process.env.DRAFTCRAFT_DEPS || path.join(draftcraft, 'deps-src'), out });
  const middlewares = [];
  const api = { middlewares: { use: (fn) => middlewares.push(fn) } };
  for (const plugin of plugins) plugin.configureServer?.(api);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
  const bundles = new Map();
  const httpServer = http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let i = 0;
    const next = async () => {
      const fn = middlewares[i++];
      if (fn) return fn(req, res, next);
      try {
        if (url.startsWith('/assets/')) { const f = path.join(out, url); if (fs.existsSync(f)) { res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); return res.end(fs.readFileSync(f)); } }
        const file = path.resolve(project, '.' + url);
        if (!file.startsWith(project) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
        if (/\.(tsx?|jsx)$/.test(file)) {
          if (!bundles.has(file)) {
            const result = await tools.esbuild.build({ ...tools.sharedOptions, minify: false, entryPoints: [file], bundle: true, format: 'esm', write: false, outdir: path.join(out, 'assets'), publicPath: '/assets', plugins: [tools.plugins.resolvePlugin, tools.plugins.typeOnlyImports, tools.plugins.queryPlugin, tools.plugins.workerPlugin, tools.plugins.cssPlugin] });
            for (const o of result.outputFiles) if (!o.path.endsWith('.js')) { fs.mkdirSync(path.dirname(o.path), { recursive: true }); fs.writeFileSync(o.path, o.contents); }
            bundles.set(file, result.outputFiles.find((o) => o.path.endsWith('.js')).text);
          }
          res.setHeader('content-type', 'text/javascript');
          return res.end(bundles.get(file));
        }
        res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
        res.end(fs.readFileSync(file));
      } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
    };
    await next();
  });
  return {
    httpServer,
    async listen() { await new Promise((r) => httpServer.listen(options.port || 0, options.host || '127.0.0.1', r)); return this; },
    async close() { await new Promise((r) => httpServer.close(() => r())); fs.rmSync(out, { recursive: true, force: true }); },
  };
}
void here;
