'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function registerTableRead({ipcMain,service,trusted,dialog,getWindow,documents,origin}){
 const safeName=value=>String(value||'Screenplay').replace(/[\\/:*?"<>|\r\n\t]/g,'').slice(0,100)||'Screenplay';
 ipcMain.handle('desktop:table-read',async(event,action,payload={})=>{
  trusted(event);
  const audioResult=value=>({...value,audioUrl:origin+'/__table-read/audio/'+value.key+'.wav'});
  if(action==='status')return service.status();
  if(action==='voices')return service.voices(payload.engine,payload.options);
  if(action==='configure')return service.configure(payload.key);
  if(action==='authorize')return service.authorize(payload.requests);
  if(action==='synthesize')return audioResult(await service.synthesize(payload.request,payload.id,payload.token));
  if(action==='cancel')return service.cancel(payload.prefix);
  if(action==='clear')return service.clearCache();
  if(action==='limit'){if(typeof payload.mb!=='number'||!Number.isFinite(payload.mb)||payload.mb<32||payload.mb>2048)throw Error('Choose a cache limit from 32 to 2048 MB.');service.limit=Math.round(payload.mb*1024*1024);await service.evict();return service.cacheStats();}
  if(action!=='export')throw Error('Unknown Table Read action.');
  if(!Array.isArray(payload.plan)||!payload.plan.length||payload.plan.length>20000)throw Error('Choose a reading before exporting.');
  const formats=(await service.status()).formats;if(!formats.includes(payload.format))throw Error('The selected audio export format is unavailable.');
  const progress=value=>{const window=getWindow(event);if(window&&!window.isDestroyed())window.webContents.send('desktop:table-read-progress',{id:payload.id,...value})};
  const cueSheet=async(file,cues)=>{if(payload.cueSheet)await fs.promises.writeFile(file+'.cues.json',JSON.stringify({format:'draftcraft-table-read-cues',version:1,audio:path.basename(file),cues},null,2),{mode:0o600});};
  if(!payload.separate){const choice=await dialog.showSaveDialog(getWindow(event),{title:'Export Table Read Audio',defaultPath:path.join(documents(),safeName(payload.title)+' - Table Read.'+payload.format),filters:[{name:payload.format.toUpperCase()+' audio',extensions:[payload.format]}],properties:['createDirectory','showOverwriteConfirmation'],buttonLabel:'Export'});if(choice.canceled||!choice.filePath)return {saved:false,canceled:true};const destination=choice.filePath.toLowerCase().endsWith('.'+payload.format)?choice.filePath:choice.filePath+'.'+payload.format;
   if(destination!==choice.filePath&&fs.existsSync(destination)){const answer=await dialog.showMessageBox(getWindow(event),{type:'question',message:'Replace '+path.basename(destination)+'?',buttons:['Replace','Cancel'],defaultId:1,cancelId:1});if(answer.response!==0)return {saved:false,canceled:true};}
   const result=await service.export(payload.plan,destination,payload.format,payload.id,payload.token,progress);try{await cueSheet(destination,result.cues);}catch{throw Error('Audio was saved as '+result.name+', but its cue sheet could not be written.');}return {...result,cues:undefined};
  }
  const choice=await dialog.showOpenDialog(getWindow(event),{title:'Choose a Folder for Scene Recordings',properties:['openDirectory','createDirectory'],buttonLabel:'Export Scenes'});if(choice.canceled||!choice.filePaths[0])return {saved:false,canceled:true};
  const finishedDirectory=path.join(choice.filePaths[0],safeName(payload.title)+' - Table Read - '+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,6));const directory=path.join(choice.filePaths[0],'.draftcraft-scene-export-'+crypto.randomUUID());await fs.promises.mkdir(directory,{mode:0o700});const parent=service.controller(payload.id);const groups=[];for(const item of payload.plan){const last=groups.at(-1);if(last&&last.id===item.sceneId)last.plan.push(item);else groups.push({id:item.sceneId,name:item.scene,plan:[{...item,gapMs:0}]});}const names=[];let duration=0,completed=0,bytes=0;try{for(let i=0;i<groups.length;i++){if(parent.signal.aborted)throw Error('Export canceled.');const group=groups[i],file=path.join(directory,String(i+1).padStart(3,'0')+' - '+safeName(group.name)+'.'+payload.format);const result=await service.export(group.plan,file,payload.format,payload.id+':scene'+i,payload.token,p=>progress({...p,done:completed+p.done,total:payload.plan.length}),parent.signal);completed+=group.plan.length;await cueSheet(file,result.cues);names.push(path.basename(file));duration+=result.duration;bytes+=result.bytes;}if(parent.signal.aborted)throw Error('Export canceled.');await fs.promises.rename(directory,finishedDirectory);return {saved:true,name:path.basename(finishedDirectory),files:names,duration,bytes};}catch(error){await fs.promises.rm(directory,{recursive:true,force:true});throw error;}finally{service.jobs.delete(payload.id);}
 });
}
module.exports={registerTableRead};
