"""Run sequential release suites against the exact extracted app payload.
DRAFTCRAFT_TEST_SUITES can resume selected suites only when the payload digest
matches the previous result. Recovered summaries explicitly identify lost logs.
"""
from pathlib import Path
import hashlib,json,os,re,subprocess,time
root=Path(__file__).resolve().parent.parent
out=root/'verification/story-results';out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();dist=Path(env.get('DRAFTCRAFT_DIST',str(root.parent/'desktop-build/app/dist'))).resolve()
if not (dist/'index.html').is_file():raise RuntimeError('Provide an extracted application renderer')
env.update(DRAFTCRAFT_DIST=str(dist),DRAFTCRAFT_PAYLOAD=str(dist.parent),RUN_LARGE='1')
browser=env.get('BROWSER_EXE') or env.get('DRAFTCRAFT_CHROMIUM')
if browser:env.update(BROWSER_EXE=browser,DRAFTCRAFT_CHROMIUM=browser)
unit=['node','--import','tsx','--test']+[str(p.relative_to(root)) for p in sorted((root/'verification').glob('*.test.ts'))]+['verification/advanced-suggestions.test.cjs','verification/shortcut-recording.test.cjs','verification/native-history.test.cjs','verification/project-files.test.cjs','verification/table-read-backend.test.cjs','verification/document-windows.test.cjs','verification/collaboration.test.mjs','verification/print-queue.test.cjs','verification/developer-id-sign.test.cjs','verification/dictation-helper.test.cjs','verification/self-test-fixtures.test.cjs','verification/recent-projects.test.cjs','verification/desktop-stage-list.test.cjs']
suites=[('models',unit)]+[(name,['node','--import','tsx','verification/'+script]) for name,script in [('story','story-browser.cjs'),('editor','browser-tests.cjs'),('shortcuts','shortcuts-browser.cjs'),('words','synonyms-browser.cjs'),('spelling','writing-browser.cjs'),('smart-save','smart-save-browser.cjs'),('caret','caret-browser.cjs'),('formats','formats-browser.cjs'),('punctuation','punctuation-browser.cjs'),('automatic-formatting','automatic-formatting-browser.cjs'),('table-read','table-read-browser.cjs'),('production','production-browser.cjs'),('collaboration','collaboration-browser.cjs'),('interchange','production-codecs.cjs'),('repair','repair-browser.cjs'),('cross-paragraph','cross-paragraph-browser.cjs'),('templates','template-formatting-browser.cjs'),('enter-flow','enter-flow-browser.cjs'),('workspace','workspace-browser.cjs')]]
h=hashlib.sha256()
for p in sorted(dist.parent.rglob('*')):
 if p.is_file():h.update(p.relative_to(dist.parent).as_posix().encode()+b'\0'+p.read_bytes())
fingerprint=h.hexdigest();selected=set(filter(None,env.get('DRAFTCRAFT_TEST_SUITES','').split(',')))
if selected-set(name for name,_ in suites):raise RuntimeError('Unknown suite')
results=[]
if selected:
 try:
  previous=json.loads((out/'final-tests.json').read_text())
  if previous.get('payload_sha256')==fingerprint:results=previous['results']
 except (OSError,ValueError):pass
for name,command in suites:
 if selected and name not in selected:continue
 start=time.monotonic();run=subprocess.run(command,cwd=root,env=env,text=True,capture_output=True)
 log=run.stdout+run.stderr;(out/(name+'-tests.log')).write_text(log)
 result={'suite':name,'passed':run.returncode==0,'seconds':round(time.monotonic()-start,1),'interaction_groups':len(re.findall(r'^PASS ',log,re.M)),'measurements':[json.loads(line[line.index('{'):]) for line in log.splitlines() if line.startswith(('PERFORMANCE ','SHORTCUT PERFORMANCE ','SAVE PERFORMANCE ','CARET PERFORMANCE ','FORMAT PERFORMANCE ','PUNCTUATION PERFORMANCE ','AUTOMATIC FORMATTING PERFORMANCE ','TABLE READ PERFORMANCE '))]}
 if name=='models':result['tests']=int(re.search(r'(?:tests |# tests )(\d+)',log)[1])
 results=[r for r in results if r['suite']!=name]+[result];order=[name for name,_ in suites];results.sort(key=lambda r:order.index(r['suite']))
 record={'tested_payload':str(dist.parent),'payload_sha256':fingerprint,'recovered_after_workspace_maintenance':any('evidence_source' in r for r in results),'results':results}
 for key,var,default in [('story_typing_p95_budget_ms','DRAFTCRAFT_STORY_TYPING_P95_MS',250),('shortcut_p95_budget_ms','DRAFTCRAFT_SHORTCUT_P95_MS',250),('word_cached_budget_ms','DRAFTCRAFT_WORD_CACHED_MS',500),('spelling_typing_p95_budget_ms','DRAFTCRAFT_SPELLING_P95_MS',250),('save_fill_p95_budget_ms','DRAFTCRAFT_SAVE_FILL_P95_MS',600)]:record[key]=int(env.get(var,str(default)))
 (out/'final-tests.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(result),flush=True)
 if run.returncode:print(log[-2500:],flush=True)
if any(not r['passed'] for r in results):raise SystemExit(1)
print('All release test suites passed.' if len(results)==len(suites) else 'Selected suites passed; release checks remain incomplete.',flush=True)
