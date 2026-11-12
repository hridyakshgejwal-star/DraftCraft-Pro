import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Paragraph} from '../src/types/script';
import {blankDocument} from '../src/files/model';
import {baseFormat} from '../src/formats/model';
import {CharacterIndex} from '../src/writing/model';
import {addTag, emptyStudio, migrateStudio, pairDialogue, reconcileStudio} from '../src/production/model';
import {documentLayout, lockLayout} from '../src/production/layout';
import {printHtml} from '../src/production/print';
import {revisionPageLabels} from '../src/production/revisions';
import {characterSides, characterSidesHtml} from '../src/production/sides';
import {parseFountain, exportToFountain} from '../src/utils/fountainCodec';
import {formatRtf, parseRtf} from '../src/formats/interchange';
import {repairPlanningLinks, sendPlanning, outlineExport} from '../src/production/planning';
import {generateCharacterReport, generateTagReports} from '../src/utils/reportsGenerator';

const p = (id: string, type: Paragraph['type'], text: string): Paragraph => ({id, type, text});
const doc = (paragraphs: Paragraph[]) => migrateStudio(new CharacterIndex().reconcile({...blankDocument(), paragraphs, writingFormat: baseFormat()}));

test('dual-column locked boundaries preserve both speech offsets after overflow and save/reopen', () => {
  let d = doc(pairDialogue([p('s', 'Scene Heading', 'INT. ROOM - DAY'), p('c1', 'Character', 'ANN'), p('d1', 'Dialogue', 'Left speech. '.repeat(650)), p('c2', 'Character', 'ANNA'), p('d2', 'Dialogue', 'Right speech. '.repeat(600)), p('tail', 'Action', 'Final paragraph is untouched.')], 'c1'));
  d = lockLayout(d);
  const locks = d.studio!.pageLocks;
  assert.ok(locks.some(lock => lock.companionAnchors?.length));
  d = reconcileStudio(d, {...d, paragraphs: d.paragraphs.map(p => p.id === 'd1' ? {...p, text: 'Inserted speech. '.repeat(150) + p.text} : p)});
  d = JSON.parse(JSON.stringify(d));
  const layout = documentLayout(d);
  assert.equal(new Set(layout.pages.map(page => page.pageLabel)).size, layout.pages.length, 'Page labels must be unique');
  for (const lock of d.studio!.pageLocks) {
    const page = layout.pages.find(page => page.pageLabel === lock.label);
    assert.ok(page, lock.label);
    for (const anchor of [lock.anchor, ...(lock.companionAnchors || [])]) {
      assert.ok(page!.fragments.some(fr => fr.paragraphId === anchor.paragraphId && fr.start === anchor.offset), `Missing ${lock.label}: ${anchor.paragraphId}:${anchor.offset}`);
    }
  }
  for (const id of ['d1', 'd2']) {
    const source = d.paragraphs.find(p => p.id === id)!.text;
    const fragments = layout.pages.flatMap(page => page.fragments).filter(fr => fr.paragraphId === id);
    assert.equal(fragments.map(fr => source.slice(fr.start, fr.end)).join(''), source);
  }
});

test('deletion-only revision pages and empty surviving paragraphs export with a revision mark', () => {
  let d = doc([p('a', 'Action', 'Delete these words.')]);
  d = {...d, productionMode: true, studio: {...d.studio!, activeRevisionId: 'blue', revisionSets: [{id: 'blue', name: 'Blue', date: '2026-10-16', author: 'Writer', color: '#2563eb'}]}};
  d = reconcileStudio(d, {...d, paragraphs: [{...d.paragraphs[0], text: ''}]});
  assert.equal(d.paragraphs[0].revisionMarks?.at(-1)?.deletedText, 'Delete these words.');
  assert.deepEqual(revisionPageLabels(d, documentLayout(d).pages, 'blue'), ['1']);
  const html = printHtml(d, {includeTitlePage: false, revisedPagesOnly: true, revisionSetId: 'blue'});
  assert.ok(html.includes('data-page-label="1"')); assert.ok(html.includes('>*</span>'));
});

