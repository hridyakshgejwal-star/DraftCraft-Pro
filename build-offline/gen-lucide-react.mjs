// Generates the lucide-react package source from the pinned lucide repository
// (icons/*.svg + icons/*.json + packages/lucide-react/src), replicating
// tools/build-icons (renderUniqueKey, withAliases, prefixed/suffixed names).
import fs from 'node:fs';
import path from 'node:path';

const [repo, out] = process.argv.slice(2);
if (!repo || !out) throw new Error('usage: gen-lucide-react.mjs <lucide repo> <output dir>');
const iconsDir = path.join(repo, 'icons');
const hash = (string, seed = 5381) => { let i = string.length; while (i) seed = (seed * 33) ^ string.charCodeAt(--i); return (seed >>> 0).toString(36).substr(0, 6); };
const toCamelCase = (s) => s.replace(/^([A-Z])|[\s-_]+(\w)/g, (m, p1, p2) => (p2 ? p2.toUpperCase() : p1.toLowerCase()));
const toPascalCase = (s) => { const c = toCamelCase(s); return c.charAt(0).toUpperCase() + c.slice(1); };

function parseChildren(svg, name) {
  const body = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const children = [];
  const re = /<([a-z]+)\b([^>]*?)\/?>(?:\s*<\/\1>)?/g; let m;
  while ((m = re.exec(body))) {
    const attributes = {}; const ar = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g; let a;
    while ((a = ar.exec(m[2]))) attributes[a[1]] = a[2];
    children.push({ name: m[1], attributes });
  }
  if (!children.length) throw new Error(`${name}.svg has no children!`);
  return children;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'src', 'icons'), { recursive: true });
for (const f of ['createLucideIcon.ts', 'Icon.ts', 'defaultAttributes.ts', 'types.ts', 'context.ts'])
  if (fs.existsSync(path.join(repo, 'packages/lucide-react/src', f))) fs.copyFileSync(path.join(repo, 'packages/lucide-react/src', f), path.join(out, 'src', f));
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });
for (const f of fs.readdirSync(path.join(repo, 'packages/shared/src'))) fs.copyFileSync(path.join(repo, 'packages/shared/src', f), path.join(out, 'shared', f));

const names = fs.readdirSync(iconsDir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
let index = '', aliases = '';
const taken = new Set(names.map(toPascalCase));
const exportOnce = (name) => { if (taken.has(name)) return false; taken.add(name); return true; };
const aliasLines = [];
for (const iconName of names) {
  const children = parseChildren(fs.readFileSync(path.join(iconsDir, iconName + '.svg'), 'utf8'), iconName);
  const keys = children.map((c) => hash(JSON.stringify([c.name, c.attributes])));
  if (new Set(keys).size !== keys.length) throw new Error(`Duplicated children in ${iconName}.svg`);
  const node = children.map((c, i) => [c.name, { ...c.attributes, key: keys[i] }]);
  const component = toPascalCase(iconName);
  fs.writeFileSync(path.join(out, 'src/icons', iconName + '.ts'),
    `import createLucideIcon from '../createLucideIcon';\nimport { IconNode } from '../types';\n\nexport const __iconNode: IconNode = ${JSON.stringify(node)};\n\nconst ${component} = createLucideIcon('${iconName}', __iconNode);\n\nexport default ${component};\n`);
  index += `export { default as ${component} } from './${iconName}';\n`;
  aliasLines.push([iconName, [component + 'Icon', 'Lucide' + component]]);
  const meta = JSON.parse(fs.readFileSync(path.join(iconsDir, iconName + '.json'), 'utf8'));
  for (const alias of meta.aliases || []) {
    const aliasName = toPascalCase(typeof alias === 'string' ? alias : alias.name);
    aliasLines.push([iconName, [aliasName, aliasName + 'Icon', 'Lucide' + aliasName]]);
  }
}
for (const [iconName, list] of aliasLines) { const unique = list.filter(exportOnce); if (unique.length) aliases += `export { ${unique.map((n) => 'default as ' + n).join(', ')} } from '../icons/${iconName}';\n`; }
fs.writeFileSync(path.join(out, 'src/icons/index.ts'), index);
fs.mkdirSync(path.join(out, 'src/aliases'), { recursive: true });
fs.writeFileSync(path.join(out, 'src/aliases/index.ts'), aliases);
fs.writeFileSync(path.join(out, 'src/lucide-react.ts'), fs.readFileSync(path.join(repo, 'packages/lucide-react/src/lucide-react.ts'), 'utf8'));
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ name: 'lucide-react', version: '0.546.0', sideEffects: false, module: './src/lucide-react.ts' }, null, 2));
console.log(`lucide-react: ${names.length} icons generated`);
