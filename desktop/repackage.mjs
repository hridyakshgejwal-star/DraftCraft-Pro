// Rebuild the app payload while retaining a known supplied Electron runtime.
// Usage: node desktop/build.cjs, then:
// RCODESIGN=/path/rcodesign node desktop/repackage.mjs /path/Original.app /path/Output.app
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const plist = require('plist');
const here = path.dirname(new URL(import.meta.url).pathname);
const stage = path.resolve(here, '../../desktop-build/app');
const input = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || '');
if (!process.argv[2] || !process.argv[3] || input === output || !input.endsWith('.app') || !output.endsWith('.app')) throw new Error('Provide separate input and output app bundles.');
if (!fs.existsSync(path.join(stage, 'dist/index.html'))) throw new Error('Run desktop/build.cjs first.');
if (process.platform !== 'darwin' && !process.env.RCODESIGN) throw new Error('Supply RCODESIGN or run on macOS to sign the rebuilt bundle.');
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(input, output, { recursive: true, dereference: false, verbatimSymlinks: true });
// Detect short copies on remote/incremental build filesystems before signing.
// A single buffered write also avoids truncation of the large Electron binary.
for (const name of fs.readdirSync(input, { recursive: true })) {
  const original = path.join(input, name), copied = path.join(output, name);
  const stat = fs.lstatSync(original);
  if (!stat.isFile()) continue;
  if (stat.size > 64 * 1024 * 1024 || fs.statSync(copied).size !== stat.size) {
    const bytes = fs.readFileSync(original);
    if (!fs.readFileSync(copied).equals(bytes)) {
      fs.writeFileSync(copied, bytes);
      fs.chmodSync(copied, stat.mode & 0o777);
    }
    if (fs.statSync(copied).size !== bytes.length || !fs.readFileSync(copied).equals(bytes)) throw new Error('Incomplete runtime copy: ' + name);
  }
}
const archive = path.join(output, 'Contents/Resources/app.asar');
await asar.createPackage(stage, archive);
const headerHash = crypto.createHash('sha256').update(asar.getRawHeader(archive).headerString).digest('hex');
const infoPath = path.join(output, 'Contents/Info.plist');
const info = plist.parse(fs.readFileSync(infoPath, 'utf8'));
info.CFBundleDocumentTypes=[...(info.CFBundleDocumentTypes || []).filter(t=>!(t.CFBundleTypeExtensions || []).includes('draftcraft')),{CFBundleTypeName:'DraftCraft Project',CFBundleTypeExtensions:['draftcraft'],CFBundleTypeRole:'Editor',LSHandlerRank:'Owner'}];
const appPackage = JSON.parse(fs.readFileSync(path.join(stage, 'package.json'), 'utf8'));
info.NSMicrophoneUsageDescription='DraftCraft uses the microphone only when you start on-device dictation.';
info.NSSpeechRecognitionUsageDescription='DraftCraft transcribes your dictated screenplay using an available on-device language.';
info.CFBundleShortVersionString = appPackage.version;
info.CFBundleVersion = appPackage.version;
info.ElectronAsarIntegrity = { 'Resources/app.asar': { algorithm: 'SHA256', hash: headerHash } };
fs.writeFileSync(infoPath, plist.build(info));
fs.cpSync(path.join(here,'../licenses/production'),path.join(output,'Contents/Resources/Production-Licenses'),{recursive:true});
fs.copyFileSync(path.join(stage, 'Getting-Started.txt'), path.join(output, 'Contents/Resources/Getting-Started.txt'));
const command = process.platform === 'darwin' ? '/bin/bash' : process.env.RCODESIGN;
// A verified, byte-identical runtime can retain its nested signatures. This
// avoids rewriting large unchanged binaries on constrained build filesystems.
const args = process.platform === 'darwin' ? [path.join(here, 'sign-macos.sh'), output] : ['sign', '--config-file', '/dev/null', '--timestamp-url', 'none', ...(process.env.DRAFTCRAFT_REUSE_NATIVE_SIGNATURES==='1'?['--shallow']:[]), output];
const signed = spawnSync(command, args, { stdio: 'inherit' });
if (signed.error) throw signed.error;
if (signed.status !== 0) throw new Error('Signing failed; do not distribute this bundle.');
console.log(JSON.stringify({ bundle: output, version: appPackage.version, asarHeaderSha256: headerHash }));
