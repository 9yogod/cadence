/* Persistent storage + the single shared app-state object S. */
import {clamp,levelLabel,daysBetween} from './utils.js';
import {toast} from './toast.js';

/* ---- storage: window.storage (claude.ai) → localStorage (deployed) → memory ---- */
const HAS_WS=(typeof window!=='undefined'&&window.storage&&window.storage.get);
export const store={
  mem:{},
  async get(k,def){try{
    if(HAS_WS){const r=await window.storage.get(k);return r?JSON.parse(r.value):def;}
    const v=localStorage.getItem(k);return v?JSON.parse(v):def;
  }catch(e){return (k in this.mem)?this.mem[k]:def;}},
  async set(k,v){try{
    if(HAS_WS){await window.storage.set(k,JSON.stringify(v));return;}
    localStorage.setItem(k,JSON.stringify(v));
  }catch(e){this.mem[k]=v;}}
};

export const PHASES=[
 {key:"review",name:"표현 복습",en:"Warm-up",sec:180},
 {key:"shadow",name:"쉐도잉",en:"Shadowing",sec:600},
 {key:"talk",name:"대화",en:"Conversation",sec:900},
 {key:"feedback",name:"리뷰",en:"Review",sec:300},
];

export const S={
 mode:"work",phase:0,running:false,remaining:0,tick:null,
 level:"int",dictLevel:"int",auto:false,skill:50,
 notes:[],stats:{sessions:0,lastDate:null,streak:0},
 mistakes:[],lookups:[],sessionRecs:[],scores:[],run:null,
 passage:null,scen:null,talkMode:"scenario",chat:[],
 shadowView:"para",paraPassage:null,
 gemini:{key:"",model:"gemini-2.5-flash"}
};

export function effLevel(){if(!S.auto)return S.level;return S.skill<40?'beg':S.skill>72?'adv':'int';}

export async function bumpSkill(delta){
  const prev=effLevel();S.skill=clamp((S.skill||50)+delta,0,100);await store.set("settings:skill",S.skill);
  const now=effLevel();if(S.auto&&now!==prev)setTimeout(()=>toast("🤖 실력에 맞춰 난이도를 "+levelLabel(now)+"(으)로 조정했어요"),400);
}

/* Records that the user practiced today and keeps the streak honest.

   The old inline version asked only "was the last practice exactly yesterday?", so a
   second completion on the same day answered no and reset the streak to 1. That was
   already wrong; with a 5-minute review sitting alongside the full session it would
   fire almost every day, punishing people for practicing twice.

   countSession is for the 33-minute session only — 누적 세션 means full sessions, and
   session.js also rotates shadowing content by that counter. */
export async function markPracticeDay({countSession=false}={}){
  const today=new Date().toISOString().slice(0,10);
  const last=S.stats.lastDate;
  let streak;
  if(last===today)streak=S.stats.streak||1;                       // already counted today
  else if(last&&daysBetween(last,today)===1)streak=(S.stats.streak||0)+1;
  else streak=1;
  S.stats={sessions:(S.stats.sessions||0)+(countSession?1:0),lastDate:today,streak};
  await store.set("stats",S.stats);
  return S.stats;
}
