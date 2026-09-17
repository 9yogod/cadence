/* The pronunciation-assessment instruction, kept free of DOM and app state so the exact
   text the app sends can also be run by the verification harness in tools/pron-verify,
   which also records what this prompt does and does not catch.
   If the app and the test built their prompts separately, a passing test would say
   nothing about what users actually get.

   Two guards against confident feedback about errors nobody made. "heard" makes the
   model commit to what it actually heard before it critiques, and is shown to the user
   so they can check it listened. "audible" gives it a sanctioned way to call a take
   unusable instead of inventing an assessment. Deliberately no list of "typical
   Korean-speaker errors": naming them primes the model to report them whether or not
   they occurred. */

export const PRON_SYSTEM="You are an English pronunciation coach for a Korean learner. You receive an audio recording and the reference text the learner tried to read aloud. Base every judgment strictly on what is audible in the recording. Never report an error you cannot actually hear. If the recording is silent, unintelligible, or is not an attempt at the reference text, set audible to false and return an empty words list. Return ONLY JSON.";

export function pronPrompt(ref){
  return `Reference text the learner was reading aloud:
"""${ref}"""

Listen to the attached recording and return JSON with exactly these fields:
{
 "audible": true or false,
 "heard": "verbatim transcript of what you actually heard, keeping misread, mispronounced or skipped words as they were spoken",
 "score": integer 0-100 for pronunciation accuracy and intelligibility,
 "fluency": "one Korean sentence about pace, pauses and rhythm",
 "strengths": "one Korean sentence about what sounded good",
 "focus": "one Korean sentence: the single most useful thing to practice next",
 "words": [{"word":"the reference word","heard":"how it actually sounded","issue":"short Korean description of the sound problem","tip":"short Korean instruction for producing it correctly"}]
}
words: at most 6, only problems clearly audible in the recording, most damaging to intelligibility first, [] if none.
score rubric: 90-100 near-native clarity; 75-89 clear with a noticeable accent; 60-74 understandable with clear errors; 40-59 errors interfere with understanding; below 40 hard to understand.`;
}

/* generateContent settings shared by the app and the harness. */
export const PRON_GENERATION={temperature:.2,maxOutputTokens:2048,responseMimeType:"application/json"};

/* The generateContent body for an audio assessment. Built here, not in gemini.js, so the
   harness sends byte-for-byte the request the app sends. Part shape per the
   generateContent reference: inline_data {mime_type, data (base64)}. */
export function audioRequestBody(prompt,wavBase64,systemText){
  const body={
    contents:[{role:'user',parts:[{text:prompt},{inline_data:{mime_type:'audio/wav',data:wavBase64}}]}],
    generationConfig:{...PRON_GENERATION}
  };
  if(systemText)body.systemInstruction={parts:[{text:systemText}]};
  return body;
}

/* Word drill. The sentence assessment misses substitutions that form another plausible
   word because context resolves them; with isolated words there is no context to lean
   on, so each word is judged on its sounds alone. The confusable counterpart is named
   per word to make it a decision between two specific sounds rather than an open
   judgment - and "heard" is still required first, so a wrong call can be seen. */
export const WORDPRON_SYSTEM="You are an English pronunciation coach for a Korean learner. You receive a recording of single words read one at a time, and the list of words that were supposed to be said. Judge each word only by the sounds actually in the recording - there is no sentence context to rely on, so do not guess from the list what the speaker must have meant. Never mark a word correct because it is the expected word. Return ONLY JSON.";

export function wordPronPrompt(round){
  const lines=round.map((p,i)=>`${i+1}. ${p.a}   (counts as wrong if it sounds like: ${p.b})`).join('\n');
  return `The learner was asked to read these words aloud, one at a time, in this order:
${lines}

Listen to the recording and return JSON:
{
 "audible": true or false,
 "heard": "the words you heard, in order, separated by spaces, exactly as they sounded",
 "words": [{"index":1,"target":"the expected word","heard":"what that position actually sounded like","correct":true or false,"note":"at most one short Korean sentence, only when it is wrong"}]
}
One entry per expected word, in order. correct is true only when the sounds match the expected word rather than its confusable counterpart. If a position is missing or unintelligible, set correct false and heard "". If the recording is silent or is not someone reading these words, set audible false.`;
}
