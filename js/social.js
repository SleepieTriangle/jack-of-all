/* Jack of All — backup codes and friends.
   Everything works WITHOUT accounts or a server: a "code" is the data itself,
   compressed and turned into text you can copy, share as a link, or save as a
   file. Friend codes carry a small public scorecard (name, avatar, this week's
   scores, streak, levels) — never your full history. Codes received from other
   people are treated as untrusted data and validated before use. */
(function () {
  const J = window.JOA;

  // ---------- encoding: JSON → gzip (when available) → base64url ----------
  const b64url = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64url = (str) => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  const canZip = () => typeof CompressionStream !== 'undefined';

  J.encodeCode = async function (obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (canZip()) {
      const zipped = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      return 'JA1z' + b64url(zipped);
    }
    return 'JA1j' + b64url(bytes);
  };

  J.decodeCode = async function (code) {
    code = String(code || '').trim().replace(/\s+/g, '');
    const m = code.match(/(JA1[zj])([A-Za-z0-9_-]+)/); // tolerate a pasted link around the code
    if (!m) throw new Error('That doesn\'t look like a Jack of All code.');
    let bytes = unb64url(m[2]);
    if (m[1] === 'JA1z') {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser can\'t read that code. Try updating it.');
      bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    }
    if (bytes.length > 2_000_000) throw new Error('That code is too big.');
    return JSON.parse(new TextDecoder().decode(bytes));
  };

  // ---------- backups ----------
  // A backup holds players' full progress (minus the "already seen" puzzle lists,
  // which only keep puzzles fresh and would make codes huge).
  J.makeBackup = async function (allPlayers) {
    const list = allPlayers ? J.profiles() : [J.activeProfile()].filter(Boolean);
    const players = list.map((p) => {
      const st = J.profileState(p.id);
      delete st.seen;
      return { profile: p, state: st };
    });
    return J.encodeCode({ t: 'backup', v: 1, at: Date.now(), players });
  };

  J.readBackup = async function (code) {
    const data = await J.decodeCode(code);
    if (!data || data.t !== 'backup' || !Array.isArray(data.players)) throw new Error('That isn\'t a backup code.');
    return data.players
      .filter((x) => x && x.profile && typeof x.profile.id === 'string' && x.state && typeof x.state === 'object')
      .map((x) => ({
        profile: { id: x.profile.id.slice(0, 40), name: String(x.profile.name || 'Player').slice(0, 24), avatar: cleanAvatar(x.profile.avatar), createdAt: +x.profile.createdAt || Date.now() },
        state: x.state,
      }));
  };

  // Restore players from a backup. Same player (same id) is replaced; new ones are added.
  J.restorePlayers = function (players) {
    const idxRaw = J.storage.get('jack-of-all:profiles');
    const idx = (idxRaw && JSON.parse(idxRaw)) || { active: null, list: [] };
    players.forEach(({ profile, state }) => {
      const at = idx.list.findIndex((p) => p.id === profile.id);
      if (at >= 0) idx.list[at] = profile;
      else idx.list.push(profile);
      J.storage.set('jack-of-all:p:' + profile.id, JSON.stringify(state));
    });
    if (!idx.active && idx.list.length) idx.active = players[0].profile.id;
    J.storage.set('jack-of-all:profiles', JSON.stringify(idx));
  };

  const cleanAvatar = (a) => (J.AVATARS.includes(a) || a === '🧸' ? a : '🙂');

  // ---------- friends ----------
  // A player's public scorecard.
  J.scorecard = function (profile, st) {
    st = st || J.profileState(profile.id);
    if (!st.fid) {
      // Give every player a stable public id, so their friend code and their
      // row on this device are recognized as the same person.
      st.fid = 'f' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      J.storage.set('jack-of-all:p:' + profile.id, JSON.stringify(st));
    }
    const wk = J.weekInfo(J.today());
    const week = wk.days.map((d) => {
      const r = st.daily[J.dateKey(d)];
      return r ? r.score : null;
    });
    const levels = {};
    J.gameIds().forEach((id) => (levels[id] = J.clamp(st.unlocked[id] || 1, 1, J.MAX_LEVEL)));
    return {
      id: st.fid || profile.id,
      name: profile.name,
      avatar: profile.avatar,
      at: Date.now(),
      week: wk.weekIndex,
      scores: week,
      streak: J.streakOf(st, J.today()),
      levels,
      badges: Object.keys(st.badges || {}).length,
    };
  };

  // Stable public id for friend codes (so a new code replaces the old one).
  J.friendId = function () {
    const st = J.getState();
    if (!st.fid) {
      st.fid = 'f' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      J.saveState(st);
    }
    return st.fid;
  };

  J.makeFriendCode = async function () {
    J.friendId();
    const card = J.scorecard(J.activeProfile(), J.getState());
    return J.encodeCode({ t: 'friend', v: 1, card });
  };

  // Validate an untrusted scorecard: keep only known fields with safe values.
  function cleanCard(c) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string') throw new Error('That friend code is damaged.');
    const n = (v, lo, hi) => (Number.isFinite(+v) ? J.clamp(Math.round(+v), lo, hi) : lo);
    const levels = {};
    J.gameIds().forEach((id) => (levels[id] = n(c.levels && c.levels[id], 1, J.MAX_LEVEL)));
    return {
      id: c.id.replace(/[^\w-]/g, '').slice(0, 40),
      name: String(c.name || 'Friend').replace(/[\u0000-\u001f]/g, '').slice(0, 24),
      avatar: cleanAvatar(c.avatar),
      at: n(c.at, 0, 4e12),
      week: n(c.week, 0, 1e6),
      scores: Array.isArray(c.scores) ? c.scores.slice(0, 7).map((v) => (v === null || v === undefined ? null : n(v, 0, 100))) : [],
      streak: n(c.streak, 0, 100000),
      levels,
      badges: n(c.badges, 0, 1000),
    };
  }

  J.readFriendCode = async function (code) {
    const data = await J.decodeCode(code);
    if (!data || data.t !== 'friend') throw new Error('That isn\'t a friend code.');
    return cleanCard(data.card);
  };

  J.addFriend = function (card) {
    const st = J.getState();
    if (card.id === st.fid) throw new Error('That\'s your own code! Send it to a friend instead.');
    const isNew = !st.friends[card.id];
    st.friends[card.id] = Object.assign(card, { added: (st.friends[card.id] || {}).added || Date.now() });
    J.saveState(st);
    return isNew;
  };
  J.removeFriend = function (id) {
    const st = J.getState();
    delete st.friends[id];
    J.saveState(st);
  };

  J.weekTotal = (scores) => (scores || []).reduce((a, b) => a + (b || 0), 0);

  J._social = { cleanCard, b64url, unb64url };
})();
