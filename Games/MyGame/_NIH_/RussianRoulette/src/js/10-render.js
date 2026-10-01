// ══════════════════ 렌더 ══════════════════
const persRecord = (id, m = 'auto') => (statsM[m] || {})[id] || { w: 0, l: 0 };
const hearts = n => '<span class="hearts">' + Array.from({ length: Math.max(3, n) }, (_, j) => j).map(j => j < n ? '♥' : '<span class="off">♥</span>').join('') + '</span>';
function setH(node, h) { if (node && node._h !== h) { node.innerHTML = h; node._h = h; } } // 내용이 같으면 DOM을 건드리지 않음 (깜빡임 방지)
function renderSeat(i) {
  const s = state.seats[i], el = seatEls[i]; if (!s) return;
  const human = s.kind === 'human', p = human ? null : PERS[s.pers];
  el.style.setProperty('--pc', human ? '#d6a64e' : (s.boss ? '#ff3b3b' : p.color));
  setH(el.querySelector('.ini'), esc([...s.name][0] || '?'));
  { const nm = el.querySelector('.sname'), h = esc(s.name) + (human ? ' <button class="edit" title="이름 변경">✎</button>' : ''); if (nm._h !== h) { nm.innerHTML = h; nm._h = h; const n = [...s.name].length; nm.style.fontSize = ''; if (n > 7) nm.style.fontSize = (parseFloat(getComputedStyle(nm).fontSize) * 7.5 / n).toFixed(1) + 'px'; } } // 긴 이름(최대 12자)은 한 줄에 맞게 줄인다 // 바뀔 때만 다시 그림 (깜빡임 방지)
  let chip;
  if (human) chip = state.mode === 'tour' ? `${hearts(tour.lives)}${s.injured ? ' <span class="ru">부상</span>' : ''}` : '플레이어';
  else chip = `${s.boss ? '보스 · ' : ''}${s.nemesis ? '<span class="nemtag">숙적</span> · ' : ''}${p.ko}`;
  setH(el.querySelector('.chip'), chip);
  setH(el.querySelector('.sdesc'), human ? esc(`말투: ${voiceLabel()} · ` + (s.injured ? '피가 멎지 않는다. 손이 떨리고 시간이 짧아진다.' : '방아쇠는 당신 손에 있다.')) : (s.mood ? `<span class="moodtag">${s.mood}</span>` : '') + esc(p.desc));
  const tk = (k, label) => `<span class="token t-${k} ${s.used[k] ? 'used' : ''}">${label}</span>`;
  setH(el.querySelector('.tokens'), bossRule() === 'noitems' ? '<span class="token used">아이템 금지</span>' : tk('spin', s.spinExtra ? '스핀 ×2' : '스핀') + tk('pass', '양보') + tk('raise', '+1발') + `<span class="token t-skip ${(state.flickUsed && state.flickUsed[i]) || (state.turn === i && !state.busyLoad && !canOf(i).skip) ? 'used' : ''}" title="${state.flickUsed && state.flickUsed[i] ? '이번 스핀에 이미 사용 — 스핀하면 다시 충전' : '방아쇠 연타'}">플릭샷</span>`);
  let stat;
  if (state.mode === 'auto') { const r = persRecord(s.pers, 'auto'); stat = `생존<b>${r.w}</b> 사망<b>${r.l}</b>`; }
  else if (human) stat = `<b>${won(money.v)}</b>` + (streak >= 2 ? `<span class="streak">${streak}연승</span>` : '');
  else stat = state.mode === 'tour' ? `지하 <b>B${tour.floor}</b>` : `사망<b>${deaths.ai}</b>`;
  if ((human ? isDrunkVoice(i) : s.pers === 'drunk') && s.drink != null) { const n = Math.round(s.drink / 20); stat += `<span class="drinkbar" title="취기">취기 ${[0,1,2,3,4].map(j => `<i class="${j < n ? 'on' : ''}"></i>`).join('')}</span>`; } // 술꾼 말투 플레이어도 취기 표시
  setH(el.querySelector('.stat'), stat);
  el.classList.toggle('active', state.turn === i && !state.busyLoad && !state.over);
}
function canOf(i) {
  const s = state.seats[i], b = remLive(), rem = state.N - state.shot;
  if (bossRule() === 'noitems') return { fire: true, spin: false, pass: false, raise: false, skip: false };
  return { fire: true, spin: !s.used.spin && bossRule() !== 'volkov', pass: !s.used.pass, raise: !s.used.raise && b + 1 < rem && !(state.cursed && state.raiseCount >= 1), skip: !(state.flickUsed && state.flickUsed[i]) && risk() < 1 && state.shot + 2 <= state.N }; // 플릭샷: 각자 스핀(어떤 스핀이든)당 1회 · 표기 100% 불가 · 마지막 칸을 넘기는 플릭 불가
}
function renderStage() {
  const N = state.N, nc = nextCh(), p = risk(), sp = shownRisk(), pct = Math.round(sp * 100), b = remLive();
  const dc = p >= 1 ? '#ff3b3b' : p >= .5 ? '#ff6a3a' : p >= 1 / 3 ? '#ff9b3a' : p >= .25 ? '#e8c14a' : '#d6a64e';
  const dg = $('#danger'); dg.style.setProperty('--dc', state.over ? '#ff3b3b' : dc);
  const lap = state.shot >= N;
  $('#dpct').textContent = state.over ? '탕' : state.busyLoad || lap ? '—' : pct + '%';
  $('#dlbl').textContent = state.over ? '라운드 종료' : state.busyLoad ? '장전 중' : lap ? '딜러가 탄을 다시 꽂는다' : `${nc}/${N} 약실 · 실탄 ${b}발`;
  { const fb = state.firedBy || {}, LR = w => w === 0 ? '좌' : w === 1 ? '우' : ''; // 쏜 칸·플릭으로 넘긴 칸에 누가 했는지 (좌 = 왼쪽 좌석, 우 = 오른쪽 좌석)
    setH($('#pips'), Array.from({ length: N }, (_, j) => { const q = j + 1, sk = (state.flickSkips || []).find(x => x.q === q), dd = state.over && state.deadAt && state.deadAt.q === q, fired = state.fired.has(q) || dd, w = dd ? state.deadAt.who : sk ? sk.who : fired ? fb[q] : null;
      const cls = (fired ? 'fired' : '') + (dd ? ' dead' : '') + (sk && !dd ? ' skipped' : '') + (w === 0 ? ' byL' : w === 1 ? ' byR' : '') + (q === nc && !state.busyLoad && !state.over ? ' next' : '');
      const nm = w === 0 || w === 1 ? `${w ? '오른쪽' : '왼쪽'}(${state.seats[w] ? state.seats[w].name : '?'})` : '누군가';
      const tip = dd ? `${q}번 약실 · D — ${nm} 사망` : sk ? `${q}번 약실 · F — ${jo(nm, '이')} 플릭샷으로 넘김 (안은 아무도 모름)` : fired ? `${q}번 약실 · S — ${jo(nm, '이')} 쏨 (빈칸)` : q === nc ? `${q}번 약실 · C — 현재 약실 (다음 격발)` : `${q}번 약실 · 아직 안 쏨`;
      return `<i class="pip ${cls}" title="${esc(tip)}">${(fired || sk) && LR(w) ? LR(w) + (dd ? 'D' : sk ? 'F' : 'S') : q === nc && !state.busyLoad && !state.over ? 'C' : ''}</i>`; }).join('')); } // S 쏨 · F 플릭으로 넘김 · D 죽음
  $('#roundLbl').innerHTML = state.mode === 'tour' ? `지하 B${tour.floor} / B${FLOORS}` + (BOSS_TXT[bossRule()] ? ` · <span style="color:#ff8a6a">${BOSS_TXT[bossRule()]}</span>` : '') : state.mode === 'auto' ? 'AI 대전 · 순위전' : '라운드 ' + state.round;
  $('#pot').textContent = won(state.pot);
  const live = !state.busyLoad && !state.over;
  $('#warn').classList.toggle('on', live && !lap && (p >= HIGH || nc === N)); // 마지막 칸(6번)은 확률과 무관하게 항상 경고 // 한 바퀴 다 돈 직후(딜러가 다시 꽂기 전)엔 경고 없음
  { const w = nc === N ? (p >= 1 ? '마지막 약실' : '마지막 약실 · 탄이 있을 수 있다') : p >= 1 ? '반드시 탄이 있다' : p >= HIGH ? '사망 확률 최상' : ''; if (w) setH($('#warn span'), `⚠ ${w} // ${w} // ${w} // ${w} //`); }
  document.body.classList.toggle('tense', live && p >= .5);
  const cur = state.seats[state.turn];
  const humanTurn = cur && cur.kind === 'human' && !state.busy && live;
  const can = cur ? canOf(state.turn) : {};
  Object.entries(BTN).forEach(([a, el]) => { el.disabled = !humanTurn || !can[a]; el.classList.remove('urge'); });
  if (state.flickWindow >= 0) fireBtn.disabled = false; // 플릭샷 입력 창
  if (humanTurn && p >= 1) { const e = can.pass ? passBtn : can.spin ? spinBtn : fireBtn; e.classList.add('urge'); }
  cylArea.classList.remove('sh1', 'sh2', 'sh3');
  if (humanTurn) { const lv = clamp((p >= 1 ? 3 : p >= .5 ? 2 : p >= 1 / 3 ? 1 : 0) + (cur.injured || 0) - (state.vodka ? 1 : 0), 0, 3); if (lv) cylArea.classList.add('sh' + lv); }
}
function renderAll() { renderSeat(0); renderSeat(1); renderStage(); renderLB(); renderShop(); if (state.debug) refreshDbg(); }
function renderLB() {
  const m = lbView || state.mode, st = statsM[m], me = m !== 'auto'; // me: 플레이어 기준 (AI의 패 = 내 승)
  document.querySelectorAll('#lbTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#lbTitle').textContent = me ? '상대 성격별 내 전적' : 'AI 성격별 전적';
  const rows = PERS_IDS.map(id => { const r = persRecord(id, m); return { id, w: me ? r.l : r.w, l: me ? r.w : r.l }; }).filter(r => r.w + r.l > 0)
    .sort((a, b) => (b.w / (b.w + b.l)) - (a.w / (a.w + a.l)) || (b.w + b.l) - (a.w + a.l));
  const empty = { vs: '아직 기록 없음 — 1:1 대결을 해보세요', tour: '아직 기록 없음 — 토너먼트에 내려가 보세요', auto: '아직 기록 없음 — AI 대전에서 성격끼리 붙여보세요' }[m];
  $('#lb').innerHTML = rows.length ? rows.map(r => { const p = PERS[r.id], rate = Math.round(r.w / (r.w + r.l) * 100);
    return `<tr><td class="nm"><i style="background:${p.color}"></i>${me ? 'vs ' : ''}${p.ko}</td><td class="bar"><div><span style="width:${rate}%;background:${p.color}"></span></div></td><td class="rec">${rate}% · ${r.w}승 ${r.l}패</td></tr>`; }).join('')
    : `<tr><td class="empty">${empty}</td></tr>`;
  const kh = killHistM[m], mx = Math.max(1, ...kh);
  $('#hist').innerHTML = kh.map((v, j) => `<div><span style="height:${Math.round(v / mx * 40)}px" title="${v}"></span><em>${j + 1}</em></div>`).join('');
  const W = Object.values(st).reduce((a, r) => a + r.l, 0), L = Object.values(st).reduce((a, r) => a + r.w, 0);
  const esc_ = prof.n >= 3 ? ` · 당신이 주로 피하는 약실 <b>${profEsc()}번</b>` : '';
  $('#meStat').innerHTML = m === 'vs' ? `1:1 소지금 <b>${won(bank)}</b>${loans ? ` · 빚 <b>${loans}</b>회` : ''} · 승리 <b>${W}</b> · 사망 <b>${L}</b>${esc_}`
    : m === 'tour' ? `토너먼트 지갑 <b>${won(tbank)}</b> · 승리 <b>${W}</b> · 사망 <b>${L}</b><br>최고 기록 <b>${tourBest ? 'B' + tourBest : '—'}</b>${esc_}`
    : `AI 대전 ${W}경기 (판 수에는 넣지 않는다) · 1:1 소지금 <b>${won(bank)}</b>로 베팅`;
}
function gainPop(i, text) { const g = seatEls[i].querySelector('.gainpop'); g.textContent = text; g.classList.remove('go'); void g.offsetWidth; g.classList.add('go'); }
function bumpPot() { const e = $('#pot'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

