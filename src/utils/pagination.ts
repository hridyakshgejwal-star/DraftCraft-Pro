import {layoutScript,type LayoutPage} from '../production/layout';
import { Paragraph, ElementType } from '../types/script';
import {paragraphMeasure,type WritingFormat} from '../formats/model';

export const LINES_PER_PAGE = 54;

export type PageChunk = LayoutPage;

export function estimateParagraphLines(p: Paragraph): number {
  const chars = p.text.length;
  let charsPerLine = 60;

  switch (p.type) {
    case 'Lyrics':
    case 'Dialogue':
      charsPerLine = 35;
      break;
    case 'Dual Dialogue':
      charsPerLine = 28;
      break;
    case 'Parenthetical':
      charsPerLine = 28;
      break;
    case 'Character':
      charsPerLine = 35;
      break;
    case 'Scene Heading':
    case 'Action':
    case 'Shot':
    default:
      charsPerLine = 60;
  }

  const textLines = chars === 0 ? 1 : Math.ceil(chars / charsPerLine);

  let leadingSpacing = 1;
  if (p.type === 'Scene Heading') leadingSpacing = 2;
  if (p.type === 'Parenthetical' || p.type === 'Dialogue') leadingSpacing = 0;

  return textLines + leadingSpacing;
}

export function paginateScript(paragraphs: Paragraph[], lockedPages = false, format?:WritingFormat, state?:import('../production/model').StudioState): PageChunk[] {
  return layoutScript(paragraphs,format,state).pages;
}

// Word counts per paragraph object. Unchanged paragraphs keep their object identity
// between edits, so typing recounts only the edited paragraph; the stored text is
// compared too, so an in-place mutation can never return a stale count.
const wordCounts = new WeakMap<Paragraph, { text: string; count: number }>();
function wordsIn(p: Paragraph) {
  const cached = wordCounts.get(p);
  if (cached && cached.text === p.text) return cached.count;
  const count = p.text.split(/\s+/).filter(Boolean).length;
  wordCounts.set(p, { text: p.text, count });
  return count;
}

export function calculateScriptStats(paragraphs: Paragraph[],layoutPages?:PageChunk[]) {
  const words = paragraphs.reduce((acc, p) => acc + wordsIn(p), 0);
  const characters = new Set<string>();
  const characterLinesCount: Record<string, number> = {};
  const scenes: { index: number; heading: string; number?: string }[] = [];

  let currentCharacter = '';
  paragraphs.forEach((p, idx) => {
    if (p.type === 'Scene Heading') {
      scenes.push({ index: idx, heading: p.text, number: p.sceneNumber });
    } else if (p.type === 'Character') {
      const cleanChar = p.text.replace(/\s*\(.*\)/, '').trim();
      if (cleanChar) {
        characters.add(cleanChar);
        currentCharacter = cleanChar;
        characterLinesCount[cleanChar] = (characterLinesCount[cleanChar] || 0) + 1;
      }
    } else if (p.type === 'Dialogue' && currentCharacter) {
      // counted
    }
  });

  const pages = layoutPages||paginateScript(paragraphs);
  const estimatedScreenMinutes = pages.length; // 1 page = 1 minute standard rule

  return {
    wordCount: words,
    pageCount: pages.length,
    sceneCount: scenes.length,
    characterCount: characters.size,
    characters: Array.from(characters),
    characterLinesCount,
    estimatedScreenMinutes,
    scenes,
  };
}
