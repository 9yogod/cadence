/* Phase 2 (Shadowing): paragraph or sentence-by-sentence listen-and-repeat, plus a
   read-aloud pronunciation check that grades against speech recognition. */
import {S,effLevel} from '../state.js';
import {levelLabel,wordWrap,esc,lcsMatch} from '../utils.js';
import {speak,wireMicButton,cancelSpeech} from '../speech.js';
import {hasKey,geminiCall} from '../gemini.js';
import {LONGSHADOW} from '../data/longshadow.js';

export function renderShadow(body){
  if(!S.shadowView)S.shadowView='para';
  const seg=`<div class="tabs" style="margin-bottom:14px">
     <button data-sv="para" class="${S.shadowView==='para'?'on':''}">📄 문단 읽기</button>
     <button data-sv="sent" class="${S.shadowView==='sent'?'on':''}">🔤 문장별</button></div>`;
  if(S.shadowView==='sent')return renderShadowSentences(body,seg);
  return renderShadowParagraph(body,seg);
}
function bindSeg(body){body.querySelectorAll('.tabs [data-sv]').forEach(b=>b.onclick=()=>{S.shadowView=b.dataset.sv;renderShadow(body);});}

function renderShadowSentences(body,seg){
  const r=S.passage;const sents=r.sentences;const full=sents.map(s=>s.en).join(' ');
  body.innerHTML=`<div class="card">${seg}
    <div class="eyebrow">Shadowing · 문장별 · ${levelLabel(effLevel())}${S.auto?' 🤖':''}</div>
    <h2 style="font-size:20px">${esc(r.title)}</h2>
    <div class="row" style="margin:4px 0 16px"><button class="btn small" id="listen">🔊 전체 듣기</button><button class="btn ghost small" id="listenSlow">🐢 천천히</button><button class="btn ghost small" id="stopS">⏹</button></div>
    ${sents.map((s,i)=>`<div class="sent"><div class="num">SENTENCE ${i+1}</div>
      <div class="en lookup">${wordWrap(s.en)}</div><div class="pron">🗣 ${esc(s.pron)}</div><div class="ko">${esc(s.ko)}</div>
      <div class="act"><button data-say="${i}">🔊 듣기</button><button data-slow="${i}">🐢 천천히</button><span class="rep">따라 읽어보세요</span></div></div>`).join('')}
    <div class="gloss"><h4>Key expressions</h4>${r.glossary.map(g=>`<div class="g"><b>${esc(g.en)}</b><span>${esc(g.ko)}</span></div>`).join('')}</div>
    <button class="btn ghost small" id="saveGloss" style="margin-top:14px">＋ 이 표현들 노트에 저장</button></div>`;
  bindSeg(body);
  document.getElementById('listen').onclick=()=>speak(full,.92);
  document.getElementById('listenSlow').onclick=()=>speak(full,.7);
  document.getElementById('stopS').onclick=()=>cancelSpeech();
  body.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(sents[+b.dataset.say].en,.92));
  body.querySelectorAll('[data-slow]').forEach(b=>b.onclick=()=>speak(sents[+b.dataset.slow].en,.6));
  document.getElementById('saveGloss').onclick=async()=>{const {addNotes}=await import('../notes.js');const {toast}=await import('../toast.js');await addNotes(r.glossary);toast("표현을 노트에 저장했어요 📒");};
}

