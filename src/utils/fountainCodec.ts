import {parseFountainInline,fountainText} from '../production/fountainInline';
import {pairDialogue,speechBlocks} from '../production/model';
import { ScriptDocument, Paragraph, ElementType } from '../types/script';

export function exportToFountain(doc: ScriptDocument): string {
  let out = `Title: ${doc.titlePage.title}\n`;
  out += `Credit: ${doc.titlePage.author}\n`;
  if (doc.titlePage.basedOn) out += `Source: ${doc.titlePage.basedOn}\n`;
  out += `Draft date: ${doc.titlePage.draftDate}\n`;
  out += `Contact: ${doc.titlePage.contact.replace(/\n/g, ' ')}\n\n`;

  for (const [index,p] of doc.paragraphs.entries()) {
    const text=fountainText(p);
    if(p.pageBreakBefore)out+='===\n\n';
    switch (p.type) {
      case 'Scene Heading':
        out += `\n${text.toUpperCase()}${p.sceneNumber?' #'+p.sceneNumber+'#':''}\n\n`;
        break;
      case 'Character':
        out += `\n@${text.toUpperCase()}${p.dualGroupId&&p.dualColumn===2?' ^':''}\n`;
        break;
      case 'Parenthetical': {
        const direction = text.startsWith('(') && text.endsWith(')') ? text : `(${text})`;
        out += `${direction}\n`;
        break;
      }
      case 'Dialogue':
      case 'Dual Dialogue':
        out += `${text}\n${['Dialogue','Dual Dialogue','Parenthetical'].includes(doc.paragraphs[index+1]?.type||'')?'':'\n'}`;
        break;
      case 'Transition':
        out += `> ${text.toUpperCase()}\n\n`;
        break;
      case 'Shot':
        out += `\n${text.toUpperCase()}\n\n`;
        break;
      case 'Centered Text':
        out += `> ${text} <\n\n`;
        break;
      case 'Lyrics':
        out += `${text.split('\n').map(line => '~' + line).join('\n')}\n\n`;
        break;
      case 'Outline Level 1':case 'Outline Level 2':case 'Outline Level 3':
        out += `${'#'.repeat(Number(p.type.slice(-1)))} ${text}\n\n`;break;
      case 'Scene Summary':out += `= ${text}\n\n`;break;
      case 'Note':out += `[[${text}]]\n\n`;break;
      case 'Action':
        out += `!${text}\n\n`;break;
      default:
        out += `${text}\n\n`;
        break;
    }

    if (p.notes && p.notes.length > 0) {
      for (const n of p.notes) {
        out += `[[ Note: ${n.name ? `${n.name} - ` : ''}${n.author}: ${n.text} ]]\n\n`;
      }
    }

    if (p.bookmark) {
      const bmName = typeof p.bookmark === 'object' ? p.bookmark.name : p.bookmark;
      out += `[[ Bookmark: ${bmName} ]]\n\n`;
    }

    if (p.sceneComment) {
      out += `[[ SceneComment: ${p.sceneComment} ]]\n\n`;
    }
  }

  return out;
}

