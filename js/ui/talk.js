/* Phase 3 (Conversation): either a live Gemini roleplay chat, or an offline scripted
   scenario when no key is set. Both mic inputs use the shared wireMicButton helper with a
   live interim caption while the learner speaks. */
import {S,effLevel} from '../state.js';
import {wordWrap,esc} from '../utils.js';
import {speak,speakQueued,wireMicButton} from '../speech.js';
import {hasKey,geminiCall,geminiStreamCall,openKeySheet} from '../gemini.js';
import {nextPhase} from './session.js';

export function renderTalk(body){
  const seg=`<div class="tabs" style="margin-bottom:14px">
      <button data-tm="ai" class="${S.talkMode==='ai'?'on':''}">⚡ AI 실시간</button>
      <button data-tm="scenario" class="${S.talkMode==='scenario'?'on':''}">🎭 시나리오(오프라인)</button>
    </div>`;
  function wire(){body.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{S.talkMode=b.dataset.tm;renderTalk(body);});}
  if(S.talkMode==='ai'&&!hasKey()){
    body.innerHTML=`<div class="card">${seg}
      <div class="setbox">⚡ 실시간 AI 대화는 본인 <b>Gemini 무료 키</b>가 필요해요. 키를 넣으면 상대가 실제로 반응하고, 답변마다 더 자연스러운 표현을 바로 알려줍니다.</div>
      <button class="btn" id="setKey">🔑 API 키 입력</button>
      <button class="btn ghost small" id="useScen" style="width:100%;margin-top:10px">키 없이 시나리오로 연습</button></div>`;
    wire();
    document.getElementById('setKey').onclick=openKeySheet;
    document.getElementById('useScen').onclick=()=>{S.talkMode='scenario';renderTalk(body);};
    return;
  }
  if(S.talkMode==='ai')return renderAIChat(body,seg,wire);
  return renderScenario(body,seg,wire);
}

function renderScenario(body,seg,wire){
  const sc=S.scen;let idx=0;S.run.answers=[];
  function turnView(){
    const turn=sc.turns[idx];
    body.innerHTML=`<div class="card">${seg}
      <h2 style="font-size:20px">${esc(sc.title)}</h2>
      <div class="setbox">🎬 ${esc(sc.setting)}</div>
      <div class="prog">${idx+1} / ${sc.turns.length}</div>
      <div class="rolelabel">상대</div>
      <div class="pline"><div class="en lookup">${wordWrap(turn.p.en)}</div><div class="ko hidden" id="pko">${esc(turn.p.ko)}</div></div>
      <div class="row" style="margin-top:8px"><button class="btn ghost small" id="pSay">🔊 다시 듣기</button><button class="btn ghost small" id="pKoBtn">한국어 보기</button></div>
      <div class="rolelabel">내 대답 — 말하거나 입력</div>
      <div class="composer"><button class="iconbtn" id="mic" title="말하기">🎙</button><textarea id="ans" rows="1" placeholder="영어로 답해보세요…"></textarea></div>
      <div class="interim" id="ansInterim"></div>
      <div id="modelWrap"></div>
      <div class="row"><button class="btn small" id="showModel">모범답안 보기</button><button class="btn ghost small" id="nextTurn">${idx===sc.turns.length-1?'리뷰로 →':'다음 →'}</button></div></div>`;
    wire();speak(turn.p.en);
    const ans=document.getElementById('ans');
    ans.addEventListener('input',()=>{ans.style.height='auto';ans.style.height=Math.min(ans.scrollHeight,120)+'px';});
    document.getElementById('pSay').onclick=()=>speak(turn.p.en);
    document.getElementById('pKoBtn').onclick=()=>document.getElementById('pko').classList.toggle('hidden');
    wireMicButton(document.getElementById('mic'),{
      interimEl:document.getElementById('ansInterim'),
      onFinalText:t=>{if(t){ans.value=(ans.value+' '+t).trim();ans.dispatchEvent(new Event('input'));}}
    });
    document.getElementById('showModel').onclick=()=>{
      document.getElementById('modelWrap').innerHTML=`<div class="rolelabel">모범답안</div>
        <div class="model"><div class="en lookup">${wordWrap(turn.m.en)}</div><div class="ko">${esc(turn.m.ko)}</div>
        <div class="act" style="margin-top:8px"><button id="mSay" style="font-size:12.5px;color:var(--accent);font-weight:600">🔊 듣기</button></div></div>`;
      document.getElementById('mSay').onclick=()=>speak(turn.m.en);};
    document.getElementById('nextTurn').onclick=()=>{
      S.run.answers[idx]={p:turn.p,m:turn.m,your:document.getElementById('ans').value.trim()};
      if(idx<sc.turns.length-1){idx++;turnView();}else nextPhase();};
  }
  turnView();
}

