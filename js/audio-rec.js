/* Raw audio capture for pronunciation assessment.

   Speech recognition hands back text, and text is exactly what can't carry
   pronunciation: a recognizer maps a mangled "through" onto "through" from context,
   so any score built on its transcript rewards the words it guessed, not the sounds
   you made. To judge pronunciation the model has to hear the recording itself.

   Encodes 16 kHz mono 16-bit PCM WAV rather than passing along MediaRecorder output.
   What MediaRecorder produces differs by browser (webm/opus on Chrome, mp4/aac on
   Safari), while WAV is one format we write ourselves and every audio API accepts.
   16 kHz mono loses nothing here: Gemini downsamples input to 16 kbps mono anyway.
   Size is 32 KB per second, so the 60-second cap stays far below the 20 MB request
   limit even after base64.

   Capture follows stt-whisper.js (ScriptProcessor, iOS context resume) because that
   path is already proven on the devices this app runs on. */

const MAX_MS = 60000;
const TARGET_RATE = 16000;
/* Below this the take is effectively silence. Sending it would cost a request and
   invite the model to invent feedback on nothing, so it is refused locally. */
const SILENT_PEAK = 0.02;

/* Audio-context promises are not guaranteed to settle: resume() can stay pending when
   the browser withholds audio, and close() on a context that never started can too.
   Awaiting either unbounded would leave the record button hanging forever, so both are
   raced against a short timeout and recording proceeds either way. */
const within=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);

export function audioRecSupported(){
  return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&(window.AudioContext||window.webkitAudioContext));
}

async function resample(float32,fromRate){
  if(fromRate===TARGET_RATE)return float32;
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const frames=Math.max(1,Math.ceil(float32.length/fromRate*TARGET_RATE));
  const offline=new OAC(1,frames,TARGET_RATE);
  const buf=offline.createBuffer(1,float32.length,fromRate);
  buf.copyToChannel(float32,0);
  const src=offline.createBufferSource();src.buffer=buf;src.connect(offline.destination);src.start(0);
  return (await offline.startRendering()).getChannelData(0);
}

export function encodeWav(samples,rate){
  const buf=new ArrayBuffer(44+samples.length*2);
  const v=new DataView(buf);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);str(8,'WAVE');
  str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  str(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0,o=44;i<samples.length;i++,o+=2){
    const s=Math.max(-1,Math.min(1,samples[i]));
    v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);
  }
  return new Uint8Array(buf);
}

export function toBase64(bytes){
  let bin='';const CH=0x8000;
  for(let i=0;i<bytes.length;i+=CH)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
  return btoa(bin);
}

/* Starts recording. Resolves to a controller once the microphone is live; rejects if
   it is denied. controller.stop() resolves to
   {wavBase64, ms, peak, silent} — wavBase64 is null when the take was silent. */
export async function startRecording({onAutoStop}={}){
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const AC=window.AudioContext||window.webkitAudioContext;
  const ctx=new AC();
  if(ctx.state==='suspended'){try{await within(ctx.resume(),1500);}catch(e){/* keep going */}}
  const source=ctx.createMediaStreamSource(stream);
  const proc=ctx.createScriptProcessor(4096,1,1);
  const chunks=[];let peak=0;let done=false;let t0=Date.now();

  /* Resolve only once audio is actually arriving. Between getUserMedia returning and the
     first processed buffer there can be a gap of most of a second; if the UI says
     "recording" during it, the user starts reading and the first words are never
     captured - measured here as 2.0 s of wall time yielding 1.19 s of audio. */
  let markLive;const live=new Promise(r=>{markLive=r;});
  proc.onaudioprocess=e=>{
    if(done)return;
    const d=e.inputBuffer.getChannelData(0);
    if(!chunks.length){t0=Date.now();markLive();}
    chunks.push(new Float32Array(d));
    for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>peak)peak=a;}
  };
  source.connect(proc);proc.connect(ctx.destination);
  await within(live,2500);

  let stopPromise=null;
  const timer=setTimeout(()=>{if(onAutoStop)onAutoStop();},MAX_MS);

  function stop(){
    if(stopPromise)return stopPromise;
    stopPromise=(async()=>{
      done=true;clearTimeout(timer);
      try{proc.disconnect();source.disconnect();}catch(e){}
      stream.getTracks().forEach(t=>t.stop());
      const rate=ctx.sampleRate;
      try{await within(ctx.close(),1000);}catch(e){}
      const len=chunks.reduce((a,c)=>a+c.length,0);
      const all=new Float32Array(len);let o=0;for(const c of chunks){all.set(c,o);o+=c.length;}
      const ms=Date.now()-t0;
      const silent=peak<SILENT_PEAK||len===0;
      if(silent)return {wavBase64:null,ms,peak,silent:true};
      const pcm=await resample(all,rate);
      return {wavBase64:toBase64(encodeWav(pcm,TARGET_RATE)),ms,peak,silent:false};
    })();
    return stopPromise;
  }
  return {stop};
}