function pickLong(){const L=effLevel();let f=LONGSHADOW.filter(x=>x.mode===S.mode&&x.level===L);if(!f.length)f=LONGSHADOW.filter(x=>x.mode===S.mode);if(!f.length)f=LONGSHADOW;return f[(S.stats.sessions||0)%f.length];}
async function genParagraph(){
  const L=effLevel();const modeTxt=S.mode==='work'?'business and work life':'everyday life and culture';
  const lvl=L==='beg'?'simple beginner vocabulary and short-to-medium sentences':L==='adv'?'advanced vocabulary, idioms, and longer multi-clause sentences':'natural intermediate English';
  const sys="You write ORIGINAL short English opinion-column passages for read-aloud shadowing practice by a Korean learner. Write your OWN words; never copy any real article. Flowing, natural prose with good spoken rhythm. Return ONLY JSON.";
  const prompt=`Write an ORIGINAL newspaper-column-style passage of about 8-10 sentences (one flowing paragraph) in English on a timely, interesting topic related to ${modeTxt}. Use ${lvl}. It should read naturally aloud. Return JSON: {"title":"short title","paragraph":"the passage as one paragraph","paragraph_ko":"a full, natural Korean translation of the whole paragraph","glossary":[{"en":"useful phrase from the passage","ko":"Korean meaning"} x4],"summary_ko":"one-sentence Korean summary"}`;
  return await geminiCall([{role:'user',content:prompt}],sys,true);
}
async function renderShadowParagraph(body,seg){
  let p=S.paraPassage;
  /* Built-in passage by default. Generating one costs a Gemini request every time the
     shadowing phase opens - a third of a free day's budget across a session - and the
     🔄 새 지문 button already exists for when a fresh passage is actually wanted. */
  if(!p){p=pickLong();S.paraPassage=p;}
  paintPara(body,seg,p);
}
function paintPara(body,seg,p){
  const para=p.paragraph||'';
  const gloss=p.glossary||[];
  body.innerHTML=`<div class="card">${seg}
    <div class="eyebrow">Shadowing · 문단 · ${levelLabel(effLevel())}${S.auto?' 🤖':''}${hasKey()?' · AI':''}</div>
    <h2 style="font-size:20px">${esc(p.title||'Reading passage')}</h2>
    ${p.summary_ko?`<p class="lead" style="margin:2px 0 14px">${esc(p.summary_ko)}</p>`:''}
    <div class="row" style="margin:2px 0 14px">
      <button class="btn small" id="listen">🔊 전체 듣기</button>
      <button class="btn ghost small" id="listenSlow">🐢 천천히</button>
      <button class="btn ghost small" id="stopS">⏹</button>
      ${hasKey()?`<button class="btn ghost small" id="regen">🔄 AI 새 지문 (요청 1회)</button>`:''}
    </div>
    <div class="script read lookup" id="paraText">${wordWrap(para)}</div>
    ${p.paragraph_ko?`<div class="gloss"><h4>한글 해석</h4><p class="lead" style="margin:0;line-height:1.7">${esc(p.paragraph_ko)}</p></div>`:''}
    <div class="gloss"><h4>Key expressions</h4>${gloss.map(g=>`<div class="g"><b>${esc(g.en)}</b><span>${esc(g.ko)}</span></div>`).join('')}</div>
    <button class="btn ghost small" id="saveGloss" style="margin-top:12px">＋ 이 표현들 노트에 저장</button>
    <div style="border-top:1px solid var(--line);margin:18px 0 0;padding-top:16px">
      ${hasKey()?`<div class="eyebrow" style="margin-bottom:6px">AI 발음 평가</div>
      <p class="lead" style="font-size:13px;margin:0 0 12px">버튼을 누르고 위 지문을 <b>소리 내어 읽어보세요</b>. 다 읽으면 다시 눌러 멈춰요. 녹음을 AI가 <b>직접 듣고</b> 어떤 소리가 어긋났는지 짚어드려요.</p>
      <button class="btn" id="pronBtn">🎙 읽고 발음 평가받기</button>`
      :`<div class="eyebrow" style="margin-bottom:6px">읽기 일치도 체크</div>
      <p class="lead" style="font-size:13px;margin:0 0 12px">버튼을 누르고 위 지문을 <b>소리 내어 읽어보세요</b>. 음성인식이 원문 단어를 알아들었는지 대조해요.
        <span style="color:var(--muted)">이건 발음 평가가 아니에요 — 인식기는 문맥으로 단어를 보정하거든요. Gemini 키를 넣으면 AI가 녹음을 직접 듣고 발음을 평가해요.</span></p>
      <button class="btn" id="pronBtn">🎙 읽고 일치도 체크</button>`}
      <div class="interim" id="pronInterim"></div>
      <div id="pronResult"></div>
    </div>
  </div>
  <p class="lead" style="text-align:center;font-size:13px">💡 모르는 단어는 <b>탭</b>하거나 <b>드래그</b>하면 뜻이 나와요.</p>`;
  bindSeg(body);
  document.getElementById('listen').onclick=()=>speak(para,.92);
  document.getElementById('listenSlow').onclick=()=>speak(para,.68);
  document.getElementById('stopS').onclick=()=>cancelSpeech();
  document.getElementById('saveGloss').onclick=async()=>{const {addNotes}=await import('../notes.js');const {toast}=await import('../toast.js');await addNotes(gloss);toast("표현을 노트에 저장했어요 📒");};
  const rg=document.getElementById('regen');
  if(rg)rg.onclick=async()=>{
    rg.disabled=true;rg.textContent='만드는 중…';
    try{S.paraPassage=await genParagraph();}
    catch(e){
      S.paraPassage=pickLong();
      const {toast}=await import('../toast.js');const {geminiErrorText}=await import('../gemini.js');
      toast('내장 지문으로 대체했어요 — '+geminiErrorText(e),'err');
    }
    renderShadow(body);
  };

  /* pronunciation check: unified mic wiring with live interim caption */
  const pronBtn=document.getElementById('pronBtn');
  const pronInterim=document.getElementById('pronInterim');
  const pronResult=document.getElementById('pronResult');
  if(hasKey())return wireAIPron(pronBtn,pronInterim,pronResult,para);
  wireMicButton(pronBtn,{
    continuous:true,
    interimEl:pronInterim,
    onStart:()=>{pronBtn.textContent='⏹ 멈추고 대조';pronResult.innerHTML='';},
    onStop:()=>{pronBtn.textContent='🎙 읽고 일치도 체크';},
    onFinalText:said=>gradePron(para,said,pronResult)
  });
}

