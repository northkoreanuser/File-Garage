// ══════════════════ 상태 ══════════════════
const state = {
  mode: S.get('mode', 'vs'), name: S.get('name', null), N: 6,
  seats: [null, null], turn: 0, shot: 0, fired: new Set(), flickWindow: -1, flickHit: -1, flickReq: -1, flickUsed: [false, false], c0: 1, live: new Set(), rot: 0,
  busy: true, busyLoad: false, over: false, token: 0, round: (S.get('roundM', {})[S.get('mode', 'vs')]) || 0, paused: false, started: false, debug: false,
  lastAction: [null, null], lastThink: [0, 0], turnStart: 0, pot: 0, gain: [0, 0],
};
if (!['vs', 'tour', 'auto'].includes(state.mode)) state.mode = 'vs';
let deaths = S.get('deaths', null);
if (!deaths) { deaths = { human: parseInt(S.raw('playerDeathCount')) || 0, ai: parseInt(S.raw('opponentDeathCount')) || 0 }; S.set('deaths', deaths); }
// 기록은 모드별로 따로: vs(1:1) · tour(토너먼트) · auto(AI 관전). 예전 통합 기록은 AI 관전으로 옮긴다
const REC_MODES = ['vs', 'tour', 'auto'];
let statsM = S.get('statsM', null);
if (!statsM) { statsM = { vs: {}, tour: {}, auto: S.get('stats', {}) }; S.set('statsM', statsM); }
let killHistM = S.get('killhistM', null);
if (!killHistM) killHistM = { vs: [], tour: [], auto: S.get('killhist', []) };
REC_MODES.forEach(m => { statsM[m] = statsM[m] || {}; killHistM[m] = killHistM[m] || []; while (killHistM[m].length < 7) killHistM[m].push(0); });
S.set('killhistM', killHistM);
const killSum = () => [0, 1, 2, 3, 4, 5, 6].map(j => REC_MODES.reduce((a, m) => a + killHistM[m][j], 0));
let lbView = null; // 기록 창에서 보는 모드 (null이면 현재 모드)
let bank = S.get('bank', 1000), loans = S.get('loans', 0);
let tbank = S.get('tbank', 1000); // 토너먼트 전용 지갑 (1:1과 별개)
const money = { get v() { return state.mode === 'tour' ? tbank : bank; }, set v(x) { if (state.mode === 'tour') tbank = x; else bank = x; } };
let prof = Object.assign({ esc: [0, 0, 0, 0, 0, 0, 0], n: 0, fires: 0 }, S.get('prof', {}));
let riv = S.get('riv', {});
let wins = S.get('wins', 0), lifeBought = S.get('lifeBought', 0);
let tour = S.get('tour', null); let tourBest = S.get('tourBest', 0);
function tourReset() { const lv = tour && tour.voice; tour = { floor: 1, lives: 3, opp: null, lastVoice: lv }; S.set('tour', tour); }
if (!tour) tourReset();
const BOSS_TXT = { noitems: '아이템 금지', pot2: '판돈 ×2', fast: '시간 제한 8초', volkov: '볼코프의 규칙: 2발 장전 · 스핀 금지' };
function bossRule() { if (state.mode !== 'tour') return null; if (state.noItems) return 'noitems'; return ({ 5: 'pot2', 6: 'fast', 7: 'volkov' })[tour.floor] || null; } // 아이템 금지는 층 고정이 아니라 판마다 5% 확률
let streak = S.get('streak', 0);
let nemesis = S.get('nemesis', null);
const profEsc = () => { let m = 0; prof.esc.forEach((v, j) => { if (v > prof.esc[m]) m = j; }); return m + 1; };

const seatEls = [$('#seat0'), $('#seat1')];
const cylRot = $('#cylRot'), cylWrap = $('#cylWrap'), cylArea = $('.cyl-area'), hammer = $('#hammer');
const msgEl = $('#msg'), fireBtn = $('#fireBtn'), spinBtn = $('#spinBtn'), passBtn = $('#passBtn'), raiseBtn = $('#raiseBtn');
const BTN = { fire: fireBtn, spin: spinBtn, pass: passBtn, raise: raiseBtn };

async function wait(ms) { let left = ms; while (left > 0) { const s = Math.min(left, 80); await sleep(s); if (!state.paused) left -= s; } }
function setMsg(t, cls = '') { msgEl.textContent = t; msgEl.className = 'msg ' + cls; chatMsg(t, cls); }
function log(html, cls = '') {
  const li = document.createElement('li'); li.className = cls;
  li.innerHTML = `<span class="r">${state.mode === 'tour' ? 'B' + tour.floor : state.mode === 'auto' ? 'AI' : 'R' + state.round}</span>` + html;
  const ul = $('#log'); ul.prepend(li); while (ul.children.length > 60) ul.lastChild.remove();
}
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const won = n => '₽ ' + n.toLocaleString('ko-KR');

