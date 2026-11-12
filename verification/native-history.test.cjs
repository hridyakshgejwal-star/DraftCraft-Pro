const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
const guard=source.match(/function clipboardSender\(event\) \{[\s\S]*?\n\}/)[0];
const handler=source.match(/ipcMain.handle\('desktop:native-history',[\s\S]*?\n\}\);/)[0];
const menu=source.match(/  const historyAction = [\s\S]*?\n  \} \}\);/)[0];
function setup(){
  const calls=[],frame={},sender={id:1,mainFrame:frame,undo:()=>calls.push('undo'),redo:()=>calls.push('redo')};
  let handle;const mainWindow={webContents:sender};
  const context={mainWindow,documentWindows:{records:new Map([[sender.id,{}]]),has:e=>e.sender===sender&&e.senderFrame===frame},ipcMain:{handle:(name,fn)=>{assert.equal(name,'desktop:native-history');handle=fn}},sendCommand:command=>calls.push('command:'+command)};
  vm.runInNewContext(guard+'\n'+handler+'\n'+menu+'\nglobalThis.menuAction=historyAction;',context);
  return{calls,context,handle,sender,frame,event:{sender,senderFrame:frame}};
}
test('native history IPC accepts only the trusted main frame and undo/redo',()=>{
  const {calls,handle,event,frame,sender}=setup();
  assert.equal(handle(event,'undo'),true);assert.equal(handle(event,'redo'),true);assert.deepEqual(calls,['undo','redo']);
  for(const action of ['cut','delete',null,undefined,{}])assert.throws(()=>handle(event,action));
  assert.throws(()=>handle({sender:{mainFrame:frame},senderFrame:frame},'undo'));
  assert.throws(()=>handle({sender,senderFrame:{}},'undo'));
  assert.deepEqual(calls,['undo','redo']);
});
test('native menu preserves history in separate settings windows and dispatches screenplay history in the main window',()=>{
  const {calls,context}=setup();const undo=context.menuAction('Undo','undo','CmdOrCtrl+Z');
  undo.click(null,context.mainWindow);assert.deepEqual(calls,['command:undo']);
  const other={webContents:{undo:()=>calls.push('settings:undo'),redo:()=>calls.push('settings:redo')}};
  undo.click(null,other);context.menuAction('Redo','redo','CmdOrCtrl+Shift+Z').click(null,other);
  assert.deepEqual(calls,['command:undo','settings:undo','settings:redo']);
});
