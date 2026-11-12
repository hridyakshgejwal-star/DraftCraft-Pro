import type {Paragraph} from '../types/script';
export function sceneSpan(paragraphs:Paragraph[],sceneId:string){const start=paragraphs.findIndex(p=>p.id===sceneId&&p.type==='Scene Heading');if(start<0)return null;let end=start+1;while(end<paragraphs.length&&paragraphs[end].type!=='Scene Heading')end++;return {start,end};}
export function moveScene(paragraphs:Paragraph[],sceneId:string,direction:-1|1):Paragraph[]{const headings=paragraphs.filter(p=>p.type==='Scene Heading'),at=headings.findIndex(p=>p.id===sceneId),target=headings[at+direction],span=sceneSpan(paragraphs,sceneId);if(!span||!target)return paragraphs;const block=paragraphs.slice(span.start,span.end),remaining=[...paragraphs.slice(0,span.start),...paragraphs.slice(span.end)],destination=sceneSpan(remaining,target.id)!;remaining.splice(direction===1?destination.end:destination.start,0,...block);return remaining;}
/** Moves a whole scene (heading to the next heading) so it sits before `beforeId`, or at the end when `beforeId` is null. */
export function moveSceneBefore(paragraphs:Paragraph[],sceneId:string,beforeId:string|null):Paragraph[]{
  if(sceneId===beforeId)return paragraphs;const span=sceneSpan(paragraphs,sceneId);if(!span)return paragraphs;
  const block=paragraphs.slice(span.start,span.end),remaining=[...paragraphs.slice(0,span.start),...paragraphs.slice(span.end)];
  const at=beforeId===null?remaining.length:remaining.findIndex(p=>p.id===beforeId&&p.type==='Scene Heading');if(at<0)return paragraphs;
  const next=[...remaining.slice(0,at),...block,...remaining.slice(at)];return next.every((p,i)=>p===paragraphs[i])?paragraphs:next;
}
