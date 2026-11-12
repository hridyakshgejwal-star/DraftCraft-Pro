import {documentLayout} from '../production/layout';
import {productionScenes} from '../production/queries';
import {sceneCast,studio,migrateStudio} from '../production/model';
import {blankDocument} from '../files/model';
import {CharacterIndex,characterName} from '../writing/model';
import type {ScriptDocument} from '../types/script';
import { Paragraph, ElementType } from '../types/script';
import { paginateScript, estimateParagraphLines, LINES_PER_PAGE } from './pagination';

function reportDocument(paragraphs:Paragraph[],doc?:ScriptDocument){return doc||migrateStudio(new CharacterIndex().reconcile({...blankDocument(),paragraphs}));}
// --- Types for Report Generation (Part 10) ---

export interface SceneReportItem {
  sceneNumber: string;
  heading: string;
  setting: 'INT' | 'EXT' | 'INT/EXT';
  location: string;
  timeOfDay: string;
  startPage: number;
  endPage: number;
  lengthEighths: number; // e.g. 8 = 1 full page, 4 = 1/2 page
  lengthFormatted: string; // e.g. "1 3/8 pgs" or "5/8 pg"
  characters: string[];
  tags: string[];
  omitted: boolean;
  notesCount: number;
}

export interface LocationReportItem {
  locationName: string;
  totalScenes: number;
  intCount: number;
  extCount: number;
  dayCount: number;
  nightCount: number;
  otherTimeCount: number;
  totalEighths: number;
  totalLengthFormatted: string;
  scenes: { sceneNumber: string; heading: string; page: number; lengthFormatted: string }[];
}

export interface CharacterDialogueLine {
  sceneNumber: string;
  sceneHeading: string;
  page: number;
  dialogueText: string;
  wordCount: number;
  parenthetical?: string;
  characterExtension?: string;
}

export interface MonologueItem {
  sceneNumber: string;
  sceneHeading: string;
  page: number;
  wordCount: number;
  excerpt: string;
}

export interface CharacterReportItem {
  characterName: string;
  sceneCount: number;
  scenes: { sceneNumber: string; heading: string; page: number }[];
  dialogueCount: number;
  totalWords: number;
  speechPercentage: number;
  extensions: Record<string, number>; // e.g. { "(V.O.)": 2, "(O.S.)": 1, "(CONT'D)": 3 }
  parentheticals: Record<string, number>;
  monologues: MonologueItem[];
  dialogueLines: CharacterDialogueLine[];
}

export interface CastReportItem {
  characterName: string;
  isSpeaking: boolean;
  totalSpeeches: number;
  totalWords: number;
  speakingScenes: number;
  nonSpeakingScenes: number;
  totalScenes: number;
  firstAppearancePage: number;
  firstSceneNumber: string;
  percentageOfCastDialogue: number;
}

export interface ScriptReportOptions {
  selectedTypes: ElementType[];
  includeSceneNumbers: boolean;
  includeCharacterCues: boolean;
  includeParentheticals: boolean;
  includeNotes: boolean;
  searchFilter?: string;
}

export interface ScriptNoteReportItem {
  id: string;
  title: string;
  author: string;
  category: string;
  color: string;
  createdAt: string;
  text: string;
  sceneNumber: string;
  sceneHeading: string;
  page: number;
  paragraphType: ElementType;
  paragraphSnippet: string;
}

export interface ElementBreakdownItem {
  type: ElementType;
  count: number;
  percentage: number;
  words: number;
  wordsPercentage: number;
}

export interface ProfanityOccurrence {
  word: string;
  severity: 'mild' | 'moderate' | 'strong';
  count: number;
  scenes: string[];
}

