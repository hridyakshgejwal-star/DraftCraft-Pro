// Extract and byte-compare the actual application archive before release tests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const asar=createRequire(path.resolve(__dirname,'../desktop/repackage.mjs'))('@electron/asar');
const [bundle,output]=process.argv.slice(2);if(!bundle||!output)throw Error('Provide an app bundle and separate extraction directory.');
const stage=path.resolve(__dirname,'../../desktop-build/app'),archive=path.join(bundle,'Contents/Resources/app.asar');
fs.mkdirSync(output,{recursive:true});asar.extractAll(archive,output);
function inventory(root){return fs.readdirSync(root,{recursive:true}).filter(name=>fs.statSync(path.join(root,name)).isFile()).sort()}
const before=inventory(stage),after=inventory(output);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('ASAR inventory changed');
for(const file of before)if(!fs.readFileSync(path.join(stage,file)).equals(fs.readFileSync(path.join(output,file))))throw Error('ASAR bytes changed: '+file);
for(const file of ['window-registry.cjs','production-print.cjs','dictation-ipc.cjs','main.cjs','save-coordinator.cjs','project-files.cjs','preload.cjs','table-read.cjs','table-read-ipc.cjs','table-read-audio.cjs','table-read-audio-worker.cjs'])if(!fs.readFileSync(path.join(__dirname,'../desktop',file)).equals(fs.readFileSync(path.join(output,file))))throw Error('Backend source changed: '+file);
const proof={passed:true,files:before.length,asarHeaderSha256:crypto.createHash('sha256').update(asar.getRawHeader(archive).headerString).digest('hex'),version:JSON.parse(fs.readFileSync(path.join(output,'package.json'))).version,exact_stage_and_backend_bytes:true};
fs.writeFileSync(path.join(__dirname,'smart-save-asar-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
