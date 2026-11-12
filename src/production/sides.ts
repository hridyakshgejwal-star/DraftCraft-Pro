import type {ScriptDocument} from '../types/script';
import {characterName} from '../writing/model';
import {documentLayout} from './layout';
import {sceneCast} from './model';
import {productionScenes} from './queries';
import {portablePrintHtml, printHtml} from './print';

export interface CharacterSides {
  names: string[]; sceneIds: string[]; paragraphIds: string[]; pageLabels: string[]; text: string;
}

/** Whole-scene sides retain original paper geometry and production page labels.
 * Scene membership is explicit, including non-speaking cast, never an action-text guess. */
export function characterSides(doc: ScriptDocument, characters: string[], includeNonSpeaking = true): CharacterSides {
  const names = [...new Set(characters.map(value => characterName(doc.characterMemory?.find(c => c.id === value)?.name || value)).filter(Boolean))];
  if (!names.length) throw Error('Choose at least one character for the sides.');
  const selected = new Set(names);
  const sceneIds = productionScenes(doc).filter(scene => !scene.omitted && sceneCast(doc, scene.id).some(c => selected.has(characterName(c.name)) && (includeNonSpeaking || c.speaking))).map(scene => scene.id);
  const scenes = new Set(sceneIds), paragraphIds: string[] = []; let scene = '';
  for (const p of doc.paragraphs) { if (p.type === 'Scene Heading') scene = p.id; if (scenes.has(scene)) paragraphIds.push(p.id); }
  const ids = new Set(paragraphIds), layout = documentLayout(doc);
  const pageLabels = layout.pages.filter(page => page.fragments.some(f => ids.has(f.paragraphId))).map(page => page.pageLabel);
  const text = names.join(', ') + ' — CHARACTER SIDES\n' + doc.titlePage.title + '\n\n' + doc.paragraphs.filter(p => ids.has(p.id)).map(p => (p.type === 'Scene Heading' ? `[Scene ${p.sceneNumber || productionScenes(doc).find(s => s.id === p.id)?.number || ''}; page ${(layout.paragraphPages.get(p.id) || []).join(', ')}]\n` : '') + p.text).join('\n\n');
  return {names, sceneIds, paragraphIds, pageLabels, text};
}

export function characterSidesHtml(doc: ScriptDocument, sides: CharacterSides): string {
  if (!sides.pageLabels.length) throw Error('No non-omitted scenes match the selected cast.');
  return printHtml(doc, {paragraphIds: sides.paragraphIds, pageRange: sides.pageLabels.join(','), includeTitlePage: false});
}

export function portableCharacterSides(doc: ScriptDocument, sides: CharacterSides): Promise<string> {
  if (!sides.pageLabels.length) throw Error('No non-omitted scenes match the selected cast.');
  return portablePrintHtml(doc, {paragraphIds: sides.paragraphIds, pageRange: sides.pageLabels.join(','), includeTitlePage: false});
}
