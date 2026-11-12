import type {Paragraph,ElementType} from '../types/script';
import type {WritingFormat} from './model';
import {characterName} from '../writing/model';
// Same prefixes the heading formatter completes: INT., EXT., INT./EXT., INT/EXT., EXT./INT., EXT/INT., I/E (dot optional
// only for the combined forms, so ordinary words such as "Interior" or "Extra" are never headings).
const SCENE_INTRO=/^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.|EXT\.)(?=\s|$)/i;
// Known transitions; group 2 is the explicit ending. Without an ending the line is only offered, never converted.
const TRANSITION=/^(CUT TO|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|JUMP CUT TO|TIME CUT|FLASH CUT TO|WIPE TO|FADE TO BLACK|FADE OUT|FADE IN|FADE TO|INTERCUT|BACK TO)\s*([:.])?$/i;
const SHOT_WORDS='EXTREME CLOSE[- ]UP|EXTREME CLOSE ON|CLOSE[- ]UP|CLOSE ON|CLOSE SHOT|MEDIUM CLOSE[- ]UP|MEDIUM SHOT|MEDIUM WIDE SHOT|WIDE SHOT|WIDE ANGLE|WIDE ON|ESTABLISHING SHOT|EXTREME WIDE SHOT|INSERT|POV|P\\.O\\.V\\.|ANGLE ON|NEW ANGLE|REVERSE ANGLE|REVERSE SHOT|TRACKING SHOT|DOLLY SHOT|CRANE SHOT|AERIAL SHOT|OVER THE SHOULDER|TWO SHOT|BACK TO SCENE';
const SHOT=new RegExp('^(?:'+SHOT_WORDS+')(?=$|[\\s:—–-])\\s*(:)?','i');
/** A camera direction: a shot keyword followed by a colon ("close on: the clock", "INSERT: THE LETTER"), or an all-capitals
 * line without sentence punctuation ("ANGLE ON SARAH", "WIDE SHOT"). Mixed-case prose ("Close on the edge…") is not. */
