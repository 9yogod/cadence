/* Text-to-speech + speech-to-text (Web Speech API), plus a shared "wire a mic button" helper
   so the three places that record speech (chat mic, scenario mic, pronunciation check) behave
   and look the same: live interim captions while the user talks, consistent recording state,
   and one Korean error message for a given failure instead of three different behaviors. */
import {esc} from './utils.js';
import {toast} from './toast.js';

/* ---- TTS ---- */
let voice=null;
function pickVoice(){const vs=speechSynthesis.getVoices();
  voice=vs.find(v=>/en-US/i.test(v.lang)&&/female|Samantha|Google US/i.test(v.name))||vs.find(v=>/en-US/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;}
if('speechSynthesis'in window){speechSynthesis.onvoiceschanged=pickVoice;pickVoice();}

export function speak(text,rate=.92){
  if(!('speechSynthesis'in window))return toast("이 브라우저는 음성 재생을 지원하지 않아요");
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=rate;if(voice)u.voice=voice;speechSynthesis.speak(u);
}

/* Like speak(), but doesn't cancel what's already queued — calling this repeatedly
   (e.g. once per completed sentence while a reply streams in) plays each chunk in
   order without cutting the previous one off, instead of waiting for the whole
   reply to finish generating before saying anything. */
export function speakQueued(text,rate=.92){
  if(!('speechSynthesis'in window)||!text)return;
  const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=rate;if(voice)u.voice=voice;speechSynthesis.speak(u);
}

/* ---- STT ---- */
export function sttSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}

export function micUnsupportedMessage(){
  return "이 브라우저는 음성 인식을 지원하지 않아요 (iOS Safari 등). 텍스트로 입력해 주세요.";
}

function mapSTTError(code){
  return {
    'no-speech':'음성이 감지되지 않았어요. 다시 말해보세요.',
    'not-allowed':'마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.',
    'service-not-allowed':'마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.',
    'audio-capture':'마이크를 찾을 수 없어요.',
    'network':'네트워크 오류로 음성 인식에 실패했어요.',
    'aborted':''
  }[code]||'음성 인식 중 오류가 발생했어요.';
}

/* Low-level: creates a SpeechRecognition instance wired to onInterim/onFinal/onEnd/onError.
   Returns null when the browser has no Web Speech API. */
export function createRecognizer({continuous=false,onInterim,onFinal,onEnd,onError}={}){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return null;
  const rec=new SR();
  rec.lang='en-US';rec.interimResults=true;rec.continuous=continuous;
  let finalText='';
  rec.onresult=e=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r=e.results[i];
      if(r.isFinal){finalText=(finalText+' '+r[0].transcript).trim();if(onFinal)onFinal(finalText);}
      else interim+=r[0].transcript;
    }
    if(interim&&onInterim)onInterim(interim);
  };
  rec.onerror=e=>{if(onError)onError(mapSTTError(e.error));};
  rec.onend=()=>{if(onEnd)onEnd(finalText.trim());};
  return rec;
}

/* Shared wiring behind wireMicButton: given any recognizer-constructor with the
   create{Recognizer,WhisperRecognizer}({onInterim,onFinal,onEnd,onError}) shape,
   toggles the button between idle/recording, shows the live caption, and surfaces
   errors as a toast — identical behavior regardless of which engine is underneath. */
function wireRecognizerButton(btn,makeRecognizer,{interimEl,onFinalText,onStart,onStop}={}){
  let rec=null,on=false;
  const stopUI=()=>{on=false;btn.classList.remove('mic-live');if(onStop)onStop();};
  btn.onclick=()=>{
    if(on){rec&&rec.stop();return;}
    if(interimEl){interimEl.textContent='';interimEl.classList.remove('err');}
    rec=makeRecognizer({
      onInterim:t=>{if(interimEl){const suffix=/[.!?…]$/.test(t.trim())?'':'…';interimEl.innerHTML='<b>'+esc(t)+suffix+'</b>';}},
      onEnd:finalText=>{stopUI();if(interimEl)interimEl.textContent='';if(onFinalText)onFinalText(finalText);},
      onError:msg=>{stopUI();if(msg){if(interimEl){interimEl.textContent=msg;interimEl.classList.add('err');}toast(msg,'err');}}
    });
    if(!rec)return;
    on=true;btn.classList.add('mic-live');if(onStart)onStart();rec.start();
  };
}

/* High-level: wires a single mic <button> to start/stop recording with a live interim caption.
   - btn: the mic button.
   - interimEl: optional element that shows the live partial transcript + error messages.
   - onFinalText(text): called once recording stops with the best final transcript recognized.
   - continuous: keep listening across pauses (used for reading a whole paragraph aloud).
   Picks the engine automatically: the browser's native Web Speech API when available
   (fast, no download), or — when it isn't (iOS Safari, some Firefox builds, …) — an
   in-browser Whisper model (`stt-whisper.js`) so voice input still works everywhere.
   Only if neither is available does the button hide, with an explanatory message. */
export function wireMicButton(btn,{interimEl,onFinalText,continuous=false,onStart,onStop}={}){
  if(sttSupported()){
    wireRecognizerButton(btn,cfg=>createRecognizer({...cfg,continuous}),{interimEl,onFinalText,onStart,onStop});
    return {supported:true};
  }
  import('./stt-whisper.js').then(({whisperSupported,createWhisperRecognizer})=>{
    if(!whisperSupported()){
      btn.style.display='none';
      if(interimEl){interimEl.textContent=micUnsupportedMessage();interimEl.classList.add('err');}
      return;
    }
    wireRecognizerButton(btn,createWhisperRecognizer,{interimEl,onFinalText,onStart,onStop});
  });
  return {supported:'pending'};
}