/* System prompt for the streamed reply itself — plain text only (no JSON), which
   keeps latency low and lets the response be spoken sentence-by-sentence as it
   streams in instead of waiting for the whole thing. */
function aiReplySystem(){
  const L=effLevel();
  const role=S.mode==="work"?"You are a friendly coworker chatting in English with a Korean engineer who is practicing.":"You are a warm friend chatting casually in English with a Korean speaker who is practicing.";
  const lvl=L==="beg"?"Keep your English very simple and short (beginner). Use common words and basic sentence patterns.":L==="adv"?"Use rich, natural, challenging English (advanced): idioms, phrasal verbs, and longer multi-clause sentences. Push the learner with varied vocabulary.":"Use natural intermediate English.";
  const idiom=S.mode==="daily"?"\n- Naturally weave in common everyday idioms and phrasal verbs that native speakers actually use (e.g., hang out, grab a bite, hit it off, no biggie, catch up, I'm down, for sure).":"";
  return `${role}
- Keep each reply to 1-2 sentences, then ask ONE follow-up question.
- ${lvl}${idiom}
- Natural spoken American English (contractions, casual phrasing).
Reply with PLAIN TEXT ONLY — exactly what you'd say out loud. No JSON, no markdown, no quote marks around it.`;
}
/* Separate, background-only prompt for the "better way to say it" correction chip —
   split out from the reply so the learner isn't stuck waiting on a slower
   structured-output call just to hear the next line of conversation. */