export function isShot(value:string){const m=value.match(SHOT);if(!m)return false;if(m[1])return true;return value===value.toLocaleUpperCase()&&!/[.,!?;]/.test(value.replace(/P\.O\.V\./i,''));}
// All-capital lines that are screenplay structure, not speakers.
const NOT_A_CUE=/^(SCENE|ACT|PAGE|PANEL|END|THE END|LATER|MOMENTS LATER|CONTINUOUS|SAME|MONTAGE|SERIES OF SHOTS|FLASHBACK|END FLASHBACK|BACK TO PRESENT|INTERCUT|TITLE|SUPER|CHYRON|FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP|WIPE)\b/i;
export interface InferenceOptions {enabled?:boolean;characters?:boolean;templateRules?:boolean;ambiguous?:boolean}
export function inferElement(text:string,current:Paragraph,previous:Paragraph|undefined,format:WritingFormat,names:Set<string>,options:InferenceOptions={}):{type:ElementType;confident:boolean;reason:string}|null {
 const result=inferRaw(text,current,previous,format,names,options);
 if(!result)return null;if(result.type==='Character'&&options.characters===false)return null;if(!result.confident&&options.ambiguous===false)return null;return result;
}
function inferRaw(text:string,current:Paragraph,previous:Paragraph|undefined,format:WritingFormat,names:Set<string>,options:InferenceOptions):{type:ElementType;confident:boolean;reason:string}|null {
 if(options.enabled===false||format.mode==='manual'||current.elementSource==='manual'||!text.trim())return null;const templateRules=options.templateRules!==false;
 const value=text.trim(),upper=value.toLocaleUpperCase();const offer=(type:ElementType,confident=true,reason='Recognized '+type)=>format.supported.includes(type)&&type!==current.type?{type,confident,reason}:null;
 if(format.kind==='prose'||format.kind==='structure')return null;
 if(format.kind==='comic'){if(!templateRules)return null;
  if(/^PAGE\s+\d+\s*$/i.test(value))return offer('Comic Page');
  if(/^PANEL\s+\d+[.:]?\s*$/i.test(value))return offer('Panel');
  if(/^(CAPTION|CAP):$/i.test(value))return offer('Caption');if(/^SFX:$/i.test(value))return offer('Sound Effect');return null;
 }
 const audioCue=templateRules&&format.supported.includes('Sound Effect')&&/^(SFX|F\/X|FX|SOUND|MUSIC|ATMOS)\s*:/i.test(value);
 // A speaker line that the writer turns into an SFX:/MUSIC: cue (audio scripts alternate speeches and cues).
 if(audioCue&&current.type==='Character')return offer('Sound Effect');
 const dialogueContext=['Character','Dialogue','Parenthetical'].includes(current.type);
 if(dialogueContext){if(current.type==='Dialogue'&&/^\([^\n]*\)$/.test(value)&&previous&&['Character','Dialogue','Parenthetical'].includes(previous.type))return offer('Parenthetical');return null;}
 if(templateRules&&/^END (OF )?(ACT|TEASER|EPISODE)\b/i.test(value))return offer('End of Act');
 if(templateRules&&/^(ACT (ONE|TWO|THREE|FOUR|FIVE|SIX|[IVX]+|\d+)|TEASER|COLD OPEN|TAG|INTERMISSION)\s*$/i.test(value))return offer('New Act');
 if(templateRules&&format.kind==='stageplay'&&/^SCENE\s+(\d+|[IVX]+|ONE|TWO|THREE)\b/i.test(value))return offer('Scene Heading');
 // Audio, documentary and commercial cues, in templates that define those elements.
 if(audioCue)return offer('Sound Effect');
 if(templateRules&&format.supported.includes('Caption')&&/^(LOWER THIRD|SUPER|TITLE CARD|ON SCREEN|CHYRON)\s*:/i.test(value))return offer('Caption');
 if(templateRules&&format.supported.includes('Narration')&&/^(NARRATOR|NARRATION|ANNOUNCER)\b[^:]{0,30}:/i.test(value))return offer('Narration',false,'Possible narration');
 if(SCENE_INTRO.test(value))return offer('Scene Heading');
 const transition=value.match(TRANSITION);
 if(transition)return transition[2]?offer('Transition'):offer('Transition',false,'Possible transition');
 if(format.mode!=='smart')return null;
 const shot=isShot(value);
 if(shot)return offer('Shot',false,'Possible camera direction');
 if(names.has(characterName(value))&&value.length<65&&!/[.!?:]$/.test(value))return offer('Character',false,'Established character cue — confirm or press Return');
 if(current.type==='Action'&&upper===value&&/^[\p{L}][\p{L}\p{M} '\u2019.-]{0,30}$/u.test(value)&&!/[.!?]$/.test(value)&&!NOT_A_CUE.test(value))return offer('Character',false,'Possible new character cue');
 return null;
}
export function headingTab(text:string,separator=' - '){
 const intro=text.match(/^(INT\.?\/?EXT\.?|I\/E\.?|INT\.?|EXT\.?)\s*/i);
 if(!intro)return {text:'INT. '+text,start:5+text.length};
 let normalized=intro[1].toUpperCase().replace(/\.$/,'')+'.';
 const rest=text.slice(intro[0].length);
 if(!rest){const value=normalized+' ';return {text:value,start:value.length};}
 if(!text.includes(separator)){const value=normalized+' '+rest.trimEnd()+separator;return {text:value,start:value.length};}
 return {text,start:text.length};
}
export function nextSpeaker(paragraphs:Paragraph[],beforeId:string):string|undefined {
 const at=paragraphs.findIndex(p=>p.id===beforeId);let start=at;while(start>0&&paragraphs[start-1].type!=='Scene Heading')start--;
 const cues=paragraphs.slice(start,at).filter(p=>p.type==='Character').map(p=>characterName(p.text)).filter(Boolean);
 const a=cues.at(-1),b=cues.at(-2);return a&&b&&a!==b&&(cues.length===2||cues.at(-3)===a)?b:undefined;
}
/** The element after a finished speech, from how the current scene has gone so far. Each earlier speech in the scene
 * that was directly followed by a cue or by action is one sample. The fallback (the profile or template rule) is kept
 * unless at least two of the last three samples went the other way and none went the fallback's way, so the choice
 * stays predictable and changes only when the scene clearly shows a pattern. */
export function afterDialogue(paragraphs:Paragraph[],index:number,fallback:ElementType):ElementType {
 if(fallback!=='Character'&&fallback!=='Action')return fallback;
 let start=index;while(start>0&&paragraphs[start-1].type!=='Scene Heading')start--;
 const samples:ElementType[]=[];
 for(let i=start;i<index;i++){if(paragraphs[i].type!=='Dialogue'||!paragraphs[i].text.trim())continue;const next=paragraphs[i+1]?.type;if(next==='Character'||next==='Action')samples.push(next);}
 const recent=samples.slice(-3),other=fallback==='Character'?'Action':'Character';
 return recent.filter(t=>t===other).length>=2&&!recent.includes(fallback)?other:fallback;
}
/** A line in a Character element that the writer is clearly typing as prose: six or more words, or a sentence or clause
 * that continues after punctuation. Parenthetical extensions are ignored. Used only for cues the editor chose itself. */
export function proseInCue(text:string){
 const value=text.replace(/\([^)]*\)?/g,' ').trim();if(!value)return false;
 const plain=value.replace(/\b(?:MR|MRS|MS|DR|PROF|SGT|LT|CPT|CAPT|COL|GEN|ST|JR|SR|REV|DET|OFC|AGT|SEN|GOV|PRES|MT|NO)\./giu,'X').replace(/(^|\s)\p{L}\./gu,'$1X');
 return value.split(/\s+/).length>=6||/[\p{L}\p{N}][.!?,;]\s+\p{L}/u.test(plain);
}
