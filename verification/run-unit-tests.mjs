// Runs the release "models" unit tests (every verification/*.test.ts plus the .cjs/.mjs list in
// run-release-tests.py) with node:test, on any platform. Used by the Windows workflow.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = fs.readFileSync(path.join(root, 'verification', 'run-release-tests.py'), 'utf8');
const list = runner.match(/\+\[('verification\/advanced[^\]]*)\]/);
if (!list) throw new Error('The unit-test list in run-release-tests.py was not found.');
const others = [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const typescript = fs.readdirSync(path.join(root, 'verification')).filter((f) => f.endsWith('.test.ts')).sort().map((f) => 'verification/' + f);
const files = [...typescript, ...others];
console.log(`Running ${files.length} unit-test files on ${process.platform} (Node ${process.version}).`);
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { cwd: root, stdio: 'inherit', env: { ...process.env, RUN_LARGE: '1' } });
process.exit(result.status ?? 1);
