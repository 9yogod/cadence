/* Dictation sentences, by level. */
export const DICT=[
 {en:"I usually grab a coffee before work.",ko:"보통 출근 전에 커피를 사요."},
 {en:"Can you send me the file by tonight?",ko:"오늘 밤까지 파일 보내줄 수 있어요?"},
 {en:"The meeting got pushed to next week.",ko:"회의가 다음 주로 미뤄졌어요."},
 {en:"Let's take a short break and come back.",ko:"잠깐 쉬었다가 다시 하죠."},
 {en:"I'm not sure I follow what you mean.",ko:"무슨 말인지 잘 모르겠어요."},
 {en:"Traffic was terrible on the way here.",ko:"여기 오는 길에 차가 많이 막혔어요."},
 {en:"Do you want to split the bill?",ko:"계산 나눠서 낼까요?"},
 {en:"She said she'd get back to us soon.",ko:"곧 답을 준다고 했어요."},
 {en:"It totally slipped my mind.",ko:"완전히 깜빡했어요."},
 {en:"We're running a little behind schedule.",ko:"일정보다 조금 늦어지고 있어요."},
 {en:"Let me double-check the numbers.",ko:"숫자를 다시 확인해 볼게요."},
 {en:"That works for me either way.",ko:"저는 어느 쪽이든 괜찮아요."},
 {en:"Could you speak up a little?",ko:"조금만 더 크게 말씀해 주실래요?"},
 {en:"I'll take care of it right away.",ko:"제가 바로 처리할게요."},
 {en:"Thanks for looking into this.",ko:"이거 알아봐 주셔서 감사해요."},
 {en:"Let's touch base tomorrow morning.",ko:"내일 아침에 잠깐 얘기해요."},
 /* beginner */
 {en:"Let's meet at three.",ko:"세 시에 만나요.",level:"beg"},
 {en:"Can you help me?",ko:"저 좀 도와줄래요?",level:"beg"},
 {en:"I'm running late.",ko:"저 좀 늦어요.",level:"beg"},
 {en:"See you tomorrow.",ko:"내일 봐요.",level:"beg"},
 /* advanced (longer) */
 {en:"I was hoping we could push the meeting to later this afternoon if that works for everyone.",ko:"모두 괜찮으면 회의를 오늘 오후 늦게로 미룰 수 있을까 했어요.",level:"adv"},
 {en:"To be honest, I'm not entirely sure this is the best approach, but I'm willing to give it a try.",ko:"솔직히 이게 최선인지 완전히 확신하진 못하지만, 한번 해볼 의향은 있어요.",level:"adv"},
 {en:"Could you double-check whether the numbers in the report actually match what we discussed?",ko:"보고서의 숫자가 우리가 논의한 것과 실제로 맞는지 다시 확인해 줄 수 있어요?",level:"adv"},
 {en:"Let's take a step back and figure out what's really causing the delay before we react.",ko:"반응하기 전에, 한 걸음 물러서서 지연의 진짜 원인이 뭔지 파악해 봅시다.",level:"adv"},
 {en:"I'd really appreciate it if you could get back to me by the end of the day.",ko:"오늘 안으로 답을 주시면 정말 감사하겠어요.",level:"adv"},
 {en:"It completely slipped my mind that we were supposed to send that over yesterday.",ko:"어제 그걸 보내기로 했다는 걸 완전히 깜빡했어요.",level:"adv"}
];
DICT.forEach(d=>{if(!d.level)d.level='int';});
