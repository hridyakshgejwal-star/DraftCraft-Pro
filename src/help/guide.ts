// In-app Getting Started (1.17): a short task guide followed by the full Getting Started reference that ships with
// the app (desktop/Getting-Started.txt, split at its capitalised headings), searchable together.
export interface GuideSection{id:string;title:string;body:string;group:'Guide'|'Reference'}

export const GUIDE:Omit<GuideSection,'group'>[]=[
 {id:'first-scene',title:'Write your first scene',body:`Type a scene heading such as INT. KITCHEN - NIGHT and press Return: the next element is Action.
Type the description, press Return, then Tab to start a Character cue. Return after the cue starts Dialogue.
Return after dialogue starts the next Character cue; Return on that empty cue goes back to Action. Cmd+1 to Cmd+0 choose an element directly
(1 Scene Heading, 2 Action, 3 Character, 4 Parenthetical, 5 Dialogue, 6 Transition, 7 Shot, 8 New Act, 9 End of Act, 0 General).
Format › Element shows every element and its key.`},
 {id:'save',title:'Save, autosave and backups',body:`Cmd+S saves the whole project as a .draftcraft file; after the first save, changes are saved automatically.
Settings › Files & Autosave sets the timing. File › File Manager & Backups… lists backups and recovery snapshots.
File › Open opens .draftcraft, Final Draft (.fdx) and Fountain files. File › Export PDF…, Export Final Draft (.fdx)…
and Export Fountain… create exchange copies.`},
 {id:'navigator',title:'Navigator: scenes, characters and the cast list',body:`View › Navigator opens the side panel. Scenes lists every scene with its number, length and characters;
click a scene to go to it. Switch between cards and a table; in the table, drag a column header to reorder columns,
double-click a summary or comment to edit it, and pick a scene colour. The sort and the column order are remembered.
Cast List shows each character's scenes, pages, eighths and estimated screen time, and exports a CSV file.
The buttons beside the Navigator title change its text size.`},
 {id:'beat-board',title:'Beat Board',body:`View › Beat Board opens a free canvas of story cards. New Beat (or right-click the board › New Beat Here) adds a card;
drag cards to arrange them and draw flow lines between them. Arrange by Sequence groups cards by the sequences in the Outline Editor.
Board Views saves the current arrangement, zoom and filter under a name. With a card selected, the arrow keys move it,
[ and ] select the previous and next card, Return edits its title and Shift+F10 opens its menu.
Right-click a card and choose Send to Script… to create its scene.`},
 {id:'outline',title:'Outline Editor (Timeline)',body:`View › Timeline (Outline Editor) shows lanes of outline elements above the script. Double-click a lane to add an element at that
point; drag its edges to resize it. An element placed under a longer element in a lane above (a scene under its sequence)
is nested in it: moving the parent moves it too (hold Option to move only the parent, Cmd to turn snapping off). With Ripple Insert on, a new element pushes later elements along.`},
 {id:'idea-to-draft',title:'Idea to Draft tutorials',body:`Help › Idea to Draft opens a guided tutorial as a new project: Feature Screenplay, Television Pilot or Stage Play.
Each one fills the Beat Board with numbered cards — idea, characters, structure and draft — linked in order, and adds
matching sections to the Outline Editor. Replace each card's prompt with your own story, then use Send to Script… to
turn the structure cards into scenes. Your current project stays as it is.`},
 {id:'spelling',title:'Spelling, autocorrect and languages',body:`Settings › Writing › Writing Assistance… turns spelling, autocorrect and suggestions on or off. English (US and UK) uses the
built-in dictionaries; other languages use the macOS spelling dictionaries for the language you choose there.
Custom Autocorrect replaces your own pairs as you type (for example "teh" with "the"); import or export a list as text.
Right-to-left text such as Arabic or Hebrew is typed and printed in its own direction automatically.`},
 {id:'production',title:'Production: scene numbers, revisions and locked pages',body:`Production › Revision Mode marks changes with the current revision colour. Page Locking & Scene Numbers… locks pages and numbers.
Format › Scene Numbers can hide the right-hand scene number automatically when a long heading would run into it.
File › New from Template… includes a Streaming Feature (Netflix-style) format with scene numbers and continueds.`},
 {id:'status-bar',title:'Status bar',body:`The bar under the script shows the page, scene, element, word count and more. Right-click it to choose which items appear;
Show All restores them. Your choice is remembered.`},
 {id:'table-read',title:'Table Read and dictation',body:`Tools › Table Read… reads the script aloud with a different voice for each character; Voice Cast… assigns the voices.
Edit › Dictation… types what you say into the script.`},
 {id:'accessibility',title:'Accessibility and VoiceOver',body:`VoiceOver announces each script element by its type (a scene heading also by its scene number). Press Ctrl+Shift+Period (View › Announce Element Number)
to hear the element type, its number in the script, the page and the scene. The Navigator tabs, the Beat Board and the
Outline Editor can be used from the keyboard: arrow keys move between tabs and items, Home and End go to the first and last,
and Shift+F10 opens the menu of the selected item.`},
 {id:'emoji',title:'Emoji and special characters',body:`Insert › Emoji… (Ctrl+Cmd+E), the Emoji button in the toolbar, or Insert Emoji… in the script's right-click menu opens
DraftCraft's emoji picker. Search by name ("laugh", "rain", "camera") or browse the categories; click an emoji to insert it at
the caret, or Shift-click to insert several. Recently used emoji are listed first. The same picker works in Beat Board cards,
ScriptNotes and other text fields. Insert › Emoji & Symbols (Character Viewer) opens the macOS character viewer instead
(also Ctrl+Cmd+Space). Emoji are saved in .draftcraft, Final Draft and Fountain files and appear in printed and exported PDFs.`},
 {id:'start-window',title:'Start Window and recent projects',body:`When DraftCraft Pro opens, the Start Window offers New Screenplay, quick-start formats (feature, television pilot,
sitcom, stage play, streaming feature, short film), More Templates…, Open…, your recent projects, and the Idea to Draft
tutorials. Choose Continue (or press Escape) to keep working on the document that is already open. Reopen it any time
with File › Start Window…; File › Open Recent lists the same projects. Turn off "Show this window when DraftCraft Pro opens"
to go straight to your script. Removing a project from the list never deletes the file.`},
 {id:'shortcuts',title:'Keyboard shortcuts and the toolbar',body:`Settings › Keyboard Shortcuts… shows and changes every key. View › Customize Toolbar… chooses the toolbar buttons;
drag buttons to reorder them.`},
];

