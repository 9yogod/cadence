/* Small stateless helpers shared across the app. */

export function fmt(s){const m=Math.floor(s/60),x=s%60;return m+":"+String(x).padStart(2,'0');}

export function esc(t){const d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML;}

export function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

export function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

export function levelLabel(l){return{beg:'초급',int:'중급',adv:'고급'}[l]||'중급';}

/* pick an item from arr matching `mode`, rotating deterministically with the session count
   so the same session index always gets the same pick but consecutive sessions vary */
export function pick(arr,mode,seed){const f=arr.filter(x=>x.mode===mode);return f[(seed||0)%f.length];}

export function daysBetween(a,b){return Math.round((new Date(b)-new Date(a))/86400000);}

export function splitSents(par){return par.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);}

/* word-wrap text into <span class="w"> tokens so tap/drag word lookup can bind to them */
export function wordWrap(text){return esc(text).split(/(\s+)/).map(t=>/\S/.test(t)?`<span class="w">${t}</span>`:t).join('');}

/* ---- LCS-based word alignment, used by dictation grading and pronunciation checking ---- */
export function lcsMatch(ref,you){const n=ref.length,m=you.length,dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=ref[i-1]===you[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
  const matched=new Array(n).fill(false);let i=n,j=m;
  while(i>0&&j>0){if(ref[i-1]===you[j-1]){matched[i-1]=true;i--;j--;}else if(dp[i-1][j]>=dp[i][j-1])i--;else j--;}return matched;}

/* ---- dictation text normalization ---- */
export function norm(s){return s.toLowerCase().replace(/[^a-z0-9'\s]/g,'').replace(/\s+/g,' ').trim();}
/* reference: drop apostrophes/punct, keep word count aligned with display */
export function canonRef(s){return s.toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();}

/* learner answer: also expand casual reductions so wanna/gonna/etc. count as correct */
export const COLLOQ={wanna:'want to',gonna:'going to',gotta:'got to',gimme:'give me',lemme:'let me',kinda:'kind of',sorta:'sort of',outta:'out of',lotta:'lot of',hafta:'have to',oughta:'ought to',tryna:'trying to',gotcha:'got you',cuz:'because',coz:'because',til:'until',till:'until',yall:'you all',finna:'going to',imma:'i am going to'};
export function canonAns(s){
  s=' '+s.toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9\s]/g,'')+' ';
  for(const k in COLLOQ)s=s.replace(new RegExp('\\b'+k+'\\b','g'),COLLOQ[k]);
  return s.replace(/\s+/g,' ').trim();
}

/* standard phrase -> common casual/spoken form, for tips */
export const REV={"want to":"wanna","going to":"gonna","got to":"gotta","have got to":"gotta","give me":"gimme","let me":"lemme","kind of":"kinda","sort of":"sorta","out of":"outta","have to":"hafta","trying to":"tryna","got you":"gotcha","don't know":"dunno","because":"'cause","a lot of":"a lotta"};
export function casualTips(text){const t=' '+text.toLowerCase()+' ';const tips=[];for(const k in REV){if(t.includes(' '+k+' ')||t.includes(k))tips.push({std:k,casual:REV[k]});}return tips;}
