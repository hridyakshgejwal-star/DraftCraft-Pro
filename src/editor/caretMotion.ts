export type CaretCurve='ease-out'|'spring'|'linear';
export interface CaretPoint {x:number;y:number}
export function caretProgress(progress:number,style:CaretCurve):number {
  const t=Math.max(0,Math.min(1,progress));
  if(style==='linear')return t;
  // Critically damped, normalized to finish exactly, without overshoot.
  if(style==='spring')return (1-(1+8*t)*Math.exp(-8*t))/(1-9*Math.exp(-8));
  return 1-Math.pow(1-t,3);
}
/** A single interruptible trajectory, sampled by the display's frame clock.
 * Retargeting begins at the currently displayed point, never queues motions. */
export class CaretMotion {
  private from:CaretPoint={x:0,y:0};
  private target:CaretPoint={x:0,y:0};
  private start=0;
  private duration=0;
  private curve:CaretCurve='ease-out';
  private initialized=false;
  get moving(){return this.duration>0}
  sample(now:number):CaretPoint {
    if(!this.duration)return {...this.target};
    const t=Math.max(0,(now-this.start)/this.duration);
    if(t>=1){this.duration=0;this.from=this.target;return {...this.target};}
    const p=caretProgress(t,this.curve);
    return {x:this.from.x+(this.target.x-this.from.x)*p,y:this.from.y+(this.target.y-this.from.y)*p};
  }
  retarget(target:CaretPoint,now:number,duration:number,curve:CaretCurve,snap=false) {
    if(!Number.isFinite(target.x)||!Number.isFinite(target.y))return;
    if(this.initialized&&!snap&&target.x===this.target.x&&target.y===this.target.y)return;
    const current=this.sample(now);this.target={...target};this.curve=curve;this.start=now;
    this.duration=this.initialized&&!snap?Math.max(0,Math.min(150,duration)):0;
    this.from=this.duration?current:this.target;this.initialized=true;
  }
  reset(){this.initialized=false;this.duration=0}
}
export function canGlide(from:CaretPoint,to:CaretPoint,height:number,samePage:boolean) {
  return samePage&&Math.abs(to.x-from.x)<=Math.max(48,height*5)&&Math.abs(to.y-from.y)<=height*1.6;
}
