import type {Paragraph,ElementType} from '../types/script';
import type {Macro} from './model';
import {conflictFor,overlaps,validateShortcut,type ShortcutProfile,type CharacterShortcuts} from '../shortcuts/model';
export function macroConflict(macro:Macro,macros:Macro[],profile:ShortcutProfile,characters:CharacterShortcuts):string|null {
 if(!macro.name.trim()||!macro.text) return 'Enter a name and expansion text.';
 if(macro.trigger&&/\s/u.test(macro.trigger))return 'A text trigger cannot contain whitespace.';
 if(macro.shortcut){const invalid=validateShortcut(macro.shortcut);if(invalid)return invalid;const conflict=conflictFor(profile,characters,'macro:'+macro.id,macro.shortcut);if(conflict)return 'Shortcut conflicts with '+conflict+'.';}
 for(const other of macros){if(other.id===macro.id||!other.enabled)continue;const shared=!macro.scope.length||!other.scope.length||macro.scope.some(s=>other.scope.includes(s));if(shared&&macro.trigger&&macro.trigger===other.trigger)return 'This trigger is already used in the same elements.';if(macro.shortcut&&other.shortcut&&overlaps(macro.shortcut,other.shortcut))return 'Shortcut conflicts with macro '+other.name+'.';}return null;
}
export function triggerMacro(macros:Macro[],p:Paragraph,at:number){return macros.find(m=>m.enabled&&m.trigger&&(!m.scope.length||m.scope.includes(p.type))&&p.text.slice(0,at).endsWith(m.trigger)&&(at===m.trigger.length||!/[\p{L}\p{N}_]/u.test(p.text[at-m.trigger.length-1])));}
export function expandMacro(paragraphs:Paragraph[],id:string,start:number,end:number,macro:Macro){
 const index=paragraphs.findIndex(p=>p.id===id),current=paragraphs[index];if(!current||(!macro.scope.includes(current.type)&&macro.scope.length))throw Error('Macro does not apply to this element.');
 const marker=macro.text.indexOf('{{cursor}}'),expansion=macro.text.replace('{{cursor}}',''),parts=expansion.split('\n'),type=macro.element||current.type;
 const inserted:Paragraph[]=parts.map((text,i)=>({...(i===0?current:{id:'p-'+crypto.randomUUID(),type}),type,text:(i===0?current.text.slice(0,start):'')+text+(i===parts.length-1?current.text.slice(end):''),runs:undefined}));
 let caret=marker<0?expansion.length:marker,offset=start,target=inserted[0];for(let i=0;i<inserted.length;i++){const n=parts[i].length;if(caret<=n){target=inserted[i];offset=(i===0?start:0)+caret;break;}caret-=n+1;}
 if(marker<0){target=inserted.at(-1)!;offset=target.text.length-current.text.slice(end).length;}
 if(macro.next){const text=macro.next==='Parenthetical'?'()':'';target={id:'p-'+crypto.randomUUID(),type:macro.next as ElementType,text};inserted.push(target);offset=text?1:0;}
 return {paragraphs:[...paragraphs.slice(0,index),...inserted,...paragraphs.slice(index+1)],paragraph:target,start:offset};
}