export interface StatisticsReportData {
  totalWords: number;
  totalParagraphs: number;
  totalCharacters: number;
  totalScenes: number;
  totalPages: number;
  estimatedRuntimeMinutes: number;
  elementsBreakdown: ElementBreakdownItem[];
  sceneStats: {
    intCount: number;
    extCount: number;
    intExtCount: number;
    dayCount: number;
    nightCount: number;
    otherTimeCount: number;
    averageLengthEighths: number;
    averageLengthFormatted: string;
    longestScene: { number: string; heading: string; lengthFormatted: string; page: number };
    shortestScene: { number: string; heading: string; lengthFormatted: string; page: number };
  };
  dialogueStats: {
    totalSpeeches: number;
    totalDialogueWords: number;
    averageWordsPerSpeech: number;
    monologueCount: number;
    topCharactersByWords: { name: string; words: number; percentage: number }[];
    topCharactersBySpeeches: { name: string; speeches: number; percentage: number }[];
    topCharactersByScenes: { name: string; scenes: number }[];
  };
  profanityStats: {
    totalCount: number;
    occurrences: ProfanityOccurrence[];
    mpaaRatingAssessment: string;
  };
}

export interface TagBySceneItem {
  sceneNumber: string;
  heading: string;
  page: number;
  tagsByCategory: Record<string, string[]>;
  allTags: string[];
}

export interface TagByTagItem {
  tagName: string;
  category: string;
  totalOccurrences: number;
  scenes: { sceneNumber: string; heading: string; page: number }[];
}

// Format 1/8th of a page standard: 8 eighths = 1 page
export function formatEighths(eighths: number): string {
  if (eighths <= 0) return '0 pgs';
  const pages = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  if (pages === 0) {
    return `${remainder || 1}/8 pg`;
  }
  if (remainder === 0) {
    return `${pages} pg${pages > 1 ? 's' : ''}`;
  }
  return `${pages} ${remainder}/8 pgs`;
}

// Categorize raw tag string like "Prop: Gun" or "VFX: Explosion"
export function parseTagCategory(tag: string): { category: string; item: string } {
  if (tag.includes(':')) {
    const parts = tag.split(':');
    return {
      category: parts[0].trim(),
      item: parts.slice(1).join(':').trim(),
    };
  }
  // Guess category
  const lower = tag.toLowerCase();
  if (lower.includes('prop') || lower.includes('gun') || lower.includes('case') || lower.includes('spectrometer')) return { category: 'Props', item: tag };
  if (lower.includes('vfx') || lower.includes('hologram') || lower.includes('beam')) return { category: 'VFX', item: tag };
  if (lower.includes('sfx') || lower.includes('rain') || lower.includes('pump') || lower.includes('siren')) return { category: 'SFX', item: tag };
  if (lower.includes('suit') || lower.includes('coat') || lower.includes('wardrobe')) return { category: 'Wardrobe', item: tag };
  if (lower.includes('car') || lower.includes('train') || lower.includes('monorail') || lower.includes('vehicle')) return { category: 'Vehicles', item: tag };
  if (lower.includes('stunt') || lower.includes('rig') || lower.includes('jump')) return { category: 'Stunts', item: tag };
  if (lower.includes('camera') || lower.includes('lens') || lower.includes('drone')) return { category: 'Camera', item: tag };
  return { category: 'General', item: tag };
}

// --- REPORT GENERATORS ---

/**
 * 10.1 Scene Report
 */
export function generateSceneReport(paragraphs:Paragraph[],document?:ScriptDocument):SceneReportItem[]{
 const doc=reportDocument(paragraphs,document),layout=documentLayout(doc);return productionScenes(doc).map(scene=>{
  const heading=scene.heading,match=heading.match(/^(INT\.?\s*\/\s*EXT\.?|INT\/EXT\.?|INT\.|EXT\.|I\/E\.)\s*(.*)$/i),body=match?.[2]||heading,split=body.lastIndexOf(doc.writingFormat?.sceneSeparator||' - '),separator=doc.writingFormat?.sceneSeparator||' - ';
  return {sceneNumber:scene.number,heading,setting:/EXT.*INT|INT.*EXT|I\/E/i.test(match?.[1]||'')?'INT/EXT':/^EXT/i.test(match?.[1]||'')?'EXT':'INT',location:split<0?body:body.slice(0,split),timeOfDay:split<0?'':body.slice(split+separator.length),startPage:layout.pages.findIndex(p=>p.pageLabel===scene.pages[0])+1,endPage:layout.pages.findIndex(p=>p.pageLabel===scene.pages.at(-1))+1,lengthEighths:scene.eighths,lengthFormatted:scene.omitted?'Omitted':formatEighths(scene.eighths),characters:scene.characters,tags:scene.tags,omitted:scene.omitted,notesCount:scene.notes};
 });
}

