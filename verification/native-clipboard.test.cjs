const {app,clipboard,ClipboardItem}=require('electron'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('node:vm');
app.whenReady().then(async()=>{
 const text=fs.readFileSync(__dirname+'/../desktop/main.cjs','utf8');
 const snippet=text.slice(text.indexOf('function clipboardSender'),text.indexOf('function settingsSender'));
 const handlers=new Map(),frame={},sender={mainFrame:frame},event={sender,senderFrame:frame};
 const context={clipboard,ClipboardItem,mainWindow:{webContents:sender},ipcMain:{handle:(name,handler)=>handlers.set(name,handler)}};
 vm.runInNewContext(snippet,context);
 const read=handlers.get('desktop:clipboard-read'),write=handlers.get('desktop:clipboard-write');
 const payload={text:'INT. माँ — CAFÉ - DAY\n\nReadable screenplay text.',html:'<meta name="draftcraft-page" content="e30="><pre>INT. माँ — CAFÉ - DAY</pre>'};
 await write(event,payload);const copied=await read(event);assert.equal(copied.text,payload.text);assert.ok(copied.html.includes('name="draftcraft-page"'));assert.equal(typeof copied.text,'string');assert.equal(typeof copied.html,'string');console.log('PASS native clipboard and serializable IPC result');
 await clipboard.writeText('External text');const plain=await read(event);assert.equal(plain.html,'');assert.equal(plain.text,'External text');console.log('PASS external text clears page HTML');
 await assert.rejects(()=>read({sender:{mainFrame:frame},senderFrame:frame}),/Main editor required/);await assert.rejects(()=>write({sender,senderFrame:{}},payload),/Main editor required/);await assert.rejects(()=>write(event,{text:7}),/Invalid clipboard/);console.log('PASS sender/frame guards and invalid payload rejection');
 context.clipboard={write:async()=>{throw new Error('Native clipboard failure')}};await assert.rejects(()=>write(event,payload),/Native clipboard failure/);console.log('PASS async write failure reaches renderer; no successful Cut acknowledgment');
 fs.writeFileSync(__dirname+'/results/native-clipboard.json',JSON.stringify({runtime:{electron:process.versions.electron,chromium:process.versions.chrome,platform:process.platform},passed:true,checks:['Native clipboard writes plain text and structured HTML through the exact IPC handler','Read handler returns serializable strings after awaiting native reads','External plain text clears structured HTML','Untrusted sender and child frames are rejected','Invalid writes are rejected','Async clipboard failure propagates before a successful Cut acknowledgment'],limits:'The exact clipboard handler source was exercised with Electron clipboard on Linux and test sender/frame identities. Full desktop UI launch and macOS pasteboard persistence after restart remain unverified.'},null,2));app.quit();
}).catch(e=>{console.error(e);app.exit(1)});
