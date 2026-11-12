"""Build and independently verify the personal HFSX/UDIF release on Linux.

Run assemble-automatic-formatting.py first. External prerequisites: mode-preserving Mozilla
libdmg-hfsplus tools and hfsprogs. Override tool paths with the named environment
variables below. The macOS build continues to use desktop/package.mjs instead.
"""
from pathlib import Path
import hashlib,json,os,subprocess

source=Path(__file__).resolve().parent.parent
task=source.parent.parent
tools=task/'tools'
def tool(variable,default):
    path=Path(os.environ.get(variable,str(default))).resolve()
    assert path.is_file(),f'Missing {variable}: {path}'
    return str(path)
hfs=tool('HFSPLUS',tools/'dmg-build/hfs/hfsplus')
dmg=tool('DMG_TOOL',tools/'dmg-build/dmg/dmg')
mkfs=tool('MKFS_HFSPLUS',tools/'sysroot/sbin/mkfs.hfsplus')
fsck=tool('FSCK_HFSPLUS',tools/'sysroot/sbin/fsck.hfsplus')
release=task/'release-final'
out=task/'deliverables'
assert (release/'Support/Package-SHA256.txt').is_file()
assert (out/'DraftCraft-Pro-Automatic-Formatting-Source.zip').is_file()
image=out/'DraftCraft-Pro-Automatic-Formatting.dmg'
raw=task/'automatic-formatting.hfs'
roundtrip=task/'automatic-formatting-roundtrip'
assert not roundtrip.exists(),'Use a fresh round-trip extraction folder'
with raw.open('wb') as f:f.truncate(512*1024*1024)
with (task/'dmg-build.log').open('w') as log:
    def run(args):subprocess.run(args,stdout=log,stderr=subprocess.STDOUT,check=True)
    run([mkfs,'-s','-v','DraftCraft Pro',str(raw)])
    run([hfs,str(raw),'addall',str(release),'--symlinks=clone_link'])
    run([fsck,'-fn',str(raw)])
    run([dmg,'-c','zlib','-l','9','build',str(raw),str(image)])
    roundtrip.mkdir()
    run([hfs,str(raw),'extractall','/',str(roundtrip)])
proof=source/'verification/automatic-formatting-dmg-proof.json'
subprocess.run(['python3',str(source/'verification/verify-dmg.py'),str(image),str(raw),str(release),str(roundtrip),hfs,str(proof)],check=True)
result=json.loads(proof.read_text());assert result['passed']
report=out/'DraftCraft-Pro-Automatic-Formatting-Report.md'
report.write_text(report.read_text()+f'''\n## Finished disk image\n\n- DMG: `{image.name}` — **{result['dmg_bytes']:,} bytes**.\n- SHA-256: `{result['dmg_sha256']}`.\n- Source ZIP SHA-256: `{hashlib.sha256((out/'DraftCraft-Pro-Automatic-Formatting-Source.zip').read_bytes()).hexdigest()}`.\n- HFSX consistency check passed. Independent verification decoded **{result['decoded_bytes']:,} bytes** across **{result['udif_runs']} UDIF runs**, validating compressed-data, HFS and master CRCs.\n- Round-trip comparison passed for **{result['regular_files']} regular files**, **{result['symlinks']} symlinks** and **{result['stored_catalog_modes']} stored catalog modes**, plus installer app hashes and support-file pins.\n- The mounted volume and application launch were not exercised on a Mac.\n\nThe in-image report and source report omit this final image hash to avoid a\nself-referential archive checksum. This external report records the final result.\n''')
print(json.dumps({'passed':True,'deliverables':[str(image),str(out/'DraftCraft-Pro-Automatic-Formatting-Source.zip'),str(report)]}),flush=True)
