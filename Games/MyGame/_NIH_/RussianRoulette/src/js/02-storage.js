// ══════════════════ 저장소 (localStorage 실패 시 메모리) ══════════════════
const mem = {};
const S = {
  get(k, d) { try { const v = localStorage.getItem('rr2_' + k); if (v !== null) return JSON.parse(v); } catch (e) {} return (k in mem) ? mem[k] : d; },
  set(k, v) { mem[k] = v; try { localStorage.setItem('rr2_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { delete mem[k]; try { localStorage.removeItem('rr2_' + k); } catch (e) {} },
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
};