test('production tags follow exact split and join transactions, including a tag crossing the split', () => {
  let d = addTag(doc([p('a', 'Action', 'A gold key opens.')]), 'Key', 'Props', {paragraphId: 'a', start: 2, end: 10});
  d = reconcileStudio(d, {...d, paragraphs: [{...d.paragraphs[0], text: 'A gold '}, p('b', 'Action', 'key opens.')]});
  const ranges = d.studio!.occurrences.filter(o => !o.deleted);
  assert.equal(ranges.length, 2); assert.equal(new Set(ranges.map(o => o.rangeId)).size, 1);
  assert.equal(ranges.map(o => d.paragraphs.find(p => p.id === o.paragraphId)!.text.slice(o.start, o.end)).join(''), 'gold key');
  d = reconcileStudio(d, {...d, paragraphs: [{...d.paragraphs[0], text: 'A gold key opens.'}]});
  assert.ok(d.studio!.occurrences.every(o => o.paragraphId === 'a' && !o.deleted));
  assert.equal(d.studio!.occurrences.map(o => d.paragraphs[0].text.slice(o.start, o.end)).join(''), 'gold key');
});

test('character sides include explicit non-speaking cast, selected takes and original production labels', () => {
  let d = doc([p('s1', 'Scene Heading', 'INT. ROOM - DAY'), p('c1', 'Character', 'ANN'), {...p('d1', 'Dialogue', 'Selected B.'), altDialogue: ['Unused A.', 'Selected B.'], activeAltIndex: 1}, p('s2', 'Scene Heading', 'EXT. ROAD - DAY'), p('c2', 'Character', 'ANNA'), p('d2', 'Dialogue', 'Other character.'), p('s3', 'Scene Heading', 'INT. STUDIO - DAY'), p('a3', 'Action', 'A silent entrance.')]);
  const ann = d.characterMemory!.find(c => c.name === 'ANN')!;
  d = {...d, studio: {...d.studio!, castMembership: {s3: [ann.id]}, pageLocks: [{id: 'first', level: 1, label: '12A', anchor: {paragraphId: 's1', offset: 0}}]}};
  const sides = characterSides(d, [ann.id]);
  assert.deepEqual(sides.sceneIds, ['s1', 's3']); assert.deepEqual(sides.pageLabels, ['12A']);
  const html = characterSidesHtml(d, sides);
  assert.ok(html.includes('Selected B.')); assert.ok(!html.includes('Unused A.')); assert.ok(!html.includes('Other character.')); assert.ok(html.includes('data-page-label="12A"'));
  assert.deepEqual(characterSides(d, [ann.id], false).sceneIds, ['s1']);
});

test('versioned production migration preserves preferences, assets and legacy ranges without inventing activity', () => {
  const d = doc([p('a', 'Action', 'Source text.')]);
  const original = {...emptyStudio(), version: 1, continuations: {...emptyStudio().continuations, more: '(KEEP READING)'}, doctor: {...emptyStudio().doctor, beforePrint: true}};
  const migrated = migrateStudio({...d, studio: original as any});
  assert.equal(migrated.studio!.version, 2); assert.equal(migrated.studio!.continuations.more, '(KEEP READING)'); assert.equal(migrated.studio!.doctor.beforePrint, true);
  assert.throws(() => migrateStudio({...d, studio: {...emptyStudio(), version: 99} as any}), /newer production metadata/);
});

test('typing after imported rich text preserves unaffected styles and RTF color/strikeout round trips', () => {
  let d = doc([{...p('rich', 'Action', 'Red crossed text.'), runs: [{text: 'Red ', style: {color: '#ff0000'}}, {text: 'crossed', style: {strikethrough: true}}, {text: ' text.'}]}]);
  d = reconcileStudio(d, {...d, paragraphs: [{...d.paragraphs[0], text: 'Red crossed text. More.', runs: undefined}]});
  assert.equal(d.paragraphs[0].runs?.map(r => r.text).join(''), d.paragraphs[0].text);
  d.titlePage.includeInPdf=false;
  const imported = parseRtf(formatRtf(d));
  assert.ok(imported.paragraphs![0].runs?.some(r => r.style?.color === '#ff0000'));
  assert.ok(imported.paragraphs![0].runs?.some(r => r.style?.strikethrough && r.text === 'crossed'));
});

test('Fountain inline emphasis, literal escaped markers and dual dialogue survive a round trip', () => {
  const parsed = parseFountain('!A **bold** and *italic* and _underlined_ word.\\*Literal\\*\n\nANN\nSelected **speech**.\n\nANNA ^\nOther *speech*.\n');
  assert.equal(parsed.paragraphs![0].text, 'A bold and italic and underlined word.*Literal*');
  const d = doc(parsed.paragraphs!);
  const imported = parseFountain(exportToFountain(d));
  assert.deepEqual(imported.paragraphs!.map(p => p.text), d.paragraphs.map(p => p.text));
  for (const style of ['bold', 'italic', 'underline'] as const) assert.ok(imported.paragraphs![0].runs!.some(r => r.style?.[style]));
  assert.ok(imported.paragraphs!.some(p => p.dualColumn === 2));
});

