/* The home screen: mode/level picker, session start, and entry points to dictation + the
   Gemini key sheet. */
import {S,store,PHASES,effLevel} from '../state.js';
import {levelLabel,daysBetween} from '../utils.js';
import {startSession} from './session.js';
import {startDictation} from '../dictation.js';
import {hasKey,openKeySheet} from '../gemini.js';
import {startLevelTest} from '../leveltest.js';

function phaseHint(k){return{
  review:"저장된 표현을 소리 내어 다시 말해요",
  shadow:"문장별 발음 가이드로 듣고 따라 말해요",
  talk:"롤플레이 또는 AI와 실시간 대화",
  feedback:"교정·모범답안을 복습하고 저장해요"}[k];}

export function renderStart(){
  speechSynthesis.cancel();clearInterval(S.tick);
  const app=document.getElementById('app');
  const last=S.stats.lastDate?`마지막 연습 ${S.stats.lastDate} · 누적 ${S.stats.sessions}회`:"오늘이 첫 세션이에요";
  let nudge='';
  if(S.stats.lastDate){
    const gap=daysBetween(S.stats.lastDate,new Date().toISOString().slice(0,10));
    if(gap===1)nudge=`<div class="setbox" style="margin-top:10px">🔥 스트릭 ${S.stats.streak}일째! 오늘 세션을 마치면 이어져요.</div>`;
    else if(gap>=2)nudge=`<div class="setbox" style="margin-top:10px">며칠 쉬었네요. 오늘부터 다시 스트릭을 쌓아봐요!</div>`;
  }
  app.innerHTML=`
    <div class="card">
      <div class="eyebrow">Daily session · 약 33분 · 오프라인</div>
      <h2>오늘의 말하기 훈련</h2>
      <p class="lead">복습 → 쉐도잉 → 대화 → 리뷰. 핵심 기능은 토큰 없이 작동해요.<br>${last}</p>
      ${nudge}
      <div class="eyebrow" style="margin-bottom:8px">모드</div>
      <div class="grid2" id="modeSel">
        <button class="choice" data-mode="work" aria-pressed="${S.mode==='work'}"><div class="k">💼 업무 · 비즈니스</div><div class="d">회의, 보고, 협업</div></button>
        <button class="choice" data-mode="daily" aria-pressed="${S.mode==='daily'}"><div class="k">☕ 일상 회화</div><div class="d">카페, 스몰토크, 친구</div></button>
      </div>
      <div class="eyebrow" style="margin:18px 0 8px">난이도</div>
      <div id="lvlSel" style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">
        <button class="choice" data-lvl="beg" aria-pressed="${!S.auto&&S.level==='beg'}"><div class="k">초급</div></button>
        <button class="choice" data-lvl="int" aria-pressed="${!S.auto&&S.level==='int'}"><div class="k">중급</div></button>
        <button class="choice" data-lvl="adv" aria-pressed="${!S.auto&&S.level==='adv'}"><div class="k">고급</div></button>
        <button class="choice" data-lvl="auto" aria-pressed="${S.auto}"><div class="k">🤖 자동</div></button>
      </div>
      <p class="lead" id="lvlHint" style="font-size:12.5px;margin:8px 0 0">${S.auto?`자동: 받아쓰기 정확도와 세션 성적에 맞춰 난이도를 조절해요. 현재 추정 <b>${levelLabel(effLevel())}</b>.`:`직접 고르거나, <b>🤖 자동</b>을 켜면 몇 번 해본 뒤 실력에 맞춰 알아서 조절돼요.`}</p>
      <button class="btn ghost small" id="levelTestBtn" style="width:100%;margin-top:10px">🎯 내 레벨 확인하기 (약 2분)</button>
      <div style="margin-top:22px"><button class="btn" id="startBtn">세션 시작하기 →</button></div>
    </div>
    <div class="card">
      <div class="eyebrow">이렇게 진행돼요</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
        ${PHASES.map((p,i)=>`<div style="display:flex;gap:14px;align-items:baseline">
          <span style="font-weight:600;color:var(--accent);font-size:13px;width:18px">0${i+1}</span>
          <div><b style="font-weight:600">${p.name}</b><span style="color:var(--muted);font-size:13px"> · ${p.en} · ${p.sec/60}분</span>
          <div style="color:var(--muted);font-size:13px;margin-top:1px">${phaseHint(p.key)}</div></div></div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="eyebrow">단품 연습 · 세션과 별도</div>
      <h2 style="font-size:20px">🎧 받아쓰기 (Dictation)</h2>
      <p class="lead">문장을 듣고 받아써요. 정확도(%)와 놓친 단어를 브라우저가 바로 채점해요.</p>
      <button class="btn ghost" id="dictBtn">받아쓰기 시작 →</button>
    </div>
    <div class="card">
      <div class="eyebrow">대화 = 온라인 AI (기본)</div>
      <h2 style="font-size:20px">🔑 Gemini 키 등록</h2>
      <p class="lead">대화 단계는 이제 <b>실시간 온라인 AI</b>가 기본이에요. 본인 Gemini 무료 키를 한 번만 넣으면 매 세션 자동으로 실시간 대화 + 즉시 피드백이 켜져요. 인터넷이 없거나 키가 없을 때만 시나리오(오프라인)로 대체됩니다. ${hasKey()?'<b style="color:var(--ok)">현재: 키 등록됨 ✓</b>':'<b style="color:var(--live)">현재: 미등록 — 아래에서 등록하세요</b>'}</p>
      <button class="btn ${hasKey()?'ghost':''}" id="keyBtn">${hasKey()?'키 관리':'API 키 입력'}</button>
    </div>
    <p class="lead" style="font-size:11px;text-align:center;margin:0">예문 일부는 <a class="link" href="https://tatoeba.org" target="_blank" rel="noopener">Tatoeba.org</a>에서 제공됩니다 (CC BY 2.0 FR)</p>`;
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
  document.getElementById('levelTestBtn').onclick=startLevelTest;
}
