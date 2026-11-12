// DraftCraft Pro 1.15.3: cross-paragraph editing model (join, split, range
// delete, copy, paste) — regression tests for E-01..E-05.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteSelection, extractSelection, insertParagraphs, joinWithNext, joinWithPrevious, looksLikeScreenplay, plainTextElements, selectionRanges, selectionText, sliceRuns, splitParagraph } from '../src/editor/crossParagraph';
import { structuralSlices } from '../src/production/anchors';
import { enterParagraph } from '../src/shortcuts/model';
import type { Paragraph } from '../src/types/script';

const P = (id: string, type: Paragraph['type'], text: string, extra: Partial<Paragraph> = {}): Paragraph => ({ id, type, text, ...extra } as Paragraph);
const script = () => [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('a1', 'Action', 'First action line.', { notes: [{ id: 'n1', author: 'W', text: 'note', color: 'yellow', createdAt: 'x', paragraphId: 'a1' }] }), P('a2', 'Action', 'Second action line.', { notes: [{ id: 'n2', author: 'W', text: 'other', color: 'blue', createdAt: 'x', paragraphId: 'a2' }], tags: ['t2'] }), P('c', 'Character', 'ELENA'), P('d', 'Dialogue', 'Hello there.')];

test('E-01: Backspace at the start joins with the previous element as an exact structural join', () => {
  const before = script();
  const r = joinWithPrevious(before, 'a2');
  assert.ok(r && !('blocked' in r));
  assert.deepEqual(r.paragraphs.map((p) => p.id), ['h', 'a1', 'c', 'd']);
  const joined = r.paragraphs[1];
  assert.equal(joined.text, 'First action line.Second action line.');
  assert.equal(joined.type, 'Action');
  assert.deepEqual(r.caret, { id: 'a1', offset: 'First action line.'.length });
  assert.deepEqual(joined.notes!.map((n) => [n.id, n.paragraphId]), [['n1', 'a1'], ['n2', 'a1']], 'notes of both elements are kept');
  assert.deepEqual(joined.tags, ['t2']);
  const slices = structuralSlices(before, r.paragraphs);
  assert.deepEqual(slices.get('a2'), [{ paragraphId: 'a1', sourceStart: 0, sourceEnd: 19, targetStart: 18 }], 'production anchors follow the join exactly');
  assert.equal(joinWithPrevious(before, 'h'), null, 'nothing before the first element');
});

test('E-02: Delete at the end joins the next element; alternate takes block a lossy join', () => {
  const r = joinWithNext(script(), 'c');
  assert.ok(r && !('blocked' in r));
  assert.equal(r.paragraphs.find((p) => p.id === 'c')!.text, 'ELENAHello there.');
  const takes = script(); takes[4] = { ...takes[4], altDialogue: ['Hello there.', 'Hi.'], activeAltIndex: 0 };
  const blocked = joinWithNext(takes, 'c');
  assert.ok(blocked && 'blocked' in blocked, 'joining would discard an alternate take');
});

test('E-07: splitting keeps inline styles on both halves (Enter mid-paragraph)', () => {
  const styled = P('s', 'Action', 'Bold then plain.', { runs: [{ text: 'Bold', style: { bold: true } }, { text: ' then plain.' }] });
  const { left, right } = splitParagraph(styled, 2);
  assert.deepEqual(left.runs, [{ text: 'Bo', style: { bold: true } }]);
  assert.deepEqual(right.runs, [{ text: 'ld', style: { bold: true } }, { text: ' then plain.' }]);
  const nav = { enter: { Action: 'Action' }, tab: {}, dialogueExit: 'legacy' } as never;
  const entered = enterParagraph([styled], 's', 2, 2, nav)!;
  assert.deepEqual(entered.paragraphs.map((p) => p.text), ['Bo', 'ld then plain.']);
  assert.deepEqual(entered.paragraphs[0].runs, [{ text: 'Bo', style: { bold: true } }], 'left half keeps bold');
  assert.deepEqual(entered.paragraphs[1].runs, [{ text: 'ld', style: { bold: true } }, { text: ' then plain.' }], 'right half keeps bold');
  assert.equal(sliceRuns(P('x', 'Action', 'abc', { runs: [{ text: 'zz' }] }), 0, 1), undefined, 'stale runs are ignored');
});

