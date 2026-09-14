/* 1-minute speech: pick a topic, talk for sixty seconds, get it back corrected.

   The gap this fills: the app could already drill set sentences (shadowing) and
   back-and-forth exchanges (conversation), but nothing made you hold the floor alone.
   That is what interviews, presentations and speaking tests actually ask for, and it is
   where your own gaps surface rather than the ones a script chose for you.

   It also closes the loop the rest of the app was missing. Corrections here go to the
   mistake log and the saved expressions, which the SRS deck schedules, which the
   5-minute review then drills - so a phrase you fumbled today comes back tomorrow.

   Works without a Gemini key (transcript + pace, self-review) and without a microphone
   (type instead), because in-app browsers block getUserMedia. */
import {S,markPracticeDay,effLevel} from '../state.js';
import {esc,wordWrap,shuffle} from '../utils.js';
import {speak,cancelSpeech,wireMicButton} from '../speech.js';
import {hasKey,geminiCall,openKeySheet} from '../gemini.js';
import {addNotes} from '../notes.js';
import {TOPICS} from '../data/topics.js';

const SECONDS = 60;

function pickTopic(){
  const lvl=effLevel();
  let pool=TOPICS.filter(t=>t.mode===S.mode&&t.level===lvl);
  if(!pool.length)pool=TOPICS.filter(t=>t.mode===S.mode);
  if(!pool.length)pool=TOPICS;
  return shuffle(pool.slice())[0];
}

function shell(inner){
  return `<div class="card">${inner}</div>
    <button class="btn ghost small" id="s1home" style="width:100%">← 홈으로</button>`;
}

function wireHome(){
  const b=document.getElementById('s1home');
  if(b)b.onclick=async()=>{clearInterval(S.tick);cancelSpeech();const {renderStart}=await import('./start.js');renderStart();};
}

export function startSpeech1(){
  cancelSpeech();clearInterval(S.tick);
  renderTopic(pickTopic());
}

let startedAt=0;
function elapsed(){return startedAt?Math.min(SECONDS,Math.round((Date.now()-startedAt)/1000)):0;}

/* ---- 1. topic ---- */
function renderTopic(topic,notice){
  const app=document.getElementById('app');
  app.innerHTML=shell(`
    <div class="eyebrow">1-minute speech</div>
    <h2 style="font-size:21px">1분 동안 혼자 말하기</h2>
    <p class="lead">주제를 보고 <b>60초</b> 동안 영어로 말해보세요. 끝나면 받아적은 내용을 보여드리고${hasKey()?', 어색한 부분을 고쳐드려요.':' 스스로 점검할 수 있어요.'}</p>
    <div class="s1topic">
      <div class="en lookup">${wordWrap(topic.en)}</div>
      <div class="ko">${esc(topic.ko)}</div>
    </div>
    <div class="s1hints">
      <div class="eyebrow" style="margin-bottom:7px">이 순서로 말하면 쉬워요</div>
      ${topic.hints.map((h,i)=>`<div class="s1hint"><b>${i+1}</b>${esc(h)}</div>`).join('')}
    </div>
    ${notice?`<div class="s1notice">${esc(notice)}</div>`:''}
    <button class="btn" id="s1start" style="margin-top:18px">🎙 시작하기 · 60초</button>
    <div class="interim" id="s1interim" style="text-align:center"></div>
    <div class="row">
      <button class="btn ghost small" id="s1topicSay">🔊 주제 듣기</button>
      <button class="btn ghost small" id="s1other">다른 주제</button>
      <button class="btn ghost small" id="s1type">⌨ 입력으로</button>
    </div>`);
  document.getElementById('s1topicSay').onclick=()=>speak(topic.en);
  document.getElementById('s1other').onclick=()=>renderTopic(pickTopic());
  document.getElementById('s1type').onclick=()=>renderTranscript(topic,'',0);

  /* The start button IS the mic button: recording has to begin inside the tap that
     asked for it, or the browser refuses the microphone. The caption element is looked
     up lazily because renderRecording() replaces the DOM the moment recording starts. */
  const btn=document.getElementById('s1start');
  /* onStop runs on both a clean finish and a failure (denied mic, no engine); only the
     clean one is followed by onFinalText. Without this, a blocked microphone left the
     user watching a 60-second countdown that was recording nothing - which is exactly
     what happens inside an in-app browser. */
  let gotTranscript=false;
  wireMicButton(btn,{
    interimEl:liveCaption(),
    continuous:true,
    onStart:()=>{gotTranscript=false;renderRecording(topic,btn);},
    onFinalText:t=>{clearInterval(S.tick);gotTranscript=true;renderTranscript(topic,t,elapsed());},
    onStop:()=>{
      clearInterval(S.tick);
      setTimeout(()=>{
        if(!gotTranscript&&document.getElementById('s1timer'))
          renderTopic(topic,'마이크를 쓸 수 없어요. 아래 “⌨ 입력으로”를 누르면 입력으로 연습할 수 있어요. (카톡·네이버 안의 브라우저는 마이크가 막혀 있어요)');
      },250);
    }
  });
  wireHome();
}

