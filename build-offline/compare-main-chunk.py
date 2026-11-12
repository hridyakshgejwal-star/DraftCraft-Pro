#!/usr/bin/env python3
"""Compare two builds' main renderer chunks (dist/assets/index-*.js) that differ only in identifier names.

esbuild can number colliding top-level names differently between two builds of the same tree; the minifier then
assigns different short names. This check passes when the two chunks have the same token sequence and punctuation,
every differing token is an identifier, and each name in the first chunk always maps to the same name in the second.

Usage: compare-main-chunk.py <dist/assets of build A> <dist/assets of build B>
"""
import glob, re, sys

def chunk(assets):
    found = glob.glob(assets.rstrip('/') + '/index-*.js')
    if len(found) != 1:
        sys.exit(f'expected one index-*.js in {assets}, found {len(found)}')
    return open(found[0], encoding='utf-8').read()

a, b = chunk(sys.argv[1]), chunk(sys.argv[2])
word = re.compile(r'[\w$]+')
ident = re.compile(r'^[A-Za-z_$][\w$]*$')
skeleton_same = word.sub('#', a) == word.sub('#', b)
ta, tb = word.findall(a), word.findall(b)
pairs = [(x, y) for x, y in zip(ta, tb) if x != y] if len(ta) == len(tb) else None
mapping, inconsistent = {}, 0
for x, y in pairs or []:
    if mapping.setdefault(x, y) != y:
        inconsistent += 1
non_identifier = [p for p in pairs or [] if not (ident.match(p[0]) and ident.match(p[1]))]
ok = a == b or (skeleton_same and pairs is not None and not non_identifier and not inconsistent)
print(f'identical={a == b} punctuation_identical={skeleton_same} tokens={len(ta)}/{len(tb)} '
      f'differing_tokens={len(pairs) if pairs is not None else "n/a"} renamed_identifiers={len(mapping)} '
      f'non_identifier_differences={len(non_identifier)} inconsistent_renames={inconsistent} -> {"EQUIVALENT" if ok else "DIFFERENT"}')
sys.exit(0 if ok else 1)
