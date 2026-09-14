/* Standalone dictation practice: listen, type what you hear, get graded locally (no AI needed). */
import {S,bumpSkill,effLevel} from './state.js';
import {esc,levelLabel,canonRef,canonAns,lcsMatch,casualTips} from './utils.js';
import {speak,cancelSpeech} from './speech.js';
import {DICT} from './data/dict.js';
import {TATOEBA} from './data/tatoeba.js';

function pickDict(level){let f=[...DICT,...TATOEBA].filter(d=>d.level===level);if(!f.length)f=DICT;return f[Math.floor(Math.random()*f.length)];}

export function startDictation(){
  clearInterval(S.tick);cancelSpeech();
  const app=document.getElementById('app');
  const dl=S.auto?effLevel():S.dictLevel;
  const item=pickDict(dl);
  app.innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><div class="eyebrow">Dictation · 받아쓰기 · ${levelLabel(dl)}${S.auto?' 🤖':''}</div><h2 style="font-size:22px">듣고 받아쓰기</h2></div>
      <button class="btn ghost small" id="dhome">← 홈</button></div>
    ${S.auto?`<div class="setbox" style="margin:8px 0 14px">🤖 자동 난이도 · 정확도에 맞춰 조절돼요 (현재 <b>${levelLabel(dl)}</b>)</div>`:`<div id="dlvl" class="tabs" style="margin:8px 0 14px">
      <button data-dl="beg" class="${S.dictLevel==='beg'?'on':''}">초급</button>
      <button data-dl="int" class="${S.dictLevel==='int'?'on':''}">중급</button>
      <button data-dl="adv" class="${S.dictLevel==='adv'?'on':''}">고급</button></div>`}
    <p class="lead">버튼을 눌러 듣고, 들리는 대로 영어로 받아써 보세요.</p>
    <div class="row" style="margin-bottom:14px"><button class="btn small" id="dplay">🔊 듣기</button><button class="btn ghost small" id="dslow">🐢 천천히</button><button class="btn ghost small" id="dstop">⏹</button></div>
    <div class="field"><label>받아쓴 영어 문장</label><textarea id="dinput" rows="2" style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--surface-2)" placeholder="Type what you hear…"></textarea></div>
    <button class="btn" id="dcheck" style="margin-top:14px">채점하기</button><div id="dresult"></div></div>`;
  document.getElementById('dhome').onclick=async()=>{const {renderStart}=await import('./ui/start.js');renderStart();};
  app.querySelectorAll('#dlvl button').forEach(b=>b.onclick=()=>{S.dictLevel=b.dataset.dl;startDictation();});
  document.getElementById('dplay').onclick=()=>speak(item.en,.9);
  document.getElementById('dslow').onclick=()=>speak(item.en,.6);
  document.getElementById('dstop').onclick=()=>cancelSpeech();
  setTimeout(()=>speak(item.en,.9),350);
  document.getElementById('dcheck').onclick=async()=>{
    const {toast}=await import('./toast.js');
    const {logMistake,logScore}=await import('./history.js');
    const attempt=document.getElementById('dinput').value.trim();if(!attempt){toast("먼저 들은 내용을 받아써 주세요");return;}
    cancelSpeech();
    const refW=canonRef(item.en).split(' '),youW=canonAns(attempt).split(' ').filter(Boolean);
    const matched=lcsMatch(refW,youW);const hit=matched.filter(Boolean).length;const acc=Math.round(hit/refW.length*100);
    const missed=item.en.split(/\s+/).filter((_,k)=>!matched[k]);
    const refHtml=item.en.split(/\s+/).map((w,k)=>matched[k]?esc(w):`<span class="missword">${esc(w)}</span>`).join(' ');
    if(acc<100)await logMistake({you:attempt,better:item.en,note:(missed.length?'놓친 단어: '+missed.join(', '):'')+(item.ko?' · '+item.ko:''),source:'받아쓰기'});
    await logScore('dictation',acc);
    {let d=acc>=92?5:acc>=75?1:acc<55?-6:-1;await bumpSkill(d);}
    document.getElementById('dresult').innerHTML=`<div style="margin-top:16px">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px"><div class="acc">${acc}%</div><div style="color:var(--muted);font-size:13px">정확도 · ${hit}/${refW.length} 단어</div></div>
      <div class="dcompare"><div class="drow ${acc===100?'hit':'miss'}"><div class="ref lookup">${refHtml}</div><div class="yr">내 답: <b>${esc(attempt)}</b></div><div class="nt">🇰🇷 ${esc(item.ko)}</div></div></div>
      ${missed.length?`<div class="summary">🗣 밑줄 친 <b>${esc(missed.join(', '))}</b>를 놓쳤어요. 다시 듣고 발음을 확인해 보세요.</div>`:`<div class="summary" style="background:#EEF7F1">완벽해요! 👏</div>`}
      ${(()=>{const tips=casualTips(item.en);return tips.length?`<div class="summary" style="background:#FFF7E8;border:1px solid #EAD9AE"><b>💡 회화 Tip</b><br>${tips.map(t=>`"${esc(t.std)}" 는 실제 대화에서 <b>${esc(t.casual)}</b> 로도 말해요 <button class="pill" data-tip="${esc(t.casual)}">🔊 ${esc(t.casual)}</button>`).join('<br>')}</div>`:'';})()}
      <div class="row"><button class="btn small" id="dagain">다음 문제 →</button><button class="btn ghost small" id="dreplay">🔊 다시 듣기</button></div></div>`;
    document.getElementById('dresult').querySelectorAll('[data-tip]').forEach(b=>b.onclick=()=>speak(b.dataset.tip.replace(/'/g,''),.9));
    document.getElementById('dagain').onclick=startDictation;
    document.getElementById('dreplay').onclick=()=>speak(item.en,.85);
    document.getElementById('dresult').scrollIntoView({behavior:'smooth',block:'center'});
  };
}
