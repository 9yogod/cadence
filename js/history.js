/* Logging (mistakes/lookups) + the History screen (three tabs: mistakes / lookups / sessions). */
import {S,store} from './state.js';
import {esc} from './utils.js';
import {speak,cancelSpeech} from './speech.js';
import {toast} from './toast.js';
import {scoreChartHTML,wireScoreChart} from './ui/progress-chart.js';

export async function logMistake(m){if(!m||!m.better)return;
  S.mistakes.push({...m,date:new Date().toISOString().slice(0,10),t:Date.now()});
  if(S.mistakes.length>300)S.mistakes=S.mistakes.slice(-300);
  await store.set("log:mistakes",S.mistakes);if(S.run)S.run.mistakes++;}

export async function logLookup(l){
  S.lookups.push({...l,date:new Date().toISOString().slice(0,10),t:Date.now()});
  if(S.lookups.length>300)S.lookups=S.lookups.slice(-300);
  await store.set("log:lookups",S.lookups);if(S.run)S.run.lookups++;}

/* type: 'dictation' | 'pronunciation' — feeds the History screen's 진척(progress) tab */
export async function logScore(type,acc){
  S.scores.push({date:new Date().toISOString().slice(0,10),t:Date.now(),type,acc});
  if(S.scores.length>500)S.scores=S.scores.slice(-500);
  await store.set("log:scores",S.scores);}

function emptyState(msg){return `<div class="empty">${msg}</div>`;}

