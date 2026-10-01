// ══════════════════ 상수 ══════════════════
// 총은 3D 모델 하나(6연발 리볼버)로 고정. 대신 '장전 탄 수'를 설정에서 고른다.
const GUNS = { 6: { ko: '리볼버', desc: '6연발' } };
const LOADS = { 1: '1발 · 첫 격발 17%', 2: '2발 · 첫 격발 33%', 3: '3발 · 첫 격발 50%' };
const ANTE = 100, LOAN = 1000, FLOORS = 7;
const TOUR_TIERS = [['drunk', 'coward'], ['gambler', 'mimic'], ['fatalist', 'berserker'], ['veteran', 'calculator'], ['provocateur'], ['mindgamer'], ['strategist']];
let settings = Object.assign({ load: 1, timer: true, fs: true, betPanel: true, lullaby: true, voiceSfx: true, voiceStyle: 'voice' }, S.get('settings', {}));
settings.gun = 6; if (!LOADS[settings.load]) settings.load = 1; if (settings.voiceStyle === 'babble') settings.voiceStyle = 'voice'; // 웅얼 → 목소리

// ══════════════════ 최적 전략 (게임이론 DP) ══════════════════
// V = 차례인 사람이 이번 판에 죽을 확률. me/op = 남은 아이템 비트 (1 스핀, 2 양보, 4 +1발)
const DP = {};
function optimal(N, k, b, me, op) {
  const key = N + ',' + k + ',' + b + ',' + me + ',' + op; if (DP[key]) return DP[key];
  const rem = N - k, p = b / rem, opts = [];
  opts.push(['fire', p >= 1 ? 1 : p + (1 - p) * (1 - optimal(N, k + 1, b, op, me).v)]);
  if (me & 2) opts.push(['pass', 1 - optimal(N, k, b, op, me & ~2).v]);
  if (me & 1) opts.push(['spin', 1 - optimal(N, 0, b, op, me & ~1).v]);
  if ((me & 4) && b + 1 < rem) opts.push(['raise', 1 - optimal(N, k, b + 1, op, me & ~4).v]);
  let best = opts[0]; for (const o of opts) if (o[1] < best[1] - 1e-9) best = o;
  return (DP[key] = { a: best[0], v: best[1] });
}
const maskOf = s => (s.used.spin ? 0 : 1) | (s.used.pass ? 0 : 2) | (s.used.raise ? 0 : 4);
function escape(c) { if (c.p >= .5 && c.can.pass) return 'pass'; if (c.can.spin) return 'spin'; if (c.can.pass) return 'pass'; return 'fire'; }
function weighted(c, w) { const opts = Object.entries(w).filter(([a]) => a === 'fire' || c.can[a]); let t = opts.reduce((x, [, v]) => x + v, 0), r = Math.random() * t;
  for (const [a, v] of opts) { if ((r -= v) <= 0) return a; } return 'fire'; }

