"""Independent ad-hoc signature/resource checks; not Apple's codesign/Gatekeeper."""
import argparse, hashlib, json, os, plistlib, struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('bundle');p.add_argument('--baseline');p.add_argument('--output');p.add_argument('--added',action='append',default=[],help='bundle-relative path of a native file that is new in this release (verified, not compared with the baseline)');args=p.parse_args()
root=Path(args.bundle).resolve();baseline=Path(args.baseline).resolve() if args.baseline else None
results={'added_native_files':[],'mach_o_files':0,'code_page_hashes':0,'special_slot_hashes':0,'resource_hashes':0,'nested_code_seals':0,'symlinks':0,'resource_seals':0,'unchanged_native_sections':0,'errors':[]}
code_hashes={}
def digest(data,kind=2):
 return {1:hashlib.sha1,2:hashlib.sha256,3:hashlib.sha256,4:hashlib.sha384}[kind](data).digest()
def commands(data):
 offset=32
 for _ in range(struct.unpack_from('<I',data,16)[0]):
  cmd,size=struct.unpack_from('<II',data,offset);yield cmd,data[offset:offset+size];offset+=size

def code_directories(path):
 data=path.read_bytes()
 command=next(c for cmd,c in commands(data) if cmd==0x1d)
 offset,length=struct.unpack_from('<II',command,8)
 superblob=data[offset:offset+length]
 assert struct.unpack_from('>I',superblob)[0]==0xfade0cc0
 slots={}
 for i in range(struct.unpack_from('>I',superblob,8)[0]):
  kind,at=struct.unpack_from('>II',superblob,12+i*8);size=struct.unpack_from('>I',superblob,at+4)[0];slots[kind]=superblob[at:at+size]
 return data,slots

def nearest_bundle(path):
 return next((parent for parent in path.parents if parent.suffix in ['.app','.framework']),None)
def main_binary(bundle):
 if bundle.suffix=='.app':
  info=plistlib.loads((bundle/'Contents/Info.plist').read_bytes());return bundle/'Contents/MacOS'/info['CFBundleExecutable']
 info=plistlib.loads((bundle/'Resources/Info.plist').read_bytes());return bundle/info.get('CFBundleExecutable',bundle.stem)

def sections(data):
 result={}
 for cmd,c in commands(data):
  if cmd!=0x19: continue
  for i in range(struct.unpack_from('<I',c,64)[0]):
   at=72+i*80;name=c[at:at+16].rstrip(b'\0')+b'/'+c[at+16:at+32].rstrip(b'\0');size=struct.unpack_from('<Q',c,at+40)[0];offset=struct.unpack_from('<I',c,at+48)[0];flags=struct.unpack_from('<I',c,at+64)[0]
   if offset and flags&0xff not in [1,12,18]:result[name.decode()]=hashlib.sha256(data[offset:offset+size]).hexdigest()
 return result

for path in root.rglob('*'):
 if path.is_symlink():results['symlinks']+=1;continue
 if not path.is_file():continue
 if path.open('rb').read(4)!=b'\xcf\xfa\xed\xfe':continue
 try:
  data,slots=code_directories(path);dirs=[blob for blob in slots.values() if blob[:4]==b'\xfa\xde\x0c\x02'];assert dirs
  hashes=[]
  for blob in dirs:
   hash_offset=struct.unpack_from('>I',blob,16)[0];special,count,limit=struct.unpack_from('>III',blob,24);hash_size,hash_type,page_size=blob[36],blob[37],1<<blob[39]
   hashes.append(digest(blob,hash_type)[:20])
   for i in range(count):
    assert digest(data[i*page_size:min((i+1)*page_size,limit)],hash_type)[:hash_size]==blob[hash_offset+i*hash_size:hash_offset+(i+1)*hash_size],f'code page {i}'
    results['code_page_hashes']+=1
   bundle=nearest_bundle(path)
   if bundle and bundle.suffix=='.app':info=bundle/'Contents/Info.plist';seal=bundle/'Contents/_CodeSignature/CodeResources'
   elif bundle:info=path.parent/'Resources/Info.plist';seal=path.parent/'_CodeSignature/CodeResources'
   else: info=None;seal=None
   for slot,content in [(1,info.read_bytes() if info and info.exists() else None),(2,slots.get(2)),(3,seal.read_bytes() if seal and seal.exists() else None)]:
    if slot>special:continue
    expected=blob[hash_offset-slot*hash_size:hash_offset-(slot-1)*hash_size]
    if expected==b'\0'*hash_size:continue
    if content is None:raise ValueError(f'missing special slot {slot}')
    assert digest(content,hash_type)[:hash_size]==expected,f'special slot {slot}'
    results['special_slot_hashes']+=1
  code_hashes[path.resolve()]=hashes;results['mach_o_files']+=1
  if baseline and path.relative_to(root).as_posix() in args.added:results['added_native_files'].append(path.relative_to(root).as_posix())
  elif baseline:
   previous=baseline/path.relative_to(root);before=sections(previous.read_bytes());after=sections(data);assert before==after,'native payload sections changed';results['unchanged_native_sections']+=len(after)
 except Exception as e:results['errors'].append(f'{path.relative_to(root)}: {e}')

for seal in root.rglob('CodeResources'):
 try:
  resources=plistlib.loads(seal.read_bytes());parent=seal.parent.parent;results['resource_seals']+=1
  for key in ['files','files2']:
   for name,entry in resources.get(key,{}).items():
    path=parent/name
    if isinstance(entry,bytes):entry={'hash':entry}
    if 'symlink' in entry:assert path.is_symlink() and os.readlink(path)==entry['symlink'];continue
    if 'cdhash' in entry:
     binary=main_binary(path) if path.is_dir() else path
     assert entry['cdhash'] in code_hashes[binary.resolve()],f'nested seal {name}';results['nested_code_seals']+=1;continue
    if not path.exists() and entry.get('optional'):continue
    for hash_name,kind in [('hash',1),('hash2',2)]:
     if hash_name in entry:assert digest(path.read_bytes(),kind)==entry[hash_name],name;results['resource_hashes']+=1
 except Exception as e:results['errors'].append(f'{seal.relative_to(root)}: {e}')
results['passed']=not results['errors']
if args.output:Path(args.output).write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
raise SystemExit(0 if results['passed'] else 1)
