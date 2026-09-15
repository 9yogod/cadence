/* Real-Gemini check of the pronunciation assessment against recordings with known,
   planted errors. Run:  node tools/pron-verify/verify.mjs
   (generate the recordings first with make_audio.ps1)

   Everything except the network call comes from the app itself - the prompt, system
   text and request body (js/pron-prompt.js) and the WAV encoder (js/audio-rec.js),
   which re-encodes each recording's samples - so a result here is a result for the app.

   Costs 8 requests. The free tier allowed 20 per day per model on gemini-2.5-flash when
   this was written, and the app's own AI features draw on the same daily count.

   Key: GEMINI_API_KEY, or the file ~/.cadence_gemini_key. Never printed. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = pathToFileURL(path.join(HERE, '..', '..', 'js') + path.sep).href;
const {PRON_SYSTEM, pronPrompt, audioRequestBody} = await import(JS + 'pron-prompt.js');
const {encodeWav, toBase64} = await import(JS + 'audio-rec.js');

const keyFile = path.join(os.homedir(), '.cadence_gemini_key');
const KEY = (process.env.GEMINI_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!KEY) { console.log('No key: set GEMINI_API_KEY or create ~/.cadence_gemini_key'); process.exit(3); }
const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const AUDIO = path.join(HERE, 'audio');

export const REF = 'Could you walk me through the numbers before Thursday? I think the third option is really worth considering.';

function pcm(file){
  const w = fs.readFileSync(path.join(AUDIO, file + '.wav'));
  let o = 12;
  while (o < w.length - 8) {
    const id = w.toString('ascii', o, o + 4), sz = w.readUInt32LE(o + 4);
    if (id === 'data') { const n = sz >> 1, f = new Float32Array(n); for (let i = 0; i < n; i++) f[i] = w.readInt16LE(o + 8 + 2 * i) / 32768; return f; }
    o += 8 + sz + (sz % 2);
  }
  throw new Error('no data chunk: ' + file);
}

async function assess(file){
  const body = audioRequestBody(pronPrompt(REF), toBase64(encodeWav(pcm(file), 16000)), PRON_SYSTEM);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`,
    {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const raw = (await res.text()).split(KEY).join('***');
  if (!res.ok) return {error: `HTTP ${res.status} ${raw.slice(0, 160)}`};
  const d = JSON.parse(raw), c = d.candidates && d.candidates[0];
  const text = ((c && c.content && c.content.parts) || []).map(p => p.text || '').join('');
  try { return {r: JSON.parse(text.replace(/```json|```/g, ''))}; }
  catch (e) { return {error: `unparseable (${c && c.finishReason}): ${text.slice(0, 120)}`}; }
}

const runs = ['correct', 'th_errors', 'skipped', 'wrong_text', 'silence', 'korean_voice', 'correct', 'th_errors'];
const got = {};
for (const f of runs) {
  const out = await assess(f);
  (got[f] ||= []).push(out);
  if (out.error) { console.log(`${f}  ERROR ${out.error}`); if (/HTTP 429/.test(out.error)) { console.log('Daily quota exhausted - stopping.'); break; } }
  else console.log(`${f}  audible=${out.r.audible} score=${out.r.score} words=[${(out.r.words || []).map(w => w.word + '→' + w.heard).join(', ')}]\n    heard: ${out.r.heard}`);
  await new Promise(r => setTimeout(r, 7000));
}

const first = k => got[k] && got[k].find(x => x.r) && got[k].find(x => x.r).r;
const lc = s => String(s || '').toLowerCase();
const checks = [];
const check = (name, pass, detail) => checks.push([pass ? 'PASS' : 'FAIL', name, detail]);
const c = first('correct'), t = first('th_errors'), s = first('skipped'), w = first('wrong_text'), z = first('silence'), k = first('korean_voice');

if (c) {
  check('correct: audible', c.audible === true, '');
  check('correct: score >= 80', +c.score >= 80, c.score);
  check('correct: no invented errors (<= 1 flagged)', (c.words || []).length <= 1, (c.words || []).length);
}
if (t) {
  const flagged = (t.words || []).map(x => lc(x.word).replace(/[^a-z]/g, ''));
  const caught = ['through', 'thursday', 'think', 'third'].filter(p => flagged.includes(p));
  check('th_errors: >= 2 of 4 planted substitutions flagged', caught.length >= 2, caught.join(', ') || 'none');
  const kept = ['true', 'tursday', 'sink', 'tird'].filter(f => lc(t.heard).includes(f));
  check('th_errors: "heard" keeps >= 2 erroneous forms', kept.length >= 2, kept.join(', ') || 'none');
  if (c) check('th_errors: scores below correct', +t.score < +c.score, `${t.score} < ${c.score}`);
}
if (s) check('skipped: omitted words absent from "heard"', ['through', 'third', 'really', 'considering'].filter(x => !lc(s.heard).includes(x)).length >= 3, s.heard);
if (w) check('wrong_text: rejected (audible false or < 40)', w.audible === false || +w.score < 40, `${w.audible}/${w.score}`);
if (z) check('silence: audible false, nothing flagged', z.audible === false && !(z.words || []).length, `${z.audible}`);
if (k && c) check('korean_voice: scores below correct', +k.score < +c.score, `${k.score} < ${c.score}`);
for (const n of ['correct', 'th_errors']) {
  const sc = (got[n] || []).filter(x => x.r).map(x => +x.r.score);
  if (sc.length >= 2) check(`${n}: repeat scores within 10`, Math.max(...sc) - Math.min(...sc) <= 10, sc.join(', '));
}
console.log('\n' + checks.map(x => x.join('  ')).join('\n'));
console.log(`\n${checks.filter(x => x[0] === 'PASS').length}/${checks.length} passed`);
