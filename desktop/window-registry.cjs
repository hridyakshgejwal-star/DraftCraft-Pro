'use strict';
// Document windows are keyed by the webContents id captured at registration.
// Electron destroys a BrowserWindow (and its webContents) before 'closed'
// listeners run, so cleanup must never read window.webContents again.
const destroyed=window=>!window||typeof window.isDestroyed==='function'&&window.isDestroyed();
class DocumentWindows{
 constructor(){this.records=new Map();}
 add(window,slot,coordinator){const id=window.webContents.id;if(this.records.has(id))throw Error('Window already registered.');const record={id,window,slot,coordinator,allowClose:false,closePending:false,closeTimer:null,commands:[]};this.records.set(id,record);return record;}
 get(event){const record=this.records.get(event?.sender?.id);if(!record||destroyed(record.window)||event.sender!==record.window.webContents||event.senderFrame!==event.sender.mainFrame)throw Error('Main editor required.');return record;}
 has(event){try{this.get(event);return true;}catch{return false;}}
 /** Accepts the registry record (preferred) or a still-live window. */
 remove(target){if(!target)return false;if(this.records.get(target.id)===target)return this.records.delete(target.id);for(const [id,record] of this.records)if(record.window===target)return this.records.delete(id);return false;}
 live(){return [...this.records.values()].filter(r=>!destroyed(r.window));}
 byFile(file){return this.live().find(r=>r.coordinator.active?.file===file);}
 slots(){return this.live().map(r=>r.slot);}
}
module.exports={DocumentWindows,destroyed};
