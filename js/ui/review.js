/* Phase 1 (Warm-up): re-say saved + shadowing-sourced expressions inside an example sentence,
   with AI-filled examples when a Gemini key is set. */
import {S,store} from '../state.js';
import {shuffle,wordWrap,esc,splitSents} from '../utils.js';
import {speak} from '../speech.js';
import {hasKey,geminiCall} from '../gemini.js';
import {addNotes} from '../notes.js';
import {SHADOW} from '../data/shadow.js';
import {LONGSHADOW} from '../data/longshadow.js';
import {DICT} from '../data/dict.js';
import {SCEN} from '../data/scenarios.js';
import {TATOEBA} from '../data/tatoeba.js';

const STARTER=[{en:"Could you walk me through it?",ko:"자세히 설명해 주실 수 있나요?"},{en:"Let me get back to you on that.",ko:"그건 확인하고 다시 알려드릴게요."},{en:"Sounds good to me.",ko:"저는 좋아요."},{en:"What are you up to this weekend?",ko:"주말에 뭐 해요?"}];

function warmupPool(){
  const seen=new Set(S.notes.map(n=>n.en.toLowerCase().trim()));const pool=[];
  const add=list=>list.forEach(p=>{if(p.mode===S.mode)(p.glossary||[]).forEach(g=>{const k=g.en.toLowerCase().trim();if(!seen.has(k)&&!pool.some(x=>x.en.toLowerCase().trim()===k))pool.push({en:g.en,ko:g.ko,suggest:true});});});
  add(SHADOW);add(LONGSHADOW);
  if(pool.length<8){[SHADOW,LONGSHADOW].forEach(arr=>arr.forEach(p=>{if(p.mode!==S.mode)(p.glossary||[]).forEach(g=>{const k=g.en.toLowerCase().trim();if(!seen.has(k)&&!pool.some(x=>x.en.toLowerCase().trim()===k))pool.push({en:g.en,ko:g.ko,suggest:true});});}));}
  return pool;
}

/* example-sentence corpus from built-in content */
let CORPUS=null;
function corpus(){if(CORPUS)return CORPUS;const out=[];
  SHADOW.forEach(p=>p.sentences.forEach(s=>out.push(s.en)));
  LONGSHADOW.forEach(p=>splitSents(p.paragraph).forEach(x=>out.push(x)));
  DICT.forEach(d=>out.push(d.en));
  TATOEBA.forEach(d=>out.push(d.en));
  SCEN.forEach(sc=>sc.turns.forEach(t=>{out.push(t.p.en);out.push(t.m.en);}));
  CORPUS=out;return out;}
function exprCore(expr){return (expr||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/~ing/g,'').replace(/~/g,'').replace(/\s+/g,' ').trim();}
function exampleFor(expr){const core=exprCore(expr);if(core.length<3)return null;const c=corpus();
  const tries=[core,core.split(' ').slice(0,3).join(' '),core.split(' ').slice(0,2).join(' ')];
  for(const t of tries){if(t.length<3)continue;const hit=c.find(s=>s.toLowerCase().includes(t));if(hit)return hit;}return null;}

async function fillExamplesAI(items){
  const sys="Give ONE short, natural example sentence for each English expression. Return ONLY JSON.";
  const prompt=`Write one short natural example sentence for each expression below.\n${items.map((x,i)=>(i+1)+'. '+x.en).join('\n')}\nReturn JSON: {"examples":[{"en":"the expression","ex":"an example sentence using it"}]}`;
  const r=await geminiCall([{role:'user',content:prompt}],sys,true);
  const map={};(r.examples||[]).forEach(e=>{if(e.en)map[e.en.toLowerCase().trim()]=e.ex;});return map;
}
function exLineHtml(e,i){
  if(e.ex)return `예: <span class="lookup">${wordWrap(e.ex)}</span> <button class="pill" data-sayex="${i}">🔊 따라 말하기</button>`;
  if(hasKey())return `<span style="color:var(--muted)"><span class="spin dark"></span> 예문 생성 중…</span>`;
  return `<span style="color:var(--muted)">예문 없음</span>`;
}

export async function renderReview(body){
  const N=10;
  let notes=shuffle(S.notes.slice());notes.sort((a,b)=>((a.seen||0)-(b.seen||0)));
  let picked=notes.slice(0,N);const filled=picked.length<N;
  if(filled)picked=picked.concat(shuffle(warmupPool()).slice(0,N-picked.length));
  if(picked.length===0)picked=STARTER.map(s=>({...s,suggest:true}));
  const deck=shuffle(picked.slice());
  deck.forEach(e=>{e.ex=exampleFor(e.en);});
  const first=S.notes.length===0;
  body.innerHTML=`<div class="card">
    <div class="eyebrow">Warm-up${filled&&!first?' · 쉐도잉 표현 자동 보충':''}</div><h2 style="font-size:21px">소리 내어 다시 말해보기</h2>
    <p class="lead">${first?'표현과 예문을 소리 내어 따라 말해보세요. 세션에서 ＋저장을 누르면 나만의 복습 덱이 쌓여요.':'표현을 예문 속에서 입으로 따라 말해보세요. 매번 섞어서, 오래 안 본 것 먼저 보여드려요.'}</p>
    <button class="btn ghost small" id="playAll" style="margin-bottom:14px">🔊 예문 전체 듣기</button>
    <div>${deck.map((e,i)=>`<div class="exp">
      <div class="en lookup">${wordWrap(e.en)}</div><div class="ko">${esc(e.ko||'')}</div>
      <div id="ex-${i}" class="read" style="font-size:15px;margin-top:8px;line-height:1.5">${exLineHtml(e,i)}</div>
      <div class="mini"><button data-say="${i}">🔊 표현</button>${e.suggest?` · <span class="rep">쉐도잉 표현</span> · <button data-add="${i}">＋ 저장</button>`:''}</div></div>`).join('')}</div></div>`;
  function wireEx(){body.querySelectorAll('[data-sayex]').forEach(b=>b.onclick=()=>{const e=deck[+b.dataset.sayex];if(e.ex)speak(e.ex,.9);});}
  body.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(deck[+b.dataset.say].en));
  body.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const e=deck[+b.dataset.add];await addNotes([{en:e.en,ko:e.ko}]);const {toast}=await import('../toast.js');toast('노트에 저장했어요 📒');});
  wireEx();
  document.getElementById('playAll').onclick=()=>speak(deck.map(e=>e.ex||e.en).join('. '),.92);
  // spaced-repetition update
  const now=Date.now();let changed=false;
  S.notes.forEach(n=>{if(deck.some(d=>!d.suggest&&d.en===n.en)){n.seen=now;changed=true;}});
  if(changed)await store.set("notes:expressions",S.notes);
  // AI-fill missing examples
  if(hasKey()){
    const missing=deck.map((e,i)=>({e,i})).filter(x=>!x.e.ex);
    if(missing.length){try{
      const map=await fillExamplesAI(missing.map(x=>x.e));
      missing.forEach(x=>{const ex=map[x.e.en.toLowerCase().trim()];if(ex){x.e.ex=ex;const el=document.getElementById('ex-'+x.i);if(el)el.innerHTML=exLineHtml(x.e,x.i);}else{const el=document.getElementById('ex-'+x.i);if(el)el.innerHTML='';}});
      wireEx();
    }catch(err){deck.forEach((e,i)=>{if(!e.ex){const el=document.getElementById('ex-'+i);if(el)el.innerHTML='';}});}}
  }
}