/**
 * 10.2 Location Report
 */
export function generateLocationReport(paragraphs: Paragraph[],document?:ScriptDocument): LocationReportItem[] {
  const sceneReport = generateSceneReport(paragraphs,document);
  const locMap: Record<string, LocationReportItem> = {};

  sceneReport.forEach((s) => {
    const loc = s.location || 'UNKNOWN LOCATION';
    if (!locMap[loc]) {
      locMap[loc] = {
        locationName: loc,
        totalScenes: 0,
        intCount: 0,
        extCount: 0,
        dayCount: 0,
        nightCount: 0,
        otherTimeCount: 0,
        totalEighths: 0,
        totalLengthFormatted: '0 pgs',
        scenes: [],
      };
    }

    const item = locMap[loc];
    item.totalScenes++;
    if (s.setting === 'INT') item.intCount++;
    else if (s.setting === 'EXT') item.extCount++;

    const tod = s.timeOfDay.toUpperCase();
    if (tod.includes('DAY') || tod.includes('MORNING') || tod.includes('AFTERNOON')) item.dayCount++;
    else if (tod.includes('NIGHT') || tod.includes('EVENING') || tod.includes('DUSK')) item.nightCount++;
    else item.otherTimeCount++;

    item.totalEighths += s.lengthEighths;
    item.scenes.push({
      sceneNumber: s.sceneNumber,
      heading: s.heading,
      page: s.startPage,
      lengthFormatted: s.lengthFormatted,
    });
  });

  const list = Object.values(locMap).map((l) => ({
    ...l,
    totalLengthFormatted: formatEighths(l.totalEighths),
  }));

  // Sort by occurrence descending
  return list.sort((a, b) => b.totalScenes - a.totalScenes);
}

/**
 * 10.3 Character Report
 */
export function generateCharacterReport(paragraphs: Paragraph[],document?:ScriptDocument): CharacterReportItem[] {
  const reportDoc=reportDocument(paragraphs,document),pages=documentLayout(reportDoc).pages,sceneNumbers=new Map(productionScenes(reportDoc).map(scene=>[scene.id,scene.number]));
  const charMap: Record<string, CharacterReportItem> = {};

  let currentSceneNumber = '1';
  let currentSceneHeading = 'PROLOGUE';
  let currentCharacter = '';
  let currentExtension = '';
  let currentParenthetical = '';
  let omittedScene=false;

  paragraphs.forEach((p) => {
    if(p.type==='Scene Heading')omittedScene=!!p.omitted;if(omittedScene)return;
    // Find page of paragraph
    let pageNum = 1;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].paragraphs.some((x) => x.id === p.id)) {
        pageNum = pages[i].pageNumber;
        break;
      }
    }

    if (p.type === 'Scene Heading') {
      currentSceneNumber = p.sceneNumber || sceneNumbers.get(p.id) || currentSceneNumber;
      currentSceneHeading = p.text;
      currentCharacter = '';
      currentExtension = '';
      currentParenthetical = '';
    } else if (p.type === 'Character') {
      const matchExt = p.text.match(/\((.*?)\)/);
      currentExtension = matchExt ? `(${matchExt[1]})` : (p.characterExtension || '');
      const rawName = characterName(p.text);

      if (rawName) {
        currentCharacter = rawName;
        if (!charMap[rawName]) {
          charMap[rawName] = {
            characterName: rawName,
            sceneCount: 0,
            scenes: [],
            dialogueCount: 0,
            totalWords: 0,
            speechPercentage: 0,
            extensions: {},
            parentheticals: {},
            monologues: [],
            dialogueLines: [],
          };
        }

        const entry = charMap[rawName];
        if (!entry.scenes.some((s) => s.sceneNumber === currentSceneNumber)) {
          entry.scenes.push({
            sceneNumber: currentSceneNumber,
            heading: currentSceneHeading,
            page: pageNum,
          });
          entry.sceneCount = entry.scenes.length;
        }

        if (currentExtension) {
          entry.extensions[currentExtension] = (entry.extensions[currentExtension] || 0) + 1;
        }
      }
      currentParenthetical = '';
    } else if (p.type === 'Parenthetical') {
      currentParenthetical = p.text.trim();
      if (currentCharacter && charMap[currentCharacter]) {
        const entry = charMap[currentCharacter];
        entry.parentheticals[currentParenthetical] = (entry.parentheticals[currentParenthetical] || 0) + 1;
      }
    } else if (['Dialogue','Dual Dialogue'].includes(p.type) && currentCharacter && charMap[currentCharacter]) {
      const entry = charMap[currentCharacter];
      const words = p.text.split(/\s+/).filter(Boolean).length;

      entry.dialogueCount++;
      entry.totalWords += words;

      entry.dialogueLines.push({
        sceneNumber: currentSceneNumber,
        sceneHeading: currentSceneHeading,
        page: pageNum,
        dialogueText: p.text,
        wordCount: words,
        parenthetical: currentParenthetical,
        characterExtension: currentExtension,
      });

      // Monologue: speech with 40 or more words
      if (words >= 40) {
        entry.monologues.push({
          sceneNumber: currentSceneNumber,
          sceneHeading: currentSceneHeading,
          page: pageNum,
          wordCount: words,
          excerpt: p.text.slice(0, 100) + (p.text.length > 100 ? '...' : ''),
        });
      }

      // Reset parenthetical
      currentParenthetical = '';
    }
  });

  const totalAllWords = Object.values(charMap).reduce((acc, c) => acc + c.totalWords, 0);

  const result = Object.values(charMap).map((c) => ({
    ...c,
    speechPercentage: totalAllWords > 0 ? Math.round((c.totalWords / totalAllWords) * 100) : 0,
  }));

  // Sort by spoken words descending
  return result.sort((a, b) => b.totalWords - a.totalWords);
}

