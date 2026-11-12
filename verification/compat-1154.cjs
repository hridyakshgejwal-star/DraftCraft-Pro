// Runs compat-1154-entry.ts in Chromium (the codec needs DOMParser). Usage:
//   OLD_TREE=<checkout of release-1.15.3> BROWSER_EXE=<chrome> ESBUILD=<esbuild module> node verification/compat-1154.cjs <out.json>
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const esbuild=require(process.env.ESBUILD||'esbuild'),old=path.resolve(process.env.OLD_TREE);
(async()=>{
 const outfile=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'compat-')),'bundle.js');
 await esbuild.build({entryPoints:[path.join(__dirname,'compat-1154-entry.ts')],bundle:true,format:'iife',outfile,logLevel:'error',loader:{'.json':'json'},plugins:[{name:'old',setup(b){b.onResolve({filter:/^OLD\//},a=>({path:require.resolve(path.join(old,a.path.slice(4))+'.ts')}));}}]});
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXE,args:['--no-sandbox']}),page=await browser.newPage();
 const server=require('node:http').createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html'});r.end('<!doctype html><title>compat</title>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.addScriptTag({content:fs.readFileSync(outfile,'utf8')});
 const rows=await page.evaluate(()=>window.runCompat());
 const summary={templates:rows.length,formatValid:rows.filter(r=>r.formatValid).length,unchangedOnOpen:rows.filter(r=>r.documentUnchangedOnOpen).length,fdxWithMetadataExact:rows.filter(r=>r.fdxWithMetadata?.paragraphs&&r.fdxWithMetadata?.formatIdentical).length,fdxWithoutMetadataText:rows.filter(r=>r.fdxWithoutMetadata?.paragraphs).length,fdxWithoutMetadataLayout:rows.filter(r=>r.fdxWithoutMetadata?.layoutWithin001in===true).length,fdxLayoutApplicable:rows.filter(r=>r.fdxWithoutMetadata&&r.fdxWithoutMetadata.layoutWithin001in!==null).length,newFdxOpensIn1153:rows.filter(r=>r.newFdxOpensIn1153?.paragraphs).length,errors:rows.filter(r=>r.fdxError||r.formatError||r.newFdxOpensIn1153?.error).map(r=>({template:r.template,fdxError:r.fdxError,formatError:r.formatError,newFdx:r.newFdxOpensIn1153?.error}))};
 fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify({summary,rows},null,1));console.log(JSON.stringify(summary));
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
