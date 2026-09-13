/* "앱으로 설치" affordance.

   The PWA plumbing (manifest + sw.js) makes Cadence installable, but nothing about
   that is visible on the page — and the single most common way this link gets opened
   in Korea is by tapping it inside KakaoTalk or Naver, whose in-app browsers cannot
   install a PWA at all (no menu item, no beforeinstallprompt) and also tend to block
   getUserMedia, which kills the mic. So the app has to say so itself.

   Three environments, three different messages:
   - in-app browser  → offer to reopen in the real browser (and warn about the mic)
   - iOS Safari      → there is no prompt API; show the 공유 → 홈 화면에 추가 steps
   - Android Chrome  → fire the deferred beforeinstallprompt
   Already installed (standalone) shows nothing. */
import {store} from './state.js';
import {openSheet,closeSheet} from './lookup.js';
import {toast} from './toast.js';

const ua=navigator.userAgent||'';

export const IOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const ANDROID=/Android/i.test(ua);
/* KakaoTalk, Naver, Daum, Instagram, Facebook, Line, Band, 에브리타임 … */
export const IN_APP=/KAKAOTALK|NAVER\(inapp|DaumApps|Instagram|FB_IAB|FBAN|FBAV|Line\/|band\/|everytimeApp|zumapp|whale/i.test(ua);
const KAKAO=/KAKAOTALK/i.test(ua);
const MOBILE=IOS||ANDROID||/Mobile/i.test(ua);

export function isStandalone(){
  return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
}

/* beforeinstallprompt fires once, early, and only Chromium fires it — capture it at
   module load (main.js imports this) so the button has something to fire later. */
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;toast('홈 화면에 설치됐어요 🎉');});

