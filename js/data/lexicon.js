/* Offline word/phrase dictionary used by tap/drag-to-look-up. Extended with every glossary
   entry from the shadowing passages so anything the learner sees can be looked up. */
import {SHADOW} from './shadow.js';
import {LONGSHADOW} from './longshadow.js';

export const LEX={
 "thanks":{ko:"감사, 고마움"},"time":{ko:"시간"},"goals":{ko:"목표"},"timeline":{ko:"일정, 진행 순서"},
 "questions":{ko:"질문"},"noon":{ko:"정오, 낮 12시"},"deadline":{ko:"마감 기한"},"testing":{ko:"테스트, 시험"},
 "progress":{ko:"진행, 진척"},"sorry":{ko:"미안한, 죄송한"},"again":{ko:"다시"},"recap":{ko:"요약, 정리"},
 "sense":{ko:"의미, 감각"},"busy":{ko:"바쁜, 붐비는"},"latte":{ko:"라떼"},"rush":{ko:"서두름, 급함"},
 "sleep":{ko:"잠, 자다"},"dinner":{ko:"저녁 식사"},"number":{ko:"번호, 숫자"},"text":{ko:"문자(하다)"},
 "coffee":{ko:"커피"},"file":{ko:"파일"},"meeting":{ko:"회의"},"break":{ko:"휴식, 쉬는 시간"},
 "traffic":{ko:"교통, 교통 체증"},"bill":{ko:"계산서"},"mind":{ko:"마음, 생각"},"schedule":{ko:"일정"},
 "morning":{ko:"아침"},"project":{ko:"프로젝트"},"blockers":{ko:"걸림돌, 장애물"},"draft":{ko:"초안"},
 "report":{ko:"보고서"},"swamped":{ko:"눈코 뜰 새 없이 바쁜"},"lifesaver":{ko:"은인, 구세주"},"americano":{ko:"아메리카노"},
 "milk":{ko:"우유"},"ages":{ko:"아주 오랜 시간"},"congrats":{ko:"축하해"},"job":{ko:"직장, 일"},
 "work":{ko:"일, 직장"},"weekend":{ko:"주말"},"forever":{ko:"영원히, 아주 오랫동안"},"issue":{ko:"문제, 사안"},
 "workaround":{ko:"임시 해결책"},"stand":{ko:"서다; 입장/상황"},"follow":{ko:"따라가다, 이해하다"},"split":{ko:"나누다"},
 "totally":{ko:"완전히"},"behind":{ko:"뒤에; 늦은"}
};
SHADOW.forEach(p=>p.glossary.forEach(g=>{LEX[g.en.toLowerCase()]={ko:g.ko};}));
LONGSHADOW.forEach(p=>p.glossary.forEach(g=>{LEX[g.en.toLowerCase()]={ko:g.ko};}));
