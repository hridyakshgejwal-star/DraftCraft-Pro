// 1.17 items 16–17: the searchable Getting Started guide and the Idea to Draft tutorial projects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {GUIDE,guideSections,highlightParts,parseGuideText,queryWords,searchGuide} from '../src/help/guide';
import {TUTORIALS,ideaToDraftDocument} from '../src/help/ideaToDraft';
import {documentGraphIssues} from '../src/files/documentGraph.mjs';
import {migrateStudio} from '../src/production/model';

const reference=fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname),'..','desktop','Getting-Started.txt'),'utf8');

test('the shipped Getting Started text splits into one section per capitalised heading',()=>{
 const sections=parseGuideText(reference),headings=reference.split('\n').filter(l=>/^[A-Z][A-Z0-9 ,.&/'’()—–+-]{2,}$/.test(l)&&/[A-Z]{3}/.test(l)&&!/^DRAFTCRAFT PRO/.test(l));
 assert.equal(sections.length,headings.length,'every heading becomes a section');
 assert.ok(sections.every(s=>s.body.length>0&&s.group==='Reference'));
 const shortcuts=sections.find(s=>s.title==='Keyboard Shortcuts');assert.ok(shortcuts,'title case');assert.match(shortcuts!.body,/Cmd\+1 Scene Heading/);
 // No text is lost: every non-heading line of the file is in some section body.
 const bodies=sections.map(s=>s.body).join('\n');for(const line of reference.split('\n').slice(1))if(line.trim()&&!headings.includes(line))assert.ok(bodies.includes(line.trim()),'kept: '+line);
});

test('search needs every word, ignores case and accents, and ranks title matches first',()=>{
 const all=guideSections(reference);assert.equal(all.length,GUIDE.length+parseGuideText(reference).length);
 assert.deepEqual(searchGuide(all,''),all,'empty query: everything in order');
 const cast=searchGuide(all,'CAST list CSV');assert.ok(cast.length>=1);assert.equal(cast[0].id,'navigator');
 assert.ok(cast.every(s=>/cast/i.test(s.title+s.body)&&/csv/i.test(s.title+s.body)));
 assert.equal(searchGuide(all,'zzqqxx').length,0);
 const shortcut=searchGuide(all,'keyboard shortcuts');assert.ok(['shortcuts'].includes(shortcut[0].id)||/Keyboard Shortcuts/.test(shortcut[0].title),'a title hit leads: '+shortcut[0].title);
 assert.ok(searchGuide([{id:'x',title:'Café',body:'Résumé',group:'Guide'}],'cafe resume').length===1,'accents ignored');
 assert.deepEqual(queryWords('  Beat   BOARD '),['beat','board']);
});

test('highlighting marks every occurrence without changing the text',()=>{
 const parts=highlightParts('Beat Board: drag a beat.',['beat']);
 assert.equal(parts.map(p=>p.text).join(''),'Beat Board: drag a beat.');
 assert.deepEqual(parts.filter(p=>p.match).map(p=>p.text),['Beat','beat']);
 assert.deepEqual(highlightParts('abc',[]),[{text:'abc',match:false}]);
});

test('each Idea to Draft tutorial is a valid new project in its format with linked step cards',()=>{
 for(const t of TUTORIALS){
  const d=ideaToDraftDocument(t.kind),steps=t.phases.flatMap(p=>p.steps),structure=t.phases.find(p=>p.name==='Structure')!.steps;
  assert.equal(d.beats.length,steps.length,t.kind);
  assert.deepEqual(d.beats.map(b=>b.title),steps.map((s,i)=>(i+1)+' · '+s.title),'numbered in order');
  assert.ok(d.beats.every(b=>b.description&&b.tags.includes('Idea to Draft')&&b.act>=1&&b.act<=4));
  assert.equal(new Set(d.beats.map(b=>b.posX+','+b.posY)).size,d.beats.length,'no two cards overlap');
  assert.deepEqual(d.flowLines.map(f=>[f.fromId,f.toId]),d.beats.slice(1).map((b,i)=>[d.beats[i].id,b.id]),'flow lines link the steps in order');
  const markers=d.outlineMarkers.filter(m=>m.beatId);assert.equal(markers.length,structure.length,'one outline section per structure card');
  for(const m of markers){assert.ok(d.outlineLanes.some(l=>l.id===m.laneId&&l.type==='sequence'));assert.ok(m.startPage>=1&&m.endPage>m.startPage&&m.endPage<=d.targetScriptPages+1,JSON.stringify(m));assert.ok(d.beats.some(b=>b.id===m.beatId));}
  for(let i=1;i<markers.length;i++)assert.ok(markers[i].startPage>=markers[i-1].startPage,'sections follow the story order');
  assert.equal(d.appliedTemplateId,t.template.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
  assert.ok(d.writingFormat?.supported.includes(d.paragraphs[1].type),'the instruction line uses an element of the format');
  assert.deepEqual(documentGraphIssues(d),[],'references are consistent');
  const again=ideaToDraftDocument(t.kind);assert.notEqual(again.id,d.id);assert.notEqual(again.beats[0].id,d.beats[0].id,'every project gets its own IDs');
  const reopened=migrateStudio(JSON.parse(JSON.stringify(d)));assert.deepEqual(reopened.beats,d.beats,'the project survives a save and reopen');assert.deepEqual(reopened.outlineMarkers,d.outlineMarkers);
 }
 assert.equal(ideaToDraftDocument('stage').writingFormat?.kind,'stageplay');
 assert.equal(ideaToDraftDocument('series').writingFormat?.kind,'television');
});
