"""Inventory preserved source and the supplied runtime; does not assert UI parity."""
from pathlib import Path
import hashlib,json,os
root=Path(__file__).resolve().parent.parent;task=root.parent.parent
baseline=task/'baseline-source/DraftCraft-Pro-Source'
scopes={'src','desktop','crates','screenplay-workspace'}
def files(directory):
 return {p.relative_to(directory).as_posix():p for p in directory.rglob('*') if p.is_file() and p.relative_to(directory).parts[0] in scopes and not {'node_modules','target','__pycache__','dist'}.intersection(p.relative_to(directory).parts)}
a,b=files(baseline),files(root);removed=sorted(a.keys()-b.keys());assert not removed,removed
changed=sorted(n for n in a.keys()&b.keys() if a[n].read_bytes()!=b[n].read_bytes());new=sorted(b.keys()-a.keys());unchanged=sorted(n for n in a.keys()&b.keys() if n not in changed)
protected=['src/writing/punctuation.ts','src/editor/automaticFormatting.ts','src/editor/preferences.ts','src/formats/catalog.ts','src/formats/model.ts','src/shortcuts/model.ts','desktop/table-read.cjs','desktop/table-read-audio.cjs','desktop/table-read-audio-worker.cjs']
assert all(n in unchanged for n in protected)
assert all(n in unchanged for n in a if n.startswith(('crates/','screenplay-workspace/')))
report={'passed':True,'baseline':'supplied 1.14.0 source','removed_files':removed,'changed_files':changed,'new_files':new,'unchanged_files':len(unchanged),'unchanged_rust_files':sum(n.startswith(('crates/','screenplay-workspace/')) for n in unchanged),'protected_unchanged':protected}
(root/'verification/production-preservation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'changed':len(changed),'new':len(new),'unchanged':len(unchanged),'rust':report['unchanged_rust_files']}))