/* ---- reopening outside the in-app browser ---- */
function openExternal(){
  const url=location.href;
  if(KAKAO){location.href='kakaotalk://web/openExternal?url='+encodeURIComponent(url);return true;}
  if(/Line\//i.test(ua)){location.href=url+(url.includes('?')?'&':'?')+'openExternalBrowser=1';return true;}
  if(ANDROID){ // generic Android in-app browser → hand off to Chrome
    location.href='intent://'+url.replace(/^https?:\/\//,'')+'#Intent;scheme=https;package=com.android.chrome;end';
    return true;
  }
  return false; // iOS + non-Kakao: no scheme works, the user has to use the ⋯ menu
}

async function copyLink(){
  const url=location.href;
  try{
    await navigator.clipboard.writeText(url);
    toast('주소를 복사했어요. 브라우저에 붙여넣기 해주세요');
  }catch(e){
    /* clipboard API is often blocked in in-app browsers; fall back to a selectable field */
    const el=document.getElementById('copyUrl');
    if(el){el.focus();el.select();toast('주소를 길게 눌러 복사해 주세요');}
    else toast('주소: '+url,'err');
  }
}

/* ---- the instructions sheet ---- */
export function openInstallSheet(){
  if(isStandalone()){
    openSheet(`<div class="term">이미 설치돼 있어요 ✅</div>
      <p class="mean">지금 홈 화면 앱으로 열려 있어요.</p>
      <div class="row"><button class="btn small" id="isClose">닫기</button></div>`);
    document.getElementById('isClose').onclick=closeSheet;
    return;
  }

  if(IN_APP){
    const who=KAKAO?'카카오톡':'이 앱';
    openSheet(`
      <div class="term">📲 브라우저에서 열어주세요</div>
      <p class="mean">지금 <b>${who} 안의 브라우저</b>로 보고 계세요. 여기서는 홈 화면 추가가 안 되고,
        <b>마이크(음성인식)도 막혀 있는 경우가 많아요.</b> Safari나 Chrome으로 열면 다 정상 동작해요.</p>
      ${IOS&&!KAKAO?`<p class="mean" style="color:var(--muted);font-size:14px">
        화면 <b>오른쪽 아래 ⋯ (또는 나가기) 버튼 → "Safari로 열기"</b>를 눌러주세요.</p>`:''}
      <input id="copyUrl" readonly value="${location.href}"
        style="width:100%;padding:11px 13px;border:1.5px solid var(--line);border-radius:14px;
               background:var(--surface-2);margin-top:12px;font-size:13px">
      <div class="row">
        ${(KAKAO||ANDROID)?`<button class="btn small" id="isOpen">브라우저로 열기</button>`:''}
        <button class="btn ghost small" id="isCopy">주소 복사</button>
        <button class="btn ghost small" id="isClose">닫기</button>
      </div>`);
    const o=document.getElementById('isOpen');
    if(o)o.onclick=()=>{if(!openExternal())toast('브라우저 메뉴에서 "다른 브라우저로 열기"를 눌러주세요','err');};
    document.getElementById('isCopy').onclick=copyLink;
    document.getElementById('isClose').onclick=closeSheet;
    return;
  }

  /* iOS never fires beforeinstallprompt, so the instructions branch must win there
     regardless of what any stale prompt object says. */
  if(deferredPrompt&&!IOS){
    openSheet(`
      <div class="term">📲 홈 화면에 설치</div>
      <p class="mean">설치하면 주소창 없는 전체화면으로 열리고, 오프라인에서도 연습할 수 있어요.</p>
      <div class="row">
        <button class="btn small" id="isGo">설치하기</button>
        <button class="btn ghost small" id="isClose">닫기</button>
      </div>`);
    document.getElementById('isGo').onclick=async()=>{
      const p=deferredPrompt;deferredPrompt=null;closeSheet();
      if(!p)return;
      p.prompt();
      const {outcome}=await p.userChoice.catch(()=>({outcome:'dismissed'}));
      if(outcome!=='accepted')toast('설치를 취소했어요');
    };
    document.getElementById('isClose').onclick=closeSheet;
    return;
  }

  /* iOS Safari, or any browser that doesn't expose the prompt */
  openSheet(`
    <div class="term">📲 홈 화면에 추가하기</div>
    <p class="mean">설치하면 주소창 없는 전체화면으로 열리고, 오프라인에서도 연습할 수 있어요.</p>
    ${IOS?`
      <div class="mean" style="line-height:1.9">
        1. 화면 아래 <b>공유 버튼 ⬆️</b> 누르기<br>
        2. 목록을 내려서 <b>"홈 화면에 추가"</b> 누르기<br>
        3. 오른쪽 위 <b>"추가"</b> 누르기
      </div>
      <p class="mean" style="color:var(--muted);font-size:13px">※ 아이폰은 <b>Safari</b>에서만 홈 화면 추가가 돼요.</p>`
    :`
      <div class="mean" style="line-height:1.9">
        1. 브라우저 <b>메뉴(⋮)</b> 열기<br>
        2. <b>"앱 설치"</b> 또는 <b>"홈 화면에 추가"</b> 누르기
      </div>`}
    <div class="row"><button class="btn small" id="isClose">알겠어요</button></div>`);
  document.getElementById('isClose').onclick=closeSheet;
}

/* ---- the dismissible card on the home screen ---- */
const DISMISS_KEY='settings:installCardDismissed';
let dismissed=false;
export async function loadInstallState(){dismissed=await store.get(DISMISS_KEY,false);}

export function installCardHTML(){
  if(isStandalone()||dismissed||!MOBILE)return '';
  if(IN_APP)return `
    <div class="installcard warn" id="installCard">
      <button class="x" id="installX" aria-label="닫기">✕</button>
      <div class="t">브라우저에서 열면 더 잘 돼요</div>
      <div class="d">지금은 앱 안의 브라우저예요. 마이크가 막혀 있을 수 있고 홈 화면 추가도 안 돼요.</div>
      <button class="btn small" id="installGo" style="margin-top:11px">Safari · Chrome으로 열기</button>
    </div>`;
  return `
    <div class="installcard" id="installCard">
      <button class="x" id="installX" aria-label="닫기">✕</button>
      <div class="t">📲 홈 화면에 추가하기</div>
      <div class="d">앱처럼 전체화면으로 열리고, 오프라인에서도 연습할 수 있어요.</div>
      <button class="btn small" id="installGo" style="margin-top:11px">설치 방법 보기</button>
    </div>`;
}

export function wireInstallCard(){
  const go=document.getElementById('installGo');
  if(go)go.onclick=openInstallSheet;
  const x=document.getElementById('installX');
  if(x)x.onclick=async()=>{
    dismissed=true;await store.set(DISMISS_KEY,true);
    const c=document.getElementById('installCard');if(c)c.remove();
    toast('필요하면 "더 해보기 › 앱 설치"에서 다시 볼 수 있어요');
  };
}
