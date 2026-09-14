/* The home screen: one hero card (streak + mode/level + start), a condensed utility row
   for the secondary actions (dictation / level test / Gemini key), and a footer credit. */
import {S,store,effLevel} from '../state.js';
import {levelLabel,daysBetween} from '../utils.js';
import {startSession} from './session.js';
import {startDictation} from '../dictation.js';
import {hasKey,openKeySheet} from '../gemini.js';
import {startLevelTest} from '../leveltest.js';
import {installCardHTML,wireInstallCard,openInstallSheet,isStandalone} from '../install.js';
import {ensureAll,dueCount} from '../srs.js';
import {startQuickReview} from './quick.js';
import {cancelSpeech} from '../speech.js';

const FLAME=`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 .5 2-1 3-2 3-1.5 0-2-1.3-1.3-2.6C14.5 5.8 13 4 12 2z"/><path d="M8 13a4 4 0 1 0 8 0c0-1.5-1-2.5-1-2.5.3 1.6-.7 2.8-2 2.8s-2-1-1.7-2.4C10.6 12 8 12 8 13z"/></svg>`;
const ICON_DICT=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z"/></svg>`;
const ICON_TARGET=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></svg>`;
const ICON_PHONE=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18.5h2"/></svg>`;
const ICON_KEY=`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M17 6l2 2M14 9l2 2"/></svg>`;

export function renderStart(){
  cancelSpeech();clearInterval(S.tick);
  const app=document.getElementById('app');
  const today=new Date().toISOString().slice(0,10);
  const gap=S.stats.lastDate?daysBetween(S.stats.lastDate,today):null;

  ensureAll(S.notes);
  const nDue=dueCount(S.notes);
  const dueBadge=nDue?`<div class="streakbadge duebadge">📒 오늘 복습할 표현 ${nDue}개</div>`:'';

  let badge='';
  if(gap===0)badge=`<div class="streakbadge">${FLAME} 오늘 세션 완료 · 누적 ${S.stats.sessions}회</div>`;
  else if(gap===1)badge=`<div class="streakbadge">${FLAME} 스트릭 ${S.stats.streak}일째 · 오늘 마치면 이어져요</div>`;
  else if(gap>=2)badge=`<div class="streakbadge" style="color:var(--muted);background:var(--surface-2)">${FLAME} 며칠 쉬었어요 · 오늘부터 다시 쌓아봐요</div>`;
  else badge=`<div class="streakbadge" style="color:var(--muted);background:var(--surface-2)">오늘이 첫 세션이에요</div>`;

  app.innerHTML=`
    ${installCardHTML()}
    <div class="card">
      ${badge}${dueBadge}
      <h2>오늘도<br>말해볼까요?</h2>
      <p class="lead">복습 → 쉐도잉 → 대화 → 리뷰 · 약 33분<br>시간 없는 날은 아래 5분 복습만 해도 이어져요</p>

      <div class="grid2" id="modeSel">
        <button class="choice" data-mode="work" aria-pressed="${S.mode==='work'}" style="text-align:center"><div class="k">💼 업무</div></button>
        <button class="choice" data-mode="daily" aria-pressed="${S.mode==='daily'}" style="text-align:center"><div class="k">☕ 일상</div></button>
      </div>
      <div id="lvlSel" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px">
        <button class="choice" data-lvl="beg" aria-pressed="${!S.auto&&S.level==='beg'}" style="text-align:center;padding:9px 6px"><div class="k" style="font-size:12.5px">초급</div></button>
        <button class="choice" data-lvl="int" aria-pressed="${!S.auto&&S.level==='int'}" style="text-align:center;padding:9px 6px"><div class="k" style="font-size:12.5px">중급</div></button>
        <button class="choice" data-lvl="adv" aria-pressed="${!S.auto&&S.level==='adv'}" style="text-align:center;padding:9px 6px"><div class="k" style="font-size:12.5px">고급</div></button>
        <button class="choice" data-lvl="auto" aria-pressed="${S.auto}" style="text-align:center;padding:9px 6px"><div class="k" style="font-size:12.5px">🤖 자동</div></button>
      </div>
      <p class="lead" id="lvlHint" style="font-size:12px;margin:8px 0 0">${S.auto?`정확도에 맞춰 자동 조절 · 현재 추정 <b>${levelLabel(effLevel())}</b>`:`<b>🎯 내 레벨 확인하기</b>로 알맞은 난이도를 찾을 수도 있어요`}</p>

      <button class="btn" id="startBtn" style="margin-top:18px">세션 시작하기</button>
      ${S.notes.length?`<button class="btn ghost" id="quickBtn" style="margin-top:9px">⚡ ${nDue?`5분 복습 · ${nDue}개`:'미리 복습하기'}</button>`:''}
    </div>

    <div style="margin:4px 0 18px">
      <div class="eyebrow" style="margin-bottom:12px">더 해보기</div>
      <div class="utilrow">
        <button class="util" id="dictBtn"><div class="uicon">${ICON_DICT}</div><span class="ulabel">받아쓰기</span></button>
        <button class="util" id="levelTestBtn"><div class="uicon">${ICON_TARGET}</div><span class="ulabel">레벨 확인</span></button>
        <button class="util" id="keyBtn"><div class="uicon">${ICON_KEY}${hasKey()?'<span class="dot"></span>':''}</div><span class="ulabel">Gemini 키</span></button>
        ${isStandalone()?'':`<button class="util" id="installBtn"><div class="uicon">${ICON_PHONE}</div><span class="ulabel">앱 설치</span></button>`}
      </div>
    </div>

    <p class="lead" style="font-size:11px;text-align:center;margin:0">예문 일부는 <a class="link" href="https://tatoeba.org" target="_blank" rel="noopener">Tatoeba.org</a>에서 제공됩니다 (CC BY 2.0 FR)</p>`;

  wireInstallCard();
  const ib=document.getElementById('installBtn');if(ib)ib.onclick=openInstallSheet;
  document.getElementById('dictBtn').onclick=startDictation;
  document.getElementById('keyBtn').onclick=openKeySheet;
  app.querySelectorAll('#modeSel .choice').forEach(b=>b.onclick=()=>{
    app.querySelectorAll('#modeSel .choice').forEach(x=>x.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true');S.mode=b.dataset.mode;});
  app.querySelectorAll('#lvlSel .choice').forEach(b=>b.onclick=async()=>{
    if(b.dataset.lvl==='auto'){S.auto=true;}
    else{S.auto=false;S.level=b.dataset.lvl;S.dictLevel=b.dataset.lvl;}
    await store.set("settings:auto",S.auto);await store.set("settings:level",S.level);
    renderStart();});
  document.getElementById('startBtn').onclick=startSession;
  const qb=document.getElementById('quickBtn');if(qb)qb.onclick=startQuickReview;
  document.getElementById('levelTestBtn').onclick=startLevelTest;
}
