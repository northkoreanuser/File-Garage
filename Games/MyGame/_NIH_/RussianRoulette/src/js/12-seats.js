// ══════════════════ 좌석 구성 ══════════════════
const freshUsed = () => ({ spin: false, pass: false, raise: false, skip: false });
function makeAI(avoidName, avoidPers) {
  let pers; do pers = pick(PERS_IDS); while (pers === avoidPers);
  let name; do name = pick(NAMES); while (name === avoidName);
  return { kind: 'ai', name, pers, used: freshUsed(), n: 0 };
}
function prepAI(s) {
  if (s.kind !== 'ai') return;
  s.mood = pick(['평온', '평온', '숙취', '자신감', '초조']);
  if (s.pers === 'drunk') s.drink = 20 + rand(25);
  if (s.pers === 'fatalist') s.n = 2 + rand(state.N - 2);
  if (s.pers === 'veteran') { let best = 3; const kh = killSum(); for (let j = 1; j < state.N - 1; j++) if (kh[j] > kh[best]) best = j; s.n = Math.min(best, state.N - 2) + 1; }
}
function humanN() {
  const id = voiceRandom() ? curVoiceId() : voice.mode === 'preset' ? voice.preset : voice.base;
  const t = { pers: id === 'veteran' ? 'veteran' : 'fatalist', kind: 'ai' }; prepAI(t); return t.n;
}
function humanSeat() { return { kind: 'human', name: state.name || '무명', pers: null, used: freshUsed(), n: humanN(), injured: state.mode === 'tour' ? Math.max(0, 3 - tour.lives) : 0, spinExtra: 0 }; }
function tourOpp() {
  if (tour.opp && tour.opp.pers === tour.voice) tour.opp = null; // 플레이어 말투와 같은 성격은 상대로 안 나옴
  if (!tour.opp) { let tier = TOUR_TIERS[tour.floor - 1].filter(x => x !== tour.voice || x === 'drunk'); if (!tier.length) tier = ['veteran', 'calculator']; // 술꾼끼리는 만날 수 있다 · 층 상대가 플레이어 말투와 겹쳐 비면 대체
    const pers = pick(tier), used = tour.names || (tour.names = []); // 이번 토너먼트에서 나온 이름은 다시 안 나온다 (내 이름도 제외)
    let pool = NAMES.filter(n => !used.includes(n) && n !== state.name); if (!pool.length) pool = NAMES.filter(n => n !== state.name);
    tour.opp = { name: tour.floor === FLOORS ? '볼코프' : pick(pool), pers }; used.push(tour.opp.name); S.set('tour', tour); }
  // 숙적: 나를 죽인 층에 같은 이름·성격으로 기다린다
  if (nemesis && nemesis.floor === tour.floor && PERS[nemesis.pers] && nemesis.pers !== tour.voice && (tour.opp.name !== nemesis.name || tour.opp.pers !== nemesis.pers)) { tour.opp = { name: nemesis.name, pers: nemesis.pers }; (tour.names || (tour.names = [])).push(nemesis.name); S.set('tour', tour); }
  const nem = !!(nemesis && nemesis.floor === tour.floor && tour.opp.name === nemesis.name && tour.opp.pers === nemesis.pers);
  return { kind: 'ai', name: tour.opp.name, pers: tour.opp.pers, used: freshUsed(), n: 0, boss: tour.floor === FLOORS, nemesis: nem };
}

