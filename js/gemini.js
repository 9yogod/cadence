/* Optional "bring your own key" Gemini integration. The key is stored only in the
   browser (via state.store) and calls go straight from the browser to Google. */
import {S,store,PHASES} from './state.js';
import {esc} from './utils.js';
import {toast} from './toast.js';
import {openSheet,closeSheet} from './lookup.js';
import {audioRequestBody} from './pron-prompt.js';

export function hasKey(){return !!(S.gemini&&S.gemini.key);}

/* Every Gemini failure used to surface as "check your key", including the one a
   free-tier user hits most: the daily request cap (20 per model per project on
   gemini-2.5-flash at the time of writing). Being told to fix a working key sends
   people chasing the wrong problem, so the message now names the actual cause.
   Daily quotas reset at midnight Pacific time (Gemini API rate-limit docs); the reset
   is shown in the viewer's local time. Across a DST switch it can be an hour off. */
function nextPacificMidnight(now){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now);
  const g=t=>+(parts.find(p=>p.type===t)||{value:0}).value;
  const into=g('hour')*3600+g('minute')*60+g('second');
  return new Date(now.getTime()+(86400-into)*1000);
}
export function geminiErrorText(e){
  const m=String((e&&e.message)||e||'');
  const status=+((m.match(/^gemini (\d{3})/)||[])[1]||0);
  if(status===429){
    let when='';
    try{when=nextPacificMidnight(new Date()).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'});}catch(x){}
    return `오늘 Gemini 무료 사용량을 다 썼어요.${when?` ${when}에 다시 쓸 수 있어요.`:' 내일 다시 쓸 수 있어요.'} (키 문제가 아니에요)`;
  }
  if(status===503)return 'Gemini 서버가 지금 붐벼요. 잠시 후 다시 시도해 주세요.';
  if(status===400&&/API[_ ]key/i.test(m))return 'Gemini 키가 올바르지 않아요. 🔑 Gemini 키를 다시 확인해 주세요.';
  if(status===401||status===403)return 'Gemini 키 권한 문제예요. 🔑 Gemini 키를 다시 확인해 주세요.';
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  return 'Gemini 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.';
}

/* A free-tier key allows a fixed number of requests per model per day (20 on
   gemini-2.5-flash when this was written), and nothing in the API tells you how much of
   it is left until it refuses. Counting our own calls locally is approximate - it can't
   see usage from another device or app - but it's the difference between "the app
   stopped working" and "I've used 18 of about 20 today". */
export async function noteUsage(){
  const today=new Date().toISOString().slice(0,10);
  const u=await store.get("usage:gemini",{date:today,count:0});
  const next=(u.date===today)?{date:today,count:(u.count||0)+1}:{date:today,count:1};
  await store.set("usage:gemini",next);
  return next;
}
export async function usageToday(){
  const today=new Date().toISOString().slice(0,10);
  const u=await store.get("usage:gemini",{date:today,count:0});
  return u.date===today?(u.count||0):0;
}

export async function geminiCall(history,systemText,wantJSON){
  const model=(S.gemini.model||"gemini-2.5-flash").trim();
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.gemini.key)}`;
  const body={
    contents:history.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),
    generationConfig:{temperature:.85,maxOutputTokens:600}
  };
  if(systemText)body.systemInstruction={parts:[{text:systemText}]};
  if(wantJSON)body.generationConfig.responseMimeType="application/json";
  await noteUsage();
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok){const t=await res.text();throw new Error("gemini "+res.status+" "+t.slice(0,120));}
  const data=await res.json();
  const text=((data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts)||[]).map(p=>p.text||"").join("").trim();
  if(wantJSON)return JSON.parse(text.replace(/```json|```/g,"").trim());
  return text;
}

/* Sends a recording for the model to listen to, with a text instruction alongside.
   Part shape per the generateContent reference: inline_data {mime_type, data(base64)}.

   Temperature is low on purpose. An assessment that comes back different every time
   you submit the same take is not an assessment, and the scores feed a trend chart.
   The output budget is larger than geminiCall's because a per-word breakdown is long,
   and on 2.5 models thinking tokens are drawn from the same budget - a tight cap
   truncates the JSON mid-object. */
export async function geminiAudioCall(prompt,wavBase64,systemText){
  const model=(S.gemini.model||"gemini-2.5-flash").trim();
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.gemini.key)}`;
  const body=audioRequestBody(prompt,wavBase64,systemText);
  await noteUsage();
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok){const t=await res.text();throw new Error("gemini "+res.status+" "+t.slice(0,160));}
  const data=await res.json();
  const text=((data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts)||[]).map(p=>p.text||"").join("").trim();
  if(!text)throw new Error("gemini empty response"+(data.candidates&&data.candidates[0]?" ("+data.candidates[0].finishReason+")":""));
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

