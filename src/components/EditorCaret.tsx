import React,{useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {EditorPreferences} from '../editor/preferences';
import {CaretMotion,canGlide,type CaretPoint} from '../editor/caretMotion';

const STYLE_KEYS=['font-family','font-size','font-weight','font-style','font-variant','font-stretch','font-feature-settings','font-kerning','font-variation-settings','line-height','letter-spacing','word-spacing','text-align','text-indent','text-transform','direction','unicode-bidi','writing-mode','tab-size','padding-top','padding-bottom','padding-left','padding-right','border-top-width','border-bottom-width','border-left-width','border-right-width','border-style','box-sizing','word-break','overflow-wrap','white-space'] as const;

/** The real textarea always owns editing, selection, IME and accessibility.
 * One mirror measures only the focused paragraph when invalidated. Motion
 * frames update only this portal's transform, without reads or React updates. */
export function EditorCaret({preferences,layout,zoom=100}:{preferences:EditorPreferences;layout?:unknown;zoom?:number}){
  const caret=useRef<HTMLDivElement>(null),feedback=useRef<HTMLDivElement>(null);
  const invalidate=useRef<((snap?:boolean)=>void)|null>(null),previousZoom=useRef(zoom);
  useLayoutEffect(()=>{
    const visual=caret.current!,glow=feedback.current!,reduce=matchMedia('(prefers-reduced-motion: reduce)'),contrast=matchMedia('(forced-colors: active)');
    const motion=new CaretMotion(),mirror=document.createElement('div'),text=document.createTextNode(''),range=document.createRange();
    mirror.className='dc-caret-mirror no-print';mirror.setAttribute('aria-hidden','true');mirror.append(text);
    let active:HTMLTextAreaElement|null=null,page:Element|null=null,lastTarget:CaretPoint|null=null;
    let frame:number|null=null,dirty=true,snap=true,metricsDirty=true,disposed=false,composing=false,selecting=false,focused=document.hasFocus();
    let signature='',style:CSSStyleDeclaration|null=null,lastValue='',lastStart=-1,lastEnd=-1,height=0;
    let blink:Animation|undefined,blinkTimer:ReturnType<typeof setTimeout>|undefined,glowTimer:ReturnType<typeof setTimeout>|undefined;
    let flash:{input:HTMLTextAreaElement;count:number}|null=null,mirroredValue:string|null=null;
    const observer=new ResizeObserver(()=>schedule(true,true));
    const nativeCaret=()=>{active?.classList.remove('dc-native-caret-hidden','dc-native-caret-steady');visual.style.display='none';};
    const cancelBlink=()=>{clearTimeout(blinkTimer);blink?.cancel();blink=undefined;visual.style.opacity='1';};
    const sleep=()=>{cancelBlink();nativeCaret();glow.style.display='none';motion.reset();lastTarget=null;};
    const release=()=>{if(active)observer.unobserve(active);sleep();active=null;page=null;signature='';style=null;mirror.remove();};
    const wake=()=>{
      cancelBlink();
      if(!preferences.cursorBlink)return;
      blinkTimer=setTimeout(()=>{
        if(disposed||visual.style.display==='none'||!focused||document.hidden||composing||selecting)return;
        const frames=preferences.smoothBlink?[{opacity:1,offset:0},{opacity:1,offset:.42},{opacity:.05,offset:.58},{opacity:.05,offset:.82},{opacity:1,offset:1}]:[{opacity:1,offset:0},{opacity:1,offset:.49},{opacity:0,offset:.5},{opacity:0,offset:.99},{opacity:1,offset:1}];
        blink=visual.animate(frames,{duration:preferences.blinkInterval,iterations:Infinity,easing:preferences.smoothBlink?'ease-in-out':'steps(1,end)'});
      },650);
    };
    const draw=(position:CaretPoint)=>{visual.style.transform=`translate3d(${position.x}px,${position.y}px,0)`;};
    const measure=(now:number)=>{
      const input=document.activeElement;
      if(!(input instanceof HTMLTextAreaElement)||!input.id.startsWith('input-')||!input.closest('.dc-editor-workspace')){release();return;}
      if(active!==input){if(active)observer.unobserve(active);active?.classList.remove('dc-native-caret-hidden','dc-native-caret-steady');if(!lastTarget||snap||!focused){sleep();page=null;}active=input;observer.observe(input);metricsDirty=true;lastStart=-1;lastEnd=-1;lastValue='';}
      const changed=lastValue!==input.value||lastStart!==input.selectionStart||lastEnd!==input.selectionEnd;
      if(changed){wake();lastValue=input.value;lastStart=input.selectionStart;lastEnd=input.selectionEnd;}
      if(!focused||document.hidden||composing||selecting||input.selectionStart!==input.selectionEnd){sleep();return;}
      const enabled=preferences.smoothCursor&&!reduce.matches&&!contrast.matches;
      if(!enabled&&!preferences.typingAnimation){sleep();if(!preferences.cursorBlink)input.classList.add('dc-native-caret-steady');return;}
      const nextSignature=[input.className,input.style.cssText,input.clientWidth,input.clientHeight,input.wrap].join('|');
      if(metricsDirty||nextSignature!==signature||!style){
        style=getComputedStyle(input);for(const key of STYLE_KEYS)mirror.style.setProperty(key,style.getPropertyValue(key));
        Object.assign(mirror.style,{width:style.width,height:style.height,whiteSpace:input.wrap==='off'?'pre':'pre-wrap'});signature=nextSignature;metricsDirty=false;
      }
      // Preserve native caret affinity for bidirectional/vertical text.
      if(style.direction==='rtl'||style.writingMode!=='horizontal-tb'||/[\u0590-\u08ff\u200f\u202b-\u202e\u2067-\u2069\ufb1d-\ufdff\ufe70-\ufeff]/u.test(input.value)){sleep();return;}
      if(!mirror.isConnected)document.body.append(mirror);
      if(mirroredValue!==input.value){text.data=input.value+'\u200b';mirroredValue=input.value;}
      range.setStart(text,Math.min(input.selectionStart,input.value.length));range.collapse(true);
      const r=range.getBoundingClientRect(),m=mirror.getBoundingClientRect(),bounds=input.getBoundingClientRect(),viewport=input.closest('.dc-editor-workspace')!.getBoundingClientRect();
      if(!m.width||!r.height||!bounds.width){sleep();return;}
      const sx=bounds.width/m.width,sy=m.height?bounds.height/m.height:sx;
      const line=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2;const complex=/[\p{Mark}\p{Extended_Pictographic}]/u.test(input.value);height=(complex?parseFloat(style.fontSize):r.height)*sy;
      const target={x:bounds.left+(r.left-m.left-input.scrollLeft)*sx,y:bounds.top+(r.top-m.top-input.scrollTop+(complex?(r.height-parseFloat(style.fontSize))/2:0))*sy};
      if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||!Number.isFinite(height)||target.x<Math.max(0,viewport.left)-1||target.x>Math.min(innerWidth,viewport.right)||target.y<Math.max(0,viewport.top)-1||target.y+height>Math.min(innerHeight,viewport.bottom)+1){sleep();return;}
      const nextPage=input.closest('.script-page'),immediate=snap||!lastTarget||!canGlide(lastTarget,target,line*sy,page===nextPage);
      motion.retarget(target,now,preferences.cursorSpeed,preferences.cursorStyle,immediate);snap=false;page=nextPage;lastTarget=target;
      visual.style.height=height+'px';visual.style.width=preferences.cursorAppearance==='wide'?'3px':'1.5px';visual.style.backgroundColor=style.color;
      if(enabled){visual.style.display='block';input.classList.add('dc-native-caret-hidden');input.classList.remove('dc-native-caret-steady');}
      else{nativeCaret();if(!preferences.cursorBlink)input.classList.add('dc-native-caret-steady');}
      if(flash&&flash.input===input&&preferences.typingAnimation&&!reduce.matches){
        range.setStart(text,Math.max(0,input.selectionStart-flash.count));range.setEnd(text,input.selectionStart);const glowRect=range.getBoundingClientRect();
        Object.assign(glow.style,{display:'block',left:bounds.left+(glowRect.left-m.left-input.scrollLeft)*sx+'px',top:bounds.top+(glowRect.top-m.top-input.scrollTop)*sy+'px',width:Math.max(2,glowRect.width*sx)+'px',height:glowRect.height*sy+'px'});
        glow.classList.remove('dc-typed-flash');void glow.offsetWidth;glow.classList.add('dc-typed-flash');clearTimeout(glowTimer);glowTimer=setTimeout(()=>{glow.style.display='none'},180);
      }
      flash=null;
    };
    function tick(now:number){frame=null;if(disposed)return;try{if(dirty){dirty=false;measure(now)}if(visual.style.display!=='none'){draw(motion.sample(now));if(motion.moving)frame=requestAnimationFrame(tick)}}catch{release();}}
    function schedule(immediate=false,metrics=false){if(disposed)return;dirty=true;snap=snap||immediate;metricsDirty=metricsDirty||metrics;if(frame===null)frame=requestAnimationFrame(tick);}
    invalidate.current=(immediate=false)=>schedule(immediate);
    const onInput=(event:Event)=>{const e=event as InputEvent;if(e.target instanceof HTMLTextAreaElement&&e.target.id.startsWith('input-')){wake();if(preferences.typingAnimation&&e.inputType==='insertText')flash={input:e.target,count:e.data?.length||1};schedule()}};
    const onKey=(event:KeyboardEvent)=>{if(event.target===active){wake();schedule()}};
    const onSelection=()=>schedule();
    const onFocus=()=>{focused=document.hasFocus();wake();schedule(true,true)};
    const onBlur=()=>{focused=false;sleep();};
    const onDocumentFocus=()=>{focused=document.hasFocus();wake();schedule(false,true)};
    const onFocusOut=()=>schedule();
    const onVisibility=()=>{if(document.hidden)onBlur();else onFocus()};
    const onGeometry=()=>schedule(true,true);
    const onScroll=()=>schedule(true);
    const onPointerDown=(event:PointerEvent)=>{if(event.target instanceof HTMLTextAreaElement&&event.target.id.startsWith('input-')){selecting=true;sleep()}};
    const onPointerUp=()=>{selecting=false;schedule(true)};
    const onCompositionStart=(event:CompositionEvent)=>{if(event.target instanceof HTMLTextAreaElement&&event.target.id.startsWith('input-')){composing=true;sleep()}};
    const onCompositionEnd=()=>{composing=false;wake();schedule(true)};
    const events:[EventTarget,string,EventListener,boolean?][]=[
      [document,'input',onInput],[document,'keydown',onKey as EventListener],[document,'keyup',onKey as EventListener],[document,'selectionchange',onSelection],[document,'focusin',onDocumentFocus],[document,'focusout',onFocusOut],
      [document,'pointerdown',onPointerDown as EventListener,true],[document,'pointerup',onPointerUp,true],[document,'pointercancel',onPointerUp,true],[document,'compositionstart',onCompositionStart as EventListener],[document,'compositionend',onCompositionEnd],
      [window,'blur',onBlur],[window,'focus',onFocus],[document,'visibilitychange',onVisibility],[window,'scroll',onScroll,true],[window,'resize',onGeometry],
    ];
    for(const [target,name,handler,capture]of events)target.addEventListener(name,handler,capture);
    reduce.addEventListener('change',onGeometry);contrast.addEventListener('change',onGeometry);document.fonts.addEventListener('loadingdone',onGeometry);window.visualViewport?.addEventListener('resize',onGeometry);window.visualViewport?.addEventListener('scroll',onScroll);
    const theme=new MutationObserver(onGeometry);theme.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
    const editor=document.querySelector('.dc-editor-workspace');if(editor)observer.observe(editor);
    document.fonts.ready.then(()=>{if(!disposed)onGeometry()});schedule(true,true);
    return()=>{disposed=true;invalidate.current=null;if(frame!==null)cancelAnimationFrame(frame);clearTimeout(glowTimer);release();observer.disconnect();theme.disconnect();for(const [target,name,handler,capture]of events)target.removeEventListener(name,handler,capture);reduce.removeEventListener('change',onGeometry);contrast.removeEventListener('change',onGeometry);document.fonts.removeEventListener('loadingdone',onGeometry);window.visualViewport?.removeEventListener('resize',onGeometry);window.visualViewport?.removeEventListener('scroll',onScroll);};
  },[preferences]);
  useLayoutEffect(()=>{invalidate.current?.(previousZoom.current!==zoom);previousZoom.current=zoom},[layout,zoom]);
  return createPortal(<><div ref={caret} aria-hidden="true" className="dc-smooth-caret no-print"/><div ref={feedback} aria-hidden="true" className="dc-typing-feedback no-print"/></>,document.body);
}
