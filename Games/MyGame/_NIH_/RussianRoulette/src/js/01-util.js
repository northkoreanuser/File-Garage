// ▼ 디버그 모드: 1 = 켜기(DEBUG 버튼 · ` 키), 0 = 숨기기
const DEBUG_MODE = 0;
const $ = s => document.querySelector(s);
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 조사 자동: jo('카츠키', '이') → '카츠키가' · jo('이반', '을') → '이반을' · 받침(ㄹ)+으로 → 로. 숫자·영문은 읽는 소리 기준
const JO = { 이: ['이', '가'], 을: ['을', '를'], 은: ['은', '는'], 과: ['과', '와'], 아: ['아', '야'], 으로: ['으로', '로'], 이다: ['이다', '다'] };
function jo(n, p) { n = String(n); const c = [...n].pop() || '', k = c.codePointAt(0) - 0xAC00, han = k >= 0 && k < 11172;
  const word = /[a-z]{2}$/.test(n); // 영어 단어는 발음(Bob→밥), 대문자 약자는 글자 이름(L→엘)
  const bat = han ? k % 28 : /[013678]$/.test(c) ? 1 : word ? /[bcdgklmnpt]$/.test(c) : /[LMNR]$/i.test(c), rieul = han ? k % 28 === 8 : /[178]$/.test(c) || (word ? /l$/.test(c) : /L$/i.test(c));
  return n + (p === '으로' && rieul ? '로' : JO[p][bat ? 0 : 1]); }