test('E-05: a selection across elements yields exact ranges, plain text and typed clipboard content', () => {
  const doc = script();
  const sel = { anchor: { id: 'a1', offset: 6 }, focus: { id: 'c', offset: 2 } };
  assert.deepEqual(selectionRanges(doc, sel), [{ id: 'a1', start: 6, end: 18 }, { id: 'a2', start: 0, end: 19 }, { id: 'c', start: 0, end: 2 }]);
  assert.deepEqual(selectionRanges(doc, { anchor: sel.focus, focus: sel.anchor }), selectionRanges(doc, sel), 'backwards selections are ordered');
  assert.equal(selectionText(doc, sel), 'action line.\n\nSecond action line.\n\nEL');
  assert.deepEqual(extractSelection(doc, sel).map((p) => [p.type, p.text]), [['Action', 'action line.'], ['Action', 'Second action line.'], ['Character', 'EL']]);
});

test('E-05: deleting a cross-element selection joins the remainder into the first element', () => {
  const doc = script();
  const r = deleteSelection(doc, { anchor: { id: 'a1', offset: 6 }, focus: { id: 'c', offset: 2 } });
  assert.ok(r && !('blocked' in r));
  assert.deepEqual(r.paragraphs.map((p) => [p.id, p.type, p.text]), [['h', 'Scene Heading', 'INT. ROOM - NIGHT'], ['a1', 'Action', 'First ENA'], ['d', 'Dialogue', 'Hello there.']]);
  assert.deepEqual(r.caret, { id: 'a1', offset: 6 });
  const whole = deleteSelection(doc, { anchor: { id: 'a1', offset: 0 }, focus: { id: 'c', offset: 2 } });
  assert.ok(whole && !('blocked' in whole));
  assert.deepEqual(whole.paragraphs.map((p) => [p.id, p.type, p.text]), [['h', 'Scene Heading', 'INT. ROOM - NIGHT'], ['c', 'Character', 'ENA'], ['d', 'Dialogue', 'Hello there.']], 'deleting whole leading elements keeps the tail element');
  const locked = script(); locked[0] = { ...locked[0], lockedScene: true, sceneNumber: '1' };
  const refused = deleteSelection(locked, { anchor: { id: 'h', offset: 3 }, focus: { id: 'a1', offset: 2 } });
  assert.ok(refused && 'blocked' in refused, 'a locked scene heading never silently merges');
});

test('E-04: pasting several elements keeps their types; one element pastes inline', () => {
  const doc = script();
  const content = [P('x1', 'Scene Heading', 'INT. HALL - DAY'), P('x2', 'Action', 'She runs.'), P('x3', 'Character', 'MARCUS')];
  const mid = insertParagraphs(doc, { id: 'a1', offset: 6 }, content)!;
  assert.deepEqual(mid.paragraphs.map((p) => [p.type, p.text]), [['Scene Heading', 'INT. ROOM - NIGHT'], ['Action', 'First '], ['Scene Heading', 'INT. HALL - DAY'], ['Action', 'She runs.'], ['Character', 'MARCUS'], ['Action', 'action line.'], ['Action', 'Second action line.'], ['Character', 'ELENA'], ['Dialogue', 'Hello there.']], 'a caret inside an element splits it around the pasted elements');
  assert.equal(new Set(mid.paragraphs.map((p) => p.id)).size, mid.paragraphs.length, 'pasted elements receive unique ids');
  assert.equal(mid.paragraphs[1].id, 'a1', 'the caret element keeps its identity');
  assert.equal(mid.paragraphs[1].notes?.[0].id, 'n1', 'its notes stay with it');
  assert.deepEqual(mid.caret, { id: mid.paragraphs[4].id, offset: 'MARCUS'.length });
  const atEnd = insertParagraphs(doc, { id: 'a1', offset: 18 }, content)!;
  assert.deepEqual(atEnd.paragraphs.slice(1, 5).map((p) => [p.type, p.text]), [['Action', 'First action line.'], ['Scene Heading', 'INT. HALL - DAY'], ['Action', 'She runs.'], ['Character', 'MARCUS']], 'at the end of an element the elements follow it');
  const atStart = insertParagraphs(doc, { id: 'a2', offset: 0 }, content)!;
  assert.deepEqual(atStart.paragraphs.slice(2, 6).map((p) => p.text), ['INT. HALL - DAY', 'She runs.', 'MARCUS', 'Second action line.'], 'at the start of an element the elements precede it');
  const empty = insertParagraphs([P('e', 'Action', '')], { id: 'e', offset: 0 }, content)!;
  assert.deepEqual(empty.paragraphs.map((p) => [p.id === 'e', p.type]), [[true, 'Scene Heading'], [false, 'Action'], [false, 'Character']], 'an empty caret element is replaced');
  const inline = insertParagraphs(doc, { id: 'd', offset: 5 }, [P('y', 'Action', ', you')])!;
  assert.equal(inline.paragraphs.find((p) => p.id === 'd')!.text, 'Hello, you there.');
  assert.equal(inline.paragraphs.find((p) => p.id === 'd')!.type, 'Dialogue', 'inline paste keeps the element type');
  assert.deepEqual(inline.caret, { id: 'd', offset: 10 });
});