export function renderHistory(tab){
  cancelSpeech();clearInterval(S.tick);tab=tab||'mistakes';
  const app=document.getElementById('app');
  const modeK=m=>m==='work'?'업무':'일상';let inner='';
  if(tab==='sessions'){const recs=S.sessionRecs.slice().reverse();
    inner=recs.length?recs.map(r=>`<div class="hrow"><div class="top"><span class="date">${r.date}</span><span class="src">${modeK(r.mode)}</span></div>
      ${r.topic?`<div class="ko" style="margin-bottom:6px">${esc(r.topic)}</div>`:''}
      <div style="display:flex;gap:16px;font-size:13px"><span>❌ 틀린 <b>${r.mistakes||0}</b></span><span>📒 새 표현 <b>${r.expr||0}</b></span><span>🔍 찾아본 <b>${r.lookups||0}</b></span></div></div>`).join(''):emptyState('아직 완료한 세션이 없어요.');}
  if(tab==='mistakes'){const ms=S.mistakes.slice().reverse();
    inner=ms.length?ms.map((m,ri)=>{const i=S.mistakes.length-1-ri;return `<div class="hrow"><div class="top"><span class="date">${m.date}</span><span class="src">${esc(m.source||'')}</span></div>
      <div class="you">${esc(m.you||'')}</div><div class="bet">${esc(m.better||'')}</div>${m.note?`<div class="note">${esc(m.note)}</div>`:''}
      <div class="mini"><button data-saym="${i}">🔊 듣기</button> · <button data-add="${i}">＋ 노트에 저장</button></div></div>`;}).join(''):emptyState('아직 기록된 틀린 표현이 없어요.<br>AI대화·받아쓰기·리뷰에서 나온 교정이 여기 모여요.');}
  if(tab==='lookups'){const ls=S.lookups.slice().reverse();
    inner=ls.length?ls.map((l,ri)=>{const i=S.lookups.length-1-ri;return `<div class="hrow"><div class="top"><span class="en">${esc(l.term||'')}</span><span class="date">${l.date}</span></div>
      ${l.ko?`<div class="ko">${esc(l.ko)}</div>`:`<div class="ko" style="color:var(--muted)">뜻 미기록</div>`}
      <div class="mini"><button data-sayl="${i}">🔊 듣기</button>${l.ko?` · <button data-addl="${i}">＋ 노트에 저장</button>`:''}</div></div>`;}).join(''):emptyState('아직 찾아본 표현이 없어요.<br>연습 중 모르는 단어를 탭하면 여기 쌓여요.');}
  if(tab==='progress'){
    const scores=S.scores;
    if(!scores.length){inner=emptyState('아직 채점 기록이 없어요.<br>받아쓰기나 쉐도잉 발음 체크를 하면 정확도 추이가 여기 쌓여요.');}
    else{
      const now=Date.now();
      const last7=scores.filter(s=>now-s.t<=7*86400000);
      const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b.acc,0)/arr.length):null;
      const avg7=avg(last7),avgAll=avg(scores);
      const recent=scores.slice(-20);
      inner=`
        <div style="display:flex;gap:12px;justify-content:center;margin:2px 0 18px">
          <div><div style="font-size:26px;font-weight:700;color:var(--accent)">${avg7==null?'–':avg7+'%'}</div><div style="font-size:11.5px;color:var(--muted)">최근 7일 평균</div></div>
          <div><div style="font-size:26px;font-weight:700">${avgAll==null?'–':avgAll+'%'}</div><div style="font-size:11.5px;color:var(--muted)">전체 평균</div></div>
          <div><div style="font-size:26px;font-weight:700;color:var(--live)">${S.stats.streak||0}🔥</div><div style="font-size:11.5px;color:var(--muted)">연속일</div></div>
        </div>
        ${scoreChartHTML(recent)}
        <p class="lead" style="font-size:12px;text-align:center;margin:0">차트에 손가락/마우스를 올리면 날짜별 정확도가 보여요 · 최근 ${recent.length}개 기록</p>`;
    }
  }
  const count=tab==='sessions'?S.sessionRecs.length:tab==='mistakes'?S.mistakes.length:tab==='progress'?S.scores.length:S.lookups.length;
  app.innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div><div class="eyebrow">History · 이력</div><h2 style="font-size:22px">내 학습 기록</h2></div>
      <button class="btn ghost small" id="hback">← 홈</button></div>
    <div class="tabs">
      <button data-tab="mistakes" class="${tab==='mistakes'?'on':''}">틀린 표현</button>
      <button data-tab="lookups" class="${tab==='lookups'?'on':''}">찾아본 표현</button>
      <button data-tab="progress" class="${tab==='progress'?'on':''}">진척</button>
      <button data-tab="sessions" class="${tab==='sessions'?'on':''}">세션</button></div>
    <div id="hlist">${inner}</div>
    ${count?`<button class="btn ghost small" id="hclear" style="width:100%;margin-top:8px;color:var(--live)">이 목록 초기화</button>`:''}</div>`;
  document.getElementById('hback').onclick=async()=>{const {renderStart}=await import('./ui/start.js');renderStart();};
  if(tab==='progress'&&S.scores.length)wireScoreChart(document.getElementById('hlist'),S.scores.slice(-20));
  app.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>renderHistory(b.dataset.tab));
  app.querySelectorAll('[data-saym]').forEach(b=>b.onclick=()=>speak(S.mistakes[+b.dataset.saym].better));
  app.querySelectorAll('[data-sayl]').forEach(b=>b.onclick=()=>speak(S.lookups[+b.dataset.sayl].term));
  app.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const {addNotes}=await import('./notes.js');const m=S.mistakes[+b.dataset.add];await addNotes([{en:m.better,ko:m.note||''}]);toast('노트에 저장했어요 📒');});
  app.querySelectorAll('[data-addl]').forEach(b=>b.onclick=async()=>{const {addNotes}=await import('./notes.js');const l=S.lookups[+b.dataset.addl];await addNotes([{en:l.term,ko:l.ko||''}]);toast('노트에 저장했어요 📒');});
  const clr=document.getElementById('hclear');
  if(clr)clr.onclick=async()=>{if(!confirm('이 목록을 모두 삭제할까요?'))return;
    if(tab==='sessions'){S.sessionRecs=[];await store.set('log:sessions',[]);}
    if(tab==='mistakes'){S.mistakes=[];await store.set('log:mistakes',[]);}
    if(tab==='lookups'){S.lookups=[];await store.set('log:lookups',[]);}
    if(tab==='progress'){S.scores=[];await store.set('log:scores',[]);}
    renderHistory(tab);};
}
