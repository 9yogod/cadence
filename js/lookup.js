/* Tap/drag word lookup: selecting or tapping a word inside any ".lookup" element shows a
   floating "뜻 보기" button, which opens the bottom sheet with the definition (hand-written
   LEX first, then the ~15k-word Wiktionary list, with a fallback link to Naver dictionary).
   Also owns the generic bottom-sheet (used by gemini.js's key settings sheet too). */
import {esc,wordWrap} from './utils.js';
import {LEX} from './data/lexicon.js';
import {speak} from './speech.js';

export {wordWrap};

export function setAI(el,text){el.classList.add('lookup');el.innerHTML=wordWrap(text);}

let lookBtn=null;
function ensureLookBtn(){if(lookBtn)return lookBtn;
  lookBtn=document.createElement('button');lookBtn.className='lookbtn';lookBtn.textContent='🔍 뜻 보기';
  lookBtn.onmousedown=e=>e.preventDefault();
  lookBtn.onclick=()=>{const s=window.getSelection();const t=(s.toString()||'').trim();hideLookBtn();s.removeAllRanges();if(t)doLookup(t);};
  document.body.appendChild(lookBtn);return lookBtn;}
function hideLookBtn(){if(lookBtn)lookBtn.classList.remove('show');}
function onSelect(){const s=window.getSelection();const t=(s.toString()||'').trim();
  if(!t||t.length>70||!s.rangeCount){hideLookBtn();return;}
  let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;
  if(!(n&&n.closest&&n.closest('.lookup'))){hideLookBtn();return;}
  const r=s.getRangeAt(0).getBoundingClientRect();const b=ensureLookBtn();
  /* Keep the button on screen on a narrow phone: clamp it horizontally, and when the
     selection sits near the top — where it would be pushed off the viewport, and where
     iOS draws its own Copy/Look Up callout — flip it under the selection instead. */
  const half=b.offsetWidth?b.offsetWidth/2:52;
  const x=Math.min(Math.max(r.left+r.width/2,half+8),window.innerWidth-half-8);
  const below=r.top<64;
  b.classList.toggle('below',below);
  b.style.left=x+'px';b.style.top=(below?r.bottom:r.top)+'px';b.classList.add('show');}
