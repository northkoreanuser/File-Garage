// ==UserScript==
// @name         namu.wiki 카드 이름 추출
// @namespace    k.namu.extract
// @version      1.29
// @match        https://namu.wiki/w/*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      namu.wiki
// @connect      i.namu.wiki
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 하이퍼링크 JSON 주소. 비워 두면 HTML 과 같은 폴더의 hyperlink.json 을 자동으로 읽는다.
  // 값을 넣으면 그 주소를 먼저 읽는다. (저장된 HTML 안의 HYPERLINK_JSON_URL 을 직접 고쳐도 된다)
  // const HYPERLINK_JSON_URL = 'https://example.com/trickcal/hyperlink.json';
  const HYPERLINK_JSON_URL = '';

  const TAB = '종족별';
  const BASE = 'https://namu.wiki/w/';
  const RACES = ['요정', '수인', '엘프', '정령', '유령', '용족', '마녀', '미스틱'];
  const SKIP = new Set(RACES);

  // 아이콘 이미지 파일명 → 값. (2026-10 나무위키 DOM 기준 + 이전 파일명)
  // alt 가 "Common UnitPerso..." 처럼 잘려 있어서 종류는 alt 로, 값은 파일명으로 판별한다.
  const ATTR = { // 성격 (alt: Common UnitPerso...) — 아이콘 실물 확인: 순수=초록 클로버, 냉정=파랑 눈꽃, 광기=빨강 불꽃, 활발=노랑 해, 우울=보라 소용돌이, 공명=무지개
    'WC_Xs6vfve5pg1Dmn88NfjPhd4iqs73RcMKkxUEA0qvyUkIcqsVhe_hTVrg0sarJW6mO6OBcxefQ3HaSC22Llw.webp': '순수',
    'c2lR4gSXdPwH4h8ypMUyqN44YgS5B5pYtrDqbakDNTuAoYDezoMVDMbwmUaqFSMhbguDxrwot36eC-PfiZslcw.webp': '우울',
    'aGE72rjqimNcdXTFGKHvFGdDQF5C3nA3xHJ1uiGmO0K-eEzQnqDxLxqJriSNd4lDgkKeDTObkApHTeB8O827cA.webp': '활발',
    'N15qJ3DySVaAByE9APSJFCGjAjamKlAu2NoehIv1GVb7H8-YElC9ZMAtF3X0eTLwfuSPQLzPdEnVXMWMLTycCA.webp': '광기',
    'SKjSXzrE9wvvWlhdTin5qpqG7ymBn-eIAfOaX4SH8HaSs8hKjLZyqcr6D4Mb3hOSvhoajUCc0qbYXexTIVNSQA.webp': '냉정',
    'jgeFCqxsMHf6skFFgLoY2NB8oezFIJ_rHb1qHghPi06b6rSfXHtCO14WZjD2JeyfvN3y6lzWW87TUhucQmL55g.webp': '공명',
    '1E-AI7FZ-Bc_R0PKjxZOQe7UXYYdFrAhGMx9WiRG72T9w_-qbPgBpUeFzkIXLp65VNOuSa1y1gfxbh_-nbLVGw.webp': '순수',
    'F8rQpXC1aV_OsKfXNrRV4MtcKrPYw6RYjefNyq-Mtgs0Jf4i3r1RIqqkSHnls6gpGXUCqZaRO-QMvTxS1ZHqSA.webp': '냉정',
    'iL11vbZXSs4XntYN6tTBLqT3gwd8SuzPee2zxfMwMDHf4mhx1rUsxLHSrxkyTaIl0DYDhZ6ZIqTMyA9Xirj80Q.webp': '광기',
    '0Skscfs15jZje4im1wlngoERc88U1ivH3kzHoM0ELq_ixg-GG9arAR1ns9ti9lfTM3v92gMijidcTQDbRfCGiQ.webp': '활발',
    'bI0t-1Ia_UT-5327ffVjR-bvEzZdr43auE0Ttovu782sz0Iz5DYlFVpTuW-g2LBWZmD9hz3mRYrcryqgZbV6zA.webp': '우울',
    'R045Slc6w7n2PbzeslXI6Nm-19aevGGB6UftsRUMl2F2bhdEOBJixo-NruUIfH1whXGPEpIPfnPtRWsjpLUzYw.webp': '공명',
  };
  const ROW = { // 배치 (alt: Common PositionF/M/B...)
    'NUxyXL1Z353MkKgTvHYJ4aDj_M1gjU0UHPsrR8PdcSINP6Ev6wt--IC2_WIFPSXAnr4qZc21Vu8sHWlc-eV5KQ.webp': '전열',
    'VbUMUONKLYsodEzimzFH8XAewnL_ZUachOIBWu0ZAOjWOX7yjioYDpy48ckm_DcYxgasAhuWVQNRrRzmjqDpjw.webp': '중열',
    'bHmk0fifBqi_FMXZAW-2nHuJAhzA4M65gUBtQ_X2XGOs0rNFkUB78otbuXjDOGEFjDEvUAZsyr7igkCj-kYgJw.webp': '후열',
    '9XiCItQeuFlFe9KfdzOH214lg75Y7drROb0CgczGSWc7aT2v3fp7t2bvsqqKwwPpulGGxzAfr2pecIT01peMLA.webp': '모든열',
    '-IJ61D3QFIAgPM_jHZqpJBpItw3FPQ4FX3zBlK_BApeTtavYFeiPXgfQqdQCOCuolnoHVBE1ElSuSo2VOtsppQ.webp': '전열',
    'Ws2NfdRLPSHDhF0qyDDBhfnYz289ihitZQ3MhNK3Qkb2ZZsvg40U2PBApKh-L1II6wil6E58mM7kGkQFXDEGaw.webp': '중열',
    '5FxWBqY5I80O7iloIQLAAqtG2i6K80rKn3Dz1LSaAdVKPcGK_k4U3sYbKl4qTNjg-jAjtagmxeSwVLa_tM-6qw.webp': '후열',
    'soj5Q1AWp7v006jZyp52jjue9NYoQhIMCLEWMDlj3TAQvC97tmdohskbUPU9m5wBTvyW_Y8gPwKleC7-11aS_g.webp': '모든열',
  };
  const POS = { // 포지션 (alt: Common UnitClass...)
    'e-jiPjGnQUmxt_xxBd8s8xav60tiI2F22KVeyee9vpSpRIShdTQjwqOBt-fgBFX5bYxM6boy6MlOx6_06UfjPA.webp': '딜러',
    '6m_SYd9cuCLCHqJ8N1Bnva181m-DMI7obbdV4SdoqE0WCaZwvX4d_JMSKfbNoWFLrndUkhR4lS0JyoxK5wudMQ.webp': '서포터',
    'j-5N9LGiPpgpxMjnJYUpwZHB-5aUGqMNVuNeWrtC0VFecBntdDbBOiM5ST-rv5Q4hxgZD67zRhSb4bd3xdMk-Q.webp': '탱커',
    'y7O0kZ7lwWTTq1WEVUeupjO3U41A2qphKPAXS_QgbZMd1wZeUT6d9WzFG5uCpeOjsPFhXwR51hAVGXaSyX3sag.webp': '딜러',
    '_Nf01a3E2e3JYnigRdGzNLrltDpwh-TJsgwG8Im-S1-MfonsUK56TZcYcUrT-1HzLzHXt1Lpv7MwS3b1Jcy7Pg.webp': '탱커',
    'vSyU2uTJYWexJNiXbduLl6YAXxaIMgqAHFSP2HhknQ0l97hAyItLRwqkqnidi1vd2PmDTiJNXyv4kbX2A9KyFA.webp': '서포터',
  };
  const ATTR_ORDER = ['순수', '냉정', '광기', '활발', '우울', '공명'];
  // 원본 페이지의 성격별 카드 배경색
  const ATTR_BG = {
    순수: '#33ac50c0', 냉정: '#5aa2e4c0', 광기: '#e45a78c0', 활발: '#e4cf5ac0', 우울: '#b35ae6c0',
    공명: 'linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)),conic-gradient(#33ac50c0,#5aa2e4c0,#e45a78c0,#e4cf5ac0,#b35ae6c0,#33ac50c0)',
  };

  const srcOf = img => {
    const s = img.getAttribute('data-src') || '';
    return s ? (s.startsWith('//') ? 'https:' + s : s) : '';
  };
  const fileOf = url => url.split('/').pop();

  // 「종족별」 탭 버튼의 data-onclick 에서 그룹 클래스를 얻어 해당 내용 div 를 찾는다
  function findRoots() {
    const roots = new Set();
    document.querySelectorAll('a[data-onclick]').forEach(t => {
      if (!t.textContent.includes(TAB)) return;
      const m = /add-class,([\w-]+),/.exec(t.getAttribute('data-onclick'));
      if (!m) return;
      document.querySelectorAll('div.' + CSS.escape(m[1])).forEach(d => roots.add(d));
    });
    return [...roots];
  }

  // 카드 하나 → {url,name,race,attr,row,pos,img,star,...Icon}
  // alt 로 아이콘 종류를 가른다. 값은 파일명 표에서 찾고, 표에 없으면 '?' 로 두고 콘솔에 남긴다.
  const kindOf = alt =>
    /UnitPerso/i.test(alt) ? 'attr' : /UnitClass/i.test(alt) ? 'pos' : /Position/i.test(alt) ? 'row' : /\d성$/.test(alt) ? 'star' : '';
  const MAP = { attr: ATTR, pos: POS, row: ROW };
  const unknown = new Set(); // 판별 못 한 아이콘 (콘솔에 출력)
  function collect() {
    const seen = new Set();
    const list = [];
    const raceIcon = {};
    unknown.clear();
    findRoots().forEach(root => {
      let race = '';
      root.querySelectorAll('a[title][href^="/w/"]').forEach(a => {
        const imgs = [...a.querySelectorAll('img')].filter(srcOf);
        if (!imgs.length) return;
        const c = a.cloneNode(true);
        c.querySelectorAll('noscript').forEach(n => n.remove());
        const name = c.textContent.replace(/\s+/g, ' ').trim();
        const title = a.getAttribute('title').trim();
        // 분류 헤더(요정, 수인 …)는 추출하지 않고 현재 종족으로만 기억
        const rm = /종족아이콘\s*(\S+)/.exec(imgs[0].getAttribute('alt') || '');
        const rn = rm ? rm[1] : SKIP.has(name) ? name : title.split('(')[0].trim();
        if (SKIP.has(rn) && imgs.length === 1) { race = rn; raceIcon[rn] = srcOf(imgs[0]); return; }
        if (!a.querySelector(':scope > div') || !name || !title) return;
        const key = title + '\t' + name;
        if (seen.has(key)) return;
        seen.add(key);
        const o = { url: BASE + title, name, race, attr: '', row: '', pos: '', img: srcOf(imgs[0]),
                    star: '', starIcon: '', attrIcon: '', rowIcon: '', posIcon: '' };
        imgs.slice(1).forEach(img => {
          const u = srcOf(img), f = fileOf(u), alt = (img.getAttribute('alt') || '').trim();
          let k = kindOf(alt);
          if (!k) k = ATTR[f] ? 'attr' : ROW[f] ? 'row' : POS[f] ? 'pos' : '';
          if (!k) { unknown.add(f + '  alt=' + alt); return; }
          if (o[k]) return; // 카드에 두 유닛이 있으면 첫 유닛 기준
          if (k === 'star') { o.star = alt.match(/\d성$/)[0]; o.starIcon = u; return; }
          o[k] = MAP[k][f] || '?';
          o[k + 'Icon'] = u;
          if (o[k] === '?') unknown.add(f + '  alt=' + alt);
        });
        list.push(o);
      });
    });
    if (unknown.size) console.warn('[namu-extract] 판별 못 한 아이콘:\n' + [...unknown].join('\n'));
    const noAttr = list.filter(o => !o.attr).length;
    if (noAttr) console.warn(`[namu-extract] 성격 미확인 사도 ${noAttr}명`);
    return { list, raceIcon, noAttr };
  }

  // ---------- 이미지 로컬화 ----------
  // 아이콘(성격·배치·포지션·성급·종족)을 파일로 받아 zip 안의 icons/ 폴더에 넣고, HTML 은 icons/파일명 으로 참조한다.
  // 사도 이미지(img)는 원본 주소 그대로 둔다. 받기 실패한 아이콘도 원본 주소 그대로.
  const ICON_DIR = 'icons/', IMG_DIR = 'img/';
  function fetchBlob(url) {
    return new Promise(res => {
      GM_xmlhttpRequest({
        method: 'GET', url, responseType: 'blob', timeout: 15000,
        headers: { Referer: location.href },
        onload: r => res(r.status === 200 && r.response && /^image\//.test(r.response.type) ? r.response : null),
        onerror: () => res(null), ontimeout: () => res(null),
      });
    });
  }

  // 무압축(store) zip 작성기. 외부 라이브러리 없이 동기로 만든다.
  const CRC_T = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; }
    return t;
  })();
  const crc32 = a => { let c = 0xffffffff; for (let i = 0; i < a.length; i++) c = CRC_T[(c ^ a[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function makeZip(files) { // files: [{name, data:Uint8Array}]
    const enc = new TextEncoder(), parts = [], cd = [];
    let off = 0;
    const d = new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
          dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const hdr = (sig, n, crc, size, nameLen, extra) => {
      const b = new Uint8Array(sig === 0x02014b50 ? 46 : 30), v = new DataView(b.buffer);
      let p = 0;
      v.setUint32(p, sig, true); p += 4;
      if (sig === 0x02014b50) { v.setUint16(p, 20, true); p += 2; }
      v.setUint16(p, 20, true); p += 2;     // version needed
      v.setUint16(p, 0x800, true); p += 2;  // flags: UTF-8 names
      v.setUint16(p, 0, true); p += 2;      // method: store
      v.setUint16(p, dosT, true); p += 2; v.setUint16(p, dosD, true); p += 2;
      v.setUint32(p, crc, true); p += 4; v.setUint32(p, size, true); p += 4; v.setUint32(p, size, true); p += 4;
      v.setUint16(p, nameLen, true); p += 2; v.setUint16(p, 0, true); p += 2; // extra len
      if (sig === 0x02014b50) { v.setUint16(p, 0, true); p += 2; v.setUint16(p, 0, true); p += 2; v.setUint16(p, 0, true); p += 2; v.setUint32(p, 0, true); p += 4; v.setUint32(p, extra, true); }
      return b;
    };
    files.forEach(f => {
      const name = enc.encode(f.name), crc = crc32(f.data);
      parts.push(hdr(0x04034b50, 0, crc, f.data.length, name.length), name, f.data);
      cd.push(hdr(0x02014b50, 0, crc, f.data.length, name.length, off), name);
      off += 30 + name.length + f.data.length;
    });
    const cdSize = cd.reduce((a, b) => a + b.length, 0);
    const e = new Uint8Array(22), v = new DataView(e.buffer);
    v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true);
    v.setUint32(12, cdSize, true); v.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [e]), { type: 'application/zip' });
  }
  const ICON_KEYS = ['attrIcon', 'rowIcon', 'posIcon', 'starIcon'];
  // 아이콘 주소를 모아 한 번씩만 받는다(같은 주소는 1회). → [{url, blob}]
  // all=true 면 사도 사진(img)까지 받는다
  async function fetchIcons(list, raceIcon, progress, all) {
    const urls = new Set();
    list.forEach(o => ICON_KEYS.forEach(k => { if (o[k]) urls.add(o[k]); }));
    if (all) list.forEach(o => { if (o.img) urls.add(o.img); });
    Object.values(raceIcon).forEach(u => { if (u) urls.add(u); });
    const got = [];
    let done = 0, fail = 0;
    progress(done, urls.size, fail);
    await Promise.all([...urls].map(async url => {
      const blob = await fetchBlob(url);
      done++;
      if (blob) got.push({ url, blob }); else fail++;
      progress(done, urls.size, fail);
    }));
    return got;
  }
  // list/raceIcon 안의 아이콘 주소를 map 대로 바꾼다 (map 에 없으면 원본 주소 유지)
  function remap(list, raceIcon, map) {
    const sw = u => map[u] || u;
    list.forEach(o => { ICON_KEYS.forEach(k => { o[k] = sw(o[k]); }); o.img = sw(o.img); });
    Object.keys(raceIcon).forEach(r => { raceIcon[r] = sw(raceIcon[r]); });
  }
  const blobToDataURL = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });

  // ---------- TSV ----------
  function toTSV(list) {
    return list.map(o => [o.url, o.name, o.race, o.attr, o.row, o.pos].join('\t')).join('\n');
  }

  // ---------- HTML ----------
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // 한글 검색용 분해. 저장되는 HTML 에도 그대로 들어간다.
  //  jamo(이름)        → 음절마다 ^초성+중성+종성 으로 푼 문자열   예) 에르핀 → ^ㅇㅔ^ㄹㅡ^ㅍㅣㄴ
  //  jamo(검색어,true) → 그 문자열에 대는 정규식 (없으면 null)
  // 검색어 규칙: 완성된 글자는 그 음절의 앞부분과 일치, 낱자음(ㄹ, ㄿ=ㄹㅍ)은 초성과 일치,
  //              받침은 다음 글자의 초성으로도 본다(삭→사과, 엺→에르핀).
  function jamo(s, query) {
    var C = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    var V = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅗㅏ','ㅗㅐ','ㅗㅣ','ㅛ','ㅜ','ㅜㅓ','ㅜㅔ','ㅜㅣ','ㅠ','ㅡ','ㅡㅣ','ㅣ'];
    var T = ['','ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    var M = { 'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ','ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ',
              'ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ' };
    var REST = '[^^]*'; // 그 음절의 나머지를 건너뜀
    var out = '';
    s = String(s).toLowerCase().replace(/[\s^]+/g, '');
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], n = s.charCodeAt(i) - 0xac00;
      if (n >= 0 && n < 11172) {
        var cho = C[Math.floor(n / 588)], jung = V[Math.floor(n / 28) % 21], jong = T[n % 28];
        if (!query) { out += '^' + cho + jung + jong; continue; }
        out += '\\^' + cho + jung;
        if (jong.length === 1) out += '(?:' + jong + '|\\^' + jong + REST + ')';
        else if (jong.length === 2) out += '(?:' + jong + '|' + jong[0] + '\\^' + jong[1] + REST + '|\\^' + jong[0] + REST + '\\^' + jong[1] + REST + ')';
        continue;
      }
      var j = M[ch] || ch;
      if (!query) { out += j; continue; }
      for (var k = 0; k < j.length; k++) {
        var c = j.charCodeAt(k);
        if (c >= 0x3131 && c <= 0x314e) out += '\\^' + j[k] + REST;       // 낱자음 = 초성
        else if (c >= 0x314f && c <= 0x3163) out += j[k];                 // 낱모음
        else out += j[k].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');          // 그 밖의 문자
      }
    }
    return query ? (out ? new RegExp(out) : null) : out;
  }

  // 저장되는 HTML 에는 카드 데이터(DATA)와 아이콘 주소(ICON)만 넣고, 3개 탭의 카드 마크업은 열릴 때 JS 가 그린다.
  // icons: {키: 'data:image/webp;base64,…'} — 단일 HTML 저장 때만 넘긴다. 아이콘 하나가 변수에 한 번만 들어간다.
  function toHTML(list, raceIcon, icons) {
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    // 값 → 아이콘 주소 (성격/배치/포지션/성급/종족 각 값마다 하나)
    const ICON = { attr: {}, row: {}, pos: {}, star: {}, race: raceIcon };
    sorted.forEach(o => {
      if (o.attr && o.attrIcon) ICON.attr[o.attr] = ICON.attr[o.attr] || o.attrIcon;
      if (o.row && o.rowIcon) ICON.row[o.row] = ICON.row[o.row] || o.rowIcon;
      if (o.pos && o.posIcon) ICON.pos[o.pos] = ICON.pos[o.pos] || o.posIcon;
      if (o.star && o.starIcon) ICON.star[o.star] = ICON.star[o.star] || o.starIcon;
    });
    // 카드: k=문서명, n=이름, i=사진, c=종족, a=성격, r=배치, p=포지션, s=성급
    const DATA = sorted.map(o => ({ k: o.url.slice(BASE.length), n: o.name, i: o.img, c: o.race, a: o.attr, r: o.row, p: o.pos, s: o.star }));
    const js = v => JSON.stringify(v).replace(/</g, '\\u003c');

    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>트릭컬 리바이브 사도 목록</title>
<style>
:root{--bg:#fff;--fg:#18181b;--mute:#8b8b93;--line:#ececef;--field:#f4f4f5;--on:#fff;--ac:#2f6fed;--err:#d92d20;color-scheme:light dark}
@media(prefers-color-scheme:dark){:root{--bg:#111113;--fg:#ededf0;--mute:#7d7d86;--line:#232327;--field:#1c1c20;--on:#2e2e34;--ac:#7aa7ff;--err:#ff6b5e}}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 Pretendard,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased}
header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:12px;max-width:1080px;margin:0 auto;padding:12px 20px}
#q{flex:1;min-width:0;height:40px;padding:0 14px;font:inherit;font-size:15px;color:inherit;background:var(--field);border:1px solid transparent;border-radius:10px;outline:0;transition:border-color .15s,background .15s}
#q:focus{background:var(--bg);border-color:var(--fg)}
#q::placeholder{color:var(--mute)}
#n{min-width:2.5em;text-align:right;color:var(--mute);font-variant-numeric:tabular-nums}
nav{display:flex;padding:3px;background:var(--field);border-radius:10px}
nav button{height:34px;padding:0 14px;font:inherit;color:var(--mute);background:none;border:0;border-radius:8px;cursor:pointer;white-space:nowrap;transition:color .15s}
nav button:hover{color:var(--fg)}
nav button.on{color:var(--fg);font-weight:600;background:var(--on);box-shadow:0 1px 2px rgba(0,0,0,.12)}
nav button:focus-visible,.c:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
main{max-width:1080px;margin:0 auto;padding:4px 20px 64px}
table{width:100%;border-collapse:collapse}
tr+tr{border-top:1px solid var(--line)}
th,td{padding:20px 0;vertical-align:top}
th{width:76px;padding-right:16px;text-align:left;font-weight:400}
th img{display:block;width:26px;height:26px;margin-bottom:6px;object-fit:contain}
th b{display:block;font-size:15px;font-weight:600}
th small{color:var(--mute);font-size:12px;font-variant-numeric:tabular-nums}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:14px 10px}
.c{display:block;color:inherit;text-decoration:none;text-align:center;border-radius:12px}
.p{position:relative;display:block;aspect-ratio:1;border-radius:12px;overflow:hidden;transition:transform .15s,box-shadow .15s}
.c:hover .p{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.16)}
.f{display:block;width:100%;height:100%;object-fit:cover}
.i{position:absolute;left:4px;top:4px;display:flex;flex-direction:column;gap:1px}
.i img{display:block;width:18px;height:18px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}
.s{position:absolute;left:14%;bottom:1px;width:72%}
.n{display:block;margin-top:6px;font-size:13px;line-height:1.25;word-break:keep-all}
#e{padding:96px 0;text-align:center;color:var(--mute)}
.has .n::after{content:"";display:inline-block;width:5px;height:5px;margin-left:4px;border-radius:50%;background:var(--ac);vertical-align:middle}
.tag .has .n::after{display:none}
#m{position:fixed;z-index:20;min-width:180px;max-width:280px;padding:4px;background:var(--bg);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18)}
#m button,#m a{display:block;width:100%;padding:8px 10px;font:inherit;color:inherit;text-align:left;text-decoration:none;background:none;border:0;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#m button{font-weight:600}
#m button:hover,#m a:hover,#m button:focus-visible,#m a:focus-visible{background:var(--field);outline:0}
#ml:not(:empty),#mn{margin-top:4px;padding-top:4px;border-top:1px solid var(--line)}
dialog{width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 48px);padding:20px;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
dialog::backdrop{background:rgba(0,0,0,.35)}
.dh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.dh b{font-size:16px}
dialog button{font:inherit;color:var(--mute);background:none;border:0;border-radius:6px;cursor:pointer}
dialog button:hover:not(:disabled){color:var(--fg);background:var(--field)}
dialog button:disabled{opacity:.3;cursor:default}
dialog button:focus-visible,dialog input:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
#dx,#dl button{width:26px;height:28px;padding:0}
#dl{margin:0 0 12px;padding:0;list-style:none}
#dl li{display:flex;align-items:center;gap:2px;padding:6px 0;border-bottom:1px solid var(--line)}
#dl li.ed{color:var(--ac)}
#dl .t{flex:1;min-width:0;padding:2px 6px 2px 0;cursor:pointer}
#dl .t b,#dl .t small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dl .t b{font-weight:600}
#dl .t small{color:var(--mute);font-size:12px}
#df{display:grid;grid-template-columns:1fr auto;gap:8px}
#df input{min-width:0;height:38px;padding:0 12px;font:inherit;color:inherit;background:var(--field);border:1px solid transparent;border-radius:9px;outline:0}
#df input:focus{background:var(--bg);border-color:var(--fg)}
#df input.bad{border-color:var(--err)}
#du{grid-column:1/3}
#da{height:38px;padding:0 16px;font-weight:600;color:var(--bg);background:var(--fg)}
#da:hover:not(:disabled){color:var(--bg);background:var(--fg);opacity:.85}
#de{margin:8px 0 0;color:var(--err);font-size:13px}
.dz{display:flex;justify-content:flex-end;gap:4px;margin-top:14px}
.dz button{padding:4px 8px;font-size:12px}
#sh{position:fixed;z-index:20;width:min(440px,calc(100vw - 24px));padding:12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18)}
#sh label{display:block;margin-bottom:8px;color:var(--mute);font-size:12px}
#sh div{display:flex;gap:8px}
#sl{flex:1;min-width:0;height:36px;padding:0 10px;font:inherit;font-size:13px;color:inherit;background:var(--field);border:1px solid transparent;border-radius:8px;outline:0}
#sl:focus{border-color:var(--fg)}
#sc{min-width:64px;height:36px;padding:0 14px;font:inherit;font-weight:600;color:var(--bg);background:var(--fg);border:0;border-radius:8px;cursor:pointer}
#sc:hover{opacity:.85}
#sc:disabled{opacity:.25;cursor:default}
#sc:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
@media(max-width:560px){
.bar{flex-wrap:wrap;gap:8px;padding:10px 14px}
#q{flex-basis:calc(100% - 3.5em)}
nav{order:3;width:100%}nav button{flex:1}
main{padding:0 14px 48px}
th{width:52px;padding-right:10px}th img{width:22px;height:22px}
.g{grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:12px 8px}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>
<header><div class="bar">
<input id="q" type="search" placeholder="검색" aria-label="이름 검색" autocomplete="off" spellcheck="false" autofocus>
<span id="n" aria-live="polite">${list.length}</span>
<nav><button data-t="t-attr" class="on">성격별</button><button data-t="t-race">종족별</button><button data-t="t-abc">가나다순</button></nav>
</div></header>
<main>
<p id="e" hidden>결과 없음</p>
</main>
<div id="m" role="menu" hidden><button id="mh" role="menuitem">하이퍼 링크</button><div id="ml"></div><div id="mn"><a id="mw" role="menuitem" target="_blank" rel="noopener">나무위키</a></div></div>
<div id="sh" hidden><label for="sl">이 검색으로 바로 열리는 링크</label><div><input id="sl" type="text" readonly spellcheck="false"><button id="sc" type="button">복사</button></div></div>
<dialog id="d" aria-labelledby="dn">
<div class="dh"><b id="dn"></b><button id="dx" type="button" aria-label="닫기">✕</button></div>
<ul id="dl"></ul>
<form id="df" novalidate>
<input id="du" type="text" inputmode="url" placeholder="URL" aria-label="URL" autocomplete="off" spellcheck="false">
<input id="dt" type="text" placeholder="이름" aria-label="이름" autocomplete="off">
<button id="da">추가</button>
</form>
<p id="de" role="alert" hidden>올바른 URL이 아닙니다</p>
<div class="dz"><button id="dex" type="button">전체 내보내기</button><button id="dim" type="button">가져오기</button><input id="dfi" type="file" accept=".json,application/json" hidden></div>
</dialog>
<script>
// 하이퍼링크 JSON 주소. 비워 두면 이 HTML 과 같은 폴더의 hyperlink.json 을 자동으로 읽는다.
// 값을 넣으면 그 주소를 먼저 읽는다.
// var HYPERLINK_JSON_URL='https://example.com/trickcal/hyperlink.json';
var HYPERLINK_JSON_URL=${JSON.stringify(HYPERLINK_JSON_URL).replace(/</g, '\\u003c')};
// 아이콘 이미지(base64). 단일 HTML 저장 때만 들어가며, 같은 아이콘은 여기 한 번만 있다. ICON 의 'ic:키' 가 이걸 가리킨다.
var ICONS=${icons ? js(icons) : '{}'};
var ICON=${js(ICON)},DATA=${js(DATA)},BASE=${js(BASE)};
var ATTR_ORDER=${js(ATTR_ORDER)},RACES=${js(RACES)},ATTR_BG=${js(ATTR_BG)};
${jamo.toString()}
// ----- 카드 그리기: DATA 로 성격별 / 종족별 / 가나다순 3개 테이블을 만든다 -----
(function(){
var CHO='ㄱㄱㄴㄷㄷㄹㅁㅂㅂㅅㅅㅇㅈㅈㅊㅋㅌㅍㅎ';
function ini(n){var c=n.charCodeAt(0)-0xac00;return c>=0&&c<11172?CHO[Math.floor(c/588)]:'기타'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function iu(u){return u.slice(0,3)==='ic:'?ICONS[u.slice(3)]||'':u}
function icon(u,t){return u?'<img src="'+esc(iu(u))+'" title="'+esc(t)+'" alt="'+esc(t)+'">':''}
function card(o){
var url=BASE+o.k,t=[o.c,o.a,o.r,o.p,o.s].filter(Boolean).join(' · ');
return '<a class="c" data-k="'+esc(o.k)+'" data-j="'+esc(jamo(o.n))+'" href="'+esc(encodeURI(url))+'" target="_blank" rel="noopener" title="'+esc(t)+'">'+
'<span class="p" style="background:'+(ATTR_BG[o.a]||'#ccc')+'"><img class="f" src="'+esc(iu(o.i))+'" alt="" loading="lazy">'+
'<span class="i">'+icon(ICON.attr[o.a],o.a)+icon(ICON.pos[o.p],o.p)+icon(ICON.row[o.r],o.r)+'</span>'+
(ICON.star[o.s]?'<img class="s" src="'+esc(iu(ICON.star[o.s]))+'" alt="'+esc(o.s)+'">':'')+
'</span><span class="n">'+esc(o.n)+'</span></a>';
}
function table(id,groups,show){
var rows='';
groups.forEach(function(g){
if(!g.items.length)return;
rows+='<tr><th scope="row">'+icon(g.icon,g.label)+'<b>'+esc(g.label)+'</b><small>'+g.items.length+'</small></th><td><div class="g">'+g.items.map(card).join('')+'</div></td></tr>';
});
return '<table id="'+id+'"'+(show?'':' hidden')+'>'+rows+'</table>';
}
function by(k,v){return DATA.filter(function(o){return o[k]===v})}
var inits=[];DATA.forEach(function(o){var i=ini(o.n);if(inits.indexOf(i)<0)inits.push(i)});
var html=table('t-attr',ATTR_ORDER.map(function(a){return{label:a,icon:ICON.attr[a]||'',items:by('a',a)}}),true)+
table('t-race',RACES.map(function(r){return{label:r,icon:ICON.race[r]||'',items:by('c',r)}}),false)+
table('t-abc',inits.map(function(i){return{label:i,icon:'',items:DATA.filter(function(o){return ini(o.n)===i})}}),false);
document.getElementById('e').insertAdjacentHTML('beforebegin',html);
})();
(function(){
var q=document.getElementById('q'),n=document.getElementById('n'),e=document.getElementById('e');
var tabs=[].slice.call(document.querySelectorAll('nav button')),tables=[].slice.call(document.querySelectorAll('table'));
function cur(){return tables.filter(function(t){return !t.hidden})[0]}
function find(){
// #으로 시작하면 사도 이름 대신 하이퍼링크 이름을 검색한다 (# 만 치면 결과 없음)
var v=q.value,tag=v.charAt(0)==='#',k=jamo(tag?v.slice(1):v,true);
document.body.classList.toggle('tag',tag); // 하이퍼링크 검색 중에는 파란 점을 숨긴다
function hit(c){
if(!tag)return !k||k.test(c.dataset.j);
return !!k&&links(c.dataset.k).some(function(l){return k.test(jamo(l.t))});
}
tables.forEach(function(t){[].forEach.call(t.rows,function(r){
var any=false;
[].forEach.call(r.querySelectorAll('.c'),function(c){var ok=hit(c);c.hidden=!ok;if(ok)any=true});
r.hidden=!any;
})});
var c=cur().querySelectorAll('.c:not([hidden])').length;
n.textContent=c;e.hidden=c>0;
}
function show(id){
tabs.forEach(function(b){b.classList.toggle('on',b.dataset.t===id)});
tables.forEach(function(t){t.hidden=t.id!==id});
try{localStorage.setItem('tab',id)}catch(x){}
find();
}
tabs.forEach(function(b){b.onclick=function(){show(b.dataset.t)}});
q.addEventListener('input',find);
// 단축키: / 검색창, Esc 지우기, Enter 첫 결과의 나무위키 열기
document.addEventListener('keydown',function(ev){
if(d.open)return;
if(ev.key==='Escape'&&!sh.hidden){sh.hidden=true;q.focus();return}
if(ev.key==='Escape'&&!m.hidden){hide();return}
if(document.activeElement===sl)return;
if(ev.key==='/'&&document.activeElement!==q){ev.preventDefault();q.focus();q.select()}
else if(ev.key==='Escape'){q.value='';find();q.focus()}
else if(ev.key==='Enter'&&document.activeElement===q&&!ev.isComposing&&q.value){var f=cur().querySelector('.c:not([hidden])');if(f)open(f.href,'_blank','noopener')}
});
// ----- 하이퍼 링크: 사도별 링크 등록 -----
// base = hyperlink.json 에서 읽은 것, db = 이 브라우저(localStorage)에서 고친 것. 같은 사도는 db 가 우선한다.
function $(id){return document.getElementById(id)}
function el(tag,text,cls){var x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x}
var KEY='trickcal-links',base={},db={},key='',edit=-1;
var m=$('m'),ml=$('ml'),d=$('d'),dl=$('dl'),du=$('du'),dt=$('dt'),da=$('da'),de=$('de');
try{db=JSON.parse(localStorage.getItem(KEY))||{}}catch(x){}
function links(k){return db[k]||base[k]||[]}
function own(){if(!db[key])db[key]=links(key).slice();return db[key]}
function merged(){var o={};Object.keys(base).concat(Object.keys(db)).forEach(function(k){if(links(k).length)o[k]=links(k)});return o}
function save(){
if(db[key]&&!db[key].length&&!(base[key]&&base[key].length))delete db[key];
try{localStorage.setItem(KEY,JSON.stringify(db))}catch(x){}
mark();
}
function mark(){[].forEach.call(document.querySelectorAll('.c'),function(c){c.classList.toggle('has',links(c.dataset.k).length>0)});find()}
// URL 검사: http(s) 만 허용, 주소만 적으면 https:// 를 붙여 본다
function toURL(v){
v=v.trim();if(!v)return null;
if(!/^https?:/i.test(v))v='https://'+v;
var u;try{u=new URL(v)}catch(x){return null}
if(u.protocol!=='http:'&&u.protocol!=='https:')return null;
if(u.hostname.indexOf('.')<0&&u.hostname!=='localhost')return null;
return u.href;
}
function hide(){m.hidden=true}
function cardOf(ev){return ev.target.closest&&ev.target.closest('.c')}
// 좌클릭·가운데 클릭·우클릭 = 메뉴, Ctrl(⌘)+좌클릭 = 나무위키
document.addEventListener('click',function(ev){
var c=cardOf(ev);if(!c||ev.ctrlKey||ev.metaKey)return;
ev.preventDefault();menu(c,ev);
});
document.addEventListener('auxclick',function(ev){
var c=cardOf(ev);if(!c||ev.button!==1)return;
ev.preventDefault();menu(c,ev);
});
document.addEventListener('mousedown',function(ev){if(ev.button===1&&cardOf(ev))ev.preventDefault()});
document.addEventListener('contextmenu',function(ev){
var c=cardOf(ev);
if(!c){hide();return}
ev.preventDefault();menu(c,ev);
});
function menu(c,ev){
var x=ev.clientX,y=ev.clientY;
if(!ev.detail&&!x&&!y){var r=c.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}
key=c.dataset.k;m.dataset.n=c.querySelector('.n').textContent;
ml.textContent='';
links(key).forEach(function(l){var a=el('a',l.t);a.href=l.u;a.target='_blank';a.rel='noopener';a.title=l.u;a.setAttribute('role','menuitem');ml.appendChild(a)});
$('mw').href=c.href;
m.hidden=false;
m.style.left=Math.max(4,Math.min(x,innerWidth-m.offsetWidth-4))+'px';
m.style.top=Math.max(4,Math.min(y,innerHeight-m.offsetHeight-4))+'px';
}
document.addEventListener('mousedown',function(ev){if(!m.hidden&&!m.contains(ev.target))hide()});
addEventListener('scroll',hide,true);addEventListener('resize',hide);addEventListener('blur',hide);
ml.addEventListener('click',hide);$('mw').addEventListener('click',hide);
$('mh').onclick=function(){hide();$('dn').textContent=m.dataset.n;reset();render();d.showModal();du.focus()};
function reset(){edit=-1;du.value='';dt.value='';da.textContent='추가';bad(false)}
function bad(on){du.classList.toggle('bad',on);de.hidden=!on}
function btn(text,label,off,fn){var b=el('button',text);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.disabled=off;b.onclick=fn;return b}
function render(){
var a=links(key);dl.textContent='';
a.forEach(function(l,i){
var li=el('li','',i===edit?'ed':''),t=el('div','','t');
t.title='수정';t.appendChild(el('b',l.t));var v=l.u;try{v=decodeURI(v)}catch(x){}t.appendChild(el('small',v));
t.onclick=function(){if(edit===i){reset();render();return}edit=i;du.value=l.u;dt.value=l.t;da.textContent='저장';bad(false);render();du.focus();du.select()};
li.appendChild(t);
li.appendChild(btn('✎','수정',false,t.onclick));
li.appendChild(btn('↑','위로',i===0,function(){move(i,i-1)}));
li.appendChild(btn('↓','아래로',i===a.length-1,function(){move(i,i+1)}));
li.appendChild(btn('✕','삭제',false,function(){own().splice(i,1);save();reset();render()}));
dl.appendChild(li);
});
}
function move(i,j){var a=own(),x=a[i];a[i]=a[j];a[j]=x;if(edit===i)edit=j;else if(edit===j)edit=i;save();render()}
$('df').addEventListener('submit',function(ev){
ev.preventDefault();
var u=toURL(du.value);
if(!u){bad(true);du.focus();return}
var l={u:u,t:dt.value.trim()||new URL(u).hostname};
var a=own();
if(edit>=0)a[edit]=l;else a.push(l);
save();reset();render();du.focus();
});
du.addEventListener('input',function(){bad(false)});
$('dx').onclick=function(){d.close()};
d.addEventListener('click',function(ev){if(ev.target===d)d.close()});
// 불러온 JSON 을 검사해 {사도:[{u,t}]} 형태만 남긴다
function clean(o){
var out={};if(!o||typeof o!=='object')return out;
Object.keys(o).forEach(function(k){
if(!Array.isArray(o[k]))return;
var a=o[k].map(function(l){var u=l&&toURL(String(l.u||''));return u?{u:u,t:String(l.t||new URL(u).hostname)}:null}).filter(Boolean);
if(a.length)out[k]=a;
});
return out;
}
// 전체 내보내기(hyperlink.json) / 가져오기
$('dex').onclick=function(){
var a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(merged(),null,1)],{type:'application/json'}));
a.download='hyperlink.json';document.body.appendChild(a);a.click();a.remove();
};
$('dim').onclick=function(){$('dfi').click()};
$('dfi').onchange=function(){
var f=this.files[0],r=new FileReader();this.value='';if(!f)return;
r.onload=function(){
var o;try{o=JSON.parse(r.result)}catch(x){return}
o=clean(o);Object.keys(o).forEach(function(k){db[k]=o[k]});
save();reset();render();
};
r.readAsText(f);
};
mark();
// ----- 검색 링크: 주소 뒤에 #Search=검색어 를 붙이면 열자마자 그 검색이 실행된다 -----
var sh=$('sh'),sl=$('sl'),sc=$('sc');
// 검색창 우클릭·가운데 클릭 → 현재 검색어가 담긴 링크를 보여 준다
function share(){
hide();
// 검색어가 없거나 # 뿐이면 빈칸. 링크는 읽을 수 있게 한글 그대로 두고 % 와 공백만 바꾼다
var page=location.href.split('#')[0];try{page=decodeURI(page).split(' ').join('%20')}catch(x){}
sl.value=jamo(q.value.charAt(0)==='#'?q.value.slice(1):q.value)?page+'#Search='+q.value.split('%').join('%25').split(' ').join('%20'):'';
sc.textContent='복사';sc.disabled=!sl.value;
var r=q.getBoundingClientRect();
sh.hidden=false;
sh.style.left=Math.max(12,Math.min(r.left,innerWidth-sh.offsetWidth-12))+'px';
sh.style.top=(r.bottom+6)+'px';
sl.focus();sl.select();
}
q.addEventListener('contextmenu',function(ev){ev.preventDefault();share()});
q.addEventListener('mousedown',function(ev){if(ev.button===1)ev.preventDefault()});
q.addEventListener('auxclick',function(ev){if(ev.button===1){ev.preventDefault();share()}});
document.addEventListener('mousedown',function(ev){if(!sh.hidden&&!sh.contains(ev.target))sh.hidden=true});
addEventListener('resize',function(){sh.hidden=true});
sc.onclick=function(){
function ok(){sc.textContent='복사됨';setTimeout(function(){sc.textContent='복사'},1200)}
function old(){sl.focus();sl.select();try{if(document.execCommand('copy'))ok()}catch(x){}}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(sl.value).then(ok,old);else old();
};
// 주소에 #Search=검색어 가 있으면 주소에서 지우고 검색창에 넣어 검색한다
function fromHash(){
var h=/^#search=(.*)$/i.exec(location.hash);if(!h)return;
// %XX 로 바뀐 부분만 골라 되돌린다 (되돌릴 수 없는 % 는 그대로 둔다)
var v=h[1].replace(/(%[0-9a-f]{2})+/gi,function(p){try{return decodeURIComponent(p)}catch(x){return p}});
try{history.replaceState(null,'',location.href.split('#')[0])}catch(x){}
q.value=v;find();
}
addEventListener('hashchange',fromHash);
// hyperlink.json 자동 로드: HYPERLINK_JSON_URL 이 있으면 먼저, 없거나 실패하면 같은 폴더의 hyperlink.json
function load(list){
if(!list.length||!window.fetch)return;
fetch(list[0],{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})
.then(function(o){base=clean(o);mark();if(d.open)render()})
.catch(function(){load(list.slice(1))});
}
load((HYPERLINK_JSON_URL?[HYPERLINK_JSON_URL]:[]).concat(location.protocol==='file:'?[]:['hyperlink.json']));
var s=null;try{s=localStorage.getItem('tab')}catch(x){}
if(s&&document.getElementById(s))show(s);
fromHash();
})();
</script>
</body></html>`;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ---------- 버튼 (좌하단) ----------
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;display:flex;gap:6px';

  function addButton(label, run) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      'padding:8px 14px;font-size:14px;border:0;border-radius:6px;background:#00a495;' +
      'color:#fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35)';
    let busy = false;
    b.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      const { list, raceIcon, noAttr } = collect();
      try { b.textContent = list.length ? await run(list, raceIcon, b) + (noAttr ? ` / 성격 미확인 ${noAttr}` : '') : '없음'; }
      catch (e) { b.textContent = '실패'; console.error(e); }
      setTimeout(() => { b.textContent = label; busy = false; }, noAttr ? 5000 : 2500);
    });
    box.appendChild(b);
  }

  addButton('추출', list => { GM_setClipboard(toTSV(list), 'text'); return `복사됨 ${list.length}`; });

  // 저장 형식 (선택은 이 브라우저에 기억)
  const MODES = { zip: 'zip (HTML + icons 폴더)', one: '단일 HTML (아이콘 base64 내장)', raw: 'HTML (아이콘 원격 링크)' };
  const sel = document.createElement('select');
  sel.style.cssText = 'padding:0 8px;font-size:13px;border:0;border-radius:6px;background:#fff;color:#222;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35)';
  Object.keys(MODES).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = MODES[k]; sel.appendChild(o); });
  try { if (MODES[localStorage.getItem('namu-extract-mode')]) sel.value = localStorage.getItem('namu-extract-mode'); } catch (e) {}
  sel.onchange = () => { try { localStorage.setItem('namu-extract-mode', sel.value); } catch (e) {} };
  // 사도 사진까지 로컬화 (zip → img/ 폴더, 단일 → base64. 단일은 수 MB 가 된다)
  const lab = document.createElement('label');
  lab.style.cssText = 'display:flex;align-items:center;gap:4px;padding:0 8px;font-size:13px;border-radius:6px;background:#fff;color:#222;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);user-select:none';
  const chk = document.createElement('input'); chk.type = 'checkbox';
  try { chk.checked = localStorage.getItem('namu-extract-all') === '1'; } catch (e) {}
  chk.onchange = () => { try { localStorage.setItem('namu-extract-all', chk.checked ? '1' : '0'); } catch (e) {} };
  lab.appendChild(chk); lab.appendChild(document.createTextNode('사도 사진 포함'));

  const prog = b => (done, total, fail) => { b.textContent = `이미지 ${done}/${total}` + (fail ? ` 실패 ${fail}` : ''); };
  const htmlBlob = h => new Blob([h], { type: 'text/html;charset=utf-8' });
  addButton('저장', async (list, raceIcon, b) => {
    const mode = sel.value;
    if (mode === 'raw') { download(htmlBlob(toHTML(list, raceIcon)), '트릭컬_사도목록.html'); return `저장됨 ${list.length}`; }
    const photos = new Set(list.map(o => o.img));
    const got = await fetchIcons(list, raceIcon, prog(b), chk.checked);
    const map = {};
    if (mode === 'zip') {
      const files = [];
      for (const g of got) { const name = (photos.has(g.url) ? IMG_DIR : ICON_DIR) + fileOf(g.url); files.push({ name, data: new Uint8Array(await g.blob.arrayBuffer()) }); map[g.url] = name; }
      remap(list, raceIcon, map);
      files.unshift({ name: '트릭컬_사도목록.html', data: new TextEncoder().encode(toHTML(list, raceIcon)) });
      download(makeZip(files), '트릭컬_사도목록.zip');
    } else {
      const icons = {};
      for (let i = 0; i < got.length; i++) { const k = 'i' + i; icons[k] = await blobToDataURL(got[i].blob); map[got[i].url] = 'ic:' + k; }
      remap(list, raceIcon, map);
      download(htmlBlob(toHTML(list, raceIcon, icons)), '트릭컬_사도목록.html');
    }
    return `저장됨 ${list.length} (이미지 ${got.length})`;
  });
  box.appendChild(sel);
  box.appendChild(lab);

  document.documentElement.appendChild(box);
})();
