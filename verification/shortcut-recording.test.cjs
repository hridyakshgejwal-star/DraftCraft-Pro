const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('native recorder bypasses menu accelerators only for the trusted main frame and boolean state',()=>{
 const source=fs.readFileSync(__dirname+'/../desktop/main.cjs','utf8'),handlers=new Map(),states=[],frame={},sender={mainFrame:frame,setIgnoreMenuShortcuts:value=>states.push(value)};
 const guard=source.match(/function clipboardSender\(event\) \{[\s\S]*?\n\}/)[0];
 const recorder=source.match(/ipcMain.handle\('desktop:shortcut-recording',[\s\S]*?\n\}\);/)[0];
 const snippet=guard+'\n'+recorder;
 vm.runInNewContext(snippet,{mainWindow:{webContents:sender},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)}});
 const handler=handlers.get('desktop:shortcut-recording'),event={sender,senderFrame:frame};
 assert.equal(handler(event,true),true);assert.equal(handler(event,false),true);assert.deepEqual(states,[true,false]);assert.throws(()=>handler(event,'yes'),/boolean/);assert.throws(()=>handler({sender,senderFrame:{}},true),/Main editor/);assert.throws(()=>handler({sender:{mainFrame:frame},senderFrame:frame},true),/Main editor/);assert.deepEqual(states,[true,false]);
});
