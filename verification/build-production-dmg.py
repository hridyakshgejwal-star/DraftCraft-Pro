"""Build the 1.15.2 personal DMG from the verified assembled application tree."""
from pathlib import Path
import hashlib,json,os,plistlib,subprocess
source=Path(__file__).resolve().parent.parent;task=source.parent.parent;tools=task/'tools';release=task/'release-final';out=task/'deliverables';out.mkdir(exist_ok=True)
def tool(name,default):
 p=Path(os.environ.get(name,str(default)));assert p.is_file(),str(p);return str(p)
hfs=tool('HFSPLUS',tools/'dmg-build/hfs/hfsplus');dmg=tool('DMG_TOOL',tools/'dmg-build/dmg/dmg');mkfs=tool('MKFS_HFSPLUS',tools/'sysroot/sbin/mkfs.hfsplus');fsck=tool('FSCK_HFSPLUS',tools/'sysroot/sbin/fsck.hfsplus')
assert (release/'Support/Package-SHA256.txt').is_file();assert (release/'Production-Release-Notes.md').is_file()
version=plistlib.loads((release/'DraftCraft Pro.app/Contents/Info.plist').read_bytes())['CFBundleShortVersionString'];assert version=='1.15.2'
tests=json.loads((source/'verification/story-results/final-tests.json').read_text());assert len(tests['results'])==16 and all(r['passed'] for r in tests['results']),'All 16 final test suites must pass.'
native=json.loads((source/'verification/dmg-native-proof.json').read_text());assert native['passed'] and native['unchanged_native_sections']>0
asar=json.loads((source/'verification/dmg-asar-proof.json').read_text());assert asar['passed'] and asar['version']==version and asar['payload_sha256']==tests['payload_sha256']
assert hashlib.sha256((release/'DraftCraft Pro.app/Contents/Resources/app.asar').read_bytes()).hexdigest()==asar['asar_sha256'],'Bundle changed after verification.'
image=out/f'DraftCraft-Pro-{version}-arm64.dmg';raw=task/'production-final.hfs';roundtrip=task/'production-roundtrip';assert not roundtrip.exists(),'Use a fresh round-trip directory.'
with raw.open('wb') as f:f.truncate(640*1024*1024)
with (task/'production-dmg-build.log').open('w') as log:
 def run(args):subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,check=True)
 run([mkfs,'-s','-v','DraftCraft Pro',str(raw)]);run([hfs,str(raw),'addall',str(release),'--symlinks=clone_link']);run([fsck,'-fn',str(raw)]);run([dmg,'-c','zlib','-l','9','build',str(raw),str(image)]);data=image.read_bytes();
 with image.open('wb') as saved:saved.write(data);saved.flush();os.fsync(saved.fileno())
 roundtrip.mkdir();run([hfs,str(raw),'extractall','/',str(roundtrip)])
subprocess.run(['python3',str(source/'verification/verify-dmg.py'),str(image),str(raw),str(release),str(roundtrip),hfs,str(source/'verification/dmg-image-proof.json')],check=True,env={**os.environ,'DRAFTCRAFT_EXPECT_VERSION':version})
print(json.dumps({'image':str(image),'passed':True}))
