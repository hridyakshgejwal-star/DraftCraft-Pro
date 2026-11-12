import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packagerPath = require.resolve('@electron/packager', { paths: [here, path.resolve(here, '../..', 'desktop-tools')] });
const { packager } = await import(pathToFileURL(packagerPath).toString());
const platform = process.argv[2] || 'darwin';
const arch = process.argv[3] || 'arm64';
if (platform === 'darwin' && process.platform !== 'darwin' && !process.env.RCODESIGN) {
  throw new Error('macOS packaging needs a macOS host or RCODESIGN pointing to a verified rcodesign executable. A bundle with only linker signatures is not a finished package.');
}
const paths = await packager({
  dir: path.resolve(here, '../..', 'desktop-build/app'),
  out: path.resolve(here, '../..', 'desktop-build/packages'),
  name: 'DraftCraft Pro',
  appVersion: '1.18.0',
  buildVersion: '1.18.0',
  appBundleId: 'com.draftcraft.screenplay.studio',
  appCategoryType: 'public.app-category.productivity',
  platform, arch,
  electronVersion: '44.7.0',
  asar: true,
  asarIntegrityDigest: false,
  prune: true,
  overwrite: true,
  // Windows (1.18.0): the same app, packaged for Windows with a Windows icon and file metadata. Nothing in the app changes.
  icon: path.join(here, platform === 'win32' ? 'icon.ico' : 'icon.icns'),
  win32metadata: { CompanyName: 'DraftCraft Pro', FileDescription: 'DraftCraft Pro', ProductName: 'DraftCraft Pro', InternalName: 'DraftCraft Pro', OriginalFilename: 'DraftCraft Pro.exe' },
  // The Speech helper must be outside app.asar to run: the one just built on this Mac, or the arm64 helper built on a
  // Mac and checked in (desktop/native/bin, see build-on-mac.log).
  extraResource: [path.join(here,'Getting-Started.txt'),path.join(here,'../licenses/production'),...(platform === 'darwin' ? ['native/DraftCraftDictation','native/bin/DraftCraftDictation'].map(p=>path.join(here,p)).filter(p=>fs.existsSync(p)).slice(0,1) : [])],
  darwinDarkModeSupport: true,
  osxSign: false,
  osxNotarize: false,
  extendInfo: {
    NSHighResolutionCapable: true,
    NSMicrophoneUsageDescription:'DraftCraft uses the microphone only when you start on-device dictation.',
    NSSpeechRecognitionUsageDescription:'DraftCraft transcribes your dictated screenplay using an available on-device language.',
    CFBundleDocumentTypes: [
      { CFBundleTypeName: 'DraftCraft Project', CFBundleTypeExtensions: ['draftcraft'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner' },
      { CFBundleTypeName: 'Final Draft Screenplay', CFBundleTypeExtensions: ['fdx'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
      { CFBundleTypeName: 'Fountain Screenplay', CFBundleTypeExtensions: ['fountain'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
    ],
  },
});
if (platform === 'darwin') {
  for (const output of paths) {
    const bundle = path.join(output, 'DraftCraft Pro.app');
    const command = process.platform === 'darwin' ? '/bin/bash' : process.env.RCODESIGN;
    const args = process.platform === 'darwin'
      ? [path.join(here, 'sign-macos.sh'), bundle]
      : ['sign', '--config-file', '/dev/null', '--timestamp-url', 'none', bundle];
    const signing = spawnSync(command, args, { stdio: 'inherit' });
    if (signing.error) throw signing.error;
    if (signing.status !== 0) throw new Error('macOS bundle signing failed.');
  }
}
console.log(JSON.stringify({ packages: paths }));