document.addEventListener('mouseup',()=>setTimeout(onSelect,10));
/* iOS finalizes the selection (and its handles) a beat after touchend. */
document.addEventListener('touchend',()=>setTimeout(onSelect,80));
document.addEventListener('scroll',hideLookBtn,true);
document.addEventListener('click',e=>{const w=e.target.closest&&e.target.closest('.w');if(w)doLookup(w.textContent.trim().replace(/[.,!?;:"'()]/g,''));});

/* ---- generic bottom sheet ---- */
function sheetEl(){let s=document.getElementById('sheet');
  if(!s){s=document.createElement('div');s.id='sheet';s.className='sheet';s.innerHTML='<div class="panel"></div>';
    s.onclick=e=>{if(e.target===s)closeSheet();};document.body.appendChild(s);}return s;}
export function openSheet(html){const s=sheetEl();s.querySelector('.panel').innerHTML=html;s.classList.add('show');}
export function closeSheet(){const s=document.getElementById('sheet');if(s)s.classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

/* ---- dictionary ---- */
/* The Wiktionary list is ~800KB, so it is fetched on the first lookup rather than at
   startup; the service worker caches it from then on. If it can't load (offline before
   it was ever fetched), lookups fall back to LEX alone. */
let WIKT=null;
async function wikt(){if(WIKT)return WIKT;
  try{WIKT=(await import('./data/wiktionary.js')).WIKT;}catch(e){return {};}return WIKT;}

/* Tapped words arrive inflected ("looked", "children") but dictionaries list base forms.
   A few suffix rules plus the common irregulars cover most of it; each candidate is only
   used if a dictionary actually has it, so a wrong guess just falls through. */
const IRR={went:'go',gone:'go',got:'get',gotten:'get',did:'do',done:'do',does:'do',has:'have',had:'have',
 was:'be',were:'be',is:'be',are:'be',been:'be',am:'be',ate:'eat',eaten:'eat',came:'come',became:'become',
 made:'make',said:'say',saw:'see',seen:'see',took:'take',taken:'take',gave:'give',given:'give',knew:'know',
 known:'know',thought:'think',told:'tell',found:'find',felt:'feel',left:'leave',kept:'keep',held:'hold',
 brought:'bring',bought:'buy',caught:'catch',taught:'teach',sent:'send',spent:'spend',built:'build',met:'meet',
 ran:'run',sat:'sit',stood:'stand',understood:'understand',lost:'lose',paid:'pay',heard:'hear',meant:'mean',
 wrote:'write',written:'write',spoke:'speak',spoken:'speak',broke:'break',broken:'break',chose:'choose',
 chosen:'choose',drove:'drive',driven:'drive',flew:'fly',flown:'fly',forgot:'forget',forgotten:'forget',
 forgave:'forgive',forgiven:'forgive',began:'begin',begun:'begin',drank:'drink',drunk:'drink',sang:'sing',
 swam:'swim',woke:'wake',wore:'wear',worn:'wear',won:'win',fell:'fall',fallen:'fall',grew:'grow',grown:'grow',
 threw:'throw',thrown:'throw',slept:'sleep',led:'lead',bred:'breed',fed:'feed',fought:'fight',hung:'hang',
 hid:'hide',hidden:'hide',rode:'ride',rose:'rise',shook:'shake',stuck:'stick',struck:'strike',sold:'sell',
 shot:'shoot',dealt:'deal',lent:'lend',bent:'bend',dug:'dig',swept:'sweep',wept:'weep',
 children:'child',men:'man',women:'woman',people:'person',feet:'foot',teeth:'tooth',mice:'mouse',
 knives:'knife',lives:'life',wives:'wife',leaves:'leaf',better:'good',best:'good',worse:'bad',worst:'bad'};
export function baseForms(w){const out=[];const add=x=>{if(x&&x.length>1&&!out.includes(x))out.push(x);};
  if(IRR[w])add(IRR[w]);
  let m;
  if(/ies$/.test(w))add(w.slice(0,-3)+'y');
  if(/(s|x|z|ch|sh|o)es$/.test(w))add(w.slice(0,-2));
  if(/[^s]s$/.test(w))add(w.slice(0,-1));
  if(/ied$/.test(w))add(w.slice(0,-3)+'y');
  if((m=w.match(/^(.*([b-df-hj-np-tv-z]))\2(ed|ing|er|est)$/)))add(m[1]);
  if(/ed$/.test(w)){add(w.slice(0,-2));add(w.slice(0,-1));}
  if(/ing$/.test(w)){add(w.slice(0,-3));add(w.slice(0,-3)+'e');}
  if(/i(er|est)$/.test(w))add(w.replace(/i(er|est)$/,'y'));
  if(/(er|est)$/.test(w)){add(w.replace(/(er|est)$/,''));add(w.replace(/(r|st)$/,''));}
  if(/ily$/.test(w))add(w.slice(0,-3)+'y');
  if(/ly$/.test(w))add(w.slice(0,-2));
  return out;}

/* -> {base, ko} where base is the headword actually found (may differ from term), or null */
async function findMeaning(term){
  const key=term.toLowerCase().replace(/[‘’]/g,"'").replace(/'s$/,'').trim();
  const W=await wikt();
  const get=k=>LEX[k]?LEX[k].ko:(W[k]||'');
  if(get(key))return {base:key,ko:get(key)};
  if(/^[a-z']+$/.test(key))for(const b of baseForms(key))if(get(b))return {base:b,ko:get(b)};
  return null;}

/* A card's 뜻 line: first part of speech only, without its [동]/[명] tag. */
function shortKo(ko){return (ko||'').split(' / ')[0].replace(/^\[[^\]]*\]\s*/,'');}

/* ---- lookup sheet ---- */
export async function doLookup(term){
  if(!term)return;
  const hit=await findMeaning(term);
  const typed=term.toLowerCase().trim();
  const word=hit?hit.base:typed;
  const naver="https://en.dict.naver.com/#/search?query="+encodeURIComponent(word);
  const {S}=await import('./state.js');
  const saved=()=>S.notes.some(n=>n.en.toLowerCase().trim()===word);
  const {logLookup}=await import('./history.js');
  await logLookup({term,ko:hit?shortKo(hit.ko):''});
  const meanHtml=hit?hit.ko.split(' / ').map(x=>`<div class="mean">${esc(x)}</div>`).join(''):'';
  openSheet(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><div class="term">${esc(term)}</div>${hit&&hit.base!==typed?`<div class="lead" style="font-size:12.5px;margin:2px 0 0">기본형 <b>${esc(hit.base)}</b></div>`:''}</div>
      <button class="btn ghost small" id="lkSay">🔊</button></div>
    ${hit?meanHtml:`<div class="mean" style="color:var(--muted)">내장 사전에 없는 표현이에요. 사전에서 확인해 보세요.</div>`}
    <div class="row">
      <button class="btn small" id="lkSave"${saved()?' disabled':''}>${saved()?'✓ 노트에 있어요':'＋ 모르는 단어로 추가'}</button>
      <button class="btn ghost small" id="lkNaver">📖 네이버 사전</button>
      <button class="btn ghost small" id="lkClose">닫기</button></div>
    <p class="lead" style="font-size:12px;margin:12px 0 0">🕘 이력 › 찾아본 표현에 자동 기록됐어요${hit&&!LEX[hit.base]?' · 뜻 출처: 위키낱말사전 (CC BY-SA)':'.'}</p>`);
  document.getElementById('lkSay').onclick=()=>speak(term);
  document.getElementById('lkNaver').onclick=()=>window.open(naver,'_blank');
  document.getElementById('lkClose').onclick=closeSheet;
  const sv=document.getElementById('lkSave');
  /* Saved as the base form, so "looked" and "looking" become one card, not two. A word
     with no meaning still goes in — the deck is the to-learn list, and 네이버 is a tap away. */
  sv.onclick=async()=>{
    if(saved())return;
    const {addNotes}=await import('./notes.js');const {toast}=await import('./toast.js');
    await addNotes([{en:word,ko:hit?shortKo(hit.ko):''}]);
    sv.disabled=true;sv.textContent='✓ 노트에 있어요';toast('모르는 단어로 추가했어요 📒');
  };
}
