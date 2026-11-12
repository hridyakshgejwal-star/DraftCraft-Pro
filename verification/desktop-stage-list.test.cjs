// Every desktop module the main process loads is copied into the app (1.18: recent-projects.cjs was missing from the
// stage list, so the packaged main process could not start and no window opened).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const desktop=path.join(__dirname,'..','desktop');
const listed=file=>{const s=fs.readFileSync(file,'utf8');return new Set([...s.matchAll(/'([\w.-]+\.(?:cjs|mjs|html|css|js))'/g)].map(m=>m[1]));};
test('the stage and build lists include every local module the desktop code requires',()=>{
 const stage=listed(path.join(__dirname,'..','build-offline','stage-desktop.mjs')),build=listed(path.join(desktop,'build.cjs')),need=new Map();
 const visit=name=>{if(need.has(name))return;const file=path.join(desktop,name);if(!fs.existsSync(file))return;need.set(name,true);
  for(const m of fs.readFileSync(file,'utf8').matchAll(/require\(\s*['"]\.\/([\w.-]+\.(?:cjs|mjs|js))['"]\s*\)/g))visit(m[1]);};
 for(const entry of ['main.cjs','preload.cjs','settings-preload.cjs'])visit(entry);
 assert.ok(need.has('recent-projects.cjs')&&need.has('self-test.cjs'),[...need.keys()].join(','));
 for(const name of need.keys()){assert.ok(stage.has(name),'stage-desktop.mjs is missing '+name);assert.ok(build.has(name),'desktop/build.cjs is missing '+name);}
});
