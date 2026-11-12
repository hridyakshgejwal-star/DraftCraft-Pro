import type { ElementType } from '../types/script';
export interface EditorPreferences {smoothCursor:boolean;cursorSpeed:number;cursorStyle:'ease-out'|'spring'|'linear';cursorBlink:boolean;smoothBlink:boolean;blinkInterval:number;cursorAppearance:'line'|'wide';typingAnimation:boolean;autoCapitalize:boolean;autoSceneHeadings:boolean;autoParentheticals:boolean;autoTransitions:boolean;respectFormatting:boolean;preserveManualCase:boolean;
  /** Master switch for every automatic change below; manual element choices, shortcuts and Return/Tab flow stay available. */
  autoFormatting:boolean;detectCharacters:boolean;autoDialogue:boolean;smartTypeSuggestions:boolean;templateFormatting:boolean;ambiguousSuggestions:boolean;
  /** Return after a speech follows the scene's pattern (cue or action); a cue the editor chose turns into Action when prose is typed into it. */
  contextualFlow:boolean}
export const EDITOR_PREFS_KEY='draftcraft_editor_preferences_v1';
export const DEFAULT_EDITOR_PREFS:EditorPreferences={smoothCursor:true,cursorSpeed:80,cursorStyle:'ease-out',cursorBlink:true,smoothBlink:true,blinkInterval:1100,cursorAppearance:'line',typingAnimation:false,autoCapitalize:true,autoSceneHeadings:true,autoParentheticals:true,autoTransitions:true,respectFormatting:true,preserveManualCase:true,autoFormatting:true,detectCharacters:true,autoDialogue:true,smartTypeSuggestions:true,templateFormatting:true,ambiguousSuggestions:true,contextualFlow:true};
export function normalizeEditorPreferences(value:unknown):EditorPreferences {
  const p=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const result={...DEFAULT_EDITOR_PREFS};
  for(const key of ['smoothCursor','cursorBlink','smoothBlink','typingAnimation','autoCapitalize','autoSceneHeadings','autoParentheticals','autoTransitions','respectFormatting','preserveManualCase','autoFormatting','detectCharacters','autoDialogue','smartTypeSuggestions','templateFormatting','ambiguousSuggestions','contextualFlow'] as const)if(typeof p[key]==='boolean')result[key]=p[key];
  if(typeof p.cursorSpeed==='number'&&Number.isFinite(p.cursorSpeed))result.cursorSpeed=Math.max(0,Math.min(150,p.cursorSpeed));
  if(typeof p.blinkInterval==='number'&&Number.isFinite(p.blinkInterval))result.blinkInterval=Math.max(400,Math.min(2400,p.blinkInterval));
  if(['ease-out','spring','linear'].includes(p.cursorStyle as string))result.cursorStyle=p.cursorStyle as EditorPreferences['cursorStyle'];
  if(p.cursorAppearance==='wide')result.cursorAppearance='wide';
  return result;
}
/** What the editor applies: with Intelligent Auto Formatting off, every automatic change is off; the stored individual
 * choices are kept for when it is turned on again. */
export function effectivePreferences(p:EditorPreferences):EditorPreferences{return p.autoFormatting?p:{...p,autoCapitalize:false,autoSceneHeadings:false,autoParentheticals:false,autoTransitions:false,detectCharacters:false,autoDialogue:false,smartTypeSuggestions:false,templateFormatting:false,ambiguousSuggestions:false,contextualFlow:false};}
export function loadEditorPreferences():EditorPreferences {try{return normalizeEditorPreferences(JSON.parse(localStorage.getItem(EDITOR_PREFS_KEY) || '{}'))}catch{return {...DEFAULT_EDITOR_PREFS}}}
const abbreviations=new Set(['mr','mrs','ms','dr','prof','sr','jr','st','vs','etc','e.g','i.e','no','fig','dept','inc','ltd','approx','a.m','p.m','int','ext','cont','v.o','o.s']);
export function startsSentence(prefix:string):boolean {
  if(/\n[\s"'“‘”’(\[{]*$/u.test(prefix))return true;
  const text=prefix.replace(/[\s"'“‘”’(\[{]+$/u,'');
  if(!text)return true;
  if(/[!?]$/u.test(text))return true;
  if(!text.endsWith('.') || /(?:\.{2,}|…)$/u.test(text))return false;
  const token=text.match(/([\p{L}.]+)\.$/u)?.[1] || '';
  if(abbreviations.has(token.toLowerCase()) || /^(?:\p{L}\.)*\p{L}$/u.test(token))return false;
  if(/\d\.$/u.test(text)&&!/[0-9]+\.[0-9]+\.$/.test(text))return false;
  return true;
}
export function capitalizeInsertion(before:string,after:string,type:ElementType,prefs:EditorPreferences,inputType?:string):{text:string;start:number;end:number}|null {
  if(!prefs.autoCapitalize || (prefs.respectFormatting && !['Action','Dialogue','Dual Dialogue','General','Scene Summary','User Defined','Centered Text','Stage Direction','Panel Description','Caption','Narration'].includes(type)))return null;
  if(inputType && inputType!=='insertText')return null; // Never rewrite pasted, dictated, IME or existing manuscript text.
  let start=0;while(start<before.length && start<after.length && before[start]===after[start])start++;
  let endBefore=before.length,endAfter=after.length;while(endBefore>start && endAfter>start && before[endBefore-1]===after[endAfter-1]){endBefore--;endAfter--;}
  if(endBefore!==start && (prefs.preserveManualCase || endBefore-start>2))return null;
  if(endAfter-start>2)return null;
  const inserted=after.slice(start,endAfter);
  const prefix=after.slice(0,start);
  if(!/^\p{Ll}$/u.test(inserted) || !startsSentence(prefix))return null;
  if(prefix.trim()&&!/[\s"'“‘”’(\[{]$/u.test(prefix))return null;
  // Replacing an existing capital with a lowercase letter is a deliberate override.
  const cap=inserted.toLocaleUpperCase();return cap===inserted?null:{text:after.slice(0,start)+cap+after.slice(endAfter),start,end:endAfter};
}