/**
 * 10.4 Cast Report
 */
export function generateCastReport(paragraphs: Paragraph[],document?:ScriptDocument): CastReportItem[] {
  const charReports = generateCharacterReport(paragraphs,document);
  const sceneReports = generateSceneReport(paragraphs,document);
  const reportDoc=reportDocument(paragraphs,document),pages=documentLayout(reportDoc).pages,sceneNumbers=new Map(productionScenes(reportDoc).map(scene=>[scene.id,scene.number]));

  // Collect any non-speaking characters mentioned in Action or character list
  const allCharacters = new Map<string, CastReportItem>();

  charReports.forEach((c) => {
    allCharacters.set(c.characterName, {
      characterName: c.characterName,
      isSpeaking: c.dialogueCount > 0,
      totalSpeeches: c.dialogueCount,
      totalWords: c.totalWords,
      speakingScenes: c.sceneCount,
      nonSpeakingScenes: 0,
      totalScenes: c.sceneCount,
      firstAppearancePage: c.scenes[0]?.page || 1,
      firstSceneNumber: c.scenes[0]?.sceneNumber || '1',
      percentageOfCastDialogue: c.speechPercentage,
    });
  });

  const doc=reportDocument(paragraphs,document);for(const scene of productionScenes(doc).filter(scene=>!scene.omitted))for(const character of sceneCast(doc,scene.id)){
    let entry=allCharacters.get(character.name);if(!entry){entry={characterName:character.name,isSpeaking:false,totalSpeeches:0,totalWords:0,speakingScenes:0,nonSpeakingScenes:0,totalScenes:0,firstAppearancePage:pages.findIndex(p=>p.pageLabel===scene.pages[0])+1,firstSceneNumber:scene.number,percentageOfCastDialogue:0};allCharacters.set(character.name,entry);}if(!character.speaking)entry.nonSpeakingScenes++;entry.totalScenes=entry.speakingScenes+entry.nonSpeakingScenes;
  }

  return Array.from(allCharacters.values()).sort((a, b) => {
    if (a.isSpeaking && !b.isSpeaking) return -1;
    if (!a.isSpeaking && b.isSpeaking) return 1;
    return b.totalSpeeches - a.totalSpeeches;
  });
}

/**
 * 10.5 Script Report (Document containing selected elements)
 */
