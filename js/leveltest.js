/* Short level diagnostic: 2 listen-and-type items per tier (beg/int/adv), reusing the
   same grading logic as standalone dictation. Result feeds S.auto/S.skill so the rest
   of the app (effLevel in state.js) picks it up automatically. */
import {S,store} from './state.js';
import {clamp,levelLabel,shuffle,canonRef,canonAns,lcsMatch} from './utils.js';
// (dictation prompts are audio-only here, so no text is ever inserted into the DOM — no esc() needed)
import {speak} from './speech.js';

const TIERS=['beg','int','adv'];
const TIER_KO={beg:'초급',int:'중급',adv:'고급'};

export async function startLevelTest(){
  const {DICT}=await import('./data/dict.js');
  const {TATOEBA}=await import('./data/tatoeba.js');
  const all=[...DICT,...TATOEBA];
  const items=TIERS.map(level=>{
    const pool=shuffle(all.filter(d=>d.level===level).slice());
    return {level,items:pool.slice(0,2)};
  });
  const flat=items.flatMap(g=>g.items.map(it=>({...it,level:g.level})));
  runTest(flat,0,[]);
}

function runTest(flat,idx,results){
  const app=document.getElementById('app');
  if(idx>=flat.length)return finishTest(flat,results);
  const item=flat[idx];
  app.innerHTML=`<div class="card">
    <div class="eyebrow">레벨 테스트 · ${idx+1}/${flat.length} · ${TIER_KO[item.level]}</div>
    <h2 style="font-size:20px">듣고 받아써 보세요</h2>
    <p class="lead">평소 받아쓰기와 같아요. 결과에 맞춰 난이도를 자동으로 맞춰드려요.</p>
    <div class="row" style="margin-bottom:14px"><button class="btn small" id="ltplay">🔊 듣기</button><button class="btn ghost small" id="ltslow">🐢 천천히</button></div>
    <div class="field"><label>받아쓴 영어 문장</label><textarea id="ltinput" rows="2" style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--surface-2)" placeholder="Type what you hear…"></textarea></div>
    <button class="btn" id="ltnext" style="margin-top:14px">${idx===flat.length-1?'결과 보기':'다음 →'}</button>
  </div>`;
  document.getElementById('ltplay').onclick=()=>speak(item.en,.9);
  document.getElementById('ltslow').onclick=()=>speak(item.en,.6);
  setTimeout(()=>speak(item.en,.9),300);
  document.getElementById('ltnext').onclick=()=>{
    const attempt=document.getElementById('ltinput').value.trim();
    const refW=canonRef(item.en).split(' '),youW=canonAns(attempt).split(' ').filter(Boolean);
    const matched=lcsMatch(refW,youW);const hit=matched.filter(Boolean).length;
    const acc=attempt?Math.round(hit/refW.length*100):0;
    runTest(flat,idx+1,[...results,{level:item.level,acc}]);
  };
}

async function finishTest(flat,results){
  const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b.acc,0)/arr.length):0;
  const byTier={};
  TIERS.forEach(t=>{byTier[t]=avg(results.filter(r=>r.level===t));});
  const skill=clamp(Math.round((byTier.beg*0.2+byTier.int*0.35+byTier.adv*0.45)),0,100);
  const suggested=skill<40?'beg':skill>72?'adv':'int';
  const app=document.getElementById('app');
  app.innerHTML=`<div class="card" style="text-align:center">
    <div class="eyebrow">레벨 테스트 결과</div>
    <h2 style="font-size:26px;margin:8px 0">예상 레벨: ${levelLabel(suggested)}</h2>
    <p class="lead">초급 ${byTier.beg}% · 중급 ${byTier.int}% · 고급 ${byTier.adv}%</p>
    <button class="btn" id="ltapply">이 레벨로 시작하기</button>
    <button class="btn ghost small" id="lthome" style="width:100%;margin-top:10px">그냥 홈으로</button>
  </div>`;
  document.getElementById('ltapply').onclick=async()=>{
    S.auto=true;S.skill=skill;
    await store.set('settings:auto',true);await store.set('settings:skill',skill);
    const {toast}=await import('./toast.js');toast('레벨을 적용했어요 · '+levelLabel(suggested));
    const {renderStart}=await import('./ui/start.js');renderStart();
  };
  document.getElementById('lthome').onclick=async()=>{const {renderStart}=await import('./ui/start.js');renderStart();};
}
