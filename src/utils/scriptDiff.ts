import {inferElement} from '../formats/inference';
import {wordEditCounts} from '../editor/wordEdits';
import {cloneDocumentGraph,documentGraphIssues} from '../files/documentGraph.mjs';
import {migrateStudio,studio} from '../production/model';
import {characterName} from '../writing/model';
import {baseFormat,type WritingFormat} from '../formats/model';
import { ScriptDocument, Paragraph, ElementType } from '../types/script';

export type DiffChangeType = 'unchanged' | 'added' | 'deleted' | 'modified';

export interface DiffParagraphChange {
  type: DiffChangeType;
  originalIndex?: number;
  revisedIndex?: number;
  originalParagraph?: Paragraph;
  revisedParagraph?: Paragraph;
  headingContext?: string;
  sceneNumber?: string;
  charDifferences?: {
    addedWords: number;
    deletedWords: number;
  };
}

export interface ScriptComparisonSummary {
  docAId: string;
  docATitle: string;
  docADate: string;
  docBId: string;
  docBTitle: string;
  docBDate: string;
  totalParagraphsA: number;
  totalParagraphsB: number;
  addedCount: number;
  deletedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  addedWords: number;
  deletedWords: number;
  scenesAffected: string[];
}

export interface ScriptComparisonResult {
  summary: ScriptComparisonSummary;
  diffs: DiffParagraphChange[];
  timestamp: string;
}

/**
 * Levenshtein-like line alignment / Myers-inspired diff for screenplay paragraphs
 */