/* A stand-in element whose writes are forwarded to whatever caption is on screen now. */
function liveCaption(){
  return {
    set textContent(v){const el=document.getElementById('s1interim');if(el)el.textContent=v;},
    get textContent(){const el=document.getElementById('s1interim');return el?el.textContent:'';},
    set innerHTML(v){const el=document.getElementById('s1interim');if(el)el.innerHTML=v;},
    get innerHTML(){const el=document.getElementById('s1interim');return el?el.innerHTML:'';},
    classList:{
      add(c){const el=document.getElementById('s1interim');if(el)el.classList.add(c);},
      remove(c){const el=document.getElementById('s1interim');if(el)el.classList.remove(c);}
    }
  };
}

/* ---- 2. recording ---- */
function renderRecording(topic,micBtn){
  startedAt=Date.now();
  const app=document.getElementById('app');
  app.innerHTML=shell(`
    <div class="eyebrow">Recording</div>
    <div class="s1timerwrap"><div class="timer" id="s1timer">1:00</div></div>
    <div class="s1ring"><span id="s1ring" style="width:100%"></span></div>
    <div class="s1topic small">
      <div class="en">${esc(topic.en)}</div>
      <div class="ko">${esc(topic.ko)}</div>
    </div>
    <div class="s1hints compact">${topic.hints.map((h,i)=>`<div class="s1hint"><b>${i+1}</b>${esc(h)}</div>`).join('')}</div>
    <div class="interim" id="s1interim" style="min-height:2.4em"></div>
    <button class="btn" id="s1stop" style="margin-top:14px">■ 그만 말하기</button>`);

  let left=SECONDS;
  const tick=()=>{
    left--;
    const tEl=document.getElementById('s1timer'), ring=document.getElementById('s1ring');
    if(tEl){tEl.textContent='0:'+String(Math.max(0,left)).padStart(2,'0');tEl.classList.toggle('warn',left<=10);}
    if(ring)ring.style.width=Math.max(0,left/SECONDS*100)+'%';
    if(left<=0){clearInterval(S.tick);micBtn.click();}   // click toggles the recorder off
  };
  clearInterval(S.tick);S.tick=setInterval(tick,1000);
  document.getElementById('s1stop').onclick=()=>{clearInterval(S.tick);micBtn.click();};
  wireHome();
}