test('E-04: plain text is parsed as screenplay only when it looks like one', () => {
  assert.equal(looksLikeScreenplay('INT. HALL - DAY\n\nShe runs.'), true);
  assert.equal(looksLikeScreenplay('MARCUS\nWait!'), true);
  assert.equal(looksLikeScreenplay('Just a note.\n\nAnother thought.'), false);
  assert.deepEqual(plainTextElements('One.\n\nTwo\nlines.\r\n\r\nThree.', 'Action').map((p) => p.text), ['One.', 'Two\nlines.', 'Three.']);
});

test('E-01/E-02: joining with an empty element removes the empty element and keeps the other element\'s type', () => {
  const note = { id: 'n9', author: 'W', text: 'keep me', color: 'yellow', createdAt: 'x', paragraphId: 'empty' };
  const list = () => [P('h', 'Scene Heading', 'INT. ROOM - NIGHT'), P('empty', 'Character', '', { notes: [note] }), P('d', 'Dialogue', 'Hello there.', { runs: [{ text: 'Hello', style: { bold: true } }, { text: ' there.' }] } as Partial<Paragraph>)];
  // Delete in the empty Character line: the Dialogue stays Dialogue, with its identity and runs.
  const del = joinWithNext(list(), 'empty');
  assert.ok(del && !('blocked' in del));
  assert.deepEqual(del.paragraphs.map((p) => [p.id, p.type, p.text]), [['h', 'Scene Heading', 'INT. ROOM - NIGHT'], ['d', 'Dialogue', 'Hello there.']]);
  assert.deepEqual(del.caret, { id: 'd', offset: 0 });
  assert.deepEqual(del.paragraphs[1].runs, list()[2].runs, 'inline styles are untouched');
  assert.deepEqual(del.paragraphs[1].notes!.map((n) => [n.id, n.paragraphId]), [['n9', 'd']], 'the empty element\'s note moves across');
  // Backspace at the start of the Dialogue after the empty line gives the same result.
  const back = joinWithPrevious(list(), 'd');
  assert.ok(back && !('blocked' in back));
  assert.deepEqual(back.paragraphs.map((p) => [p.id, p.type]), [['h', 'Scene Heading'], ['d', 'Dialogue']]);
  assert.deepEqual(back.caret, { id: 'd', offset: 0 });
  // Backspace in an empty element still removes it and moves to the end of the previous element.
  const intoPrevious = joinWithPrevious([P('a', 'Action', 'She waits.'), P('e', 'Action', '')], 'e');
  assert.ok(intoPrevious && !('blocked' in intoPrevious));
  assert.deepEqual(intoPrevious.paragraphs.map((p) => [p.id, p.text]), [['a', 'She waits.']]);
  assert.deepEqual(intoPrevious.caret, { id: 'a', offset: 10 });
  // An empty element whose other alternate takes have text is not discarded silently.
  const takes = joinWithNext([P('e', 'Dialogue', '', { altDialogue: ['', 'Other take'], activeAltIndex: 0 }), P('a', 'Action', 'Text.')], 'e');
  assert.ok(takes && !('blocked' in takes) && takes.paragraphs[0].id === 'e', 'falls back to the ordinary join that keeps the first element');
});
