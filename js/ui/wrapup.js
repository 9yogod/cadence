/* Phase 4 (Review): AI-analyzed corrections after an AI chat, or a self-review comparing the
   learner's scripted-scenario answers against the model answers. */
import {S} from '../state.js';
import {esc,wordWrap} from '../utils.js';
import {speak} from '../speech.js';
import {hasKey,geminiCall} from '../gemini.js';
import {addNotes} from '../notes.js';

export function renderReviewPhase(body){
  speechSynthesis.cancel();
  if(S.run.aiUsed&&hasKey())return renderAIReview(body);
  return renderSelfReview(body);
}

async function renderAIReview(body){
  body.innerHTML=`<div class="card"><div class="eyebrow">Review</div><h2 style="font-size:20px">교정 분석 중…</h2><p class="lead"><span class="spin dark"></span> 방금 대화를 살펴보고 있어요.</p></div>`;
  const userTurns=S.chat.filter(m=>m.role==='user');
  if(userTurns.length===0){body.innerHTML=`<div class="card"><div class="eyebrow">Review</div><h2 style="font-size:20px">대화 기록이 없어요</h2><p class="lead">다음엔 몇 마디라도 주고받아 보세요.</p></div>`;return;}
  try{
    const transcript=S.chat.map(m=>(m.role==='user'?'Learner: ':'Partner: ')+m.content).join('\n');
    const sys="You are a supportive English coach for a Korean learner. Analyze ONLY the learner's lines. Return ONLY JSON.";
    const prompt=`Conversation:\n${transcript}\n\nReturn JSON: {"summary":"2 warm Korean sentences: strengths + one focus","corrections":[{"you":"awkward learner phrase","better":"natural version","note":"short Korean why"} up to 4, [] if none],"expressions":[{"en":"useful phrase to save","ko":"Korean"} x3]}`;
    const r=await geminiCall([{role:'user',content:prompt}],sys,true);
    await addNotes(r.expressions||[]);
    const {logMistake}=await import('../history.js');
    for(const c of (r.corrections||[]))await logMistake({you:c.you,better:c.better,note:c.note,source:'AI대화'});
    body.innerHTML=`<div class="card"><div class="eyebrow">Review</div><h2 style="font-size:20px">오늘의 피드백</h2>
      <div class="summary">${esc(r.summary||'')}</div>
      ${(r.corrections&&r.corrections.length)?`<div class="eyebrow" style="margin-bottom:10px">고쳐볼 부분</div>
        ${r.corrections.map(c=>`<div class="fb"><div class="you">${esc(c.you)}</div><div class="bet lookup">${wordWrap(c.better)}</div><div class="note">${esc(c.note||'')}</div></div>`).join('')}`:`<div class="summary" style="background:var(--surface-2)">큰 오류 없이 잘 이어갔어요. 👍</div>`}
      <div class="eyebrow" style="margin:6px 0 10px">노트에 추가된 표현 (${(r.expressions||[]).length})</div>
      ${(r.expressions||[]).map(e=>`<div class="exp"><div class="en lookup">${wordWrap(e.en)}</div><div class="ko">${esc(e.ko)}</div></div>`).join('')}</div>`;
    const {toast}=await import('../toast.js');
    toast("표현 "+(r.expressions||[]).length+"개가 노트에 저장됐어요 📒");
  }catch(e){body.innerHTML=`<div class="card"><div class="eyebrow">Review</div><h2 style="font-size:20px">피드백을 불러오지 못했어요</h2><p class="lead">Gemini 연결/키를 확인하고 다시 시도해 주세요.</p></div>`;}
}

function renderSelfReview(body){
  const sc=S.scen;const ans=S.run.answers||[];
  body.innerHTML=`<div class="card"><div class="eyebrow">Self-review</div><h2 style="font-size:20px">내 답 vs 모범답안</h2>
    <div class="summary">잘 이어갔어요. 내 대답과 모범답안을 비교해 보고, 마음에 드는 표현은 저장, 어려웠던 표현은 이력에 기록해 두면 다음에 복습돼요.</div>
    ${sc.turns.map((turn,i)=>{const a=ans[i]||{};return `<div style="margin-bottom:18px">
      <div class="pline" style="margin-bottom:6px"><div class="en">🗨 ${esc(turn.p.en)}</div></div>
      <div class="yourans ${a.your?'has':''}">${a.your?esc(a.your):'(내 대답 없음)'}</div>
      <div class="model"><div class="en lookup">${wordWrap(turn.m.en)}</div><div class="ko">${esc(turn.m.ko)}</div></div>
      <div class="row" style="margin-top:6px"><button class="btn ghost small" data-say="${i}">🔊 모범답안</button><button class="btn ghost small" data-save="${i}">＋ 노트</button><button class="btn ghost small" data-hard="${i}">🕘 어려웠어요</button></div></div>`;}).join('')}</div>`;
  body.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(sc.turns[+b.dataset.say].m.en));
  body.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{const m=sc.turns[+b.dataset.save].m;await addNotes([{en:m.en,ko:m.ko}]);const {toast}=await import('../toast.js');toast('노트에 저장했어요 📒');});
  body.querySelectorAll('[data-hard]').forEach(b=>b.onclick=async()=>{const i=+b.dataset.hard;const m=sc.turns[i].m;const a=ans[i]||{};const {logMistake}=await import('../history.js');await logMistake({you:a.your||'(내 대답 없음)',better:m.en,note:m.ko,source:'대화'});const {toast}=await import('../toast.js');toast('이력에 기록했어요 🕘');});
}
