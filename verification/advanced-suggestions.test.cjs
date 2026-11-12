const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../server.ts','utf8');
function fixture(){
 let handler,called=0,configuration;
 const snippet=source.slice(source.indexOf("app.post('/api/writing-suggestions'"),source.indexOf("app.post('/api/research'")).replace(/\(s:any\)/g,'(s)');
 const client={models:{generateContent:async config=>{
   called++;configuration=config;
   return {text:JSON.stringify({suggestions:[{word:'particularly',explanation:'Specific emphasis.'},{word:'<script>',explanation:'Bad'},{word:'evil\n',explanation:'Invalid newline'}]})};
 }}};
 vm.runInNewContext(snippet,{app:{post:(_path,fn)=>{handler=fn}},AbortController,getAiClient:()=>client});
 const response={statusCode:200,on:()=>{},status(n){this.statusCode=n;return this},json(value){this.value=value;return this},headersSent:false,writableEnded:false};
 return {handler,response,get called(){return called},get configuration(){return configuration}};
}
test('advanced route validates ranges before remote processing and protects structural elements',async()=>{const f=fixture();await f.handler({body:{word:'wrong',intended:'wrong',text:'She was nervous.',start:8,end:15,style:'natural',type:'Action'}},f.response);assert.equal(f.response.statusCode,400);assert.equal(f.called,0);const p=fixture();await p.handler({body:{word:'JOHN',intended:'JOHN',text:'JOHN',start:0,end:4,style:'natural',type:'Character'}},p.response);assert.equal(p.called,0);assert.equal(p.response.value.suggestions.length,0)});
test('advanced route passes bounded structured context, timeout and schema; invalid output is rejected',async()=>{const f=fixture();await f.handler({body:{word:'extremly',intended:'extremely',text:'She was extremly nervous.',start:8,end:16,style:'natural',type:'Action',nearby:''}},f.response);assert.equal(f.called,1);assert.equal(f.configuration.config.httpOptions.timeout,10000);assert.equal(f.configuration.config.responseMimeType,'application/json');assert.equal(f.configuration.config.responseJsonSchema.properties.suggestions.maxItems,8);assert.equal(f.response.value.suggestions.length,1);assert.equal(f.response.value.suggestions[0].word,'particularly');assert.equal(JSON.parse(f.configuration.contents).selectedWord,'extremly')});