export function generateScriptReport(
  paragraphs: Paragraph[],
  options: ScriptReportOptions
): { filteredParagraphs: Paragraph[]; totalCount: number; totalWords: number } {
  const filtered = paragraphs.filter((p) => {
    if (!options.selectedTypes.includes(p.type)) return false;
    if (options.searchFilter && options.searchFilter.trim()) {
      const q = options.searchFilter.toLowerCase();
      return p.text.toLowerCase().includes(q);
    }
    return true;
  });

  const totalWords = filtered.reduce(
    (acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length,
    0
  );

  return {
    filteredParagraphs: filtered,
    totalCount: filtered.length,
    totalWords,
  };
}

/**
 * 10.6 ScriptNote Report
 */
export function generateScriptNoteReport(paragraphs: Paragraph[],document?:ScriptDocument): ScriptNoteReportItem[] {
  const reportDoc=reportDocument(paragraphs,document),pages=documentLayout(reportDoc).pages,sceneNumbers=new Map(productionScenes(reportDoc).map(scene=>[scene.id,scene.number]));
  const items: ScriptNoteReportItem[] = [];

  let currentSceneNumber = '1';
  let currentSceneHeading = 'PROLOGUE';

  paragraphs.forEach((p) => {
    // Find page of paragraph
    let pageNum = 1;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].paragraphs.some((x) => x.id === p.id)) {
        pageNum = pages[i].pageNumber;
        break;
      }
    }

    if (p.type === 'Scene Heading') {
      currentSceneNumber = p.sceneNumber || sceneNumbers.get(p.id) || currentSceneNumber;
      currentSceneHeading = p.text;
    }

    if (p.notes && p.notes.length > 0) {
      p.notes.forEach((n) => {
        items.push({
          id: n.id,
          title: n.name || 'Untitled ScriptNote',
          author: n.author || 'Author',
          category: n.category ? n.category.toUpperCase() : 'GENERAL',
          color: n.color || 'yellow',
          createdAt: n.createdAt || 'Draft',
          text: n.text,
          sceneNumber: currentSceneNumber,
          sceneHeading: currentSceneHeading,
          page: pageNum,
          paragraphType: p.type,
          paragraphSnippet: p.text.slice(0, 80) + (p.text.length > 80 ? '...' : ''),
        });
      });
    }
  });

  return items;
}

/**
 * 10.7 Statistics Report (Elements breakdown, Scene stats, Dialogue stats, Profanity audit)
 */