function aiCorrectionSystem(){
  const L=effLevel();
  return `You are an English tutor for a Korean learner, reviewing ONE thing they just said in a conversation.
Suggest a more natural version of their message${L==="adv"?", and when useful offer a more sophisticated upgrade":""}. If it was already natural, say so.
Return ONLY JSON: {"better":"more natural version, or empty if already good","note":"short Korean nuance note, or empty"}`;
}
function renderAIChat(body,seg,wire){
  body.innerHTML=`<div class="card">${seg}
    <div class="eyebrow">AI 실시간 · ${S.mode==="work"?"Business":"Daily"}</div>
    <div class="chat" id="chat" aria-live="polite"></div>
    <div class="composer"><button class="iconbtn" id="mic" title="말하기">🎙</button>
      <textarea id="msg" rows="1" placeholder="영어로 답해보세요…"></textarea><button class="iconbtn send" id="send">➤</button></div>
    <div class="interim" id="msgInterim"></div>
    <p class="lead" style="font-size:12.5px;margin:10px 0 0">마이크로 말하면 자동으로 전송돼요. 답변마다 더 자연스러운 표현을 바로 알려줘요. 교정은 🕘 이력에 자동 저장.</p></div>`;
  wire();
  const chat=document.getElementById('chat'),msg=document.getElementById('msg');
  msg.addEventListener('input',()=>{msg.style.height='auto';msg.style.height=Math.min(msg.scrollHeight,120)+'px';});
  msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  document.getElementById('send').onclick=send;
  wireMicButton(document.getElementById('mic'),{
    interimEl:document.getElementById('msgInterim'),
    onFinalText:t=>{if(t){msg.value=(msg.value+' '+t).trim();msg.dispatchEvent(new Event('input'));send();}}
  });
  if(S.chat.length===0)kickoff();else S.chat.forEach(m=>bubble(m.role,m.content));
  function bubble(role,text){const d=document.createElement('div');d.className='bub '+(role==='assistant'?'ai':'me');
    if(role==='assistant'&&text){d.classList.add('lookup');d.innerHTML=wordWrap(text);}else d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d;}
  function fbChip(better,note){const d=document.createElement('div');const good=!better;d.className='fbchip'+(good?' good':'');
    if(good){d.innerHTML=`<div class="h">👍 NATURAL</div><div class="n">자연스러운 표현이었어요.</div>`;}
    else{d.innerHTML=`<div class="h">💡 BETTER WAY TO SAY IT</div><div class="b">${esc(better)}</div>${note?`<div class="n">${esc(note)}</div>`:''}<button data-rep>🔊 천천히 따라 말하기</button>`;
      d.querySelector('[data-rep]').onclick=()=>speak(better,.62);}
    chat.appendChild(d);chat.scrollTop=chat.scrollHeight;}
  /* Streams the reply into `bubbleEl`, speaking each finished sentence the moment
     it appears rather than waiting for the whole reply — this is the "실시간 느낌" part. */
  async function streamReplyIntoBubble(history,sys,bubbleEl){
    let acc='',spokenTo=0;
    const full=await geminiStreamCall(history,sys,chunk=>{
      acc+=chunk;
      bubbleEl.classList.remove('think');bubbleEl.classList.add('lookup');
      bubbleEl.innerHTML=wordWrap(acc);chat.scrollTop=chat.scrollHeight;
      const tail=acc.slice(spokenTo);
      const m=tail.match(/^[\s\S]*?[.!?](?=\s|$)/);
      if(m){speakQueued(acc.slice(spokenTo,spokenTo+m[0].length).trim(),.92);spokenTo+=m[0].length;}
    });
    const rest=full.slice(spokenTo).trim();
    if(rest)speakQueued(rest,.92);
    return full;
  }
  /* Background correction call — fire-and-forget so it never blocks the reply. */
  async function fetchCorrection(userText){
    try{
      const context=S.chat.slice(-6).map(m=>(m.role==='user'?'Learner: ':'Partner: ')+m.content).join('\n');
      const prompt=`Recent conversation:\n${context}\n\nThe learner's last message was: "${userText}"`;
      const r=await geminiCall([{role:'user',content:prompt}],aiCorrectionSystem(),true);
      const better=(r.better||'').trim();
      fbChip(better,(r.note||'').trim());
      if(better){const {logMistake}=await import('../history.js');await logMistake({you:userText,better,note:(r.note||'').trim(),source:'AI대화'});}
    }catch(e){/* correction feedback is supplementary — a failure here shouldn't interrupt the chat */}
  }
  async function kickoff(){const t=bubble('assistant','');t.classList.add('think');
    try{
      const reply=await streamReplyIntoBubble([{role:'user',content:'Start the conversation with a short warm greeting and one question.'}],aiReplySystem(),t);
      S.chat.push({role:'assistant',content:reply||"Hey! How's it going?"});S.run.aiUsed=true;
    }catch(e){t.classList.remove('think');t.textContent="Hey! Great to see you. How's your day going?";S.chat.push({role:'assistant',content:t.textContent});aiError(e);}}
  async function send(){const text=msg.value.trim();if(!text)return;msg.value='';msg.style.height='auto';
    bubble('user',text);S.chat.push({role:'user',content:text});S.run.aiUsed=true;
    const t=bubble('assistant','');t.classList.add('think');
    try{
      const reply=await streamReplyIntoBubble(S.chat,aiReplySystem(),t);
      S.chat.push({role:'assistant',content:reply||"Got it — tell me more!"});
      fetchCorrection(text);
    }catch(e){t.classList.remove('think');t.textContent="음… 다시 한 번 말해줄래요?";aiError(e);}}
  async function aiError(e){const {toast}=await import('../toast.js');toast("Gemini 호출 오류 — 키/모델을 확인하세요",'err');}
}
