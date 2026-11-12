'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TYPES=new Set(['Scene Heading','Action','Character','Parenthetical','Dialogue','Dual Dialogue','Transition','Shot','General','Centered Text','Lyrics','New Act','End of Act','Scene Summary','Cast List','Outline Level 1','Outline Level 2','User Defined','Outline Level 3','Sequence','Note','Stage Direction','Song Title','Comic Page','Panel','Panel Description','Caption','Sound Effect','Narration']);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function fingerprint(doc){const copy={...doc};delete copy.lastSavedAt;return hash(JSON.stringify(copy));}
function validateDocument(value){
  if(typeof value!=='string'||Buffer.byteLength(value)>50*1024*1024)throw new Error('Choose a project smaller than 50 MB.');
  const doc=JSON.parse(value),ids=new Set();
  if(!doc||typeof doc.id!=='string'||!doc.id||doc.id.length>200||typeof doc.titlePage?.title!=='string'||!Array.isArray(doc.paragraphs)||doc.paragraphs.length>50000||!Array.isArray(doc.beats)||!Array.isArray(doc.outlineLanes)||!Array.isArray(doc.outlineMarkers))throw new Error('This is not a valid DraftCraft project.');
  for(const p of doc.paragraphs){if(typeof p.id!=='string'||!p.id||ids.has(p.id)||!TYPES.has(p.type)||typeof p.text!=='string')throw new Error('The project contains an invalid paragraph.');ids.add(p.id);}return doc;
}
function decodeProject(text){if(Buffer.byteLength(text)>50*1024*1024)throw new Error('Choose a project smaller than 50 MB.');const file=JSON.parse(text);if(file.format!=='draftcraft-project'||file.version!==1)throw new Error('This DraftCraft project format is not supported.');return validateDocument(JSON.stringify(file.document));}
// A file rewritten byte-for-byte differently but with the same project content (re-serialized by a sync client or
// another tool, or saved with only a new save time) is not a conflict; only a real content change is (1.15.5 S-2).
function sameProject(raw,expectedFingerprint){if(!expectedFingerprint)return false;try{return fingerprint(decodeProject(raw.toString('utf8')))===expectedFingerprint;}catch{return false;}}
class ProjectFiles{
  constructor(statePath){this.statePath=statePath;this.identityPath=path.join(path.dirname(statePath),'project-identities.json');this.locations=Object.create(null);this.signatures=new Map();this.identities=new Map();this.queue=Promise.resolve();this.metadataQueue=Promise.resolve();
    // 1.17: file identities are kept on disk too, so a project renamed or moved (within its folder, or with its folder
    // renamed) while DraftCraft was closed is found at the next launch. Unreadable or malformed entries are ignored.
    try{const saved=JSON.parse(fs.readFileSync(this.identityPath,'utf8'));const digits=v=>typeof v==='string'&&/^\d{1,20}$/.test(v);for(const[f,id]of Object.entries(saved).slice(-200))if(path.isAbsolute(f)&&/\.draftcraft$/i.test(f)&&id&&['dev','ino','parentDev','parentIno'].every(k=>digits(id[k])))this.identities.set(f,{dev:id.dev,ino:id.ino,parentDev:id.parentDev,parentIno:id.parentIno});}catch{}
    try{for(const[id,p]of Object.entries(JSON.parse(fs.readFileSync(statePath,'utf8'))))if(typeof p==='string'&&path.isAbsolute(p)&&/\.draftcraft$/i.test(p))this.locations[id]=p;}catch{}}
  associated(id){return this.locations[id]||null;}
  // File identity (device + inode of the file and of its folder), so a project renamed or moved within its folder (or
  // whose folder was renamed) in Finder while open is followed instead of failing every save (1.15.5 S-1).
  async remember(file){try{const s=await fs.promises.stat(file,{bigint:true}),p=await fs.promises.stat(path.dirname(file),{bigint:true}),id={dev:String(s.dev),ino:String(s.ino),parentDev:String(p.dev),parentIno:String(p.ino)},old=this.identities.get(file);
    if(old&&old.dev===id.dev&&old.ino===id.ino&&old.parentDev===id.parentDev&&old.parentIno===id.parentIno)return;this.identities.delete(file);this.identities.set(file,id);await this.persistIdentities();}catch{}}
  forget(file){if(this.identities.delete(file))return this.persistIdentities();}
  persistIdentities(){const task=this.metadataQueue.catch(()=>{}).then(()=>this.atomic(this.identityPath,JSON.stringify(Object.fromEntries([...this.identities].slice(-200))),{createParent:true}));this.metadataQueue=task.catch(()=>{});return task.catch(()=>{});}
  async locate(file){
    const id=this.identities.get(file);if(!id)return null;const parent=path.dirname(file),folders=[];
    const same=(s,dev,ino)=>String(s.dev)===String(dev)&&String(s.ino)===String(ino);
    try{const p=await fs.promises.stat(parent,{bigint:true});if(same(p,id.parentDev,id.parentIno))folders.push(parent);}catch{}
    if(!folders.length)try{for(const e of (await fs.promises.readdir(path.dirname(parent),{withFileTypes:true})).slice(0,5000)){if(!e.isDirectory())continue;const d=path.join(path.dirname(parent),e.name);try{const s=await fs.promises.stat(d,{bigint:true});if(same(s,id.parentDev,id.parentIno)){folders.push(d);break;}}catch{}}}catch{}
    for(const folder of folders){let entries;try{entries=await fs.promises.readdir(folder,{withFileTypes:true});}catch{continue;}
      for(const e of entries.slice(0,5000)){if(!e.isFile()||!/\.draftcraft$/i.test(e.name))continue;const f=path.join(folder,e.name);try{const s=await fs.promises.lstat(f,{bigint:true});if(s.isFile()&&same(s,id.dev,id.ino))return f;}catch{}}}
    return null;
  }
  associate(id,file){const task=this.metadataQueue.catch(()=>{}).then(async()=>{const next=Object.assign(Object.create(null),this.locations,{[id]:file});await this.atomic(this.statePath,JSON.stringify(next),{createParent:true});this.locations=next;});this.metadataQueue=task;return task;}
  async atomic(file,text,{createParent=false,expectedHash,expectedFingerprint,overwrite=false}={}){
    const parent=path.dirname(file);if(createParent)await fs.promises.mkdir(parent,{recursive:true});let folder;try{folder=await fs.promises.stat(parent);}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')throw Object.assign(new Error('The save folder is unavailable.'),{code:'EFOLDER'});throw e;}if(!folder.isDirectory())throw Object.assign(new Error('The save folder is unavailable.'),{code:'EFOLDER'});
    let old;try{old=await fs.promises.lstat(file);}catch(e){if(e.code!=='ENOENT')throw e;}if(old&&(!old.isFile()||old.isSymbolicLink()))throw new Error('Choose a regular project file.');if(old)await fs.promises.access(file,fs.constants.W_OK);
    const check=async()=>{if(expectedHash){let raw;try{raw=await fs.promises.readFile(file);}catch(e){if(e.code==='ENOENT')throw Object.assign(new Error('The project file was moved, renamed or deleted outside DraftCraft.'),{code:'EMOVED'});throw e;}if(hash(raw)!==expectedHash&&!sameProject(raw,expectedFingerprint))throw Object.assign(new Error('The project changed outside DraftCraft. Use Save As to preserve both versions.'),{code:'ECONFLICT'});}else if(!createParent&&!overwrite){try{await fs.promises.lstat(file);throw Object.assign(new Error('The destination already exists. Choose it with Save As to confirm replacement.'),{code:'ECONFLICT'});}catch(e){if(e.code!=='ENOENT')throw e;}}};
    await check();const temp=path.join(parent,'.draftcraft-'+crypto.randomUUID()+'.tmp');let handle;
    try{handle=await fs.promises.open(temp,'wx',old?old.mode&0o777:0o600);await handle.writeFile(text,'utf8');await handle.sync();await handle.close();handle=undefined;await check();await fs.promises.rename(temp,file);let folder;try{folder=await fs.promises.open(parent,'r');await folder.sync();}catch(e){if(!['EINVAL','ENOTSUP','EBADF','EISDIR','EPERM'].includes(e.code))throw e;}finally{await folder?.close();}}finally{await handle?.close();await fs.promises.unlink(temp).catch(()=>{});}
  }
  async inspect(file){const resolved=await fs.promises.realpath(file),stat=await fs.promises.stat(resolved);if(!stat.isFile()||stat.size>50*1024*1024)throw new Error('Choose a project smaller than 50 MB.');const raw=await fs.promises.readFile(resolved,'utf8'),document=decodeProject(raw);await this.remember(resolved);return{file:resolved,name:path.basename(resolved),text:JSON.stringify(document),document,fileHash:hash(raw)};}
  async open(file){const info=await this.inspect(file);await this.associate(info.document.id,info.file);this.signatures.set(info.file,info.fileHash);return{name:info.name,text:info.text,file:info.file};}
  save(snapshot,chosenPath,options={}){const doc=validateDocument(snapshot);const task=this.queue.catch(()=>{}).then(async()=>{let file=chosenPath||this.associated(doc.id),movedFrom;if(!file)return{saved:false};if(!path.isAbsolute(file)||!/\.draftcraft$/i.test(file))throw new Error('Choose a .draftcraft project filename.');
    if(!chosenPath&&await fs.promises.lstat(file).then(()=>false,e=>e.code==='ENOENT')){const found=await this.locate(file);if(found){movedFrom=file;file=found;}}
    const text=JSON.stringify({format:'draftcraft-project',version:1,document:doc},null,2);await this.atomic(file,text,{expectedHash:options.expectedHash??(options.overwrite?undefined:this.signatures.get(movedFrom||file)),expectedFingerprint:options.expectedFingerprint,overwrite:!!options.overwrite});const result={saved:true,name:path.basename(file),file,fileHash:hash(text),...(movedFrom?{movedFrom}:{})};this.signatures.set(file,result.fileHash);if(movedFrom){this.signatures.delete(movedFrom);await this.forget(movedFrom);}await this.remember(file);if(chosenPath||movedFrom)try{await this.associate(doc.id,file);}catch(e){e.fileResult=result;throw e;}return result;});this.queue=task;return task;}
}
module.exports={ProjectFiles,validateDocument,decodeProject,fingerprint,hash};
