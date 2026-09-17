/* Minimal pairs for the word-level pronunciation drill.

   Each entry is a contrast Korean has no separate phoneme for, so the two English words
   tend to collapse into one. `a` is what the learner practices saying; `b` is what it
   turns into when the contrast is lost. `tip` says how to make `a` instead of `b`.

   This is where the AI assessment actually works: measured against real Gemini, the same
   substitutions it missed inside a sentence (it resolved them to whatever the context
   made likely) came back correctly when the words were spoken on their own. See
   tools/pron-verify/README.md. */

export const MINIMAL_PAIRS=[
  // th (θ) vs s - "think" becoming "sink"
  {a:'think',  b:'sink',   group:'th/s', tip:'혀끝을 윗니와 아랫니 사이에 살짝 물고 바람을 내보내세요. s처럼 혀를 입천장에 붙이면 안 돼요.'},
  {a:'thick',  b:'sick',   group:'th/s', tip:'혀끝이 이 사이로 아주 살짝 보일 정도로 내밀어요.'},
  {a:'mouth',  b:'mouse',  group:'th/s', tip:'끝소리에서도 혀끝을 이 사이에 두고 바람만 흘려요.'},
  {a:'thing',  b:'sing',   group:'th/s', tip:'첫소리에서 혀끝이 이에 닿아야 해요.'},

  // th (θ) vs t - "three" becoming "tree"
  {a:'three',  b:'tree',   group:'th/t', tip:'t처럼 혀를 잇몸에 탁 붙였다 떼지 말고, 이 사이에서 바람을 이어서 내보내세요.'},
  {a:'thought',b:'taught', group:'th/t', tip:'막았다 터뜨리는 소리가 아니라 계속 새는 소리예요.'},

  // voiced th (ð) vs d - "they" becoming "day"
  {a:'they',   b:'day',    group:'ð/d',  tip:'혀끝을 이 사이에 두고 목을 울리며 바람을 내보내요. d처럼 막지 마세요.'},
  {a:'breathe',b:'breed',  group:'ð/d',  tip:'끝을 d로 닫지 말고 혀끝을 이 사이에 둔 채 울려요.'},

  // r vs l
  {a:'right',  b:'light',  group:'r/l',  tip:'r은 혀끝이 입천장에 닿지 않아요. 혀를 뒤로 말아 띄운 채 소리내세요.'},
  {a:'rice',   b:'lice',   group:'r/l',  tip:'입술을 살짝 오므리고 혀를 어디에도 대지 않은 채 시작해요.'},
  {a:'collect',b:'correct',group:'r/l',  tip:'l은 혀끝을 윗잇몸에 확실히 붙여요. 붙이지 않으면 r로 들려요.'},
  {a:'grass',  b:'glass',  group:'r/l',  tip:'r에서 혀끝을 띄우세요. 붙이면 glass가 됩니다.'},

  // f vs p
  {a:'coffee', b:'copy',   group:'f/p',  tip:'윗니를 아랫입술에 대고 바람을 내보내요. 두 입술을 붙이면 p가 돼요.'},
  {a:'fine',   b:'pine',   group:'f/p',  tip:'윗니와 아랫입술 사이로 바람이 새야 해요.'},
  {a:'laugh',  b:'lap',    group:'f/p',  tip:'끝소리도 윗니-아랫입술로, 터뜨리지 말고 흘려요.'},

  // v vs b
  {a:'vest',   b:'best',   group:'v/b',  tip:'윗니를 아랫입술에 댄 채 목을 울려요. 입술을 붙이면 b예요.'},
  {a:'very',   b:'berry',  group:'v/b',  tip:'f와 같은 입 모양에 목소리를 얹으세요.'},
  {a:'vote',   b:'boat',   group:'v/b',  tip:'두 입술이 닿으면 안 돼요.'},

  // z vs j / s
  {a:'zoo',    b:'jew',    group:'z/j',  tip:'혀를 붙였다 떼지 말고, s 자리에서 목을 울리며 이어서 소리내요.'},
  {a:'zero',   b:'jero',   group:'z/j',  tip:'첫소리를 막지 말고 바로 울리는 바람소리로 시작해요.'},

  // æ vs e
  {a:'bad',    b:'bed',    group:'æ/e',  tip:'입을 더 크게 벌리고 턱을 내려서 "애"에 가깝게.'},
  {a:'sat',    b:'set',    group:'æ/e',  tip:'입을 옆으로 넓게 벌려요.'},

  // long vs short vowel
  {a:'sheep',  b:'ship',   group:'iː/ɪ', tip:'입술을 옆으로 당겨 길게 "이-". ship은 짧고 힘을 뺀 소리예요.'},
  {a:'leave',  b:'live',   group:'iː/ɪ', tip:'모음을 확실히 길게 끌어요.'},

  // final consonants Korean tends to add a vowel to
  {a:'desk',   b:'데스크',  group:'끝소리', tip:'끝을 "크"로 끊지 말고 s와 k를 붙여 소리 없이 닫아요.'},
  {a:'milk',   b:'밀크',    group:'끝소리', tip:'l 뒤에 "으"를 넣지 말고 바로 k로 닫아요.'},
];

export const PAIR_GROUPS=[...new Set(MINIMAL_PAIRS.map(p=>p.group))];
