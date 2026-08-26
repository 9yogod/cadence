/* Tap/drag word lookup: selecting or tapping a word inside any ".lookup" element shows a
   floating "뜻 보기" button, which opens the bottom sheet with the definition (from the
   offline LEX dictionary, with a fallback link to Naver dictionary). Also owns the generic
   bottom-sheet (used by gemini.js's key settings sheet too). */
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
  if(!t||t.length>70){hideLookBtn();return;}
  let n=s.anchorNode;while(n&&n.nodeType!==1)n=n.parentNode;
  if(!(n&&n.closest&&n.closest('.lookup'))){hideLookBtn();return;}
  const r=s.getRangeAt(0).getBoundingClientRect();const b=ensureLookBtn();
  b.style.left=(r.left+r.width/2)+'px';b.style.top=r.top+'px';b.classList.add('show');}
document.addEventListener('mouseup',()=>setTimeout(onSelect,10));
document.addEventListener('touchend',()=>setTimeout(onSelect,10));
document.addEventListener('scroll',hideLookBtn,true);
document.addEventListener('click',e=>{const w=e.target.closest&&e.target.closest('.w');if(w)doLookup(w.textContent.trim().replace(/[.,!?;:"'()]/g,''));});

/* ---- generic bottom sheet ---- */
function sheetEl(){let s=document.getElementById('sheet');
  if(!s){s=document.createElement('div');s.id='sheet';s.className='sheet';s.innerHTML='<div class="panel"></div>';
    s.onclick=e=>{if(e.target===s)closeSheet();};document.body.appendChild(s);}return s;}
export function openSheet(html){const s=sheetEl();s.querySelector('.panel').innerHTML=html;s.classList.add('show');}
export function closeSheet(){const s=document.getElementById('sheet');if(s)s.classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});

/* ---- lookup sheet ---- */
export async function doLookup(term){
  if(!term)return;const key=term.toLowerCase().trim();const hit=LEX[key];
  const naver="https://en.dict.naver.com/#/search?query="+encodeURIComponent(term);
  const {logLookup}=await import('./history.js');
  await logLookup({term,ko:hit?hit.ko:''});
  openSheet(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div class="term">${esc(term)}</div><button class="btn ghost small" id="lkSay">🔊</button></div>
    ${hit?`<div class="mean">${esc(hit.ko)}</div>`:`<div class="mean" style="color:var(--muted)">내장 사전에 없는 표현이에요. 사전에서 확인해 보세요.</div>`}
    <div class="row">
      ${hit?`<button class="btn small" id="lkSave">＋ 노트에 저장</button>`:''}
      <button class="btn ghost small" id="lkNaver">📖 네이버 사전</button>
      <button class="btn ghost small" id="lkClose">닫기</button></div>
    <p class="lead" style="font-size:12px;margin:12px 0 0">🕘 이력 › 찾아본 표현에 자동 기록됐어요.</p>`);
  document.getElementById('lkSay').onclick=()=>speak(term);
  document.getElementById('lkNaver').onclick=()=>window.open(naver,'_blank');
  document.getElementById('lkClose').onclick=closeSheet;
  const sv=document.getElementById('lkSave');
  if(sv)sv.onclick=async()=>{
    const {addNotes}=await import('./notes.js');const {toast}=await import('./toast.js');
    await addNotes([{en:term,ko:hit?hit.ko:''}]);toast('노트에 저장했어요 📒');
  };
}
