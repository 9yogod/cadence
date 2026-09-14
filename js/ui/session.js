/* The 4-phase session shell: header timer/waveform/progress steps, phase switching, and
   session completion. Dispatches into review.js / shadow.js / talk.js / wrapup.js per phase. */
import {S,PHASES,store,bumpSkill,effLevel,markPracticeDay} from '../state.js';
import {fmt,pick,daysBetween} from '../utils.js';
import {SHADOW} from '../data/shadow.js';
import {SCEN} from '../data/scenarios.js';
import {renderReview} from './review.js';
import {renderShadow} from './shadow.js';
import {renderTalk} from './talk.js';
import {renderReviewPhase} from './wrapup.js';
import {cancelSpeech} from '../speech.js';

function pickShadow(){const lvl=effLevel();let f=SHADOW.filter(x=>x.mode===S.mode&&x.level===lvl);if(!f.length)f=SHADOW.filter(x=>x.mode===S.mode);return f[(S.stats.sessions||0)%f.length];}

export function startSession(){
  S.phase=0;S.run={mistakes:0,lookups:0,expr:0,answers:[],aiUsed:false};
  S.passage=pickShadow();S.scen=pick(SCEN,S.mode,S.stats.sessions);S.chat=[];S.paraPassage=null;
  S.talkMode="ai";
  renderSession();goPhase(0);
}

export function renderSession(){
  const app=document.getElementById('app');
  app.innerHTML=`
    <div class="stage">
      <div class="stagetop">
        <div class="phaselabel">단계 <span id="pIdx">1</span>/4<br><b id="pName">표현 복습</b></div>
        <div class="timer" id="timer">3:00</div>
      </div>
      <div class="wave" id="wave">${Array.from({length:36}).map(()=>'<i></i>').join('')}</div>
      <div class="steps" id="steps">${PHASES.map(()=>'<span></span>').join('')}</div>
      <div class="ctl">
        <button id="backBtn">← 이전</button>
        <button id="pauseBtn">⏸ 일시정지</button>
        <button id="skipBtn" class="primary">다음 단계 →</button>
      </div>
    </div>
    <div id="phaseBody"></div>`;
  document.getElementById('backBtn').onclick=prevPhase;
  document.getElementById('pauseBtn').onclick=togglePause;
  document.getElementById('skipBtn').onclick=nextPhase;
}

export function goPhase(i){
  S.phase=i;const p=PHASES[i];
  document.getElementById('pIdx').textContent=i+1;
  document.getElementById('pName').textContent=p.name;
  document.querySelectorAll('#steps span').forEach((s,idx)=>{s.className=idx<i?'past':idx===i?'on':'';});
  S.remaining=p.sec;startTimer();
  document.getElementById('backBtn').disabled=(i===0);
  document.getElementById('skipBtn').textContent=i===PHASES.length-1?'세션 완료 ✓':'다음 단계 →';
  const body=document.getElementById('phaseBody');
  if(p.key==="review")renderReview(body);
  if(p.key==="shadow")renderShadow(body);
  if(p.key==="talk")renderTalk(body);
  if(p.key==="feedback")renderReviewPhase(body);
}

export function nextPhase(){if(S.phase<PHASES.length-1)goPhase(S.phase+1);else finishSession();}
export function prevPhase(){if(S.phase>0)goPhase(S.phase-1);}

function startTimer(){clearInterval(S.tick);S.running=true;
  document.getElementById('pauseBtn').textContent='⏸ 일시정지';paintWave();updateTimerUI();
  S.tick=setInterval(()=>{if(S.remaining>0){S.remaining--;updateTimerUI();paintWave();}
    else{clearInterval(S.tick);S.running=false;const w=document.getElementById('wave');if(w)w.classList.remove('live');import('../toast.js').then(({toast})=>toast("⏱ 시간 종료 — 준비되면 다음 단계로"));}},1000);}

function togglePause(){const b=document.getElementById('pauseBtn');
  if(S.running){clearInterval(S.tick);S.running=false;b.textContent='▶ 계속하기';document.getElementById('wave').classList.remove('live');}else startTimer();}

function updateTimerUI(){const t=document.getElementById('timer');if(!t)return;t.textContent=fmt(S.remaining);t.classList.toggle('warn',S.remaining<=30);}

function paintWave(){const w=document.getElementById('wave');if(!w)return;
  const p=PHASES[S.phase];const frac=1-(S.remaining/p.sec);const bars=w.children;const n=bars.length;
  for(let k=0;k<n;k++){const done=k/n<=frac;bars[k].className=done?'done':'';bars[k].style.height=done?(28+((k*37)%10)*4)+'%':'22%';bars[k].style.animationDelay=(k*0.04)+'s';}
  w.classList.toggle('live',S.running);}

export async function finishSession(){
  clearInterval(S.tick);cancelSpeech();
  const today=new Date().toISOString().slice(0,10);
  await markPracticeDay({countSession:true});
  const rec={date:today,mode:S.mode,topic:S.scen?S.scen.title:'',mistakes:S.run.mistakes,lookups:S.run.lookups,expr:S.run.expr,t:Date.now()};
  S.sessionRecs.push(rec);if(S.sessionRecs.length>100)S.sessionRecs=S.sessionRecs.slice(-100);
  await store.set("log:sessions",S.sessionRecs);
  {const m=S.run.mistakes,lk=S.run.lookups;let d;if(m<=1&&lk<=1)d=6;else if(m<=3)d=2;else if(m>=6||lk>=6)d=-6;else d=-1;await bumpSkill(d);}
  const app=document.getElementById('app');
  app.innerHTML=`<div class="card" style="text-align:center">
    <div class="eyebrow">Session complete</div><h2 style="font-size:28px;margin:8px 0">잘했어요 ✓</h2><p class="lead">오늘도 33분을 채웠어요.</p>
    <div style="display:flex;gap:12px;justify-content:center;margin:6px 0 22px">
      <div><div style="font-size:30px;font-weight:700;color:var(--accent)">${S.stats.sessions}</div><div style="font-size:12px;color:var(--muted)">누적 세션</div></div>
      <div><div style="font-size:30px;font-weight:700;color:var(--live)">${S.stats.streak}🔥</div><div style="font-size:12px;color:var(--muted)">연속일</div></div>
      <div><div style="font-size:30px;font-weight:700">${S.notes.length}</div><div style="font-size:12px;color:var(--muted)">저장된 표현</div></div></div>
    <button class="btn" id="again">새 세션 시작</button>
    <button class="btn ghost small" id="viewHist" style="width:100%;margin-top:10px">🕘 이력 보기</button></div>`;
  const {renderStart}=await import('./start.js');
  const {renderHistory}=await import('../history.js');
  document.getElementById('again').onclick=renderStart;
  document.getElementById('viewHist').onclick=()=>renderHistory('sessions');
}
