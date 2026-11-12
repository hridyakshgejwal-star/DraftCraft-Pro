// 1.17 item 11: the packaged Speech helper is found in Contents/Resources, never inside app.asar, and must be executable.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {findHelper,helperCandidates}=require('../desktop/dictation-ipc.cjs');
test('the helper in Resources wins; asar paths and non-executables are skipped',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-helper-')),resources=path.join(root,'Resources'),asar=path.join(resources,'app.asar','desktop');
 fs.mkdirSync(path.join(asar,'native'),{recursive:true});fs.writeFileSync(path.join(asar,'native','DraftCraftDictation'),'x',{mode:0o755});
 assert.equal(findHelper(helperCandidates(resources,asar)),null,'a helper inside app.asar cannot be spawned');
 fs.writeFileSync(path.join(resources,'DraftCraftDictation'),'x',{mode:0o644});assert.equal(findHelper(helperCandidates(resources,asar)),null,'not executable');
 fs.chmodSync(path.join(resources,'DraftCraftDictation'),0o755);assert.equal(findHelper(helperCandidates(resources,asar)),path.join(resources,'DraftCraftDictation'));
 const dev=path.join(root,'desktop');fs.mkdirSync(path.join(dev,'native'),{recursive:true});fs.writeFileSync(path.join(dev,'native','DraftCraftDictation'),'x',{mode:0o755});
 assert.equal(findHelper(helperCandidates(undefined,dev)),path.join(dev,'native','DraftCraftDictation'),'development checkout');
});
test('the bundled helper is the arm64 binary built on the Mac, with its recorded checksum',()=>{
 const bin=path.join(__dirname,'..','desktop','native','bin','DraftCraftDictation');if(!fs.existsSync(bin))return;
 const bytes=fs.readFileSync(bin);assert.equal(bytes.readUInt32LE(0),0xfeedfacf,'Mach-O 64-bit');assert.equal(bytes.readUInt32LE(4),0x0100000c,'CPU type arm64');
 const log=fs.readFileSync(path.join(path.dirname(bin),'build-on-mac.log'),'utf8');assert.match(log,/RESULT: BUILT/);
 assert.ok(log.includes(crypto.createHash('sha256').update(bytes).digest('hex')),'checksum matches the Mac build log');
});