/* ---- 3. transcript ---- */
function renderTranscript(topic,text,secs){
  clearInterval(S.tick);cancelSpeech();
  const app=document.getElementById('app');
  const typed=!secs;
  app.innerHTML=shell(`
    <div class="eyebrow">Your answer</div>
    <h2 style="font-size:20px">${typed?'영어로 입력해 보세요':'이렇게 말씀하셨어요'}</h2>
    <div class="s1topic small"><div class="en">${esc(topic.en)}</div><div class="ko">${esc(topic.ko)}</div></div>
    <p class="lead" style="font-size:12.5px;margin:12px 0 6px">${typed?'마이크를 쓸 수 없는 환경이면 여기에 입력하세요.':'잘못 받아적힌 부분이 있으면 고쳐주세요. 고친 내용으로 교정해 드려요.'}</p>
    <textarea id="s1text" class="s1text" rows="6" placeholder="여기에 영어로 입력…">${esc(text||'')}</textarea>
    <div class="s1stats" id="s1stats"></div>
    <button class="btn" id="s1feedback" style="margin-top:14px">${hasKey()?'✓ 교정받기':'✓ 점검하기'}</button>
    <div class="row"><button class="btn ghost small" id="s1retry">🎙 다시 말하기</button><button class="btn ghost small" id="s1new">새 주제</button></div>`);

  const ta=document.getElementById('s1text'), st=document.getElementById('s1stats');
  const stats=()=>{
    const w=(ta.value.trim().match(/\S+/g)||[]).length;
    const wpm=secs?Math.round(w/secs*60):0;
    st.innerHTML=`<span><b>${w}</b> 단어</span>${secs?`<span><b>${secs}</b>초</span><span><b>${wpm}</b> WPM</span>`:''}`;
  };
  ta.addEventListener('input',stats);stats();
  document.getElementById('s1retry').onclick=()=>renderTopic(topic);
  document.getElementById('s1new').onclick=()=>renderTopic(pickTopic());
  document.getElementById('s1feedback').onclick=async()=>{
    const v=ta.value.trim();
    if(!v){const {toast}=await import('../toast.js');return toast('먼저 말하거나 입력해 주세요','err');}
    renderFeedback(topic,v,secs);
  };
  wireHome();
}

/* ---- 4. feedback ---- */
async function renderFeedback(topic,text,secs){
  const app=document.getElementById('app');
  await markPracticeDay();

  if(!hasKey())return renderSelfCheck(topic,text,secs);

  app.innerHTML=shell(`<div class="eyebrow">Feedback</div><h2 style="font-size:20px">교정 중…</h2>
    <p class="lead"><span class="spin dark"></span> 방금 말한 내용을 살펴보고 있어요.</p>`);
  wireHome();
  try{
    const sys="You are a supportive English coach for a Korean learner practicing a 1-minute spoken answer. The text is a speech transcript, so ignore punctuation and capitalization. Judge content and phrasing, not transcription artifacts. Return ONLY JSON.";
    const prompt=`Topic: ${topic.en}\n\nLearner's spoken answer:\n${text}\n\nReturn JSON: {"summary":"2 warm Korean sentences: what worked + one thing to focus on","corrections":[{"you":"the learner's awkward phrase, quoted","better":"natural version","note":"short Korean why"} up to 4, [] if none],"expressions":[{"en":"a natural phrase they could have used for THIS topic","ko":"Korean"} x3],"structure":"1 Korean sentence on whether the answer was organized and complete for a 1-minute response"}`;
    const r=await geminiCall([{role:'user',content:prompt}],sys,true);

    await addNotes(r.expressions||[]);
    const {logMistake}=await import('../history.js');
    for(const c of (r.corrections||[]))await logMistake({you:c.you,better:c.better,note:c.note,source:'1분스피치'});

    const w=(text.match(/\S+/g)||[]).length;
    app.innerHTML=shell(`
      <div class="eyebrow">Feedback</div><h2 style="font-size:20px">오늘의 1분</h2>
      <div class="summary">${esc(r.summary||'')}</div>
      ${r.structure?`<div class="s1struct"><b>구성</b> ${esc(r.structure)}</div>`:''}
      <div class="s1stats" style="margin:14px 0"><span><b>${w}</b> 단어</span>${secs?`<span><b>${secs}</b>초</span><span><b>${Math.round(w/secs*60)}</b> WPM</span>`:''}</div>
      ${(r.corrections&&r.corrections.length)?`<div class="eyebrow" style="margin-bottom:10px">고쳐볼 부분</div>
        ${r.corrections.map((c,i)=>`<div class="fb"><div class="you">${esc(c.you)}</div><div class="bet lookup">${wordWrap(c.better)}</div>
          <div class="note">${esc(c.note||'')}</div>
          <div class="mini"><button data-fbsay="${i}">🔊 듣기</button></div></div>`).join('')}`
        :`<div class="summary" style="background:var(--surface-2)">큰 오류 없이 잘 이어갔어요 👍</div>`}
      <div class="eyebrow" style="margin:16px 0 10px">노트에 저장된 표현 (${(r.expressions||[]).length}) · 복습에 나와요</div>
      ${(r.expressions||[]).map((e,i)=>`<div class="exp"><div class="en lookup">${wordWrap(e.en)}</div><div class="ko">${esc(e.ko)}</div>
        <div class="mini"><button data-exsay="${i}">🔊 듣기</button></div></div>`).join('')}
      <button class="btn" id="s1again" style="margin-top:16px">새 주제로 한 번 더</button>`);
    app.querySelectorAll('[data-fbsay]').forEach(b=>b.onclick=()=>speak(r.corrections[+b.dataset.fbsay].better));
    app.querySelectorAll('[data-exsay]').forEach(b=>b.onclick=()=>speak(r.expressions[+b.dataset.exsay].en));
    document.getElementById('s1again').onclick=()=>renderTopic(pickTopic());
    const {toast}=await import('../toast.js');
    const n=(r.corrections||[]).length;
    toast(n?`교정 ${n}개가 이력에 기록됐어요 🕘`:'표현이 노트에 저장됐어요 📒');
  }catch(e){
    app.innerHTML=shell(`<div class="eyebrow">Feedback</div><h2 style="font-size:20px">교정을 불러오지 못했어요</h2>
      <p class="lead">Gemini 연결이나 키를 확인하고 다시 시도해 주세요. 말한 내용은 아래에 그대로 있어요.</p>
      <div class="s1said">${esc(text)}</div>
      <button class="btn" id="s1retry2" style="margin-top:14px">다시 시도</button>`);
    document.getElementById('s1retry2').onclick=()=>renderFeedback(topic,text,secs);
  }
  wireHome();
}

