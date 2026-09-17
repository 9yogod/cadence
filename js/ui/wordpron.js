/* Word-level pronunciation drill on minimal pairs.

   Verification against real Gemini showed the sentence-level assessment resolves a
   mispronounced word to whatever the sentence makes likely - think read as "sink" came
   back as "think". The same words spoken on their own were heard correctly. So the
   contrasts Korean speakers actually lose are drilled here as words, where the model
   hears them, rather than in running speech, where it does not.

   Five words go in a single recording, judged in one request: at 20 free requests a day,
   a request per word would spend a quarter of the budget on one drill. */
import {S,markPracticeDay} from '../state.js';
import {esc,shuffle} from '../utils.js';
import {speak,cancelSpeech} from '../speech.js';
import {hasKey,openKeySheet} from '../gemini.js';
import {MINIMAL_PAIRS} from '../data/minimal-pairs.js';

const PER_ROUND = 5;

function shell(inner){
  return `<div class="card">${inner}</div>
    <button class="btn ghost small" id="wpHome" style="width:100%">← 홈으로</button>`;
}
function wireHome(){
  const b=document.getElementById('wpHome');
  if(b)b.onclick=async()=>{cancelSpeech();const {renderStart}=await import('./start.js');renderStart();};
}

export function startWordPron(){
  cancelSpeech();clearInterval(S.tick);
  render(shuffle(MINIMAL_PAIRS.slice()).slice(0,PER_ROUND));
}

function listHTML(round,results){
  return round.map((p,i)=>{
    const r=results&&results[i];
    const state=!r?'':(r.correct?' ok':' bad');
    return `<div class="wp${state}">
      <div class="top">
        <span class="num">${i+1}</span>
        <b>${esc(p.a)}</b>
        <span class="vs">≠ ${esc(p.b)}</span>
        ${r?`<span class="mark">${r.correct?'✓':'✗'}</span>`:''}
        <button data-say="${i}" aria-label="${esc(p.a)} 발음 듣기">🔊</button>
      </div>
      ${r&&!r.correct?`<div class="heardline">${r.heard?`“${esc(r.heard)}”로 들렸어요`:'소리를 잡지 못했어요'}
        <button data-sayb="${i}" class="cmp">${esc(p.b)} 🔊</button></div>`:''}
      ${r&&!r.correct?`<div class="tip">💡 ${esc(p.tip)}</div>`:''}
      ${r&&r.note?`<div class="note">${esc(r.note)}</div>`:''}
    </div>`;
  }).join('');
}

function render(round,results,notice){
  const app=document.getElementById('app');
  const done=!!results;
  const score=done?Math.round(results.filter(r=>r.correct).length/round.length*100):0;
  app.innerHTML=shell(`
    <div class="eyebrow">Word drill · 단어 발음</div>
    <h2 style="font-size:21px">헷갈리는 소리만 골라서</h2>
    <p class="lead">아래 <b>${round.length}개 단어를 하나씩 또박또박</b> 읽어주세요. 한 번에 녹음해서 ${hasKey()?'AI가 한꺼번에 채점해요 <b>(요청 1회)</b>':'연습할 수 있어요'}.
      옆의 단어는 <b>발음이 무너지면 그렇게 들리는 단어</b>예요.</p>
    ${done?`<div class="wpscore"><div class="acc">${score}</div><div>${results.filter(r=>r.correct).length}/${round.length} 정확</div></div>`:''}
    ${notice?`<div class="s1notice">${esc(notice)}</div>`:''}
    <div class="wplist">${listHTML(round,results)}</div>
    <div class="interim" id="wpInterim" style="text-align:center"></div>
    ${hasKey()
      ?`<button class="btn" id="wpRec" style="margin-top:14px">🎙 ${done?'다시 읽고 채점받기':'읽고 채점받기'}</button>`
      :`<button class="btn ghost" id="wpKey" style="margin-top:14px">🔑 키를 넣으면 AI가 채점해요</button>`}
    <div class="row">
      <button class="btn ghost small" id="wpAll">🔊 전체 듣기</button>
      <button class="btn ghost small" id="wpNew">다른 단어로</button>
    </div>`);

  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(round[+b.dataset.say].a,.6));
  app.querySelectorAll('[data-sayb]').forEach(b=>b.onclick=()=>speak(round[+b.dataset.sayb].b,.6));
  document.getElementById('wpAll').onclick=()=>speak(round.map(p=>p.a).join(', '),.6);
  document.getElementById('wpNew').onclick=()=>render(shuffle(MINIMAL_PAIRS.slice()).slice(0,PER_ROUND));
  const key=document.getElementById('wpKey');
  if(key)key.onclick=openKeySheet;
  const rec=document.getElementById('wpRec');
  if(rec)wireRecorder(rec,round);
  wireHome();
}

function wireRecorder(btn,round){
  let rec=null,busy=false;
  const interim=document.getElementById('wpInterim');
  btn.onclick=async()=>{
    if(busy)return;
    if(rec){
      const r=rec;rec=null;busy=true;
      btn.textContent='채점 중…';btn.classList.remove('mic-live');btn.disabled=true;
      interim.textContent='';
      try{
        const take=await r.stop();
        if(take.silent){render(round,null,'소리가 거의 녹음되지 않았어요. 마이크에 가까이 대고 다시 읽어보세요.');return;}
        const results=await judge(round,take);
        render(round,results);
      }catch(e){
        const {geminiErrorText}=await import('../gemini.js');
        render(round,null,'채점하지 못했어요. '+geminiErrorText(e));
      }finally{busy=false;}
      return;
    }
    const {audioRecSupported,startRecording}=await import('../audio-rec.js');
    if(!audioRecSupported())return render(round,null,'이 브라우저는 녹음을 지원하지 않아요. Chrome이나 Safari에서 열어주세요.');
    try{rec=await startRecording({onAutoStop:()=>{if(rec)btn.click();}});}
    catch(e){rec=null;return render(round,null,'마이크를 쓸 수 없어요. 권한을 허용하거나, 카톡·네이버 안에서 열었다면 Chrome으로 열어주세요.');}
    btn.textContent='⏹ 다 읽었어요 · 채점받기';btn.classList.add('mic-live');
    interim.innerHTML='<b>🎙 녹음 중</b> — 번호 순서대로 한 단어씩, 사이를 살짝 쉬어주세요';
  };
}

async function judge(round,take){
  const {geminiAudioCall}=await import('../gemini.js');
  const {WORDPRON_SYSTEM,wordPronPrompt}=await import('../pron-prompt.js');
  const r=await geminiAudioCall(wordPronPrompt(round),take.wavBase64,WORDPRON_SYSTEM);
  const raw=Array.isArray(r.words)?r.words:[];
  const results=round.map((p,i)=>{
    const w=raw.find(x=>x&&(+x.index===i+1||String(x.target||'').toLowerCase()===p.a.toLowerCase()))||{};
    return {correct:r.audible!==false&&w.correct===true,heard:String(w.heard||''),note:String(w.note||'')};
  });
  await markPracticeDay();
  const {logMistake,logScore}=await import('../history.js');
  for(let i=0;i<round.length;i++){
    if(results[i].correct)continue;
    await logMistake({you:results[i].heard?`(${results[i].heard})`:'(발음 불명확)',better:round[i].a,
      note:`${round[i].group} 대조 · ${round[i].tip}`,source:'단어발음'});
  }
  await logScore('pron-word',Math.round(results.filter(x=>x.correct).length/round.length*100));
  return results;
}
