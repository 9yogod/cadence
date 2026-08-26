/* In-browser speech recognition for platforms without the Web Speech API (notably
   iOS Safari). Runs OpenAI's Whisper (tiny.en, quantized) fully client-side via
   @huggingface/transformers (Apache-2.0, https://github.com/huggingface/transformers.js),
   loaded lazily from a public CDN — no server, no API key. The model (~40-75MB) is
   downloaded once and cached by the browser; every use after that is offline.

   Unlike the native engine this can't stream partial words as you speak — it
   transcribes the whole recording at once after you stop (or after ~1.2s of
   silence), so onInterim here only ever reports status text, never a live partial
   transcript. That trade-off is called out to the user via the interim caption. */

const MODEL_ID='Xenova/whisper-tiny.en';
const CDN='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';
const SILENCE_RMS=0.012,SILENCE_MS=1200,MIN_MS=800,MAX_MS=25000;

export function whisperSupported(){
  return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&(window.AudioContext||window.webkitAudioContext));
}

let pipelinePromise=null;
function getPipeline(onProgress){
  if(!pipelinePromise){
    pipelinePromise=import(CDN).then(({pipeline,env})=>{
      env.allowLocalModels=false;
      return pipeline('automatic-speech-recognition',MODEL_ID,{
        dtype:'q8',
        progress_callback:onProgress
      });
    });
  }
  return pipelinePromise;
}

function mergeChunks(chunks){
  const len=chunks.reduce((a,c)=>a+c.length,0);
  const out=new Float32Array(len);let o=0;
  for(const c of chunks){out.set(c,o);o+=c.length;}
  return out;
}

async function resampleTo16k(float32,fromRate){
  if(fromRate===16000)return float32;
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const duration=float32.length/fromRate;
  const offline=new OAC(1,Math.max(1,Math.ceil(duration*16000)),16000);
  const buf=offline.createBuffer(1,float32.length,fromRate);
  buf.copyToChannel(float32,0);
  const src=offline.createBufferSource();src.buffer=buf;src.connect(offline.destination);src.start(0);
  const rendered=await offline.startRendering();
  return rendered.getChannelData(0);
}

/* Same {onInterim,onFinal,onEnd,onError} shape as speech.js's createRecognizer, so
   wireMicButton can use either interchangeably. continuous/isFinal concepts don't
   apply here — every recording is a single push-to-talk-with-auto-stop utterance. */
export function createWhisperRecognizer({onInterim,onFinal,onEnd,onError}={}){
  if(!whisperSupported())return null;
  let stream=null,audioCtx=null,source=null,proc=null,chunks=[],silenceStart=null,stopped=false,startTime=0;

  async function start(){
    if(onInterim)onInterim('🎙 녹음 중');
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
    }catch(e){
      if(onError)onError('마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.');
      return;
    }
    if(stopped)return; // stop() was called while permission was pending
    const AC=window.AudioContext||window.webkitAudioContext;
    audioCtx=new AC();
    source=audioCtx.createMediaStreamSource(stream);
    proc=audioCtx.createScriptProcessor(4096,1,1);
    chunks=[];silenceStart=null;startTime=Date.now();
    proc.onaudioprocess=e=>{
      if(stopped)return;
      const data=e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
      const rms=Math.sqrt(sum/data.length);
      const now=Date.now();
      if(rms<SILENCE_RMS){
        if(silenceStart==null)silenceStart=now;
        else if(now-silenceStart>SILENCE_MS&&now-startTime>MIN_MS)stop();
      }else silenceStart=null;
      if(now-startTime>MAX_MS)stop();
    };
    source.connect(proc);proc.connect(audioCtx.destination);
  }

  async function stop(){
    if(stopped)return;stopped=true;
    const sr=audioCtx?audioCtx.sampleRate:16000;
    try{proc&&proc.disconnect();source&&source.disconnect();}catch(e){/* already torn down */}
    if(stream)stream.getTracks().forEach(t=>t.stop());
    const merged=mergeChunks(chunks);
    if(audioCtx){try{await audioCtx.close();}catch(e){/* ignore */}}
    if(!merged.length){if(onEnd)onEnd('');return;}
    try{
      const resampled=await resampleTo16k(merged,sr);
      const asr=await getPipeline(p=>{
        if(p&&p.status==='progress'&&onInterim){
          onInterim(`모델 다운로드 중… ${Math.round(p.progress||0)}% (최초 1회만)`);
        }
      });
      if(onInterim)onInterim('인식하는 중…');
      const out=await asr(resampled);
      const text=((out&&out.text)||'').trim();
      if(onFinal)onFinal(text);
      if(onEnd)onEnd(text);
    }catch(e){
      if(onError)onError('음성 인식에 실패했어요. 처음이라면 모델을 받는 중 인터넷이 끊겼을 수 있어요.');
      if(onEnd)onEnd('');
    }
  }

  return {start,stop};
}
