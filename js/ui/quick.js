/* 5-minute review: the spaced-repetition deck on its own, outside the 33-minute session.

   Why this exists: SRS pays off through small daily contact, but the deck only surfaced
   inside a 33-minute session, which nobody runs every day. Miss a day and the streak
   breaks; break the streak and the app stops getting opened. This is the version you
   can do standing on a platform.

   The drill is Korean → English on purpose. The warm-up phase inside the session shows
   both at once, which trains recognition; here the meaning is shown alone and you have
   to produce the English out loud before revealing it. Production is the harder and more
   transferable direction, and it's what a speaking app should be drilling.

   A card graded 다시 goes back to the end of the queue (twice at most, so pressing it
   repeatedly can't trap you) rather than waiting out its ten minutes off-screen. */
import {S,store,markPracticeDay} from '../state.js';
import {esc,wordWrap} from '../utils.js';
import {speak,cancelSpeech} from '../speech.js';
import {ensureAll,isDue,grade,dueLabel,pickForReview,dueCount} from '../srs.js';

const MAX_CARDS = 15;     // roughly five minutes at ~20s a card
const MAX_REQUEUE = 2;

function shell(inner){
  return `<div class="card">${inner}</div>
    <button class="btn ghost small" id="qhome" style="width:100%">← 홈으로</button>`;
}

async function wireHome(){
  const b=document.getElementById('qhome');
  if(b)b.onclick=async()=>{const {renderStart}=await import('./start.js');renderStart();};
}

export async function startQuickReview(){
  cancelSpeech();clearInterval(S.tick);
  const app=document.getElementById('app');
  const now=Date.now();
  ensureAll(S.notes,now);

  if(!S.notes.length){
    app.innerHTML=shell(`<div class="eyebrow">Quick review</div>
      <h2 style="font-size:22px">복습할 표현이 아직 없어요</h2>
      <p class="lead">세션을 한 번 하시면 표현이 쌓이고, 그때부터 여기서 짧게 복습할 수 있어요.
        단어를 탭해서 뜻을 보거나 리뷰에서 ＋저장을 눌러도 쌓여요.</p>`);
    return wireHome();
  }

  const due=S.notes.filter(n=>isDue(n,now)).sort((a,b)=>(a.due||0)-(b.due||0));
  const ahead=due.length===0;
  const queue=(ahead?pickForReview(S.notes,5,now):due.slice(0,MAX_CARDS)).slice();

  const total=queue.length;
  const requeues=new Map();
  let done=0, revealed=false;

  function render(){
    if(!queue.length)return finish();
    const card=queue[0];
    const prompt=(card.ko||'').trim();
    const askRead=!prompt;   // no Korean recorded: fall back to a read-aloud drill
    const left=queue.length;
    const pct=total?Math.round(done/(done+left)*100):0;

    app.innerHTML=shell(`
      <div class="eyebrow">Quick review${ahead?' · 미리 복습':''} · 남은 ${left}개</div>
      <div class="qprog"><span style="width:${pct}%"></span></div>
      <div class="qask">${askRead?'이 표현을 소리 내어 읽어보세요':'영어로 소리 내어 말해보세요'}</div>
      <div class="qko">${askRead?wordWrap(card.en):esc(prompt)}</div>
      <div id="qans" class="${revealed?'':'hidden'}">
        <div class="qen lookup">${wordWrap(card.en)}</div>
        <button class="btn ghost small" id="qsay" style="width:100%;margin-top:10px">🔊 원어민 발음 듣기</button>
        <div class="grade" style="margin-top:14px">
          <button class="gbtn again" data-g="again">다시</button>
          <button class="gbtn hard"  data-g="hard">애매</button>
          <button class="gbtn good"  data-g="good">알아요</button>
        </div>
        <p class="lead" style="font-size:12px;text-align:center;margin:10px 0 0">기억난 정도를 고르면 그만큼 뒤에 다시 나와요</p>
      </div>
      ${revealed?'':`<button class="btn" id="qreveal" style="margin-top:18px">정답 확인</button>`}`);

    const rv=document.getElementById('qreveal');
    if(rv)rv.onclick=()=>{revealed=true;render();speak(card.en);};
    const say=document.getElementById('qsay');
    if(say)say.onclick=()=>speak(card.en);

    app.querySelectorAll('.gbtn').forEach(b=>b.onclick=async()=>{
      const q=b.dataset.g;
      grade(card,q,Date.now());
      await store.set("notes:expressions",S.notes);
      queue.shift();
      if(q==='again'){
        const n=(requeues.get(card)||0);
        if(n<MAX_REQUEUE){requeues.set(card,n+1);queue.push(card);}
        else done++;
      }else done++;
      revealed=false;
      render();
    });
    wireHome();
  }

  async function finish(){
    await markPracticeDay();     // keeps the streak alive; not counted as a full session
    const now2=Date.now();
    const stillDue=dueCount(S.notes,now2);
    const upcoming=S.notes.filter(n=>!isDue(n,now2)).sort((a,b)=>(a.due||0)-(b.due||0))[0];
    app.innerHTML=shell(`
      <div style="text-align:center">
        <div class="eyebrow">Quick review</div>
        <h2 style="font-size:26px;margin:8px 0">복습 완료 ✓</h2>
        <p class="lead">${done}개를 복습했어요.</p>
        <div style="display:flex;gap:14px;justify-content:center;margin:4px 0 20px">
          <div><div style="font-size:28px;font-weight:700;color:var(--accent)">${done}</div><div style="font-size:12px;color:var(--muted)">오늘 복습</div></div>
          <div><div style="font-size:28px;font-weight:700;color:var(--live)">${S.stats.streak}🔥</div><div style="font-size:12px;color:var(--muted)">연속일</div></div>
        </div>
        <p class="lead" style="font-size:13px">${stillDue?`아직 <b>${stillDue}개</b> 더 남아 있어요.`
          :upcoming?`다음 복습은 <b>${dueLabel(upcoming,now2)}</b>예요.`:'남은 복습이 없어요.'}</p>
        ${stillDue?`<button class="btn" id="qmore" style="margin-top:14px">이어서 복습하기</button>`:''}
        <button class="btn ghost" id="qsession" style="margin-top:9px">정규 세션 시작하기</button>
      </div>`);
    const more=document.getElementById('qmore');
    if(more)more.onclick=startQuickReview;
    document.getElementById('qsession').onclick=async()=>{const {startSession}=await import('./session.js');startSession();};
    wireHome();
  }

  render();
}
