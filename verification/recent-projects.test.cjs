// 1.18: the recent-projects store and the Start Window preference (main process).
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {RecentProjects,StartPreference,idFor,LIMIT}=require('../desktop/recent-projects.cjs');
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'dc-recent-'));
test('recent projects: newest first, one entry per file, capped, persisted atomically, ids only',()=>{
 const dir=tmp(),file=path.join(dir,'recent-projects.json'),changes=[];const r=new RecentProjects(file,{onChange:p=>changes.push(p)});
 const a=path.join(dir,'A.draftcraft'),b=path.join(dir,'B.fdx');fs.writeFileSync(a,'{}');fs.writeFileSync(b,'x');
 assert.equal(r.touch(a,'ALPHA'),true);assert.equal(r.touch(b,''),true);assert.equal(r.touch(b,''),false,'no write when nothing changed');
 assert.deepEqual(r.list().map(e=>e.name),['B.fdx','A.draftcraft']);r.touch(a,'ALPHA');assert.deepEqual(r.list().map(e=>e.title),['ALPHA','B']);
 const entry=r.list()[0];assert.equal(entry.id,idFor(a));assert.equal(entry.folder,dir);assert.equal(entry.exists,true);assert.equal(entry.kind,'draftcraft');assert.equal(Object.hasOwn(entry,'path'),false,'paths are not handed out');
 assert.equal(r.pathFor(entry.id),a);assert.equal(r.pathFor('../../etc/passwd'),null);assert.equal(r.pathFor('ffffffffffffffff'),null);
 assert.equal((fs.statSync(file).mode&0o777),0o600);assert.ok(!fs.readdirSync(dir).some(f=>f.endsWith('.tmp')),'no temporary files left');
 assert.ok(changes.length>=3);assert.equal(fs.readFileSync(file,'utf8').includes('{}'),false,'no file contents are stored');
 assert.equal(new RecentProjects(file).list().length,2,'reloaded');
 assert.equal(r.touch('relative/path.draftcraft'),false);assert.equal(r.touch(path.join(dir,'notes.docx')),false,'only files DraftCraft opens');
 fs.rmSync(a);assert.equal(r.list().find(e=>e.title==='ALPHA').exists,false,'a moved or deleted file shows as missing');
 assert.equal(r.retitle(b,'BETA'),true);assert.equal(r.list()[1].title,'BETA');
 assert.equal(r.remove(idFor(a)),true);assert.deepEqual(r.list().map(e=>e.title),['BETA']);assert.equal(r.clear(),true);assert.deepEqual(r.list(),[]);assert.equal(r.clear(),false);
 for(let i=0;i<LIMIT+5;i++)r.touch(path.join(dir,'S'+i+'.fountain'),'S'+i);assert.equal(r.list().length,LIMIT);assert.equal(r.list()[0].title,'S'+(LIMIT+4));
});
test('recent projects: damaged or foreign files are ignored safely',()=>{
 const dir=tmp(),file=path.join(dir,'recent-projects.json');
 for(const text of ['{broken',JSON.stringify({version:2,entries:[]}),JSON.stringify({version:1,entries:[{path:'relative.draftcraft',openedAt:'x'},{path:'/x/y.exe',openedAt:'x'},null,{path:'/a/b.draftcraft'}]})]){fs.writeFileSync(file,text);assert.deepEqual(new RecentProjects(file).list(),[]);}
 fs.writeFileSync(file,JSON.stringify({version:1,entries:[{path:'/a/b.draftcraft',title:5,openedAt:'2026-01-01T00:00:00Z'},{path:'/a/b.draftcraft',openedAt:'2026-01-01T00:00:00Z'}]}));const list=new RecentProjects(file).list();assert.equal(list.length,1,'duplicates collapse');assert.equal(list[0].title,'b');
});
test('Start Window preference: on by default, saved, damaged files fall back to on',()=>{
 const dir=tmp(),file=path.join(dir,'start-window.json');assert.equal(new StartPreference(file).showAtLaunch,true);
 new StartPreference(file).set(false);assert.equal(new StartPreference(file).showAtLaunch,false);assert.throws(()=>new StartPreference(file).set('no'));
 fs.writeFileSync(file,'{oops');assert.equal(new StartPreference(file).showAtLaunch,true);
});
