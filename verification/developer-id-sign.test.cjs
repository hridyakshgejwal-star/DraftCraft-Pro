// Developer ID signing and notarization script (desktop/developer-id/Sign-and-Notarize.command).
// Signing and notarization need the owner's Apple Developer account, so they cannot run here. This test runs the
// script's control flow on Linux against stand-in tools (DC_SIGN_TEST_ROOT) that record every call, and checks:
// inside-out signing with the hardened runtime, timestamps and entitlements where they belong; notarization, stapling
// and Gatekeeper checks for the app and the disk image; and that it refuses to sign when anything is wrong.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { spawnSync } = require('node:child_process');
const script = path.resolve(__dirname, '../desktop/developer-id/Sign-and-Notarize.command'), entitlements = path.resolve(__dirname, '../desktop/developer-id/entitlements.plist');
const ID = 'Developer ID Application: Test Writer (TEAM123456)';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-sign-')), tools = path.join(root, 'tools'), calls = path.join(root, 'calls.log');
  const tool = (rel, body) => { const p = path.join(tools, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, '#!/bin/bash\n' + body + '\n', { mode: 0o755 }); };
  const record = `printf '%s' "$(basename "$0")" >> "${calls}"; for a in "$@"; do printf '\\x1f%s' "$a" >> "${calls}"; done; printf '\\n' >> "${calls}"`;
  tool('usr/bin/codesign', `${record}\ncase " $* " in *" -dvvv "*) printf 'Authority=Developer ID Application: Test Writer (TEAM123456)\\nTeamIdentifier=TEAM123456\\nflags=0x10000(runtime)\\n' >&2;; esac\nexit 0`);
  tool('usr/bin/security', `${record}\nwhile IFS= read -r n; do [ -n "$n" ] && printf '  1) 0123456789ABCDEF "%s"\\n' "$n"; done <<< "\${MOCK_IDENTITIES:-}"\nprintf '     %s valid identities found\\n' 1`);
  tool('usr/bin/xcrun', `${record}\nif [ "$1" = --find ]; then [ -z "\${MOCK_NO_TOOLS:-}" ]; exit; fi
if [ "$1 $2" = "notarytool history" ]; then [ -n "\${MOCK_PROFILE_OK:-}" ]; exit; fi
if [ "$1 $2" = "notarytool submit" ]; then printf '{"id":"sub-%s","status":"%s","message":"done"}\\n' "$(basename "$3")" "\${MOCK_STATUS:-Accepted}"; exit 0; fi
if [ "$1 $2" = "notarytool log" ]; then printf '{"issues":[]}' > "\${@: -1}"; exit 0; fi
exit 0`);
  tool('usr/sbin/spctl', `${record}\nprintf '%s: accepted\\nsource=Notarized Developer ID\\n' "\${@: -1}" >&2`);
  tool('usr/bin/hdiutil', `${record}\n: > "\${@: -1}"`);
  tool('usr/bin/ditto', `${record}\nif [ "$1" = -c ]; then : > "\${@: -1}"; else cp -R "$1" "$2"; fi`);
  tool('usr/bin/xattr', `${record}`);
  tool('usr/bin/file', `case "$(head -c 9 "$2")" in MACHO-EXE) echo 'Mach-O 64-bit executable arm64';; MACHO-LIB) echo 'Mach-O 64-bit dynamically linked shared library arm64';; *) echo data;; esac`);
  tool('usr/bin/shasum', `shift 2; if [ "$1" = -c ]; then sha256sum -c "$2"; else sha256sum "$@"; fi`);
  tool('usr/bin/uname', `[ "$1" = -s ] && echo "\${MOCK_UNAME:-Darwin}" || echo arm64`);
  tool('usr/libexec/PlistBuddy', `echo 1.16.1`);
  // A package laid out like the disk image: the app, its manifest, and the Developer-ID folder.
  const pkg = path.join(root, 'pkg'), app = path.join(pkg, 'DraftCraft Pro.app/Contents');
  const put = (rel, content) => { const p = path.join(app, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
  put('MacOS/DraftCraft Pro', 'MACHO-EXE main'); put('Info.plist', '<plist/>'); put('Resources/app.asar', 'asar');
  put('Frameworks/Electron Framework.framework/Versions/A/Electron Framework', 'MACHO-LIB electron');
  put('Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib', 'MACHO-LIB ffmpeg');
  put('Frameworks/Electron Framework.framework/Versions/A/Helpers/chrome_crashpad_handler', 'MACHO-EXE crashpad');
  put('Frameworks/Squirrel.framework/Versions/A/Squirrel', 'MACHO-LIB squirrel'); put('Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt', 'MACHO-EXE shipit');
  for (const h of ['DraftCraft Pro Helper', 'DraftCraft Pro Helper (Renderer)', 'DraftCraft Pro Helper (GPU)']) put(`Frameworks/${h}.app/Contents/MacOS/${h}`, 'MACHO-EXE ' + h);
  fs.mkdirSync(path.join(pkg, 'Support')); fs.mkdirSync(path.join(pkg, 'Developer-ID'));
  const files = spawnSync('bash', ['-c', "cd \"$1\" && find 'DraftCraft Pro.app' -type f ! -name '.DS_Store' -print | LC_ALL=C sort", '_', pkg], { encoding: 'utf8' }).stdout;
  fs.writeFileSync(path.join(pkg, 'Support/File-Paths.txt'), files);
  fs.writeFileSync(path.join(pkg, 'Support/Package-SHA256.txt'), spawnSync('bash', ['-c', 'cd "$1" && while IFS= read -r f; do sha256sum "$f"; done < Support/File-Paths.txt', '_', pkg], { encoding: 'utf8' }).stdout);
  fs.copyFileSync(script, path.join(pkg, 'Developer-ID/Sign-and-Notarize.command')); fs.chmodSync(path.join(pkg, 'Developer-ID/Sign-and-Notarize.command'), 0o755);
  fs.copyFileSync(entitlements, path.join(pkg, 'Developer-ID/entitlements.plist'));
  const run = (args = [], env = {}) => { try { fs.unlinkSync(calls); } catch { /* first run */ }
    const r = spawnSync('/bin/bash', [path.join(pkg, 'Developer-ID/Sign-and-Notarize.command'), '--out', path.join(root, 'out'), ...args], { encoding: 'utf8', input: '', env: { PATH: '/usr/bin:/bin', HOME: root, DC_SIGN_TEST_ROOT: tools, MOCK_IDENTITIES: ID, MOCK_PROFILE_OK: '1', ...env } });
    const log = fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(l => l.split('\x1f')) : [];
    return { ...r, calls: log };
  };
  return { root, pkg, run };
}

test('signs inside out with the hardened runtime, notarizes, staples and checks the app and the disk image', () => {
  const { root, run } = setup(), r = run();
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const out = path.join(root, 'out'), work = path.join(out, 'DraftCraft Pro.app');
  const signs = r.calls.filter(c => c[0] === 'codesign' && c.includes('--sign')), targets = signs.map(c => c.at(-1));
  for (const c of signs) { assert.ok(c.includes('--timestamp'), 'secure timestamp: ' + c.join(' ')); assert.equal(c[c.indexOf('--sign') + 1], ID); }
  const appSigns = signs.filter(c => !c.at(-1).endsWith('.dmg'));
  for (const c of appSigns) assert.ok(c.includes('--options') && c[c.indexOf('--options') + 1] === 'runtime', 'hardened runtime: ' + c.at(-1));
  // Every file and nested bundle is signed before the bundle that contains it; the app itself comes last.
  appSigns.forEach((c, i) => { const t = c.at(-1); appSigns.slice(0, i).forEach(prev => assert.ok(!t.startsWith(prev.at(-1) + '/'), `${t} was signed after its container ${prev.at(-1)}`)); });
  assert.equal(appSigns.at(-1).at(-1), work);
  const ent = t => signs.find(c => c.at(-1) === t)?.includes('--entitlements');
  for (const t of targets.filter(t => /\/MacOS\/[^/]+$/.test(t) || t.endsWith('.app'))) assert.ok(ent(t), 'entitlements on executable ' + t);
  for (const t of targets.filter(t => t.endsWith('.dylib') || t.endsWith('.framework') || t.endsWith('/Electron Framework'))) assert.ok(!ent(t), 'no entitlements on library ' + t);
  assert.ok(targets.some(t => t.endsWith('/chrome_crashpad_handler')) && targets.some(t => t.endsWith('/ShipIt')), 'standalone executables are signed too');
  assert.ok(targets.includes(path.join(work, 'Contents/Frameworks/DraftCraft Pro Helper (Renderer).app')));
  // Notarization of the app (zipped) and of the disk image, each stapled, then Gatekeeper checks.
  const submits = r.calls.filter(c => c[0] === 'xcrun' && c[1] === 'notarytool' && c[2] === 'submit');
  assert.equal(submits.length, 2);assert.ok(submits[0][3].endsWith('.zip') && submits[1][3].endsWith('-notarized.dmg'));
  for (const c of submits) { assert.equal(c[c.indexOf('--keychain-profile') + 1], 'DraftCraft-Notary'); assert.ok(c.includes('--wait')); }
  const staples = r.calls.filter(c => c[0] === 'xcrun' && c[1] === 'stapler' && c[2] === 'staple').map(c => c[3]);
  assert.deepEqual(staples, [work, path.join(out, 'DraftCraft-Pro-1.16.1-arm64-notarized.dmg')]);
  const order = r.calls.map(c => c.slice(0, 3).join(' '));
  assert.ok(order.indexOf('xcrun stapler staple') > order.indexOf('xcrun notarytool submit'), 'stapled after notarization');
  assert.ok(r.calls.some(c => c[0] === 'spctl' && c.includes('execute')) && r.calls.some(c => c[0] === 'spctl' && c.includes('open')), 'Gatekeeper assessment of the app and the disk image');
  assert.ok(fs.existsSync(path.join(out, 'DraftCraft-Pro-1.16.1-arm64-notarized.dmg')) && fs.existsSync(path.join(out, 'SHA256.txt')) && fs.existsSync(path.join(out, 'sign-and-notarize.log')));
  assert.ok(!fs.existsSync(path.join(out, 'DraftCraft-Pro-1.16.1-notarize.zip')), 'the upload zip is removed');
  assert.ok(!/password/i.test(fs.readFileSync(path.join(out, 'sign-and-notarize.log'), 'utf8')), 'no credentials in the log');
  assert.match(r.stdout, /Done\. Signed, notarized and stapled/);
});

test('refuses to sign when the certificate, the profile, the platform or the app is not right', () => {
  const { pkg, run } = setup();
  const signed = r => r.calls.some(c => c[0] === 'codesign');
  let r = run([], { MOCK_IDENTITIES: '' });assert.notEqual(r.status, 0);assert.match(r.stderr, /No "Developer ID Application" certificate/);assert.ok(!signed(r));
  r = run([], { MOCK_IDENTITIES: ID + '\nDeveloper ID Application: Other (TEAM999999)' });assert.notEqual(r.status, 0);assert.match(r.stderr, /choose one with --identity/);assert.ok(!signed(r));
  r = run(['--identity', 'Developer ID Application: Other (TEAM999999)'], { MOCK_IDENTITIES: ID + '\nDeveloper ID Application: Other (TEAM999999)' });assert.equal(r.status, 0, r.stderr);
  r = run(['--identity', 'Developer ID Application: Nobody (X)']);assert.notEqual(r.status, 0);assert.match(r.stderr, /is not in your keychain/);
  r = run([], { MOCK_PROFILE_OK: '' });assert.notEqual(r.status, 0);assert.match(r.stderr, /notarytool store-credentials "DraftCraft-Notary"/);assert.ok(!signed(r));
  r = run([], { MOCK_UNAME: 'Linux' });assert.notEqual(r.status, 0);assert.match(r.stderr, /Run this on macOS/);
  r = run([], { MOCK_NO_TOOLS: '1' });assert.notEqual(r.status, 0);assert.match(r.stderr, /notarytool was not found/);
  fs.appendFileSync(path.join(pkg, 'DraftCraft Pro.app/Contents/Resources/app.asar'), 'tampered');
  r = run();assert.notEqual(r.status, 0);assert.match(r.stderr, /does not match its manifest/);assert.ok(!signed(r), 'nothing is signed when the app does not match its manifest');
});

test('stops without stapling when Apple does not accept the submission, and fetches Apple’s report', () => {
  const { root, run } = setup(), r = run(['--no-dmg'], { MOCK_STATUS: 'Invalid' });
  assert.notEqual(r.status, 0);assert.match(r.stderr, /Apple did not accept the app \(status: Invalid\)/);
  assert.ok(r.calls.some(c => c[0] === 'xcrun' && c[2] === 'log'), 'the notarization log is fetched');assert.ok(fs.existsSync(path.join(root, 'out/notary-app-log.json')));
  assert.ok(!r.calls.some(c => c[0] === 'xcrun' && c[1] === 'stapler'), 'nothing is stapled');
});

test('--check only checks the tools, the certificate and the profile', () => {
  const { run } = setup(), r = run(['--check']);
  assert.equal(r.status, 0, r.stderr);assert.match(r.stdout, /Ready: the tools, the certificate and the notarytool profile all work/);
  assert.ok(!r.calls.some(c => c[0] === 'codesign' || (c[0] === 'xcrun' && c[2] === 'submit')));
});
