/* Prompts for the 1-minute speech drill.

   Each carries three hints, because the hard part of speaking for a minute isn't
   vocabulary — it's not knowing what to say second. The hints are a structure to lean
   on (what / detail / why it matters), not phrases to reproduce. */
export const TOPICS=[
  // ---- work · beginner ----
  {mode:'work',level:'beg',en:"Introduce yourself and what you do at work.",ko:"자기소개와 하는 일을 말해보세요.",hints:["이름과 직무","팀에서 맡은 일","일한 기간"]},
  {mode:'work',level:'beg',en:"Describe your typical work day.",ko:"평소 하루 일과를 설명해 보세요.",hints:["출근 후 첫 일","오전 vs 오후","하루 중 가장 바쁜 때"]},
  {mode:'work',level:'beg',en:"Talk about a coworker you enjoy working with.",ko:"함께 일하기 좋은 동료에 대해 말해보세요.",hints:["어떤 사람인지","같이 한 일","왜 좋은지"]},
  {mode:'work',level:'beg',en:"Describe your workplace or office.",ko:"일하는 공간을 설명해 보세요.",hints:["어디에 있는지","분위기","마음에 드는 점"]},
  {mode:'work',level:'beg',en:"What software or tools do you use every day?",ko:"매일 쓰는 도구나 프로그램을 말해보세요.",hints:["무엇을 쓰는지","어디에 쓰는지","없으면 어떨지"]},
  {mode:'work',level:'beg',en:"Talk about something you learned recently at work.",ko:"최근 업무에서 배운 것을 말해보세요.",hints:["무엇을 배웠는지","어떻게 배웠는지","어디에 쓸지"]},

  // ---- work · intermediate ----
  {mode:'work',level:'int',en:"Describe a project you are working on and your role in it.",ko:"진행 중인 프로젝트와 본인 역할을 설명해 보세요.",hints:["프로젝트 목표","내가 맡은 부분","지금 단계"]},
  {mode:'work',level:'int',en:"Tell me about a problem you solved at work.",ko:"업무에서 해결한 문제를 이야기해 보세요.",hints:["어떤 문제였는지","어떻게 접근했는지","결과"]},
  {mode:'work',level:'int',en:"How do you prioritize when everything feels urgent?",ko:"전부 급할 때 우선순위를 어떻게 정하나요?",hints:["기준","실제 예시","안 되면 어떻게"]},
  {mode:'work',level:'int',en:"Explain something from your job to someone outside your field.",ko:"본인 업무를 비전공자에게 설명해 보세요.",hints:["한 문장 요약","비유로 풀기","왜 중요한지"]},
  {mode:'work',level:'int',en:"Describe a time you disagreed with a decision at work.",ko:"업무 결정에 동의하지 않았던 때를 말해보세요.",hints:["상황","어떻게 말했는지","어떻게 마무리됐는지"]},
  {mode:'work',level:'int',en:"What would you change about how your team works?",ko:"팀의 일하는 방식에서 바꾸고 싶은 것은?",hints:["지금의 문제","제안","기대 효과"]},

  // ---- work · advanced ----
  {mode:'work',level:'adv',en:"Make the case for a change you think your company should make.",ko:"회사가 해야 한다고 보는 변화를 설득해 보세요.",hints:["현재 비용","제안과 근거","예상 반론에 대한 답"]},
  {mode:'work',level:'adv',en:"Your project is going to miss its deadline. Explain the situation to a client.",ko:"프로젝트 마감이 늦어집니다. 고객에게 설명해 보세요.",hints:["사실 전달","원인과 책임","새 일정과 대안"]},
  {mode:'work',level:'adv',en:"Describe a professional failure and what you took from it.",ko:"업무상 실패와 거기서 배운 것을 말해보세요.",hints:["무슨 일이 있었는지","내 책임은 무엇이었는지","이후 달라진 것"]},
  {mode:'work',level:'adv',en:"Is remote work better or worse for your kind of job? Argue one side.",ko:"본인 직무에 원격근무가 나은가요? 한쪽을 골라 주장해 보세요.",hints:["입장 선언","근거 두 가지","반대 의견 인정"]},
  {mode:'work',level:'adv',en:"How should a manager give difficult feedback?",ko:"관리자는 어려운 피드백을 어떻게 줘야 할까요?",hints:["원칙","구체적 방법","피해야 할 것"]},
  {mode:'work',level:'adv',en:"Describe a trend that will change your industry in five years.",ko:"5년 안에 업계를 바꿀 흐름을 설명해 보세요.",hints:["어떤 변화","누가 영향받는지","어떻게 대비할지"]},

  // ---- daily · beginner ----
  {mode:'daily',level:'beg',en:"Describe your morning routine.",ko:"아침 루틴을 설명해 보세요.",hints:["일어나는 시간","순서대로","가장 중요한 것"]},
  {mode:'daily',level:'beg',en:"Talk about your favorite food.",ko:"가장 좋아하는 음식에 대해 말해보세요.",hints:["어떤 음식","언제 먹는지","왜 좋은지"]},
  {mode:'daily',level:'beg',en:"Describe where you live.",ko:"사는 동네를 설명해 보세요.",hints:["어떤 곳인지","주변에 뭐가 있는지","좋은 점"]},
  {mode:'daily',level:'beg',en:"What do you usually do on weekends?",ko:"주말에 보통 뭘 하나요?",hints:["자주 하는 일","누구와","어제나 지난 주말 예시"]},
  {mode:'daily',level:'beg',en:"Talk about a person who matters to you.",ko:"소중한 사람에 대해 말해보세요.",hints:["누구인지","어떤 사람인지","기억나는 일"]},
  {mode:'daily',level:'beg',en:"Describe something you own and use a lot.",ko:"자주 쓰는 물건을 설명해 보세요.",hints:["무엇인지","언제 쓰는지","없으면 불편한 점"]},

  // ---- daily · intermediate ----
  {mode:'daily',level:'int',en:"Describe a trip that did not go as planned.",ko:"계획대로 되지 않은 여행을 이야기해 보세요.",hints:["원래 계획","무슨 일이 있었는지","결국 어땠는지"]},
  {mode:'daily',level:'int',en:"Talk about a habit you are trying to build or break.",ko:"만들거나 없애려는 습관을 말해보세요.",hints:["어떤 습관","왜","지금까지 어떻게 되고 있는지"]},
  {mode:'daily',level:'int',en:"Recommend a book, show, or place to someone.",ko:"책·영상·장소를 하나 추천해 보세요.",hints:["무엇인지","어떤 점이 좋은지","누구에게 맞을지"]},
  {mode:'daily',level:'int',en:"How have your weekends changed over the last few years?",ko:"주말 보내는 방식이 몇 년 새 어떻게 달라졌나요?",hints:["예전","지금","왜 바뀌었는지"]},
  {mode:'daily',level:'int',en:"Describe a skill you wish you had learned earlier.",ko:"더 일찍 배웠으면 하는 것을 말해보세요.",hints:["무엇인지","왜 그렇게 생각하는지","지금 어떻게 하고 있는지"]},
  {mode:'daily',level:'int',en:"Talk about a decision you made that changed things.",ko:"무언가를 바꾼 선택에 대해 말해보세요.",hints:["어떤 선택","왜 그렇게 했는지","달라진 점"]},

  // ---- daily · advanced ----
  {mode:'daily',level:'adv',en:"Should cities limit cars in the center? Argue your position.",ko:"도심 차량을 제한해야 할까요? 입장을 정해 주장해 보세요.",hints:["입장","근거 두 가지","반대편 고려"]},
  {mode:'daily',level:'adv',en:"Is social media making us better or worse at communicating?",ko:"SNS가 소통을 낫게 만들까요, 나쁘게 만들까요?",hints:["입장 선언","구체적 예","예외 인정"]},
  {mode:'daily',level:'adv',en:"What does a good life look like to you?",ko:"좋은 삶이란 어떤 것이라고 생각하나요?",hints:["정의","이유","현실에서의 어려움"]},
  {mode:'daily',level:'adv',en:"Explain a Korean custom to someone who has never visited.",ko:"한국에 와본 적 없는 사람에게 한국 문화 하나를 설명해 보세요.",hints:["무엇인지","어떻게 하는 것인지","왜 그런지"]},
  {mode:'daily',level:'adv',en:"How much should parents control what children do online?",ko:"부모가 아이의 온라인 활동을 어디까지 통제해야 할까요?",hints:["기준","이유","반대 우려에 대한 답"]},
  {mode:'daily',level:'adv',en:"Describe a belief you changed your mind about.",ko:"생각이 바뀐 믿음에 대해 말해보세요.",hints:["예전 생각","계기","지금 생각"]},
];
