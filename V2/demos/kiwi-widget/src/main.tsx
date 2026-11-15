import React, {useState, useLayoutEffect, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight, ArrowLeft, ArrowDownToLine, Check as CheckIcon, ChevronDown, Headphones, Mic, Minus, Plane, RotateCcw, Luggage, ShieldCheck} from 'lucide-react';
import {Stage} from '../kit/stage';
import {Thread, Bubble} from '../kit/messages';
import {Collapse} from '../kit/motion/Collapse';
import {States} from '../kit/motion/States';
import {Check} from '../kit/parts/Check';
import {Row} from '../kit/parts/Row';
import type {Act} from '../kit/act';
import './widget.css';

type Scene = {phase: 'start'|'typing'|'options'|'booking'|'done'; pick: number|null; details:boolean};
const initial:Scene={phase:'options',pick:null,details:false};
const poster:Scene={phase:'done',pick:0,details:false};
const flights=[{dep:'16:40',arr:'18:10',flight:'TP 439',label:'Earliest arrival'},{dep:'20:10',arr:'21:40',flight:'TP 441',label:'Later departure'}];
async function script(a:Act<Scene>){
  a.mark('options');await a.wait(2800);
  await a.click({at:'flight-0',x:.8,y:.5});a.mark('selected');a.put({pick:0});
  await a.wait(1200);await a.click({at:'confirm',x:.68,y:.5});a.mark('booking');a.put({phase:'booking'});
  await a.wait(1400);a.mark('confirmed');a.put({phase:'done'});
  await a.move({wide:{x:460,y:720},compact:{x:330,y:720}});await a.wait(3800);
}
function Mark(){return <img className="brand-mark" src="/V2/kiwi-widget/kiwi.png" width="36" height="36" alt="Kiwi.com"/>}
function MindsayMark(){return <img className="mindsay-mark" src="/V2/kiwi-widget/mindsay.svg" width="17" height="17" alt="Powered by Mindsay"/>}
function Widget({s,onChange}:{s:Scene;onChange:(next:Scene)=>void}){
 const scroll=useRef<HTMLDivElement>(null), content=useRef<HTMLDivElement>(null);
 const bookingTimer=useRef<ReturnType<typeof setTimeout>>();
 useEffect(()=>()=>clearTimeout(bookingTimer.current),[]);
 const [minimized,setMinimized]=useState(false); const [support,setSupport]=useState(false);
 useLayoutEffect(()=>{
  const box=scroll.current,inner=content.current;if(!box||!inner)return;
  let frame=0,last=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target=()=>{
   const scale=box.getBoundingClientRect().width/box.offsetWidth||1;
   const end=Math.max(0,inner.getBoundingClientRect().height/scale-box.clientHeight);
   const reply=inner.querySelector<HTMLElement>('.resolution-intro');
   if(s.phase==='done'&&!s.details&&reply)return Math.min(end,Math.max(0,box.scrollTop+(reply.getBoundingClientRect().top-box.getBoundingClientRect().top)/scale-18));
   return end;
  };
  const tick=(time:number)=>{
   const dt=last?Math.min(time-last,40):16;last=time;
   const next=target(),delta=next-box.scrollTop;
   box.scrollTop=Math.abs(delta)<1?next:box.scrollTop+delta*(1-Math.exp(-dt/90));
   box.toggleAttribute('data-scrolled',box.scrollTop>2);
   if(Math.abs(next-box.scrollTop)>1)frame=requestAnimationFrame(tick);else{frame=0;last=0;}
  };
  const observer=new ResizeObserver(()=>{if(reduced){box.scrollTop=target();box.toggleAttribute('data-scrolled',box.scrollTop>2);}else if(!frame)frame=requestAnimationFrame(tick);});
  observer.observe(inner);observer.observe(box);frame=requestAnimationFrame(tick);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[s.phase,s.details]);
 const hasOptions=['options','booking','done'].includes(s.phase);
 const chosen=flights[s.pick??0];
 return <div className="widget" data-complete={s.phase==='done'||undefined} data-minimized={minimized||undefined}>
  <div className="widget-header"><Mark/><div className="header-copy"><div className="brand-name">Kiwi.com</div><div className="brand-caption">Here for your next connection</div></div><button className="icon-control" title="Contact support" aria-label="Contact support" onClick={()=>setSupport(!support)}><Headphones size={19}/></button><button className="icon-control" title={minimized?'Expand conversation':'Minimize conversation'} aria-label={minimized?'Expand conversation':'Minimize conversation'} onClick={()=>setMinimized(!minimized)}>{minimized?<ChevronDown size={19}/>:<Minus size={19}/>}</button></div>
  <div className="widget-main">
   <div className="conversation-scroll" aria-hidden={support} {...(support?{inert:''}:{})} ref={scroll} data-crop="scrolling conversation history">
    <div ref={content} className="conversation-content">
    <div className="thread-date">Today, 14:32</div>
    <Thread className="conversation" app="imessage">
     <Bubble from="them" tail={false}>Hi Maya, how can I help with your trip?</Bubble>
     <Bubble from="me" tail={false}>My flight to Lisbon was cancelled. Can I still get there today?</Bubble>

     <Collapse className="resolution-intro" open={s.phase!=='start'} reveal="drop">
      <Bubble from="them" tail={false} typing={s.phase==='typing'}>I found two alternatives for today. Both are covered by your protection.</Bubble>
     </Collapse>
     <Collapse open={hasOptions} reveal="drop">
      <div className="flight-card" data-booked={s.phase==='done'||undefined}>
       <div className="card-eyebrow">REPLACEMENT FLIGHTS <span>18 NOV</span></div>
       <div className="flight-options" role="radiogroup" aria-label="Replacement flight">
        {flights.map((f,i)=><Collapse key={f.flight} open={s.phase!=='done'||s.pick===i} aria-hidden={s.phase==='done'&&s.pick!==i}><button key={f.flight} type="button" role="radio" aria-checked={s.pick===i} className="flight-option" data-target={`flight-${i}`} data-cursor="pointer" data-on={s.pick===i||undefined} disabled={s.phase==='booking'||s.phase==='done'} onClick={()=>onChange({...s,pick:i})}>
         <span className="radio-mark"><CheckIcon size={12} style={{opacity:s.pick===i?1:0,transition:'opacity 180ms ease'}}/></span><span className="flight-copy"><span className="flight-time"><span>{f.dep}</span><ArrowRight size={14}/><span>{f.arr}</span></span><span className="flight-meta">TAP Air Portugal · Direct</span><span className="flight-note">{f.label}</span></span><span className="flight-price">€0<span>extra</span></span>
        </button></Collapse>)}
       </div>
       <Collapse open={s.phase!=='done'}><div className="included"><Luggage size={14}/><span>Cabin bags included for both travelers</span></div></Collapse>
       <button className="confirm-button" data-target="confirm" data-cursor="pointer" disabled={s.pick===null||s.phase==='booking'||s.phase==='done'} data-done={s.phase==='done'||undefined} data-busy={s.phase==='booking'||undefined} onClick={()=>{onChange({...s,phase:'booking'});bookingTimer.current=setTimeout(()=>onChange({...s,phase:'done'}),1000);}}>
        <States value={s.phase==='done'?'done':s.phase==='booking'?'busy':'idle'} states={{idle:<><span>Confirm flight</span><ArrowRight size={16}/></>,busy:<><Check on={false} pending size={16}/><span>Changing your flight</span></>,done:<><CheckIcon size={16}/><span>Flight changed</span></>}}/>
       </button>
      </div>
     </Collapse>
     <Collapse open={s.phase==='done'} reveal="drop" aria-hidden={s.phase!=='done'} {...(s.phase!=='done'?{inert:''}:{})}>
      <div className="confirmation" data-target="itinerary">
       <div className="confirmation-top"><span className="confirmed-icon"><ShieldCheck size={20}/></span><div><div className="confirmation-title">You’re back on track.</div><div className="confirmation-caption">Your new itinerary is ready.</div></div></div>
       <div className="boarding-route"><div><span>CDG</span><strong>{chosen.dep}</strong></div><div className="route-line"><Plane size={16}/><span>2h 30m · Direct</span></div><div><span>LIS</span><strong>{chosen.arr}</strong></div></div>
       <div className="boarding-meta">TAP Air Portugal · {chosen.flight}<span>18 Nov</span></div>
       <button className="itinerary-button" data-cursor="pointer" onClick={()=>onChange({...s,details:!s.details})}>{s.details?'Hide itinerary':'View itinerary'}{s.details?<ChevronDown size={16}/>:<ArrowDownToLine size={16}/>}</button>
       <Collapse open={s.details} reveal="drop" aria-hidden={!s.details} {...(!s.details?{inert:''}:{})}><div className="itinerary-details"><Row title="Maya & Alex" meta="2 travelers"/><Row title="Cabin baggage" meta="2 × 8 kg"/><Row title="Additional payment" meta="€0"/><div className="sample-note">Demo itinerary · no booking is made</div></div></Collapse>
      </div>
     </Collapse>
    </Thread>
    <div className="powered"><MindsayMark/></div>
    </div>
   </div>
   <div className="composer" aria-hidden={support} {...(support?{inert:''}:{})}><span>Type your message…</span><Mic size={17}/><button aria-label="Conversation options" className="composer-menu" onClick={()=>setSupport(!support)}><span></span><span></span><span></span></button></div>
   <div className="support-panel" data-open={support||undefined} aria-hidden={!support} {...(!support ? {inert:''} : {})}><button className="support-back" onClick={()=>setSupport(false)}><ArrowLeft size={16}/>Back</button><div className="support-heading">A little extra help?</div><div className="support-copy">Our team can help with anything the assistant can’t resolve.</div><button className="support-action" onClick={()=>setSupport(false)}>Continue this conversation<ArrowRight size={16}/></button><p>Interactive portfolio demo. No live support connection.</p></div>
  </div>
 </div>
}
function Demo(){
 const [run,setRun]=useState(0);const [manual,setManual]=useState<Scene|null>(null);
 return <main className="demo-page"><div className="demo-surface"><Stage key={run} width={520} height={820} compact={{below:500,width:358,height:780}} initial={initial} poster={poster} script={manual?undefined:script} play="once" cursor={manual?undefined:{at:{wide:{x:470,y:760},compact:{x:330,y:740}},idle:1100}} fidelity="realistic" greys="cool" theme="light" className="kiwi-demo">
 {(state)=><Widget s={manual??state} onChange={setManual}/>}
 </Stage></div><div className="demo-caption"><span>Fictional conversation · Kiwi.com</span><button type="button" className="replay" onClick={()=>{setManual(null);setRun(n=>n+1);}}><RotateCcw size={13}/>Replay</button></div></main>
}
createRoot(document.getElementById('root')!).render(<Demo/>);
