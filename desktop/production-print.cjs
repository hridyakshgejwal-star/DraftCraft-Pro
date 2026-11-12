'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function validatePrintRequest(request){
 if(!request||!['preview','save','print'].includes(request.mode)||typeof request.html!=='string'||Buffer.byteLength(request.html)>64*1024*1024)throw Error('Invalid print request.');
 if(!/^<!doctype html>/i.test(request.html)||/<\s*(?:script|iframe|object|embed|base|form)\b|<[^>]+\son\w+\s*=|javascript\s*:/i.test(request.html))throw Error('Print content must be a self-contained, script-free document.');
 if(!Number.isFinite(request.width)||!Number.isFinite(request.height)||request.width<4||request.width>20||request.height<4||request.height>20)throw Error('Invalid print paper size.');
 return request;
}
function verifyPdf(bytes){if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-1024).toString().includes('%%EOF'))throw Error('The PDF renderer did not produce a complete PDF.');return bytes;}
async function atomicPdf(destination,bytes){const temporary=destination+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';let file;try{file=await fs.open(temporary,'wx',0o600);await file.writeFile(verifyPdf(bytes));await file.sync();await file.close();file=null;await fs.rename(temporary,destination);}finally{await file?.close();await fs.rm(temporary,{force:true});}}
function installProductionPrint({ipcMain,BrowserWindow,dialog,trusted,getWindow}){
 // Jobs run one at a time. A request that arrives while another job runs (for
 // example Export while the live preview is still rendering) waits instead of
 // failing; a queued preview is superseded by a newer preview.
 let queue=Promise.resolve(),previewTicket=0;
 ipcMain.handle('desktop:production-print',async(event,payload)=>{
  trusted(event);const r=validatePrintRequest(payload);
  const ticket=r.mode==='preview'?++previewTicket:0;
  const job=queue.then(()=>ticket&&ticket!==previewTicket?{superseded:true}:render(event,r));
  queue=job.catch(()=>{});
  return job;
 });
 async function render(event,r){
  let win;
  try{
   const policy="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
   const html=r.html.replace(/<head>/i,'<head><meta http-equiv="Content-Security-Policy" content="'+policy+'">');
   win=new BrowserWindow({show:false,width:1000,height:1000,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,preload:undefined}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   await win.loadURL('data:text/html;base64,'+Buffer.from(html).toString('base64'));
   win.webContents.on('will-navigate',e=>e.preventDefault());
   await win.webContents.executeJavaScript('document.fonts.ready.then(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>{})))).then(()=>true)',true);
   if(r.mode==='print'){await new Promise((resolve,reject)=>win.webContents.print({silent:false,printBackground:true,margins:{marginType:'none'}},(ok,error)=>ok?resolve():reject(Error(error||'Printing was canceled.'))));return {printed:true};}
   const pdf=verifyPdf(await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,margins:{top:0,bottom:0,left:0,right:0},pageSize:{width:r.width,height:r.height},generateTaggedPDF:true}));
   if(r.mode==='preview')return {data:'data:application/pdf;base64,'+pdf.toString('base64'),bytes:pdf.length};
   const name=String(r.name||'Screenplay').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180).replace(/\.pdf$/i,'')+'.pdf';
   const choice=await dialog.showSaveDialog(getWindow(event),{title:'Export Screenplay PDF',defaultPath:name,filters:[{name:'PDF document',extensions:['pdf']}],properties:['createDirectory','showOverwriteConfirmation']});
   if(choice.canceled||!choice.filePath)return {canceled:true};const destination=choice.filePath.toLowerCase().endsWith('.pdf')?choice.filePath:choice.filePath+'.pdf';await atomicPdf(destination,pdf);return {saved:true,location:destination,bytes:pdf.length};
  }finally{win?.destroy();}
 }
}
module.exports={installProductionPrint,validatePrintRequest,verifyPdf,atomicPdf};
