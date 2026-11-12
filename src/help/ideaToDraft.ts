// Idea to Draft (1.17): guided tutorials from the Help menu. Each one opens a new, separate project in the matching
// format whose Beat Board holds numbered step cards (idea, characters, structure, draft) with written prompts, linked
// in order by flow lines, plus an Outline Editor lane whose sections follow the structure cards. The writer replaces
// the prompts with their own story; nothing else in the project is special. The prompts are original DraftCraft text.
import type {BeatCard,FlowLine,OutlineMarker,ScriptDocument} from '../types/script';
import {FORMAT_TEMPLATES} from '../formats/catalog';
import {newFromTemplate} from '../formats/storage';
import {blankDocument} from '../files/model';

export type TutorialKind='feature'|'series'|'stage';
interface Step{title:string;text:string;act?:number;page?:number}
interface Phase{name:string;color:string;steps:Step[]}
export interface Tutorial{kind:TutorialKind;name:string;template:string;title:string;intro:string;phases:Phase[]}

const IDEA='#60a5fa',PEOPLE='#f472b6',SHAPE='#fbbf24',DRAFT='#34d399';
const draftSteps=(element:string):Step[]=>[
 {title:'Turn the beats into scenes',text:`Right-click a structure card and choose Send to Script… to add its scene to the ${element}. You can also write a scene first and link the card to it from the card's menu.`},
 {title:'Write the first draft',text:'Write straight through to the end without polishing. Put anything you want to fix later in a ScriptNote (Insert › ScriptNote) and keep going.'},
 {title:'Read it and rewrite',text:'Read the draft aloud with Tools › Table Read…, compare it with these cards, and revise the beats that no longer match the story you wrote. Then delete these tutorial cards or keep them as your outline.'},
];
export const TUTORIALS:Tutorial[]=[
 {kind:'feature',name:'Feature Screenplay',template:'Standard Feature Screenplay',title:'IDEA TO DRAFT — FEATURE',intro:'A feature screenplay from a one-line idea to a first draft of about 100 pages.',phases:[
  {name:'Idea',color:IDEA,steps:[
   {title:'Logline',text:'One sentence: a character who wants something, what stands in the way, and what happens if they fail. Replace this text with yours.'},
   {title:'Theme',text:'Name the question underneath the plot (for example: is loyalty worth losing yourself?). Your ending answers it.'},
   {title:'World and tone',text:'Where and when does the story happen, and how should it feel? List the rules of this world that the plot depends on.'}]},
  {name:'Characters',color:PEOPLE,steps:[
   {title:'Protagonist',text:'What do they want (the outer goal) and what do they need (the inner change)? Give them a flaw that makes the goal harder to reach.'},
   {title:'Opposition',text:'Who or what actively stops the protagonist? The opposition wants something that collides with the protagonist’s goal.'},
   {title:'Allies and mirrors',text:'The people who help, test or reflect the protagonist. Add a card for each one and note what they want.'}]},
  {name:'Structure',color:SHAPE,steps:[
   {title:'Opening image',text:'The first picture of the protagonist’s world before the story changes it.',act:1,page:1},
   {title:'Inciting incident',text:'The event that disturbs that world and creates the problem the film is about.',act:1,page:12},
   {title:'Act One decision',text:'The protagonist commits to the goal. There is no way back to the old life.',act:1,page:25},
   {title:'Midpoint',text:'A discovery, victory or defeat that raises the stakes and changes the plan.',act:2,page:55},
   {title:'Crisis',text:'Everything falls apart. The protagonist must face the flaw from the Characters row.',act:2,page:80},
   {title:'Climax',text:'The final confrontation with the opposition, won or lost by a choice only the protagonist can make.',act:3,page:95},
   {title:'Resolution',text:'The new normal. Show how the protagonist and the world have changed since the opening image.',act:3,page:105}]},
  {name:'Draft',color:DRAFT,steps:draftSteps('screenplay')}]},
 {kind:'series',name:'Television Pilot',template:'Television Pilot',title:'IDEA TO DRAFT — PILOT',intro:'A one-hour pilot episode, and the engine that keeps a series going.',phases:[
  {name:'Idea',color:IDEA,steps:[
   {title:'Logline',text:'One sentence for the pilot: who, what they want in this episode, and what stands in the way.'},
   {title:'Series engine',text:'What produces new stories week after week (a workplace, a mystery, a family, a mission)? Write it in two or three sentences.'},
   {title:'World',text:'The setting the series returns to, and the rules that make it different from any other show.'}]},
  {name:'Characters',color:PEOPLE,steps:[
   {title:'Lead',text:'Who carries the series? What do they want now, and how could that want last for seasons?'},
   {title:'Ensemble',text:'The regular characters. Give each one a want of their own that can drive an episode.'},
   {title:'Opposition',text:'The pressure on the lead in this episode, and the larger force behind the whole season.'}]},
  {name:'Structure',color:SHAPE,steps:[
   {title:'Teaser',text:'A short cold open that hooks the audience and sets the tone before the titles.',act:1,page:1},
   {title:'Act One — the problem',text:'Introduce the lead and the episode’s problem; end on a turn that forces action.',act:1,page:12},
   {title:'Act Two — complications',text:'The first plan meets resistance. End the act on a question the audience needs answered.',act:2,page:25},
   {title:'Act Three — reversal',text:'A reversal or reveal changes what the lead believes about the problem.',act:3,page:38},
   {title:'Act Four — commitment',text:'The lead commits to the series-long path. Resolve the episode’s problem.',act:4,page:50},
   {title:'Tag',text:'A final short scene that leaves a hook for the next episode.',act:4,page:58}]},
  {name:'Draft',color:DRAFT,steps:[...draftSteps('teleplay').slice(0,2),{title:'Map the season',text:'Add a card for each later episode with its own problem, and note how the lead changes across the season. Then read the pilot aloud with Tools › Table Read… and rewrite.'}]}]},
 {kind:'stage',name:'Stage Play',template:'Stageplay',title:'IDEA TO DRAFT — PLAY',intro:'A two-act play written for one stage and a live audience.',phases:[
  {name:'Idea',color:IDEA,steps:[
   {title:'Premise',text:'One sentence: who is on stage, what they want from each other, and what is at stake tonight.'},
   {title:'Central question',text:'The question the audience waits two hours to see answered. The final scene answers it.'},
   {title:'The space',text:'What does the audience see? One room, several places, a bare stage? Note what the set must do.'}]},
  {name:'Characters',color:PEOPLE,steps:[
   {title:'Lead',text:'Who changes the most by the end of the play, and what do they want in the first scene?'},
   {title:'Opposition',text:'The character the lead must persuade, defeat or forgive. Their want is just as strong.'},
   {title:'Supporting roles',text:'The other people on stage. Give each one a reason to be in the scene and a line of action.'}]},
  {name:'Structure',color:SHAPE,steps:[
   {title:'Opening',text:'Establish the world and the relationships quickly; the audience learns the rules by watching.',act:1,page:1},
   {title:'The disturbance',text:'Something arrives or is revealed that the characters cannot ignore.',act:1,page:10},
   {title:'Turn before the interval',text:'End Act One on a change that makes the audience come back for Act Two.',act:1,page:45},
   {title:'Rising stakes',text:'Each scene of Act Two costs the characters more than the last.',act:2,page:60},
   {title:'Confrontation',text:'The scene the whole play has been building toward, played out on stage.',act:2,page:85},
   {title:'Ending',text:'The last image on stage answers the central question.',act:2,page:95}]},
  {name:'Draft',color:DRAFT,steps:draftSteps('play')}]},
];
export const tutorial=(kind:TutorialKind)=>TUTORIALS.find(t=>t.kind===kind)!;

