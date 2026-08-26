/* Offline roleplay scenarios: partner line + model answer, per turn. */
export const SCEN=[
 {mode:"work",title:"Project check-in",setting:"매니저가 프로젝트 진행 상황을 물어봐요. 상태를 보고해 보세요.",turns:[
   {p:{en:"Hey, how's the project coming along?",ko:"프로젝트 어떻게 돼가요?"},m:{en:"It's going well. We're pretty much on track.",ko:"잘 되고 있어요. 대체로 일정대로예요."}},
   {p:{en:"Any blockers I should know about?",ko:"제가 알아야 할 걸림돌 있어요?"},m:{en:"We hit a small issue, but we've got a workaround.",ko:"작은 문제가 있었는데 해결책을 마련했어요."}},
   {p:{en:"Great. When can I expect the first draft?",ko:"좋네요. 초안은 언제쯤 받을 수 있죠?"},m:{en:"I'll have it ready by Thursday.",ko:"목요일까지 준비해 둘게요."}},
   {p:{en:"Perfect. Let me know if you need anything.",ko:"완벽해요. 필요한 거 있으면 말해요."},m:{en:"Will do. Thanks for checking in.",ko:"그럴게요. 챙겨주셔서 감사해요."}}]},
 {mode:"work",title:"Asking a coworker for help",setting:"동료에게 도움을 요청하는 상황이에요.",turns:[
   {p:{en:"Hey, you look a little swamped. Everything okay?",ko:"좀 정신없어 보이는데, 괜찮아요?"},m:{en:"Honestly, I could use a hand with this report.",ko:"솔직히 이 보고서 좀 도와주면 좋겠어요."}},
   {p:{en:"Sure, what do you need?",ko:"그럼요, 뭐가 필요해요?"},m:{en:"Could you double-check the numbers for me?",ko:"숫자만 다시 확인해 줄 수 있어요?"}},
   {p:{en:"No problem. When do you need it by?",ko:"문제없어요. 언제까지 필요해요?"},m:{en:"By end of day would be great.",ko:"오늘 퇴근 전까지면 좋겠어요."}},
   {p:{en:"I'll get it back to you shortly.",ko:"금방 돌려줄게요."},m:{en:"You're a lifesaver, thank you!",ko:"완전 은인이에요, 고마워요!"}}]},
 {mode:"daily",title:"Ordering at a café",setting:"카페에서 주문하는 상황이에요.",turns:[
   {p:{en:"Hi there! What can I get for you?",ko:"안녕하세요! 뭐 드릴까요?"},m:{en:"Can I get a medium iced americano?",ko:"미디엄 아이스 아메리카노 하나 주세요."}},
   {p:{en:"Sure. Room for milk?",ko:"네. 우유 넣을 공간 남겨둘까요?"},m:{en:"No thanks, all the way full is fine.",ko:"괜찮아요, 가득 채워주세요."}},
   {p:{en:"Anything else for you today?",ko:"더 필요한 거 있으세요?"},m:{en:"That'll be all, thanks.",ko:"그거면 돼요, 감사합니다."}},
   {p:{en:"Okay, it'll be ready in just a minute.",ko:"네, 곧 준비될 거예요."},m:{en:"Great, thank you so much!",ko:"좋아요, 정말 감사해요!"}}]},
 {mode:"daily",title:"Catching up with a friend",setting:"오랜만에 만난 친구와 근황을 나눠요.",turns:[
   {p:{en:"It's been ages! How have you been?",ko:"진짜 오랜만이다! 어떻게 지냈어?"},m:{en:"Pretty good, just been busy with work.",ko:"잘 지냈어, 일 때문에 좀 바빴어."}},
   {p:{en:"Same here. Anything new with you?",ko:"나도 그래. 뭐 새로운 거 있어?"},m:{en:"I actually started a new job recently.",ko:"사실 얼마 전에 새 직장 시작했어."}},
   {p:{en:"No way, congrats! How's it going?",ko:"대박, 축하해! 어때?"},m:{en:"It's a lot to take in, but I like it.",ko:"배울 게 많은데 마음에 들어."}},
   {p:{en:"We should grab dinner and catch up.",ko:"저녁 먹으면서 얘기 좀 하자."},m:{en:"For sure, let's set something up.",ko:"당연하지, 한번 잡자."}}]}
];
