/* Entry point: loads saved state, wires the header buttons, and shows the home screen. */
import {S,store} from './state.js';
import './lookup.js'; // registers global tap/drag word-lookup listeners
import {updateNoteCount, renderNotes} from './notes.js';
import {renderHistory} from './history.js';
import {renderStart} from './ui/start.js';

(async function init(){
  S.notes=await store.get("notes:expressions",[]);
  S.stats=await store.get("stats",{sessions:0,lastDate:null,streak:0});
  S.mistakes=await store.get("log:mistakes",[]);
  S.lookups=await store.get("log:lookups",[]);
  S.sessionRecs=await store.get("log:sessions",[]);
  S.scores=await store.get("log:scores",[]);
  S.gemini=await store.get("settings:gemini",{key:"",model:"gemini-2.5-flash"});
  S.level=await store.get("settings:level","int");S.dictLevel=S.level;
  S.auto=await store.get("settings:auto",false);
  S.skill=await store.get("settings:skill",50);
  updateNoteCount();renderStart();
})();

document.getElementById('openNotes').onclick=renderNotes;
document.getElementById('openHist').onclick=()=>renderHistory('mistakes');
