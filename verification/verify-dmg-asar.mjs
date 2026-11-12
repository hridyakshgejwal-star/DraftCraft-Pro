// Compare every packaged file with the exact application payload exercised by QA.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(source,'desktop/package.json'));
const asar=require('@electron/asar'),plist=require('plist');
const bundle=path.resolve(process.argv[2]||'');
const stage=path.resolve(process.argv[3]||path.join(source,'../desktop-build/app'));
const output=process.argv[4]||path.join(source,'verification/dmg-asar-proof.json');
assert.ok(process.argv[2]&&bundle.endsWith('.app'),'Provide the completed bundle');
const archive=path.join(bundle,'Contents/Resources/app.asar');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=fs.readdirSync(stage,{recursive:true}).filter(n=>fs.statSync(path.join(stage,n)).isFile()).sort();
const actual=asar.listPackage(archive).map(n=>n.replace(/^\//,'')).filter(n=>!asar.statFile(archive,n).files).sort();
assert.deepEqual(actual,files,'Packaged file inventory differs from staging');
const fingerprint=crypto.createHash('sha256');
for(const name of files){
  const bytes=fs.readFileSync(path.join(stage,name));
  assert.deepEqual(asar.extractFile(archive,name),bytes,'Packaged file differs: '+name);
  fingerprint.update(name.replaceAll(path.sep,'/')+'\0');fingerprint.update(bytes);
}
const payloadSha256=fingerprint.digest('hex');
const info=plist.parse(fs.readFileSync(path.join(bundle,'Contents/Info.plist'),'utf8'));
const version=JSON.parse(asar.extractFile(archive,'package.json').toString()).version;
assert.equal(version,process.env.DRAFTCRAFT_EXPECT_VERSION||JSON.parse(fs.readFileSync(path.join(source,'desktop/package.json'),'utf8')).version);assert.equal(info.CFBundleShortVersionString,version);
assert.equal(info.CFBundleVersion,version);assert.equal(info.CFBundleIdentifier,'com.draftcraft.screenplay.studio');
const headerHash=hash(asar.getRawHeader(archive).headerString);
assert.deepEqual(info.ElectronAsarIntegrity,{'Resources/app.asar':{algorithm:'SHA256',hash:headerHash}});
const native=[];
for(const name of fs.readdirSync(path.join(source,'desktop')).filter(n=>n.endsWith('.cjs'))){
  if(!fs.existsSync(path.join(stage,name)))continue;
  assert.deepEqual(fs.readFileSync(path.join(source,'desktop',name)),asar.extractFile(archive,name),'Backend source differs: '+name);
  native.push(name);
}
assert.deepEqual(fs.readFileSync(path.join(source,'src/files/documentGraph.mjs')),asar.extractFile(archive,'document-graph.mjs'),'Shared document graph differs');
const mach=[],nativePaths=new Set();
for(const name of fs.readdirSync(bundle,{recursive:true})){
  const target=path.join(bundle,name),stat=fs.lstatSync(target);
  if(!stat.isFile())continue;
  // Framework aliases can appear in Node's recursive listing; inspect each
  // physical native file once, while the signature proof checks every link.
  const real=fs.realpathSync(target);if(nativePaths.has(real))continue;nativePaths.add(real);
  const fd=fs.openSync(target,'r'),header=Buffer.alloc(8);const read=fs.readSync(fd,header);fs.closeSync(fd);
  if(read===8&&header.readUInt32LE(0)===0xfeedfacf){
    assert.equal(header.readUInt32LE(4),0x0100000c,'Unexpected native architecture: '+name);
    assert.ok(stat.mode&0o111,'Native file is not executable: '+name);mach.push(name);
  }
}
// 13 native files belong to the Electron runtime; 1.17.0 adds the arm64 Speech helper in Contents/Resources.
const speechHelper=mach.filter(n=>n.split(path.sep).join('/')==='Contents/Resources/DraftCraftDictation').length;
assert.equal(mach.length-speechHelper,13,'Unexpected Electron native inventory');
const result={passed:true,version,files:files.length,payload_sha256:payloadSha256,asar_sha256:hash(fs.readFileSync(archive)),asarHeaderSha256:headerHash,exact_stage_and_backend_bytes:true,native_backend_files:native,arm64_mach_o_files:mach.length,speech_helper:speechHelper===1,macos_minimum:info.LSMinimumSystemVersion,native_mac_launch_tested:false};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
