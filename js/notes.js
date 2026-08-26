/* The saved-expression deck: adding notes (deduped) and the Notes screen. */
import {S,store} from './state.js';
import {wordWrap,esc} from './utils.js';
import {speak} from './speech.js';

export function updateNoteCount(){document.getElementById('noteCount').textContent=S.notes.length;}

export async function addNotes(list){
  const now=Date.now();const existing=new Set(S.notes.map(n=>n.en.toLowerCase().trim()));let added=0;
  (list||[]).forEach(e=>{if(e&&e.en&&!existing.has(e.en.toLowerCase().trim())){S.notes.push({en:e.en,ko:e.ko||'',t:now});existing.add(e.en.toLowerCase().trim());added++;}});
  if(S.run)S.run.expr+=added;await store.set("notes:expressions",S.notes);updateNoteCount();}

export function renderNotes(){
  speechSynthesis.cancel();clearInterval(S.tick);
  const app=document.getElementById('app');
  app.innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><div class="eyebrow">Expression deck</div><h2 style="font-size:22px">내 표현노트</h2></div>
      <button class="btn ghost small" id="back">← 홈</button></div>
    <p class="lead">쉐도잉·리뷰·단어 찾기에서 모은 표현이에요. 세션마다 복습에 등장해요.</p>
    <div id="list">${S.notes.length?S.notes.slice().reverse().map((e,ri)=>{const i=S.notes.length-1-ri;
      return `<div class="exp"><div class="en lookup">${wordWrap(e.en)}</div><div class="ko">${esc(e.ko||'')}</div>
        <div class="mini"><button data-say="${i}">🔊 듣기</button><button data-del="${i}" style="color:var(--live)">삭제</button></div></div>`;}).join(''):`<div class="empty">아직 저장된 표현이 없어요.<br>세션을 완료하면 여기에 쌓입니다.</div>`}</div>
    ${S.notes.length?`<button class="btn ghost small" id="reset" style="width:100%;margin-top:10px;color:var(--live)">전체 초기화</button>`:''}</div>`;
  document.getElementById('back').onclick=async()=>{const {renderStart}=await import('./ui/start.js');renderStart();};
  app.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(S.notes[+b.dataset.say].en));
  app.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{S.notes.splice(+b.dataset.del,1);await store.set("notes:expressions",S.notes);updateNoteCount();renderNotes();});
  const r=document.getElementById('reset');
  if(r)r.onclick=async()=>{if(confirm("모든 표현을 삭제할까요?")){S.notes=[];await store.set("notes:expressions",[]);updateNoteCount();renderNotes();}};
}
