"""Independently verify a zlib UDIF, HFS catalog modes and extracted payload.
Usage: python3 verify-dmg.py image.dmg raw.hfs release-folder extracted-folder hfsplus report.json
The extracted folder must already contain hfsplus extractall's round-trip files.
This does not claim a native macOS mount or launch.
"""
from pathlib import Path
import hashlib,json,os,plistlib,re,stat,struct,subprocess,sys,zlib
dmg,raw,original,extracted,hfs,report=map(Path,sys.argv[1:])
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()
def crc_region(f,start,length):
 f.seek(start);crc=0
 while length:
  block=f.read(min(1048576,length));assert block;crc=zlib.crc32(block,crc);length-=len(block)
 return crc&0xffffffff
with dmg.open('rb') as src,raw.open('rb') as uncompressed:
 src.seek(-512,2);footer=src.read(512);assert footer[:4]==b'koly'
 assert struct.unpack_from('>II',footer,4)==(4,512)
 dataoff,datalen=struct.unpack_from('>QQ',footer,24);xml,xmlsize=struct.unpack_from('>QQ',footer,216)
 assert xml+xmlsize<=dmg.stat().st_size-512
 src.seek(xml);pl=plistlib.loads(src.read(xmlsize));tables=pl['resource-fork']['blkx']
 data_crc=crc_region(src,dataoff,datalen);kind,bits,want=struct.unpack_from('>III',footer,80)
 assert (kind,bits)==(2,32) and data_crc==want,'compressed data checksum'
 b=next(t['Data'] for t in tables if 'Apple_HFS' in t['Name']);assert b[:4]==b'mish'
 count=struct.unpack_from('>I',b,200)[0];sectors=struct.unpack_from('>Q',b,16)[0];assert sectors*512==raw.stat().st_size
 hfs_crc=0;checked=0
 for i in range(count):
  kind,_,start,n,offset,length=struct.unpack_from('>IIQQQQ',b,204+40*i)
  if kind in (0x7ffffffe,0xffffffff):continue
  if kind in (0,2):data=b'\0'*(n*512)
  else:
   src.seek(dataoff+offset);encoded=src.read(length);assert len(encoded)==length
   data=zlib.decompress(encoded) if kind==0x80000005 else encoded if kind==1 else None
   assert data is not None,hex(kind)
  assert len(data)==n*512;uncompressed.seek(start*512);assert data==uncompressed.read(len(data)),'decompression mismatch'
  hfs_crc=zlib.crc32(data,hfs_crc);checked+=len(data)
 kind,bits,want=struct.unpack_from('>III',b,64);assert (kind,bits)==(2,32) and (hfs_crc&0xffffffff)==want,'HFS checksum'
 assert checked==raw.stat().st_size
 checks=b''.join(t['Data'][72:76] for t in tables);kind,bits,want=struct.unpack_from('>III',footer,352)
 assert (kind,bits)==(2,32) and (zlib.crc32(checks)&0xffffffff)==want,'master checksum'
 uncompressed.seek(1024);assert uncompressed.read(2)==b'HX','HFSX filesystem signature'

def inventory(root):
 result={}
 for p in root.rglob('*'):
  if p.is_symlink():value={'kind':'link','target':p.readlink().as_posix(),'mode':stat.S_IMODE(p.lstat().st_mode)}
  elif p.is_dir():value={'kind':'directory','mode':stat.S_IMODE(p.stat().st_mode)}
  elif p.is_file():value={'kind':'file','mode':stat.S_IMODE(p.stat().st_mode),'bytes':p.stat().st_size,'sha256':sha(p)}
  else:raise AssertionError('Unsupported entry '+str(p))
  result[p.relative_to(root).as_posix()]=value
 return result
before=inventory(original);after=inventory(extracted)
assert before.keys()==after.keys(),'file inventory changed'
# Check each mode directly in the stored catalog. The extraction tool can apply
# host umask to directories, so normalize extraction modes only after this proof.
parents={str(Path(name).parent) for name in before};stored={}
for parent in sorted(parents):
 lines=subprocess.check_output([str(hfs),str(raw),'ls','/' if parent=='.' else '/'+parent],text=True)
 for line in lines.splitlines():
  match=re.match(r'^(\d{6})\s+\d+\s+\d+\s+\d+\s+\S+\s+\S+\s+(.*)$',line)
  if match:stored[(Path(parent)/match[2]).as_posix()]=int(match[1],8)
for name,value in before.items():
 expected={'file':stat.S_IFREG,'directory':stat.S_IFDIR,'link':stat.S_IFLNK}[value['kind']] | value['mode']
 assert stored.get(name)==expected,'stored mode '+name
 if value['kind']!='link':(extracted/name).chmod(value['mode'])
after=inventory(extracted);assert before==after,'extracted file bytes, links or modes changed'
support=extracted/'Support';manifest=(support/'Package-SHA256.txt').read_text().splitlines()
for line in manifest:
 digest,name=line.split('  ',1);assert sha(extracted/name)==digest,'installer app checksum '+name
installer=(extracted/'Install-DraftCraft.command').read_text()
for filename in ['Package-SHA256.txt','File-Paths.txt','Bundle-Links.txt','Sign-macOS.sh']:
 assert sha(support/filename) in installer,'installer pin '+filename
info=plistlib.loads((extracted/'DraftCraft Pro.app/Contents/Info.plist').read_bytes())
assert info['CFBundleShortVersionString']==os.environ.get('DRAFTCRAFT_EXPECT_VERSION','1.14.0')
result={'passed':True,'dmg_bytes':dmg.stat().st_size,'dmg_sha256':sha(dmg),'udif_runs':count,'decoded_bytes':checked,'crc_checks':['compressed data','HFS','master'],'regular_files':sum(v['kind']=='file' for v in before.values()),'symlinks':sum(v['kind']=='link' for v in before.values()),'stored_catalog_modes':len(before),'installer_app_entries':len(manifest),'app_version':info['CFBundleShortVersionString'],'macos_minimum':info['LSMinimumSystemVersion'],'native_mac_mount_tested':False}
report.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
