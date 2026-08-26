# Cadence — English Speaking Lab

🔗 **바로 열기: https://9yogod.github.io/cadence/** (설치·서버 실행 없이 링크만 열면 돼요)

원래 단일 HTML 파일이던 프로토타입을 멀티파일(ES 모듈) 구조로 재정리한 버전입니다.

## 실행 방법

### 가장 간편한 방법: 웹에서 바로 열기

위 링크(https://9yogod.github.io/cadence/)를 열면 끝이에요. 대화 기능(AI 실시간)을 쓰려면
홈 화면에서 본인 Gemini 무료 API 키를 한 번 입력하면 되고, 키는 각자 브라우저에만
저장돼요(서버로 전송되지 않음).

### 로컬에서 직접 실행하고 싶다면: `run.bat` 더블클릭

이 폴더의 **`run.bat`을 더블클릭**하면 서버가 백그라운드(최소화 창)로 켜지고
브라우저가 자동으로 열려요. 다 쓰고 나면 작업표시줄에 최소화된 **"Cadence server"** 창을
닫아서 서버를 끄면 됩니다. (컴퓨터에 Python이 설치되어 있어야 해요 — 대부분의 최신
Windows에는 이미 있어요.)

### 수동으로 실행하고 싶다면

`index.html`을 더블클릭해서 `file://`로 바로 열면 **크롬/엣지에서는 동작하지 않습니다**
(ES 모듈이 로컬 파일 시스템에서의 모듈 로딩을 CORS로 차단하기 때문). 아래처럼 아주 가벼운
정적 서버로 열어주세요:

```bash
# 이 폴더(cadence)에서 실행
python -m http.server 8000
# 그 다음 브라우저에서 http://localhost:8000 접속
```

또는:

```bash
npx serve .
```

또는 VS Code의 **Live Server** 확장을 쓰고 있다면 `index.html`에서 바로 "Open with Live Server".

## 폴더 구조

```
index.html              마크업 뼈대
css/style.css            전체 스타일
js/
  main.js                 부트스트랩(초기 로드 + 헤더 버튼)
  state.js                전역 상태 S, 저장소(store), PHASES
  utils.js                순수 헬퍼 함수 (esc, lcsMatch, 채점 로직 등)
  toast.js                하단 토스트 알림
  speech.js                TTS + STT(음성인식) — 마이크 버튼 하나로 통합 배선,
                            네이티브 미지원 시 stt-whisper.js로 자동 전환
  stt-whisper.js           브라우저 내장 Whisper(transformers.js, CDN) — iOS 등
                            Web Speech API가 없는 브라우저용 음성인식 대체 경로
  gemini.js                Gemini API 연동 (사용자 자신의 키, 브라우저에만 저장) +
                            대화용 스트리밍 호출(geminiStreamCall)
  lookup.js                단어 탭/드래그 사전 조회 + 공용 바텀시트
  history.js               학습 이력(틀린 표현/찾아본 표현/세션/진척)
  notes.js                 저장한 표현 노트
  dictation.js             받아쓰기 단품 연습
  leveltest.js             레벨 진단 테스트 (베타)
  data/                    콘텐츠 데이터 (쉐도잉/받아쓰기/시나리오/사전/Tatoeba 예문)
  ui/                      세션 4단계 화면 (start/session/review/shadow/talk/wrapup)
                            + progress-chart.js (진척 탭의 SVG 차트)
```

## 지난 리팩터링에서 바뀐 점

- 1263줄 단일 HTML → 위 구조로 분리 (로직은 그대로, 순수 리팩터링)
- 음성 인식(STT) 3곳(채팅 마이크, 시나리오 마이크, 발음 체크)을 `speech.js`의
  `wireMicButton()` 하나로 통합 — 말하는 동안 실시간으로 인식 중인 텍스트가
  화면에 표시되고, 에러(권한 거부/무음/네트워크)도 한국어 메시지로 통일해서 보여줍니다.

## 이번 업데이트에서 추가된 것

**1. 대화가 더 실시간처럼 느껴져요**
AI 채팅 답변을 Gemini의 스트리밍 API로 받아서, 완성된 문장이 나올 때마다 바로바로
말하기 시작해요 (전체 답변을 다 받을 때까지 안 기다려도 됨). 마이크로 말하고 나면
자동으로 전송되고요. "더 자연스러운 표현" 교정은 대화 흐름을 막지 않도록 백그라운드에서
따로 받아와요.

**2. iOS 등에서도 음성인식이 돼요**
Web Speech API가 없는 브라우저(iOS Safari 등)에서는 마이크 버튼이 사라지는 대신, 오픈소스
Whisper 모델(`Xenova/whisper-tiny.en`, Apache-2.0)을 브라우저 안에서 직접 돌려요 — 서버도
API 키도 필요 없어요. 최초 1회만 모델(약 40~75MB)을 받고, 그 다음부턴 브라우저에 캐시돼서
오프라인으로도 동작해요. 다만 이 경로는 실시간 부분 인식 대신 "녹음 → 멈추면 한 번에 인식"
방식이에요.

**3. 예문이 훨씬 다양해졌어요**
[Tatoeba.org](https://tatoeba.org)(무료 오픈 다국어 예문 데이터베이스, CC BY 2.0 FR)에서
받아온 영어-한국어 예문 약 360개를 받아쓰기·표현 복습 예문 풀에 추가했어요.

**4. 학습 진척을 볼 수 있어요**
🕘 이력에 **진척** 탭이 새로 생겨서, 받아쓰기·발음체크 정확도 추이를 그래프로 볼 수 있어요.
홈 화면의 **내 레벨 확인하기**로 간단한 진단 테스트를 받아 난이도를 바로 맞출 수도 있고,
며칠 안 하면 스트릭이 끊기기 전에 살짝 알려드려요.