test('a Fountain dual caret pairs the preceding speech even when another speech follows', () => {
  const parsed = parseFountain('ANN\nFirst.\n\nANNA ^\nSecond.\n\nBOB\nThird remains separate.\n');
  const [ann, , anna, , bob] = parsed.paragraphs!;
  assert.equal(ann.dualColumn, 1); assert.equal(anna.dualColumn, 2);
  assert.equal(ann.dualGroupId, anna.dualGroupId); assert.equal(bob.dualGroupId, undefined);
  const round = parseFountain(exportToFountain(doc(parsed.paragraphs!)));
  assert.equal(round.paragraphs![4].dualGroupId, undefined);
  assert.equal(round.paragraphs![5].text, 'Third remains separate.');
});

test('character reports count distinct unnumbered scenes and logical split tag ranges only once', () => {
  let d = doc([p('s1', 'Scene Heading', 'INT. ROOM - DAY'), p('c1', 'Character', 'ANN'), p('d1', 'Dialogue', 'Hello.'), p('s2', 'Scene Heading', 'INT. STUDIO - DAY'), p('c2', 'Character', 'ANN'), p('d2', 'Dialogue', 'Again.')]);
  assert.equal(generateCharacterReport(d.paragraphs, d)[0].sceneCount, 2);
  d = addTag(d, 'Phrase', 'Props', {paragraphId: 'd2', start: 0, end: 6});
  d = reconcileStudio(d, {...d, paragraphs: [...d.paragraphs.slice(0, -1), {...d.paragraphs.at(-1)!, text: 'Ag'}, p('split', 'Dialogue', 'ain.')]});
  assert.equal(generateTagReports(d.paragraphs, d).tagsByTag[0].totalOccurrences, 1);
});

test('deleted planning identities unlink retained script text and orphan markers remain exportable', () => {
  let d = doc([p('a', 'Action', 'Keep script text.')]);
  d = {...d, paragraphs: [{...d.paragraphs[0], sourceBeatId: 'removed-beat', sourcePlanningField: 'title'}], outlineMarkers: [{id: 'm', laneId: 'deleted-lane', title: 'Retained marker', description: 'Keep this hierarchy.', startPage: 1, endPage: 2, color: '#888888', beatId: 'removed-beat', anchor: {page: 1, paragraphId: 'removed-scene'}}]};
  const repaired = repairPlanningLinks(d);
  assert.equal(repaired.paragraphs[0].text, 'Keep script text.'); assert.equal(repaired.paragraphs[0].sourceBeatId, undefined);
  assert.equal(repaired.outlineMarkers[0].beatId, undefined); assert.equal(repaired.outlineMarkers[0].anchor?.paragraphId, undefined);
  assert.ok(outlineExport(repaired, 'markdown').includes('Retained marker'));
  const inserted = sendPlanning(repaired, {kind: 'marker', id: 'm', title: 'Heading', description: 'Child'}, 'Outline Level 2', {where: 'end'});
  assert.equal(inserted.paragraphs.at(-1)!.type, 'Outline Level 3');
});

test('structural production deletions remain represented in the selected revision output', () => {
  let d = doc([p('a', 'Action', 'Deleted paragraph.'), p('b', 'Action', 'Retained paragraph.')]);
  d = {...d, productionMode: true, studio: {...d.studio!, activeRevisionId: 'blue', revisionSets: [{id: 'blue', name: 'Blue', date: '2026-10-16', author: 'Writer', color: '#2563eb'}]}};
  d = reconcileStudio(d, {...d, paragraphs: [d.paragraphs[1]]});
  assert.ok(d.paragraphs[0].revisionMarks?.some(mark => mark.deletedText === 'Deleted paragraph.'));
  assert.ok(printHtml(d, {includeTitlePage: false, revisedPagesOnly: true, revisionSetId: 'blue'}).includes('Retained paragraph.'));
});


test('replacing every paragraph with a new empty editor row retains structural deletion revision marks', () => {
  let d = doc([p('all', 'Action', 'Remove the entire script.')]);
  d = {...d, productionMode:true, studio:{...d.studio!, activeRevisionId:'blue', revisionSets:[{id:'blue',name:'Blue',date:'2026-10-16',author:'Writer',color:'#2563eb'}]}};
  d = reconcileStudio(d,{...d,paragraphs:[p('empty','Action','')]});
  assert.equal(d.paragraphs[0].revisionMarks?.[0].deletedText,'Remove the entire script.');
  assert.ok(printHtml(d,{includeTitlePage:false,revisedPagesOnly:true,revisionSetId:'blue'}).includes('>*</span>'));
});