export function parseFountain(raw:string):Partial<ScriptDocument>{
 if(raw.length>50*1024*1024)throw Error('Choose a Fountain document smaller than 50 MB.');
 const lines=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n'),paragraphs:Paragraph[]=[],meta:Record<string,string>={};let cursor=0,key='';
 while(cursor<lines.length){const line=lines[cursor],match=line.match(/^(Title|Credit|Authors?|Source|Draft date|Contact|Copyright|Notes):\s*(.*)$/i);if(match){key=match[1].toLowerCase();meta[key]=match[2];cursor++;continue;}if(key&&/^( {3,}|\t)/.test(line)){meta[key]+='\n'+line.trim();cursor++;continue;}if(!line.trim()&&key){cursor++;break;}break;}
 let dialogue=false,dual=false,blank=true,pendingBreak=false,boneyard=false;
 const add=(type:ElementType,text:string,extra:Partial<Paragraph>={})=>{const previous=paragraphs.at(-1);if(!blank&&previous?.type===type&&['Action','Dialogue','Dual Dialogue','Lyrics'].includes(type)&&!pendingBreak){previous.text+='\n'+text;return;}paragraphs.push({id:'p-'+crypto.randomUUID(),type,text,...extra,...(pendingBreak?{pageBreakBefore:true}:{})});pendingBreak=false;};
 for(let i=cursor;i<lines.length;i++){
  const rawLine=lines[i],line=rawLine.trim(),plainLine=parseFountainInline(line).text;if(!line){blank=true;dialogue=false;dual=false;continue;}
  if(line==='/*'){boneyard=true;continue;}if(line==='*/'){boneyard=false;continue;}if(boneyard){add('Note',rawLine);blank=false;continue;}
  if(/^={3,}$/.test(line)){pendingBreak=true;blank=true;dialogue=false;continue;}
  if(line.startsWith('[[')&&line.endsWith(']]')){const previous=paragraphs.at(-1);if(previous)previous.notes=[...(previous.notes||[]),{id:'note-'+crypto.randomUUID(),author:'Writer',text:line.slice(2,-2).trim(),color:'yellow',createdAt:new Date().toISOString()}];else add('Note',line.slice(2,-2));continue;}
  if(line.startsWith('>')&&line.endsWith('<')){add('Centered Text',line.slice(1,-1).trim());dialogue=false;}
  else if(line.startsWith('>')||blank&&/^[A-Z][A-Z ]*TO:$/.test(line)){add('Transition',line.replace(/^>\s*/,''));dialogue=false;}
  else if(line.startsWith('~'))add('Lyrics',rawLine.replace(/^\s*~/,''));
  else if(/^#{1,3}\s/.test(line)){const n=line.match(/^#+/)![0].length;add(('Outline Level '+n) as ElementType,line.replace(/^#+\s*/,''));dialogue=false;}
  else if(/^=\s/.test(line)){add('Scene Summary',line.replace(/^=\s*/,''));dialogue=false;}
  else if(!dialogue&&(blank||paragraphs.length===0)&&(/^(INT\.?\/EXT|INT\/EXT|INT|EXT|EST|I\/E)(?:\.|\s)/i.test(line)||/^\.[\p{L}\p{N}]/u.test(line))){const number=line.match(/\s+#([^#]+)#\s*$/);add('Scene Heading',line.replace(/^\./,'').replace(/\s+#[^#]+#\s*$/,''),number?{sceneNumber:number[1]}:{});dialogue=false;}
  else if(!dialogue&&(line.startsWith('@')||blank&&((i+1<lines.length&&!!lines[i+1].trim())||!lines.slice(i+1).some(l=>l.trim()))&&/^[\p{Lu}\p{N}][\p{Lu}\p{N} .’'_-]*(?:\s*\([^)]*\))?\s*\^?$/u.test(plainLine)&&/\p{L}/u.test(line))){dual=line.endsWith('^');add('Character',line.replace(/^@/,'').replace(/\s*\^$/,''),dual?{dualColumn:2}:{});dialogue=true;}
  else if(dialogue&&line.startsWith('(')&&line.endsWith(')'))add('Parenthetical',line);
  else if(dialogue)add(dual?'Dual Dialogue':'Dialogue',rawLine);
  else add('Action',rawLine.replace(/^!/,''));
  blank=false;
 }
 for(const cue of paragraphs.filter(p=>p.type==='Character'&&p.dualColumn===2&&!p.dualGroupId)){try{const blocks=speechBlocks(paragraphs),at=blocks.findIndex(b=>paragraphs[b.start].id===cue.id),previous=blocks[at-1];if(!previous||previous.end!==blocks[at].start||paragraphs[previous.start].dualGroupId)throw Error('No available adjacent speech.');const paired=pairDialogue(paragraphs,paragraphs[previous.start].id);paragraphs.splice(0,paragraphs.length,...paired);}catch{cue.dualColumn=undefined;}}
 for(const p of paragraphs){const parsed=parseFountainInline(p.text);p.text=parsed.text;p.runs=parsed.runs;}
 return {titlePage:{title:meta.title||'UNTITLED SCRIPT',author:meta.author||meta.authors||meta.credit||'',basedOn:meta.source||'',contact:meta.contact||'',copyright:meta.copyright||'',draftDate:meta['draft date']||''},paragraphs:paragraphs.length?paragraphs:undefined};
}