/* No key: no AI, but a transcript you can actually inspect is still worth a lot. */
function renderSelfCheck(topic,text,secs){
  const app=document.getElementById('app');
  const w=(text.match(/\S+/g)||[]).length;
  const wpm=secs?Math.round(w/secs*60):0;
  const pace=!secs?'':wpm<90?'조금 천천히 말했어요. 원어민 대화는 보통 120~150 WPM이에요.'
    :wpm>170?'꽤 빠르게 말했어요. 또박또박 줄여도 좋아요.':'자연스러운 속도예요 (120~150 WPM 권장).';
  app.innerHTML=shell(`
    <div class="eyebrow">Self-check</div><h2 style="font-size:20px">스스로 점검하기</h2>
    <div class="s1stats" style="margin:10px 0 14px"><span><b>${w}</b> 단어</span>${secs?`<span><b>${secs}</b>초</span><span><b>${wpm}</b> WPM</span>`:''}</div>
    ${pace?`<div class="summary">${esc(pace)}</div>`:''}
    <div class="eyebrow" style="margin-bottom:8px">내가 말한 내용</div>
    <div class="s1said lookup">${wordWrap(text)}</div>
    <div class="eyebrow" style="margin:16px 0 8px">이 세 가지만 확인해 보세요</div>
    <div class="s1hints">
      ${topic.hints.map((h,i)=>`<div class="s1hint"><b>${i+1}</b>${esc(h)} — 말했나요?</div>`).join('')}
    </div>
    <p class="lead" style="font-size:13px;margin-top:14px">모르는 단어는 위 글에서 탭하면 뜻이 나와요.
      <b>Gemini 키</b>를 넣으면 어색한 표현을 직접 고쳐주고, 이 주제에 쓸 만한 표현을 노트에 넣어드려요.</p>
    <button class="btn" id="s1key" style="margin-top:8px">🔑 키 넣고 교정받기</button>
    <button class="btn ghost" id="s1again" style="margin-top:9px">새 주제로 한 번 더</button>`);
  document.getElementById('s1key').onclick=openKeySheet;
  document.getElementById('s1again').onclick=()=>renderTopic(pickTopic());
  wireHome();
}
