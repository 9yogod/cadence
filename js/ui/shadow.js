/* Phase 2 (Shadowing): paragraph or sentence-by-sentence listen-and-repeat, plus a
   read-aloud pronunciation check that grades against speech recognition. */
import {S,effLevel} from '../state.js';
import {levelLabel,wordWrap,esc,lcsMatch} from '../utils.js';
import {speak,wireMicButton} from '../speech.js';
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
  document.getElementById('stopS').onclick=()=>speechSynthesis.cancel();
  body.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(sents[+b.dataset.say].en,.92));
  body.querySelectorAll('[data-slow]').forEach(b=>b.onclick=()=>speak(sents[+b.dataset.slow].en,.6));
  document.getElementById('saveGloss').onclick=async()=>{const {addNotes}=await import('../notes.js');const {toast}=await import('../toast.js');await addNotes(r.glossary);toast("표현을 노트에 저장했어요 📒");};
}

function pickLong(){const L=effLevel();let f=LONGSHADOW.filter(x=>x.mode===S.mode&&x.level===L);if(!f.length)f=LONGSHADOW.filter(x=>x.mode===S.mode);if(!f.length)f=LONGSHADOW;return f[(S.stats.sessions||0)%f.length];}
async function genParagraph(){
  const L=effLevel();const modeTxt=S.mode==='work'?'business and work life':'everyday life and culture';
  const lvl=L==='beg'?'simple beginner vocabulary and short-to-medium sentences':L==='adv'?'advanced vocabulary, idioms, and longer multi-clause sentences':'natural intermediate English';
  const sys="You write ORIGINAL short English opinion-column passages for read-aloud shadowing practice by a Korean learner. Write your OWN words; never copy any real article. Flowing, natural prose with good spoken rhythm. Return ONLY JSON.";
  const prompt=`Write an ORIGINAL newspaper-column-style passage of about 8-10 sentences (one flowing paragraph) in English on a timely, interesting topic related to ${modeTxt}. Use ${lvl}. It should read naturally aloud. Return JSON: {"title":"short title","paragraph":"the passage as one paragraph","glossary":[{"en":"useful phrase from the passage","ko":"Korean meaning"} x4],"summary_ko":"one-sentence Korean summary"}`;
  return await geminiCall([{role:'user',content:prompt}],sys,true);
}
async function renderShadowParagraph(body,seg){
  let p=S.paraPassage;
  if(!p){
    if(hasKey()){
      body.innerHTML=`<div class="card">${seg}<div class="eyebrow">Shadowing · 문단</div><h2 style="font-size:20px">지문 준비 중…</h2><p class="lead"><span class="spin dark"></span> AI가 새 칼럼형 지문을 쓰고 있어요.</p></div>`;
      bindSeg(body);
      try{p=await genParagraph();}catch(e){p=pickLong();const {toast}=await import('../toast.js');toast('AI 지문 생성 실패 — 내장 지문으로 대체','err');}
    }else{p=pickLong();}
    S.paraPassage=p;
  }
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
      ${hasKey()?`<button class="btn ghost small" id="regen">🔄 새 지문</button>`:''}
    </div>
    <div class="script read lookup" id="paraText">${wordWrap(para)}</div>
    <div class="gloss"><h4>Key expressions</h4>${gloss.map(g=>`<div class="g"><b>${esc(g.en)}</b><span>${esc(g.ko)}</span></div>`).join('')}</div>
    <button class="btn ghost small" id="saveGloss" style="margin-top:12px">＋ 이 표현들 노트에 저장</button>
    <div style="border-top:1px solid var(--line);margin:18px 0 0;padding-top:16px">
      <div class="eyebrow" style="margin-bottom:6px">발음 체크</div>
      <p class="lead" style="font-size:13px;margin:0 0 12px">버튼을 누르고 위 지문을 <b>소리 내어 읽어보세요</b>. 다 읽으면 다시 눌러 멈춰요. 읽은 걸 원문과 대조해 어색하게 걸린 단어를 짚어드려요.</p>
      <button class="btn" id="pronBtn">🎙 읽고 발음 체크</button>
      <div class="interim" id="pronInterim"></div>
      <div id="pronResult"></div>
    </div>
  </div>
  <p class="lead" style="text-align:center;font-size:13px">💡 모르는 단어는 <b>탭</b>하거나 <b>드래그</b>하면 뜻이 나와요.</p>`;
  bindSeg(body);
  document.getElementById('listen').onclick=()=>speak(para,.92);
  document.getElementById('listenSlow').onclick=()=>speak(para,.68);
  document.getElementById('stopS').onclick=()=>speechSynthesis.cancel();
  document.getElementById('saveGloss').onclick=async()=>{const {addNotes}=await import('../notes.js');const {toast}=await import('../toast.js');await addNotes(gloss);toast("표현을 노트에 저장했어요 📒");};
  const rg=document.getElementById('regen');
  if(rg)rg.onclick=()=>{S.paraPassage=null;renderShadow(body);};

  /* pronunciation check: unified mic wiring with live interim caption */
  const pronBtn=document.getElementById('pronBtn');
  const pronInterim=document.getElementById('pronInterim');
  const pronResult=document.getElementById('pronResult');
  wireMicButton(pronBtn,{
    continuous:true,
    interimEl:pronInterim,
    onStart:()=>{pronBtn.textContent='⏹ 멈추고 채점';pronResult.innerHTML='';},
    onStop:()=>{pronBtn.textContent='🎙 읽고 발음 체크';},
    onFinalText:said=>gradePron(para,said,pronResult)
  });
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
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px"><div class="acc">${acc}%</div><div style="color:var(--muted);font-size:13px">읽기 일치도 · ${hit}/${refN.length} 단어</div></div>
      ${top.length?`<div style="font-size:13px;color:var(--muted);margin-bottom:4px">걸린 단어(발음 확인 추천) — 눌러서 천천히 듣기</div>
        <div>${top.map(w=>`<button class="pill bad" data-pw="${esc(w)}">${esc(w)} 🔊</button>`).join('')}</div>`:`<div class="summary" style="background:#EEF7F1">깔끔하게 읽혔어요! 👏</div>`}
      <div id="pronTip"></div>
    </div>`;
  resultEl.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>speak(b.dataset.pw,.55));
  // log a few to history
  const {logMistake,logScore}=await import('../history.js');
  for(const w of top.slice(0,5))await logMistake({you:'(발음 불명확)',better:w,note:'발음 체크에서 걸린 단어',source:'발음'});
  await logScore('pronunciation',acc);
  // AI pronunciation tips if key
  if(hasKey()&&top.length){
    const tipEl=document.getElementById('pronTip');
    tipEl.innerHTML=`<p class="lead" style="font-size:13px;margin-top:10px"><span class="spin dark"></span> 발음 팁 생성 중…</p>`;
    try{
      const sys="You are a pronunciation coach for a Korean English learner. Return ONLY JSON.";
      const prompt=`The learner read this text aloud:\n"${ref}"\nSpeech recognition heard:\n"${said}"\nThe following words likely came out unclear or awkward: ${top.join(', ')}.\nGive 2-4 concise Korean pronunciation tips for those words (stress, vowel/consonant sounds, linking). Return JSON: {"tips":[{"word":"...","tip":"Korean tip"}]}`;
      const r=await geminiCall([{role:'user',content:prompt}],sys,true);
      tipEl.innerHTML=`<div class="summary" style="margin-top:12px"><b>🗣 발음 팁</b><br>${(r.tips||[]).map(t=>`• <b>${esc(t.word)}</b> — ${esc(t.tip)}`).join('<br>')}</div>`;
    }catch(e){tipEl.innerHTML='';}
  }else if(top.length){
    document.getElementById('pronTip').innerHTML=`<p class="lead" style="font-size:12.5px;margin-top:10px">🔊 버튼으로 원어민 발음을 천천히 듣고 따라 해보세요. (Gemini 키를 넣으면 단어별 한국어 발음 팁도 받을 수 있어요.)</p>`;
  }
}
