// The native self-test's 250-page scripts parse as screenplays of the intended shape (1.17 item 14 on a Mac).
const test=require('node:test'),assert=require('node:assert/strict');
const {realisticFountain,uniformFountain}=require('../desktop/self-test.cjs');
test('self-test scripts are deterministic and long enough',()=>{
 assert.equal(realisticFountain(),realisticFountain());const mixed=realisticFountain().split('\n'),uniform=uniformFountain().split('\n');
 assert.ok(mixed.filter(l=>/^(INT|EXT)\. /.test(l)).length>150);assert.ok(mixed.filter(l=>/^(ANNA|BEN|CLARA|DETECTIVE MORRIS|JO)$/.test(l)).length>1500,'dialogue-heavy');
 assert.equal(uniform.filter(l=>l==='INT. KITCHEN - NIGHT').length,582);
});