export function generateStatisticsReport(paragraphs: Paragraph[],document?:ScriptDocument): StatisticsReportData {
  const reportDoc=reportDocument(paragraphs,document),pages=documentLayout(reportDoc).pages,sceneNumbers=new Map(productionScenes(reportDoc).map(scene=>[scene.id,scene.number]));
  const sceneItems = generateSceneReport(paragraphs,document);
  const charItems = generateCharacterReport(paragraphs,document);

  const totalWords = paragraphs.reduce(
    (acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length,
    0
  );
  const totalParagraphs = paragraphs.length;
  const totalCharacters = charItems.length;
  const totalScenes = sceneItems.length;
  const totalPages = pages.length;
  const estimatedRuntimeMinutes = totalPages;

  // Element breakdown
  const elementCounts: Partial<Record<ElementType, { count: number; words: number }>> = {};
  paragraphs.forEach((p) => {
    const w = p.text.split(/\s+/).filter(Boolean).length;
    if (!elementCounts[p.type]) {
      elementCounts[p.type] = { count: 0, words: 0 };
    }
    elementCounts[p.type]!.count++;
    elementCounts[p.type]!.words += w;
  });

  const elementsBreakdown: ElementBreakdownItem[] = Object.entries(elementCounts).map(
    ([type, data]) => ({
      type: type as ElementType,
      count: data.count,
      percentage: totalParagraphs > 0 ? Math.round((data.count / totalParagraphs) * 100) : 0,
      words: data.words,
      wordsPercentage: totalWords > 0 ? Math.round((data.words / totalWords) * 100) : 0,
    })
  ).sort((a, b) => b.count - a.count);

  // Scene Stats
  let intCount = 0;
  let extCount = 0;
  let intExtCount = 0;
  let dayCount = 0;
  let nightCount = 0;
  let otherTimeCount = 0;
  let totalEighths = 0;

  let longestScene = { number: '1', heading: '', lengthFormatted: '1/8 pg', page: 1, eighths: 0 };
  let shortestScene = { number: '1', heading: '', lengthFormatted: '8 pgs', page: 1, eighths: 9999 };

  sceneItems.forEach((s) => {
    if (s.setting === 'INT') intCount++;
    else if (s.setting === 'EXT') extCount++;
    else intExtCount++;

    const tod = s.timeOfDay.toUpperCase();
    if (tod.includes('DAY') || tod.includes('MORNING')) dayCount++;
    else if (tod.includes('NIGHT') || tod.includes('EVENING') || tod.includes('DUSK')) nightCount++;
    else otherTimeCount++;

    totalEighths += s.lengthEighths;

    if (s.lengthEighths > longestScene.eighths) {
      longestScene = {
        number: s.sceneNumber,
        heading: s.heading,
        lengthFormatted: s.lengthFormatted,
        page: s.startPage,
        eighths: s.lengthEighths,
      };
    }

    if (s.lengthEighths < shortestScene.eighths) {
      shortestScene = {
        number: s.sceneNumber,
        heading: s.heading,
        lengthFormatted: s.lengthFormatted,
        page: s.startPage,
        eighths: s.lengthEighths,
      };
    }
  });

  const averageLengthEighths = totalScenes > 0 ? Math.round(totalEighths / totalScenes) : 0;
  const averageLengthFormatted = formatEighths(averageLengthEighths);

  // Dialogue Stats
  const totalSpeeches = charItems.reduce((acc, c) => acc + c.dialogueCount, 0);
  const totalDialogueWords = charItems.reduce((acc, c) => acc + c.totalWords, 0);
  const averageWordsPerSpeech = totalSpeeches > 0 ? Math.round(totalDialogueWords / totalSpeeches) : 0;
  const monologueCount = charItems.reduce((acc, c) => acc + c.monologues.length, 0);

  const topCharactersByWords = charItems.slice(0, 5).map((c) => ({
    name: c.characterName,
    words: c.totalWords,
    percentage: c.speechPercentage,
  }));

  const topCharactersBySpeeches = [...charItems]
    .sort((a, b) => b.dialogueCount - a.dialogueCount)
    .slice(0, 5)
    .map((c) => ({
      name: c.characterName,
      speeches: c.dialogueCount,
      percentage: totalSpeeches > 0 ? Math.round((c.dialogueCount / totalSpeeches) * 100) : 0,
    }));

  const topCharactersByScenes = [...charItems]
    .sort((a, b) => b.sceneCount - a.sceneCount)
    .slice(0, 5)
    .map((c) => ({
      name: c.characterName,
      scenes: c.sceneCount,
    }));

  // Profanity & Content Analysis (MPAA / BBFC standard screenplay breakdown)
  const profanityWordList: { word: string; severity: 'mild' | 'moderate' | 'strong'; regex: RegExp }[] = [
    { word: 'damn', severity: 'mild', regex: /\bdamn\b/i },
    { word: 'hell', severity: 'mild', regex: /\bhell\b/i },
    { word: 'crap', severity: 'mild', regex: /\bcrap\b/i },
    { word: 'bastard', severity: 'moderate', regex: /\bbastard\b/i },
    { word: 'bitch', severity: 'moderate', regex: /\bbitch\b/i },
    { word: 'asshole', severity: 'moderate', regex: /\basshole\b/i },
    { word: 'shit', severity: 'moderate', regex: /\bshit\b/i },
    { word: 'fuck', severity: 'strong', regex: /\bfuck\b/i },
    { word: 'fucking', severity: 'strong', regex: /\bfucking\b/i },
  ];

  const profanityOccurrences: Record<string, { word: string; severity: 'mild' | 'moderate' | 'strong'; count: number; scenes: Set<string> }> = {};

  let currentSceneNum = '1';
  paragraphs.forEach((p) => {
    if (p.type === 'Scene Heading') {
      currentSceneNum = p.sceneNumber || currentSceneNum;
    }
    profanityWordList.forEach(({ word, severity, regex }) => {
      const matches = p.text.match(new RegExp(regex.source, 'gi'));
      if (matches && matches.length > 0) {
        if (!profanityOccurrences[word]) {
          profanityOccurrences[word] = { word, severity, count: 0, scenes: new Set() };
        }
        profanityOccurrences[word].count += matches.length;
        profanityOccurrences[word].scenes.add(currentSceneNum);
      }
    });
  });

  const profanityList: ProfanityOccurrence[] = Object.values(profanityOccurrences).map((item) => ({
    word: item.word,
    severity: item.severity,
    count: item.count,
    scenes: Array.from(item.scenes),
  }));

  const totalProfanityCount = profanityList.reduce((acc, p) => acc + p.count, 0);
  const strongCount = profanityList.filter((p) => p.severity === 'strong').reduce((a, b) => a + b.count, 0);

  let mpaaRating = 'Likely PG / PG-13 (Clean dialogue)';
  if (strongCount > 1) {
    mpaaRating = 'Likely R (Multiple strong profanity usages)';
  } else if (strongCount === 1) {
    mpaaRating = 'Likely PG-13 (Single non-sexual strong profanity)';
  } else if (totalProfanityCount > 5) {
    mpaaRating = 'Likely PG-13 (Moderate mild/moderate profanity)';
  }

  return {
    totalWords,
    totalParagraphs,
    totalCharacters,
    totalScenes,
    totalPages,
    estimatedRuntimeMinutes,
    elementsBreakdown,
    sceneStats: {
      intCount,
      extCount,
      intExtCount,
      dayCount,
      nightCount,
      otherTimeCount,
      averageLengthEighths,
      averageLengthFormatted,
      longestScene: {
        number: longestScene.number,
        heading: longestScene.heading || 'Scene 1',
        lengthFormatted: longestScene.lengthFormatted,
        page: longestScene.page,
      },
      shortestScene: {
        number: shortestScene.number,
        heading: shortestScene.heading || 'Scene 1',
        lengthFormatted: shortestScene.lengthFormatted,
        page: shortestScene.page,
      },
    },
    dialogueStats: {
      totalSpeeches,
      totalDialogueWords,
      averageWordsPerSpeech,
      monologueCount,
      topCharactersByWords,
      topCharactersBySpeeches,
      topCharactersByScenes,
    },
    profanityStats: {
      totalCount: totalProfanityCount,
      occurrences: profanityList,
      mpaaRatingAssessment: mpaaRating,
    },
  };
}

/**
 * 10.8 Tag Reports: Tags by Scene & Tags by Tag
 */
export function generateTagReports(paragraphs:Paragraph[],document?:ScriptDocument):{tagsByScene:TagBySceneItem[];tagsByTag:TagByTagItem[]}{
 const doc=reportDocument(paragraphs,document),scenes=productionScenes(doc),layout=documentLayout(doc),state=studio(doc);const tagsByScene=scenes.map(scene=>{const tags=state.tags.filter(t=>scene.tags.includes(t.name)),tagsByCategory:Record<string,string[]>={};for(const tag of tags)(tagsByCategory[tag.category]||=[]).push(tag.name);return {sceneNumber:scene.number,heading:scene.heading,page:layout.pages.findIndex(p=>p.pageLabel===scene.pages[0])+1,tagsByCategory,allTags:tags.map(t=>t.name)};});
 const tagsByTag=state.tags.map(tag=>{const occurrences=state.occurrences.filter(o=>!o.deleted&&o.tagId===tag.id);return {tagName:tag.name,category:tag.category,totalOccurrences:new Set(occurrences.map(o=>o.rangeId||o.id)).size,scenes:scenes.filter(scene=>scene.tags.includes(tag.name)).map(scene=>({sceneNumber:scene.number,heading:scene.heading,page:layout.pages.findIndex(p=>p.pageLabel===scene.pages[0])+1}))};});return {tagsByScene,tagsByTag};
}

// --- FILE EXPORT HELPERS (CSV, TXT, PRINT) ---

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (c: string | number) => {
    const str = `${c ?? ''}`.replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
