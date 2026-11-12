import test from 'node:test';
import assert from 'node:assert/strict';
import {CaretMotion,caretProgress,canGlide,type CaretCurve} from '../src/editor/caretMotion';
import {DEFAULT_EDITOR_PREFS,normalizeEditorPreferences} from '../src/editor/preferences';
test('new profiles enable normal smooth motion; existing explicit settings and safe legacy speeds survive',()=>{
 assert.equal(DEFAULT_EDITOR_PREFS.smoothCursor,true);assert.equal(DEFAULT_EDITOR_PREFS.cursorSpeed,80);
 const p=normalizeEditorPreferences({smoothCursor:false,cursorSpeed:65,cursorAppearance:'wide',cursorBlink:false});
 assert.equal(p.smoothCursor,false);assert.equal(p.cursorSpeed,65);assert.equal(p.cursorAppearance,'wide');assert.equal(p.cursorBlink,false);assert.equal(p.cursorStyle,'ease-out');assert.equal(p.smoothBlink,true);
 const invalid=normalizeEditorPreferences({smoothCursor:'false',cursorSpeed:Infinity,blinkInterval:-2,cursorStyle:'bounce',autoCapitalize:0});
 assert.equal(invalid.smoothCursor,true);assert.equal(invalid.cursorSpeed,80);assert.equal(invalid.blinkInterval,400);assert.equal(invalid.cursorStyle,'ease-out');assert.equal(invalid.autoCapitalize,true);
});
for(const curve of ['ease-out','spring','linear'] as CaretCurve[]){
 test(curve+' is monotonic and reaches its exact endpoint without overshooting',()=>{
  let previous=0;for(let n=0;n<=1000;n++){const value=caretProgress(n/1000,curve);assert.ok(value>=previous-1e-12);assert.ok(value>=0&&value<=1);previous=value;}
  assert.equal(caretProgress(0,curve),0);assert.equal(caretProgress(1,curve),1);
  const m=new CaretMotion();m.retarget({x:20,y:40},0,80,curve);m.retarget({x:120,y:60},0,80,curve);assert.deepEqual(m.sample(0),{x:20,y:40});assert.deepEqual(m.sample(80),{x:120,y:60});assert.equal(m.moving,false);
 });
}
test('60 Hz and 120 Hz sampling give the same trajectory at the same elapsed time',()=>{
 const create=()=>{const m=new CaretMotion();m.retarget({x:0,y:0},0,80,'ease-out');m.retarget({x:100,y:20},0,80,'ease-out');return m;};
 const a=create(),b=create();for(let time=0;time<=40;time+=1000/60)a.sample(time);for(let time=0;time<=40;time+=1000/120)b.sample(time);assert.deepEqual(a.sample(40),b.sample(40));assert.deepEqual(a.sample(100),b.sample(100));
});
test('rapid direction changes start from the current position and never build a delayed queue',()=>{
 const m=new CaretMotion();m.retarget({x:0,y:0},0,80,'ease-out');m.retarget({x:100,y:0},0,80,'ease-out');const before=m.sample(30);m.retarget({x:-20,y:0},30,80,'ease-out');assert.deepEqual(m.sample(30),before);assert.ok(m.sample(40).x<before.x);
 for(let n=1;n<=10000;n++)m.retarget({x:n%5,y:0},40+n,80,'ease-out');assert.deepEqual(m.sample(10200),{x:0,y:0});assert.equal(m.moving,false);
});
test('same-line movement and adjacent-line arrows glide; wrap, distant and page jumps snap',()=>{
 const a={x:300,y:100};assert.equal(canGlide(a,{x:312,y:100},20,true),true);assert.equal(canGlide(a,{x:305,y:120},20,true),true);assert.equal(canGlide(a,{x:20,y:120},20,true),false);assert.equal(canGlide(a,{x:310,y:100},20,false),false);assert.equal(canGlide(a,{x:310,y:500},20,true),false);
 const m=new CaretMotion();m.retarget(a,0,80,'ease-out');m.retarget({x:10,y:900},5,80,'ease-out',true);assert.deepEqual(m.sample(5),{x:10,y:900});m.reset();m.retarget({x:50,y:20},6,80,'ease-out');assert.deepEqual(m.sample(6),{x:50,y:20});
});
test('zero duration and suspended-display frames settle immediately; invalid targets cannot poison coordinates',()=>{
 const m=new CaretMotion();m.retarget({x:1,y:2},0,80,'spring');m.retarget({x:3,y:4},1,0,'spring');assert.deepEqual(m.sample(1),{x:3,y:4});m.retarget({x:NaN,y:Infinity},2,80,'linear');assert.deepEqual(m.sample(2),{x:3,y:4});m.retarget({x:10,y:30},5,80,'spring');assert.deepEqual(m.sample(10000),{x:10,y:30});
});