/** A new project for the tutorial: the format's template, step cards on the Beat Board (one row per phase, numbered,
 * linked in order), and an Outline Editor lane with one section per structure card at its target page. */
export function ideaToDraftDocument(kind:TutorialKind,base:ScriptDocument=blankDocument()):ScriptDocument{
 const t=tutorial(kind),template=FORMAT_TEMPLATES.find(f=>f.name===t.template);if(!template)throw Error('The '+t.template+' format is missing.');
 const doc=newFromTemplate(base,template),uid=()=>crypto.randomUUID();
 const beats:BeatCard[]=[];let n=0;
 t.phases.forEach((phase,row)=>phase.steps.forEach((step,col)=>{n++;beats.push({id:'beat-'+uid(),title:n+' · '+step.title,description:step.text,act:step.act??1,color:phase.color,tags:['Idea to Draft',phase.name],posX:60+col*290,posY:60+row*230,width:260,viewStyle:'card',stripOrder:n-1,...(step.page?{targetMinutes:step.page}:{})});}));
 const flowLines:FlowLine[]=beats.slice(1).map((b,i)=>({id:'flow-'+uid(),fromId:beats[i].id,toId:b.id,style:'forward',color:'#94a3b8'}));
 const laneId='lane-'+uid(),pages=Math.max(doc.targetScriptPages||t.phases[2].steps.at(-1)!.page!,1);
 const structure=beats.filter(b=>b.tags.includes('Structure'));
 const outlineMarkers:OutlineMarker[]=structure.map((b,i)=>{const start=Math.min(pages,Math.max(1,b.targetMinutes||1)),next=structure[i+1]?.targetMinutes||pages+1;return {id:'marker-'+uid(),laneId,title:b.title.replace(/^\d+ · /,''),description:b.description,startPage:start,endPage:Math.max(start+1,Math.min(pages+1,next)),color:b.color,beatId:b.id,kind:'section'};});
 const first=doc.paragraphs[0];
 const note={id:'p-'+uid(),type:(doc.writingFormat?.kind==='stageplay'?'Stage Direction':'Action') as ScriptDocument['paragraphs'][number]['type'],text:'Idea to Draft: open View › Beat Board and follow the numbered cards. Delete this line when you start writing.'};
 return {...doc,titlePage:{...doc.titlePage,title:t.title},beats,flowLines,outlineLanes:[...doc.outlineLanes,{id:laneId,name:'Idea to Draft — '+t.name,type:'sequence',color:SHAPE}],outlineMarkers:[...doc.outlineMarkers,...outlineMarkers],paragraphs:first?[first,note]:[note]};
}