/** The shipped Getting Started text, one section per capitalised heading line. */
/** Text for display (1.18): source lines are hard-wrapped, so a line break inside a paragraph becomes a space. Blank
 * lines still separate paragraphs, and a line that starts a list item ("1.", "*", "-", "•") still starts a new line;
 * indented continuation lines of an item join the item. Searching uses the original text. */
export function reflowText(text:string):string{
 const item=/^\s*(?:\d+[.)]|[*•-])\s/;
 return text.replace(/\r\n?/g,'\n').split(/\n[ \t]*\n/).map(par=>{const lines=par.split('\n');let out='';
  for(const line of lines){const t=line.trim();if(!t)continue;if(!out)out=t;else if(item.test(line))out+='\n'+t;else out+=' '+t;}
  return out;}).filter(Boolean).join('\n\n');
}
export function parseGuideText(text:string):GuideSection[]{
 const out:GuideSection[]=[];let current:GuideSection|null=null;const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const heading=(line:string)=>/^[A-Z][A-Z0-9 ,.&/'’()—–+-]{2,}$/.test(line.trim())&&/[A-Z]{3}/.test(line)&&line.trim()===line.trimEnd();
 lines.forEach((line,i)=>{
  if(i===0&&/^DRAFTCRAFT PRO/.test(line))return;
  if(heading(line)){const title=line.trim().toLowerCase().replace(/(^|[\s(/—–-])(\p{L})/gu,(_,a,b)=>a+b.toUpperCase());current={id:'ref-'+out.length,title,body:'',group:'Reference'};out.push(current);return;}
  if(current)current.body+=(current.body?'\n':'')+line;
 });
 return out.map(s=>({...s,body:s.body.trim()})).filter(s=>s.body);
}

export function guideSections(reference:string):GuideSection[]{return [...GUIDE.map(s=>({...s,group:'Guide' as const})),...parseGuideText(reference)];}

const fold=(s:string)=>s.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
export const queryWords=(query:string)=>fold(query).split(/\s+/).filter(Boolean);
/** Sections containing every word of the query (title or text, case and accents ignored), best matches first:
 * a title match ranks above a text-only match. An empty query returns every section in order. */
export function searchGuide(sections:GuideSection[],query:string):GuideSection[]{
 const words=queryWords(query);if(!words.length)return sections;
 return sections.map((s,i)=>{const title=fold(s.title),all=title+'\n'+fold(s.body);if(!words.every(w=>all.includes(w)))return null;return {s,score:words.filter(w=>title.includes(w)).length*10-i/1000};})
  .filter((x):x is {s:GuideSection;score:number}=>!!x).sort((a,b)=>b.score-a.score).map(x=>x.s);
}
/** Splits text into plain and matching parts for highlighting. */
export function highlightParts(text:string,words:string[]):{text:string;match:boolean}[]{
 if(!words.length)return [{text,match:false}];const folded=fold(text);
 // fold() can change length for some characters; fall back to no highlighting rather than misplace marks.
 if(folded.length!==text.length)return [{text,match:false}];
 const marks=new Array(text.length).fill(false);for(const w of words){let at=folded.indexOf(w);while(at>=0){for(let k=at;k<at+w.length;k++)marks[k]=true;at=folded.indexOf(w,at+w.length);}}
 const parts:{text:string;match:boolean}[]=[];for(let i=0;i<text.length;i++){const last=parts.at(-1);if(last&&last.match===marks[i])last.text+=text[i];else parts.push({text:text[i],match:marks[i]});}
 return parts;
}
