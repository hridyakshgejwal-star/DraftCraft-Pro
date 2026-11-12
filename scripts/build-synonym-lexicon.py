"""Build offline, lazy-loaded WordNet shards from pinned wordnet-db 3.1.14."""
import json,re,hashlib,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1];db=root/'node_modules/wordnet-db/dict';out=root/'public/synonyms';out.mkdir(parents=True,exist_ok=True)
shards={c:{} for c in 'abcdefghijklmnopqrstuvwxyz'};exceptions={};senses_count=0
for kind,pos in [('noun','n'),('verb','v'),('adj','a'),('adv','r')]:
 records={};links={}
 for line in (db/('data.'+kind)).read_text().splitlines():
  if not line or not line[0].isdigit():continue
  head,gloss=line.split('|',1);parts=head.split();count=int(parts[3],16)
  words=[re.sub(r'\((?:a|p|ip)\)$','',parts[4+i*2]).replace('_',' ') for i in range(count)]
  restrictions={words[i]:re.search(r'\((a|p|ip)\)$',parts[4+i*2]).group(1) for i in range(count) if re.search(r'\((a|p|ip)\)$',parts[4+i*2])}
  records[parts[0]]=[pos,words,gloss.strip(),int(parts[1]),[],restrictions]
  at=4+count*2;links[parts[0]]=[parts[at+1+j*4+1] for j in range(int(parts[at])) if parts[at+1+j*4]=='&']
 if kind=='adj':
  for offset,item in records.items():
   related=[records[target][:3]+[records[target][5]] for target in links[offset][:6] if target in records]
   if related:item[4]=related
 for line in (db/('index.'+kind)).read_text().splitlines():
  if not line or line[0]==' ':continue
  parts=line.split();word=parts[0]
  if not re.fullmatch('[a-z]+(?:\'[a-z]+)?',word):continue
  offsets=parts[6+int(parts[3]):];items=[records[offset] for offset in offsets if offset in records]
  if items:shards[word[0]].setdefault(word,[]).extend(items);senses_count+=len(items)
 for line in ((db/(kind+'.exc')).read_text().splitlines() if (db/(kind+'.exc')).exists() else []):
  parts=line.split();exceptions.setdefault(parts[0],{}).setdefault(pos,[]).extend(parts[1:])
for key,words in shards.items(): (out/(key+'.json')).write_text(json.dumps(words,separators=(',',':'),ensure_ascii=False))
(out/'morphology.json').write_text(json.dumps(exceptions,separators=(',',':')))
shutil.copyfile(root/'node_modules/wordnet-db/LICENSE',out/'WordNet-LICENSE.txt')
shutil.copyfile(root/'node_modules/compromise/LICENSE',out/'Compromise-LICENSE.txt')
meta={'resource':'Princeton WordNet 3.1','package':'wordnet-db 3.1.14','single_word_lemmas':sum(map(len,shards.values())),'word_senses':senses_count,'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob('*.json')}}
(out/'metadata.json').write_text(json.dumps(meta,indent=2));print(json.dumps({k:v for k,v in meta.items() if k!='sha256'}))