/* Streams a plain-text reply (no JSON mode — structured output can't be parsed
   incrementally and adds latency). Calls onDelta(chunkText) as text arrives and
   resolves with the full accumulated reply. Used for the AI chat's live reply so
   the first sentence can be spoken before the rest has even generated. */
export async function geminiStreamCall(history,systemText,onDelta){
  const model=(S.gemini.model||"gemini-2.5-flash").trim();
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(S.gemini.key)}`;
  const body={
    contents:history.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),
    generationConfig:{temperature:.85,maxOutputTokens:400}
  };
  if(systemText)body.systemInstruction={parts:[{text:systemText}]};
  await noteUsage();
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok||!res.body){const t=await res.text().catch(()=>'');throw new Error("gemini "+res.status+" "+t.slice(0,120));}
  const reader=res.body.getReader();
  const decoder=new TextDecoder();
  let buf='',full='';
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    buf+=decoder.decode(value,{stream:true});
    const lines=buf.split('\n');
    buf=lines.pop(); // keep the last (possibly incomplete) line for next chunk
    for(const line of lines){
      const l=line.trim();
      if(!l.startsWith('data:'))continue;
      const jsonStr=l.slice(5).trim();
      if(!jsonStr||jsonStr==='[DONE]')continue;
      try{
        const obj=JSON.parse(jsonStr);
        const parts=(obj.candidates&&obj.candidates[0]&&obj.candidates[0].content&&obj.candidates[0].content.parts)||[];
        const chunk=parts.map(p=>p.text||'').join('');
        if(chunk){full+=chunk;onDelta(chunk);}
      }catch(e){/* ignore a stray partial JSON line */}
    }
  }
  return full;
}

export async function openKeySheet(){
  const g=S.gemini||{};
  const used=await usageToday();
  openSheet(`
    <div class="term">🔑 AI 실시간 대화 설정</div>
    <p class="mean" style="color:var(--muted)">본인의 <b>Gemini 무료 API 키</b>를 넣으면 대화가 실시간 적응형으로 바뀌고 즉시 피드백을 받아요. 키는 <b>이 브라우저에만</b> 저장되고 Google로 직접 전송됩니다 (Claude 토큰과 무관).</p>
    <div class="field"><label>Gemini API Key</label>
      <input id="gkey" type="password" placeholder="AIza… 또는 AQ.… 로 시작하는 키" value="${esc(g.key||'')}"></div>
    <div class="field"><label>모델 (기본 gemini-2.5-flash)</label>
      <input id="gmodel" placeholder="gemini-2.5-flash" value="${esc(g.model||'gemini-2.5-flash')}"></div>
    <div class="row">
      <button class="btn small" id="gsave">저장</button>
      <button class="btn ghost small" id="gclear">키 삭제</button>
      <button class="btn ghost small" id="gclose">닫기</button>
    </div>
    ${hasKey()?`<p class="lead" style="font-size:12.5px;margin:12px 0 0">오늘 이 앱에서 보낸 AI 요청 <b>${used}회</b>.
      무료 키는 보통 <b>모델당 하루 20회</b>까지예요 (자정 기준 태평양 시간에 초기화 · 한국시간 오후 4~5시).
      모델을 바꾸면 한도가 따로 계산돼요.</p>`:''}
    <p class="lead" style="font-size:12px;margin:12px 0 0">키 발급: <a class="link" id="gget">Google AI Studio</a>에서 무료로 만들 수 있어요. 배포(예: Netlify) 시엔 키에 사용 제한(HTTP 리퍼러)을 걸어 두세요.</p>`);
  document.getElementById('gget').onclick=()=>window.open('https://aistudio.google.com/app/apikey','_blank');
  document.getElementById('gsave').onclick=async()=>{
    S.gemini={key:document.getElementById('gkey').value.trim(),model:document.getElementById('gmodel').value.trim()||"gemini-2.5-flash"};
    await store.set("settings:gemini",S.gemini);closeSheet();toast(hasKey()?"저장했어요 🔑 AI 대화 사용 가능":"키가 비어 있어요");
    // if we're mid-session on the talk phase, re-render it now that key state changed
    if(PHASES[S.phase]&&PHASES[S.phase].key==='talk'){const {goPhase}=await import('./ui/session.js');goPhase(S.phase);}
  };
  document.getElementById('gclear').onclick=async()=>{S.gemini={key:"",model:"gemini-2.5-flash"};await store.set("settings:gemini",S.gemini);closeSheet();toast("키를 삭제했어요");};
  document.getElementById('gclose').onclick=closeSheet;
}
