"""Compare this extension with the delivered 1.13 source and native bundle."""
from pathlib import Path
import hashlib,json,os,sys
root=Path(__file__).resolve().parent.parent;task=root.parent.parent
baseline=task/'baseline-source/DraftCraft-Pro-Source';app=task/'release-final/DraftCraft Pro.app';oldapp=task/'baseline-release/DraftCraft Pro.app'
scopes={'src','desktop','crates','screenplay-workspace'}
def sourcefiles(r):
 return {p.relative_to(r).as_posix():p for p in r.rglob('*') if p.is_file() and p.relative_to(r).parts[0] in scopes and not {'node_modules','target','__pycache__','dist'}.intersection(p.relative_to(r).parts)}
a,b=sourcefiles(baseline),sourcefiles(root);changed=sorted(n for n in a.keys()&b.keys() if a[n].read_bytes()!=b[n].read_bytes());removed=sorted(a.keys()-b.keys());new=sorted(b.keys()-a.keys());unchanged=sorted(n for n in a.keys()&b.keys() if n not in changed)
assert not removed,removed
critical=['desktop/project-files.cjs','desktop/save-coordinator.cjs','src/files/useProjectFiles.ts','src/writing/punctuation.ts','src/editor/automaticFormatting.ts','src/editor/preferences.ts','src/formats/catalog.ts','src/formats/model.ts','src/shortcuts/model.ts']
assert all(n in unchanged for n in critical)
def inventory(r):
 return {p.relative_to(r).as_posix():('link',os.readlink(p)) if p.is_symlink() else ('file',p.stat().st_size) for p in r.rglob('*') if p.is_file() or p.is_symlink()}
x,y=inventory(oldapp),inventory(app);assert x.keys()==y.keys();assert all(y[n]==x[n] for n in x if x[n][0]=='link')
f=app/'Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework';old=oldapp/f.relative_to(app);digest=hashlib.sha256(f.read_bytes()).hexdigest();assert f.read_bytes()==old.read_bytes()
proof={'passed':True,'baseline':'delivered 1.13.0 source and application','changed_files':changed,'new_files':new,'removed_files':removed,'unchanged_files':len(unchanged),'critical_unchanged':critical,'unchanged_rust_files':sum(n.startswith(('crates/','screenplay-workspace/')) for n in unchanged),'app_file_inventory_preserved':True,'app_regular_files':sum(v[0]=='file' for v in y.values()),'app_symlinks':sum(v[0]=='link' for v in y.values()),'electron_framework_bytes':f.stat().st_size,'electron_framework_sha256':digest}
(root/'verification/table-read-preservation.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
