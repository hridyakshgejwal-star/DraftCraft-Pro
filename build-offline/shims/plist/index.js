'use strict';
// Offline stand-in for plist.parse used by verification/verify-dmg-asar.mjs.
// Parses with Python's plistlib (standard library) and returns plain JSON values.
const { execFileSync } = require('node:child_process');
exports.parse = (xml) => JSON.parse(execFileSync('python3', ['-I', '-c', 'import plistlib,sys,json,base64,datetime\ndef d(o):\n  if isinstance(o,bytes): return base64.b64encode(o).decode()\n  if isinstance(o,datetime.datetime): return o.isoformat()\n  raise TypeError(type(o))\nprint(json.dumps(plistlib.loads(sys.stdin.buffer.read()),default=d))'], { input: Buffer.from(xml) }).toString());