/* ---- AI pronunciation assessment: the model hears the recording itself ---- */
const PRON_BANDS=[[90,'원어민에 가깝게 또렷해요'],[75,'억양은 있지만 명확해요'],[60,'알아듣지만 어긋나는 소리가 있어요'],[40,'오류가 이해를 방해해요'],[0,'알아듣기 어려워요']];
const band=sc=>(PRON_BANDS.find(b=>sc>=b[0])||PRON_BANDS[PRON_BANDS.length-1])[1];

function wireAIPron(btn,interim,result,ref){
  let rec=null,busy=false;
  const idle=()=>{btn.textContent='🎙 읽고 발음 평가받기';btn.classList.remove('mic-live');btn.disabled=false;};
  btn.onclick=async()=>{
    if(busy)return;
    if(rec){                       // second tap: stop and assess
      const r=rec;rec=null;busy=true;
      btn.textContent='평가 중…';btn.classList.remove('mic-live');btn.disabled=true;
      interim.textContent='';
      try{
        const take=await r.stop();
        if(take.silent){
          result.innerHTML=`<div class="summary" style="margin-top:12px">소리가 거의 녹음되지 않았어요. 마이크에 가까이 대고 다시 읽어보세요.</div>`;
        }else{
          result.innerHTML=`<p class="lead" style="font-size:13px;margin-top:12px"><span class="spin dark"></span> AI가 녹음을 듣고 있어요… (${Math.round(take.ms/1000)}초)</p>`;
          await assessPron(ref,take,result);
        }
      }catch(e){
        const {geminiErrorText}=await import('../gemini.js');
        result.innerHTML=`<div class="summary" style="margin-top:12px">평가를 불러오지 못했어요. ${esc(geminiErrorText(e))}</div>`;
      }
      busy=false;idle();
      return;
    }
    /* first tap: the microphone has to be opened inside this tap */
    const {audioRecSupported,startRecording}=await import('../audio-rec.js');
    if(!audioRecSupported()){
      result.innerHTML=`<div class="summary" style="margin-top:12px">이 브라우저는 녹음을 지원하지 않아요. Chrome이나 Safari에서 열어주세요.</div>`;
      return;
    }
    result.innerHTML='';
    try{
      rec=await startRecording({onAutoStop:()=>{if(rec)btn.click();}});
    }catch(e){
      rec=null;
      result.innerHTML=`<div class="summary" style="margin-top:12px">마이크를 쓸 수 없어요. 권한을 허용하거나, 카톡·네이버 안에서 열었다면 Chrome으로 열어주세요.</div>`;
      return;
    }
    btn.textContent='⏹ 다 읽었어요 · 평가받기';btn.classList.add('mic-live');
    interim.innerHTML='<b>🎙 녹음 중</b> — 지문을 끝까지 읽고 버튼을 눌러주세요 (최대 60초)';
  };
}