export function compareScriptDocuments(
  docA: ScriptDocument,
  docB: ScriptDocument
): ScriptComparisonResult {
  const pA = docA.paragraphs;
  const pB = docB.paragraphs;

  const diffs: DiffParagraphChange[] = [];
  let addedCount = 0;
  let deletedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;
  let addedWords = 0;
  let deletedWords = 0;
  const scenesAffectedSet = new Set<string>();

  // Build key map or LCS algorithm for matching paragraphs
  // Screenplay paragraphs usually follow sequential scenes and character lines
  const m = pA.length;
  const n = pB.length;

  // For very long documents, LCS matrix can be optimized.
  // We compute similarity matrix or fast greedy matching with lookahead
  let i = 0;
  let j = 0;
  let currentHeading = 'EXT./INT. GENERAL';
  let currentSceneNum = '1';

  while (i < m || j < n) {
    if (i < m && pA[i].type === 'Scene Heading') {
      currentHeading = pA[i].text;
      currentSceneNum = pA[i].sceneNumber || currentSceneNum;
    } else if (j < n && pB[j].type === 'Scene Heading') {
      currentHeading = pB[j].text;
      currentSceneNum = pB[j].sceneNumber || currentSceneNum;
    }

    if (i < m && j < n) {
      const a = pA[i];
      const b = pB[j];

      // Exact match (type & text)
      if (a.type === b.type && a.text.trim() === b.text.trim()) {
        diffs.push({
          type: 'unchanged',
          originalIndex: i,
          revisedIndex: j,
          originalParagraph: a,
          revisedParagraph: b,
          headingContext: currentHeading,
          sceneNumber: currentSceneNum,
        });
        unchangedCount++;
        i++;
        j++;
        continue;
      }

      // Modified match (same type, high textual similarity or same character/scene)
      if (a.type === b.type) {
        const wordsA = a.text.trim().split(/\s+/).filter(Boolean);
        const wordsB = b.text.trim().split(/\s+/).filter(Boolean);
        const {addedWords:wordDiffAdded,deletedWords:wordDiffDel}=wordEditCounts(a.text,b.text);

        // Check if next item matches instead of modifying
        const nextBMatch = j + 1 < n && pB[j + 1].type === a.type && pB[j + 1].text.trim() === a.text.trim();
        const nextAMatch = i + 1 < m && pA[i + 1].type === b.type && pA[i + 1].text.trim() === b.text.trim();

        if (nextBMatch && !nextAMatch) {
          // B has an addition at j
          const bWords = wordsB.length;
          addedWords += bWords;
          addedCount++;
          if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);
          diffs.push({
            type: 'added',
            revisedIndex: j,
            revisedParagraph: b,
            headingContext: currentHeading,
            sceneNumber: currentSceneNum,
            charDifferences: { addedWords: bWords, deletedWords: 0 },
          });
          j++;
          continue;
        }

        if (nextAMatch && !nextBMatch) {
          // A had something deleted at i
          const aWords = wordsA.length;
          deletedWords += aWords;
          deletedCount++;
          if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);
          diffs.push({
            type: 'deleted',
            originalIndex: i,
            originalParagraph: a,
            headingContext: currentHeading,
            sceneNumber: currentSceneNum,
            charDifferences: { addedWords: 0, deletedWords: aWords },
          });
          i++;
          continue;
        }

        // It is a modification of this paragraph
        modifiedCount++;
        addedWords += wordDiffAdded;
        deletedWords += wordDiffDel;
        if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);

        diffs.push({
          type: 'modified',
          originalIndex: i,
          revisedIndex: j,
          originalParagraph: a,
          revisedParagraph: b,
          headingContext: currentHeading,
          sceneNumber: currentSceneNum,
          charDifferences: { addedWords: wordDiffAdded, deletedWords: wordDiffDel },
        });
        i++;
        j++;
        continue;
      }

      // Check lookahead for insertion vs deletion
      let foundInB = -1;
      for (let look = j + 1; look < Math.min(n, j + 6); look++) {
        if (pB[look].type === a.type && pB[look].text.trim() === a.text.trim()) {
          foundInB = look;
          break;
        }
      }

      if (foundInB !== -1) {
        // Elements between j and foundInB were added in B
        const words = b.text.trim().split(/\s+/).filter(Boolean).length;
        addedWords += words;
        addedCount++;
        if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);

        diffs.push({
          type: 'added',
          revisedIndex: j,
          revisedParagraph: b,
          headingContext: currentHeading,
          sceneNumber: currentSceneNum,
          charDifferences: { addedWords: words, deletedWords: 0 },
        });
        j++;
      } else {
        // Element at i was deleted from A
        const words = a.text.trim().split(/\s+/).filter(Boolean).length;
        deletedWords += words;
        deletedCount++;
        if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);

        diffs.push({
          type: 'deleted',
          originalIndex: i,
          originalParagraph: a,
          headingContext: currentHeading,
          sceneNumber: currentSceneNum,
          charDifferences: { addedWords: 0, deletedWords: words },
        });
        i++;
      }
    } else if (i < m) {
      // Remaining elements in A are deleted
      const a = pA[i];
      const words = a.text.trim().split(/\s+/).filter(Boolean).length;
      deletedWords += words;
      deletedCount++;
      if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);

      diffs.push({
        type: 'deleted',
        originalIndex: i,
        originalParagraph: a,
        headingContext: currentHeading,
        sceneNumber: currentSceneNum,
        charDifferences: { addedWords: 0, deletedWords: words },
      });
      i++;
    } else if (j < n) {
      // Remaining elements in B are added
      const b = pB[j];
      const words = b.text.trim().split(/\s+/).filter(Boolean).length;
      addedWords += words;
      addedCount++;
      if (currentSceneNum) scenesAffectedSet.add(currentSceneNum);

      diffs.push({
        type: 'added',
        revisedIndex: j,
        revisedParagraph: b,
        headingContext: currentHeading,
        sceneNumber: currentSceneNum,
        charDifferences: { addedWords: words, deletedWords: 0 },
      });
      j++;
    }
  }

  return {
    summary: {
      docAId: docA.id,
      docATitle: docA.titlePage.title || 'Draft A',
      docADate: docA.titlePage.draftDate || docA.lastSavedAt,
      docBId: docB.id,
      docBTitle: docB.titlePage.title || 'Draft B',
      docBDate: docB.titlePage.draftDate || docB.lastSavedAt,
      totalParagraphsA: m,
      totalParagraphsB: n,
      addedCount,
      deletedCount,
      modifiedCount,
      unchangedCount,
      addedWords,
      deletedWords,
      scenesAffected: Array.from(scenesAffectedSet),
    },
    diffs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a combined script from two documents (Combine screenplay files)
 * Offers options:
 * - Append Document B to Document A
 * - Interleave / Merge based on scene numbers
 * - Replace scenes from A with matching scenes from B
 */
export type CombineMode = 'append' | 'merge-by-scene' | 'insert-at-cursor';

export function combineScreenplayDocuments(baseDoc:ScriptDocument,sourceDoc:ScriptDocument,mode:CombineMode='append',insertIndex?:number):ScriptDocument{
 if(mode==='insert-at-cursor'&&!Number.isInteger(insertIndex))throw Error('Select an insertion element before opening Combine.');const base=migrateStudio(baseDoc),source=migrateStudio(sourceDoc),bs=studio(base),ss=studio(source);
 if(ss.pageLocks.length||mode==='merge-by-scene'&&bs.pageLocks.length)throw Error('These production page-lock schedules cannot be merged safely. Make an explicitly unlocked working copy first; no data was discarded.');const locked=new Set(base.paragraphs.filter(p=>p.lockedScene).map(p=>p.sceneNumber));if(source.paragraphs.some(p=>p.lockedScene&&locked.has(p.sceneNumber)))throw Error('Locked scene numbers collide. Resolve them in a working copy before combining.');
 const characterIds=Object.fromEntries((source.characterMemory||[]).flatMap(c=>{const target=base.characterMemory?.find(b=>characterName(b.name)===characterName(c.name));return target?[[c.id,target.id]]:[]})),paragraphIds=mode==='merge-by-scene'?Object.fromEntries(source.paragraphs.filter(p=>p.type==='Scene Heading'&&p.sceneNumber).flatMap(p=>{const match=base.paragraphs.find(b=>b.type==='Scene Heading'&&b.sceneNumber===p.sceneNumber);return match?[[p.id,match.id]]:[]})):{};
 const imported=cloneDocumentGraph(source,{id:base.id,characterIds,paragraphIds}).document as ScriptDocument;let paragraphs=[...base.paragraphs];
 if(mode==='append')paragraphs.push(...imported.paragraphs);else if(mode==='insert-at-cursor')paragraphs.splice(Math.max(0,Math.min(paragraphs.length,insertIndex!)),0,...imported.paragraphs);else{const scenes=(items:Paragraph[])=>{const result:{number:string;paragraphs:Paragraph[]}[]=[];for(const p of items){if(p.type==='Scene Heading'||!result.length)result.push({number:p.type==='Scene Heading'?p.sceneNumber||'':'',paragraphs:[]});result.at(-1)!.paragraphs.push(p);}return result;};const from=scenes(imported.paragraphs),to=scenes(base.paragraphs);for(const list of [from,to]){const numbers=list.filter(s=>s.number).map(s=>s.number);if(new Set(numbers).size!==numbers.length)throw Error('Duplicate scene numbers need explicit resolution before merging.');}const used=new Set<typeof from[number]>();paragraphs=to.flatMap(scene=>{const replacement=scene.number&&from.find(s=>s.number===scene.number);if(!replacement)return scene.paragraphs;used.add(replacement);return replacement.paragraphs;});paragraphs.push(...from.filter(scene=>!used.has(scene)).flatMap(scene=>scene.paragraphs));}
 const is=studio(imported),existing=new Set((base.characterMemory||[]).map(c=>c.id)),nextStudio={...bs};for(const key of ['assets','tags','occurrences','revisionSets','navigator','macros','titleImages'] as const)(nextStudio[key] as unknown[])=[...bs[key],...is[key]];nextStudio.track={...bs.track,changes:[...bs.track.changes,...is.track.changes]};nextStudio.castMembership=Object.fromEntries([...new Set([...Object.keys(bs.castMembership),...Object.keys(is.castMembership)])].map(id=>[id,[...new Set([...(bs.castMembership[id]||[]),...(is.castMembership[id]||[])])]]));nextStudio.customCastOrder=[...new Set([...bs.customCastOrder,...is.customCastOrder])];
 const result:ScriptDocument={...base,paragraphs,studio:nextStudio,combinedSources:[...(base.combinedSources||[]),...(imported.combinedSources||[]),{sourceId:source.id,metadata:{titlePage:imported.titlePage,writingFormat:imported.writingFormat,headerFooterConfig:imported.headerFooterConfig,storyStructure:imported.storyStructure,smartType:imported.smartType,writingAssistance:imported.writingAssistance,tableRead:imported.tableRead,importReport:imported.importReport}}],characterMemory:[...(base.characterMemory||[]).map(c=>{const from=imported.characterMemory?.find(v=>v.id===c.id);return from?{...c,aliases:[...new Set([...c.aliases,...from.aliases])],paragraphIds:[...new Set([...c.paragraphIds,...from.paragraphIds])]}:c;}),...(imported.characterMemory||[]).filter(c=>!existing.has(c.id))],characterShortcuts:{...imported.characterShortcuts,...base.characterShortcuts},characterHighlightMap:{...imported.characterHighlightMap,...base.characterHighlightMap},characterVoiceMap:{...imported.characterVoiceMap,...base.characterVoiceMap},beats:[...base.beats,...imported.beats],flowLines:[...base.flowLines,...imported.flowLines],outlineLanes:[...base.outlineLanes,...imported.outlineLanes],outlineMarkers:[...base.outlineMarkers,...imported.outlineMarkers],tableRead:base.tableRead?{...base.tableRead,performances:{...imported.tableRead?.performances,...base.tableRead.performances},pronunciations:[...new Map([...(imported.tableRead?.pronunciations||[]),...base.tableRead.pronunciations].map(p=>[p.term,p])).values()],cast:[...base.tableRead.cast.map(c=>{const from=imported.tableRead?.cast.find(v=>v.id===c.id);return from?{...c,voices:{...from.voices,...c.voices},aliases:[...new Set([...c.aliases,...from.aliases])],cueIds:[...new Set([...c.cueIds,...from.cueIds])]}:c;}),...(imported.tableRead?.cast||[]).filter(c=>!base.tableRead!.cast.some(b=>b.id===c.id))]}:imported.tableRead,lastSavedAt:new Date().toISOString()};
 const valid=new Set(paragraphs.map(p=>p.id));result.studio!.occurrences=result.studio!.occurrences.map(o=>valid.has(o.paragraphId)?o:{...o,deleted:true});result.beats=result.beats.map(b=>b.sceneId&&!valid.has(b.sceneId)?{...b,sceneId:undefined}:b);result.studio!.castMembership=Object.fromEntries(Object.entries(result.studio!.castMembership).filter(([id])=>valid.has(id)));const issues=documentGraphIssues(result);if(issues.length)throw Error('Combine needs reference repair: '+issues.join('; '));return result;
}
export function reformatImportedText(rawText:string,format:WritingFormat=baseFormat(),names:Set<string>=new Set()):Paragraph[]{const result:Paragraph[]=[];let speech=false;for(const line of rawText.replace(/\r\n?/g,'\n').split('\n')){const text=line.trim();if(!text){speech=false;continue;}const paragraph:Paragraph={id:'reformat-'+crypto.randomUUID(),type:format.kind==='prose'||format.kind==='structure'?'General':'Action',text},inferred=inferElement(text,paragraph,result.at(-1),format,names);if(inferred?.confident||inferred?.type==='Character'&&names.has(characterName(text)))paragraph.type=inferred.type;else if(speech)paragraph.type=/^\([^\n]*\)$/.test(text)?'Parenthetical':'Dialogue';else if(inferred)paragraph.conversionReview=inferred.reason+' — preserved as '+paragraph.type+'; choose explicitly in review.';paragraph.runs=[{text}];result.push(paragraph);speech=['Character','Dialogue','Parenthetical'].includes(paragraph.type);}return result;}