async function assessPron(ref,take,result){
  const {geminiAudioCall}=await import('../gemini.js');
  const {PRON_SYSTEM,pronPrompt}=await import('../pron-prompt.js');
  const r=await geminiAudioCall(pronPrompt(ref),take.wavBase64,PRON_SYSTEM);
  const {logMistake,logScore}=await import('../history.js');

  if(r.audible===false){
    result.innerHTML=`<div class="summary" style="margin-top:12px">AI가 녹음을 제대로 알아듣지 못했어요. 조용한 곳에서 지문을 또박또박 다시 읽어보세요.
      ${r.heard?`<br><span style="font-size:12.5px;color:var(--muted)">들린 내용: “${esc(r.heard)}”</span>`:''}</div>`;
    return;
  }
  const sc=Math.max(0,Math.min(100,Math.round(+r.score||0)));
  const words=(Array.isArray(r.words)?r.words:[]).filter(w=>w&&w.word).slice(0,6);
  result.innerHTML=`
    <div style="margin-top:14px">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:4px"><div class="acc">${sc}</div><div style="color:var(--muted);font-size:13px">AI 발음 점수 · ${esc(band(sc))}</div></div>
      ${r.strengths?`<div class="summary" style="margin-top:8px">👍 ${esc(r.strengths)}${r.focus?`<br>🎯 ${esc(r.focus)}`:''}</div>`:''}
      ${r.fluency?`<div class="s1struct"><b>리듬</b> ${esc(r.fluency)}</div>`:''}
      ${words.length?`<div class="eyebrow" style="margin:16px 0 8px">어긋난 소리 — 🔊 눌러 원어민 발음 듣기</div>
        ${words.map((w,i)=>`<div class="pronw">
          <div class="top"><b>${esc(w.word)}</b>${w.heard?`<span class="heard">“${esc(w.heard)}”로 들림</span>`:''}<button data-pw="${i}" aria-label="발음 듣기">🔊</button></div>
          ${w.issue?`<div class="issue">${esc(w.issue)}</div>`:''}
          ${w.tip?`<div class="tip">💡 ${esc(w.tip)}</div>`:''}
        </div>`).join('')}`
        :`<div class="summary" style="background:#EEF7F1;margin-top:10px">뚜렷하게 어긋난 소리는 없었어요 👏</div>`}
      ${r.heard?`<details class="pronheard"><summary>AI가 들은 내용 확인하기</summary><div>${esc(r.heard)}</div></details>`:''}
      <p class="lead" style="font-size:11.5px;margin:10px 0 0">참고: 억양·빠뜨린 단어·잘못 읽은 단어는 잘 잡지만, 문장 속에서 think를 <i>sink</i>처럼 <b>다른 그럴듯한 단어로 바꿔 발음한 건</b> AI가 문맥상 맞는 단어로 알아듣고 놓치는 경우가 많아요. 그런 소리는 🔊로 원어민 발음과 직접 비교해 보세요.</p>
    </div>`;
  result.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>speak(words[+b.dataset.pw].word,.6));
  for(const w of words)await logMistake({you:w.heard?`(${w.heard})`:'(발음 불명확)',better:w.word,note:[w.issue,w.tip].filter(Boolean).join(' · '),source:'발음'});
  await logScore('pron-ai',sc);
}
async function gradePron(ref,said,resultEl){
  if(!said){resultEl.innerHTML=`<p class="lead" style="font-size:13px;margin-top:12px">인식된 말이 없어요. 조용한 곳에서 마이크에 가까이 다시 읽어보세요.</p>`;return;}
  const refTok=ref.split(/\s+/).filter(Boolean);
  const refN=refTok.map(w=>w.toLowerCase().replace(/[^a-z0-9']/g,''));
  const saidN=said.toLowerCase().replace(/[^a-z0-9'\s]/g,'').split(/\s+/).filter(Boolean);
  const matched=lcsMatch(refN,saidN);
  const hit=matched.filter(Boolean).length;
  const acc=Math.round(hit/refN.length*100);
  // problem words = ref words not matched (skip trivial stopwords)
  const stop=new Set(['a','an','the','and','or','but','of','to','in','on','is','it','i','you','we','that','this','so','as','at','for','be']);
  const bad=[];refTok.forEach((w,k)=>{if(!matched[k]){const c=refN[k];if(c&&c.length>2&&!stop.has(c)&&!bad.includes(w))bad.push(w.replace(/[.,!?;:"]/g,''));}});
  const top=bad.slice(0,10);
  resultEl.innerHTML=`
    <div style="margin-top:14px">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px"><div class="acc">${acc}%</div><div style="color:var(--muted);font-size:13px">인식 일치도 · ${hit}/${refN.length} 단어</div></div>
      ${top.length?`<div style="font-size:13px;color:var(--muted);margin-bottom:4px">인식되지 않은 단어 — 눌러서 천천히 듣기</div>
        <div>${top.map(w=>`<button class="pill bad" data-pw="${esc(w)}">${esc(w)} 🔊</button>`).join('')}</div>`:`<div class="summary" style="background:#EEF7F1">깔끔하게 읽혔어요! 👏</div>`}
      <div id="pronTip"></div>
    </div>`;
  resultEl.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>speak(b.dataset.pw,.55));
  // log a few to history
  const {logMistake,logScore}=await import('../history.js');
  for(const w of top.slice(0,5))await logMistake({you:'(발음 불명확)',better:w,note:'읽기 일치도 체크에서 인식되지 않은 단어',source:'읽기'});
  await logScore('reading',acc);
  if(top.length){
    document.getElementById('pronTip').innerHTML=`<p class="lead" style="font-size:12.5px;margin-top:10px">🔊 버튼으로 원어민 발음을 천천히 듣고 따라 해보세요. 인식기가 못 알아들은 단어라 발음 문제일 수도, 인식 오류일 수도 있어요.</p>`;
  }
}
