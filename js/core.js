/* Jack of All — core: seeded randomness, weekly schedule, difficulty, storage, helpers. */
(function () {
  const J = (window.JOA = window.JOA || {});

  // ---------------------------------------------------------------------------
  // Seeded randomness. Everyone who plays on the same day gets the same puzzles,
  // and every week/day is generated automatically from the date — no content to
  // author by hand.
  // ---------------------------------------------------------------------------
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  J.makeRng = function (seed) {
    const next = mulberry32(hashString(String(seed)));
    next(); // discard first value for better spread on similar seeds
    return {
      next,
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      shuffle: (arr) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
    };
  };

  // ---------------------------------------------------------------------------
  // Dates. Weeks run Monday → Sunday. Add ?date=YYYY-MM-DD to the URL to preview
  // any day (handy for testing).
  // ---------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');
  J.dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  J.parseKey = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  J.addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  J.today = function () {
    const p = new URLSearchParams(location.search).get('date');
    if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) return J.parseKey(p);
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  };

  J.weekInfo = function (date) {
    const dayNum = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    // 1970-01-05 (day 4) was a Monday.
    const weekIndex = Math.floor((dayNum - 4) / 7);
    const dow = (((dayNum - 4) % 7) + 7) % 7 + 1; // 1 = Monday … 7 = Sunday
    const monday = J.addDays(date, -(dow - 1));
    const days = [];
    for (let i = 0; i < 7; i++) days.push(J.addDays(monday, i));
    return { weekIndex, dow, monday, days };
  };

  J.DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  J.DAY_TITLES = ['Warm-up', 'Easy', 'Steady', 'Mid-week', 'Tough', 'Hard', 'Boss Day'];

  J.fmtRange = function (a, b) {
    const o = { month: 'short', day: 'numeric' };
    return `${a.toLocaleDateString(undefined, o)} – ${b.toLocaleDateString(undefined, o)}`;
  };

  // ---------------------------------------------------------------------------
  // Games + weekly rotation. Every cycle of N weeks is a fresh random order of
  // all N games, so each brain skill comes around once per cycle and the same
  // game never runs two weeks in a row.
  // ---------------------------------------------------------------------------
  J.games = {};
  // The original 8 games, then the brain-training games added in v2.
  J.GAME_ORDER_V1 = ['chess', 'sudoku', 'wordProblems', 'patterns', 'memory', 'scramble', 'colorClash', 'sliding'];
  J.GAME_ORDER = J.GAME_ORDER_V1.concat(['lightTrail', 'quickMath', 'oddOneOut', 'numberHunt', 'shapeSpin', 'matchBack', 'oddWord']);
  J.register = (g) => {
    J.games[g.id] = g;
  };
  J.gameIds = () => J.GAME_ORDER.filter((id) => J.games[id]);

  // The bigger rotation starts on this Monday; earlier weeks keep the original
  // 8-game schedule so nobody's week (or history) changes underneath them.
  J.ROTATION_V2_START = '2026-11-16';

  function rotation(ids, salt, w, prevGame) {
    const n = ids.length;
    const cycle = Math.floor(w / n);
    const pos = w - cycle * n;
    const order = J.makeRng(salt + cycle).shuffle(ids);
    const prevLast = prevGame !== undefined && cycle === 0 ? prevGame : J.makeRng(salt + (cycle - 1)).shuffle(ids)[n - 1];
    if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
    return order[pos];
  }

  J.gameForWeek = function (weekIndex) {
    const cut = J.weekInfo(J.parseKey(J.ROTATION_V2_START)).weekIndex;
    const v1 = J.GAME_ORDER_V1.filter((id) => J.games[id]);
    if (weekIndex < cut) return rotation(v1, 'jack-of-all:cycle:', weekIndex);
    const lastV1 = rotation(v1, 'jack-of-all:cycle:', cut - 1);
    return rotation(J.gameIds(), 'jack-of-all:v2:cycle:', weekIndex - cut, lastV1);
  };

  // ---------------------------------------------------------------------------
  // Levels. Every game has 100 LEVELS in 10 TIERS of 10. All levels in a tier
  // play at the same difficulty; each new tier is a step harder.
  //
  //   Games understand a DIFFICULTY from 1 (gentlest) to 12 (Grandmaster).
  //   Kids:   tier 1 → difficulty 1 … tier 10 → difficulty 10 (tiers 1–2 are
  //           gentle "learning" tiers with beginner helpers).
  //   Adults: tier 1 → difficulty 3 … tier 10 → difficulty 12, so Levels 1–20
  //           are easy but skip the very basic beginner puzzles.
  //   Easier / Harder shifts every tier one difficulty step down / up.
  // ---------------------------------------------------------------------------
  J.MAX_LEVEL = 100;
  J.TIER_SIZE = 10;
  J.MAX_DIFFICULTY = 12;
  J.TIERS = ['Beginner', 'Novice', 'Apprentice', 'Skilled', 'Talented', 'Advanced', 'Expert', 'Elite', 'Master', 'Grandmaster'];
  J.TIER_ICONS = ['🌱', '🌿', '📘', '🎯', '⭐', '🚀', '🔥', '💎', '👑', '🏆'];
  J.PLAYERS = {
    kid: { label: 'Kid', icon: '🧸', desc: 'Ages about 5–12. Gentle starting levels, picture-based games and beginner helpers.' },
    adult: { label: 'Adult', icon: '☕', desc: 'Teens and grown-ups. Starts easy (but not too basic) and climbs to Grandmaster.' },
  };
  J.TUNES = { easier: 'Easier', normal: 'Normal', harder: 'Harder' };
  J.TUNE_SHIFT = { easier: -1, normal: 0, harder: 1 };

  J.tierOf = (level) => Math.ceil(J.clamp(level, 1, J.MAX_LEVEL) / J.TIER_SIZE); // 1–10
  J.tierName = (level) => J.TIERS[J.tierOf(level) - 1];
  J.tierStart = (tier) => (tier - 1) * J.TIER_SIZE + 1;

  // The difficulty a level plays at, for this player's settings.
  J.difficulty = function (level, settings) {
    const s = settings || J.getState().settings;
    const base = s.player === 'kid' ? J.tierOf(level) : J.tierOf(level) + 2;
    return J.clamp(base + (J.TUNE_SHIFT[s.tune] || 0), 1, J.MAX_DIFFICULTY);
  };
  // "Learning" = the gentlest difficulties (kids' first two tiers, or Easier).
  J.isLearning = (level, settings) => J.difficulty(level, settings) <= 2;
  J.levelTag = (level, settings) => `${J.tierName(level)}${J.isLearning(level, settings) ? ' · Learning' : ''}`;
  // Beginner helpers: everyone's first tier, plus any learning difficulty.
  J.helpersAllowed = (level, settings) => J.tierOf(level) === 1 || J.isLearning(level, settings);
  J.isKid = () => J.getState().settings.player === 'kid';

  // ---------------------------------------------------------------------------
  // Level locks. Every game starts at Level 1. Passing a level (score 60+, i.e.
  // 2 stars) unlocks the next one. Each day you play your NEXT level, so the
  // game gets harder as you keep passing. Locks can be switched off.
  // ---------------------------------------------------------------------------
  J.PASS_SCORE = 60;
  J.locksOn = (st) => (st || J.getState()).settings.locks !== false;
  J.topLevel = (gameId, st) => J.clamp((st || J.getState()).unlocked[gameId] || 1, 1, J.MAX_LEVEL); // highest reached
  J.unlockedLevel = (gameId, st) => {
    st = st || J.getState();
    return J.locksOn(st) ? J.topLevel(gameId, st) : J.MAX_LEVEL;
  };
  // SMART DIFFICULTY (on by default): a 90+ score on your top level skips you
  // ahead a level; two fails in a row → the next daily drops back one tier.
  J.FAST_TRACK_SCORE = 90;
  J.smartOn = (st) => (st || J.getState()).settings.smart !== false;
  J.struggling = (gameId, st) => {
    st = st || J.getState();
    return J.smartOn(st) && (st.form[gameId] || {}).fails >= 2;
  };

  // The level today's daily game is played at: your next level to beat.
  J.dailyLevel = (gameId, st) => {
    st = st || J.getState();
    const top = J.topLevel(gameId, st);
    return J.struggling(gameId, st) ? Math.max(1, top - J.TIER_SIZE) : top;
  };

  // Record a result; returns the newly unlocked level (number), or null.
  // Also tracks pass/fail form for smart difficulty.
  J.recordPass = function (gameId, level, score) {
    const s = J.getState();
    const f = (s.form[gameId] = s.form[gameId] || { fails: 0 });
    f.fails = score < J.PASS_SCORE ? f.fails + 1 : 0;
    let unlockedTo = null;
    const cur = s.unlocked[gameId] || 1;
    if (score >= J.PASS_SCORE && level < J.MAX_LEVEL && level + 1 > cur) {
      const jump = J.smartOn(s) && score >= J.FAST_TRACK_SCORE && level === cur ? 2 : 1;
      unlockedTo = Math.min(J.MAX_LEVEL, level + jump);
      s.unlocked[gameId] = unlockedTo;
      if (unlockedTo - level === 2) s.stats.fastTracks = (s.stats.fastTracks || 0) + 1;
    }
    J.saveState(s);
    return unlockedTo && J.locksOn(s) ? unlockedTo : null;
  };

  // Players who started before locks existed keep credit for levels they passed.
  function unlocksFromHistory(s) {
    const u = {};
    const credit = (id, level, score) => {
      if (score >= J.PASS_SCORE) u[id] = Math.max(u[id] || 1, Math.min(J.MAX_LEVEL, level + 1));
    };
    Object.values(s.daily).forEach((r) => credit(r.gameId, r.level, r.score));
    Object.entries(s.practice).forEach(([id, p]) => Object.entries(p.best || {}).forEach(([lv, sc]) => credit(id, +lv, sc)));
    return u;
  }

  // Progress saved on the old 1–10 scale moves to the matching tier of the
  // 100-level scale (the start of the tier with the same difficulty).
  function toHundredScale(s) {
    const kid = s.settings.player === 'kid';
    const oldDifficulty = (l) => (l <= 2 ? l : Math.min(11, l + 1));
    const convert = (l) => {
      l = J.clamp(+l || 1, 1, 10);
      const tier = J.clamp(kid ? oldDifficulty(l) : oldDifficulty(l) - 2, 1, 10);
      return J.tierStart(tier);
    };
    Object.keys(s.unlocked).forEach((id) => (s.unlocked[id] = convert(s.unlocked[id])));
    Object.values(s.daily).forEach((r) => (r.level = convert(r.level)));
    Object.values(s.practice).forEach((p) => {
      const best = {};
      Object.entries(p.best || {}).forEach(([lv, sc]) => {
        const k = convert(lv);
        best[k] = Math.max(best[k] || 0, sc);
      });
      p.best = best;
    });
    s.levelScale = 100;
  }

  // ---------------------------------------------------------------------------
  // Storage (localStorage, per device) with PROFILES: everyone who plays on this
  // device gets their own progress, settings, unlocks and friends.
  //   jack-of-all:profiles  → { active, list: [{ id, name, avatar, createdAt }] }
  //   jack-of-all:p:<id>    → that player's state
  // J.storage can be swapped for an in-memory store (the test suite does this).
  // ---------------------------------------------------------------------------
  J.storage = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* full or blocked */ } },
    remove: (k) => { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const LEGACY_KEY = 'jack-of-all:v1';
  const PROFILES_KEY = 'jack-of-all:profiles';
  const dataKey = (id) => 'jack-of-all:p:' + id;
  J.AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐢', '🐧', '🦉', '🐨', '🐵', '🚀', '⭐', '🌈', '🎸'];

  function readJSON(k) {
    try { return JSON.parse(J.storage.get(k)); } catch (e) { return null; }
  }

  J.profileIndex = function () {
    let idx = readJSON(PROFILES_KEY);
    if (!idx || !Array.isArray(idx.list)) {
      idx = { active: null, list: [] };
      // First run after profiles were added: the old single save becomes profile 1.
      const legacy = readJSON(LEGACY_KEY);
      if (legacy && legacy.settings && (legacy.settings.player || legacy.settings.band || legacy.daily)) {
        const id = 'p' + Date.now().toString(36);
        const isKid = legacy.settings.player === 'kid' || legacy.settings.band === 'gentle';
        idx.list.push({ id, name: (legacy.settings.name || '').trim() || 'Player 1', avatar: isKid ? '🧸' : '🦊', createdAt: Date.now() });
        idx.active = id;
        J.storage.set(dataKey(id), JSON.stringify(legacy));
        J.storage.set(PROFILES_KEY, JSON.stringify(idx));
      }
    }
    return idx;
  };
  const saveIndex = (idx) => J.storage.set(PROFILES_KEY, JSON.stringify(idx));

  J.profiles = () => J.profileIndex().list;
  J.activeProfile = () => {
    const idx = J.profileIndex();
    return idx.list.find((p) => p.id === idx.active) || null;
  };
  J.createProfile = function ({ name, avatar, player }) {
    const idx = J.profileIndex();
    const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    idx.list.push({ id, name: String(name || '').trim().slice(0, 24) || 'Player ' + (idx.list.length + 1), avatar: avatar || J.AVATARS[0], createdAt: Date.now() });
    idx.active = id;
    saveIndex(idx);
    J.storage.set(dataKey(id), JSON.stringify({ levelScale: 100, settings: { player: player || 'adult', tune: 'normal', helpers: true } }));
    return id;
  };
  J.switchProfile = function (id) {
    const idx = J.profileIndex();
    if (idx.list.some((p) => p.id === id)) {
      idx.active = id;
      saveIndex(idx);
    }
  };
  J.updateProfile = function (id, patch) {
    const idx = J.profileIndex();
    const p = idx.list.find((x) => x.id === id);
    if (!p) return;
    if (patch.name !== undefined) p.name = String(patch.name).trim().slice(0, 24) || p.name;
    if (patch.avatar) p.avatar = patch.avatar;
    saveIndex(idx);
  };
  J.deleteProfile = function (id) {
    const idx = J.profileIndex();
    idx.list = idx.list.filter((p) => p.id !== id);
    if (idx.active === id) idx.active = idx.list.length ? idx.list[0].id : null;
    saveIndex(idx);
    J.storage.remove(dataKey(id));
  };
  // Raw state of any profile (used for family leaderboards and backups).
  J.profileState = (id) => normalize(readJSON(dataKey(id)) || {});

  J.getState = function () {
    const p = J.activeProfile();
    const s = normalize(p ? readJSON(dataKey(p.id)) || {} : {});
    if (p) s.settings.name = p.name;
    return s;
  };

  function normalize(s) {
    s = s || {};
    s.settings = Object.assign({ player: null, tune: 'normal', name: '', helpers: true, locks: true, smart: true, sound: true, colorSafe: false }, s.settings);
    // Carry over the old Gentle / Standard / Challenging setting.
    if (!s.settings.player && s.settings.band) {
      const map = { gentle: ['kid', 'normal'], standard: ['adult', 'normal'], challenging: ['adult', 'harder'] }[s.settings.band];
      if (map) [s.settings.player, s.settings.tune] = map;
    }
    delete s.settings.band;
    s.daily = s.daily || {};
    s.practice = s.practice || {};
    s.seen = s.seen || {};
    s.friends = s.friends || {};
    s.form = s.form || {};
    s.badges = s.badges || {};
    s.stats = s.stats || {};
    const hadHistory = Object.keys(s.daily).length || Object.keys(s.practice).length || s.unlocked;
    if (!s.unlocked) s.unlocked = unlocksFromHistory(s);
    if (s.levelScale !== 100) {
      if (hadHistory) toHundredScale(s); // older 1–10 progress
      else s.levelScale = 100;
    }
    return s;
  }

  J.saveState = function (s) {
    const p = J.activeProfile();
    if (!p) return; // no player yet (welcome screen) — nothing to save
    J.storage.set(dataKey(p.id), JSON.stringify(s));
  };
  // Reset the ACTIVE player's progress (keeps the player and their name/avatar).
  J.resetState = function () {
    const p = J.activeProfile();
    if (!p) return;
    const keep = J.getState().settings;
    J.storage.set(dataKey(p.id), JSON.stringify({ levelScale: 100, settings: { player: keep.player, tune: 'normal' } }));
  };

  J.recordDaily = function (key, gameId, level, score) {
    const s = J.getState();
    const prev = s.daily[key];
    const attempts = (prev && prev.gameId === gameId ? prev.attempts : 0) + 1;
    const best = prev && prev.gameId === gameId ? Math.max(prev.score, score) : score;
    s.daily[key] = { gameId, level, score: best, last: score, attempts, ts: Date.now() };
    J.saveState(s);
    return s.daily[key];
  };

  J.recordPractice = function (gameId, level, score) {
    const s = J.getState();
    const p = (s.practice[gameId] = s.practice[gameId] || { plays: 0, best: {} });
    p.plays++;
    p.best[level] = Math.max(p.best[level] || 0, score);
    J.saveState(s);
  };

  J.streakOf = function (s, today) {
    let d = today;
    if (!s.daily[J.dateKey(d)]) d = J.addDays(d, -1);
    let n = 0;
    while (s.daily[J.dateKey(d)]) {
      n++;
      d = J.addDays(d, -1);
    }
    return n;
  };
  J.streak = (today) => J.streakOf(J.getState(), today);

  // Longest run of consecutive days ever played.
  J.longestStreak = function (s) {
    const days = Object.keys(s.daily).map((k) => Math.round(J.parseKey(k).getTime() / 86400000)).sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    days.forEach((d) => {
      run = prev !== null && d - prev === 1 ? run + 1 : d === prev ? run : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return best;
  };

  // ---------------------------------------------------------------------------
  // Uniqueness. Each game remembers (per device) the puzzles it has shown, so
  // nothing repeats — not within a round, and not across days or replays —
  // until a game has genuinely run out of new material.
  // ---------------------------------------------------------------------------
  const SEEN_MAX = 1500; // remembered puzzles per game

  J.seenHistory = function (gameId) {
    const list = (J.getState().seen[gameId] || []).slice();
    const set = new Set(list);
    return {
      has: (k) => set.has(k),
      add(k) {
        if (set.has(k)) list.splice(list.indexOf(k), 1);
        list.push(k);
        set.add(k);
      },
      // Forget keys matching a test (used when a pool is used up, oldest first).
      forget(test) {
        for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) {
          set.delete(list[i]);
          list.splice(i, 1);
        }
      },
      save() {
        const s = J.getState();
        s.seen[gameId] = list.slice(-SEEN_MAX);
        J.saveState(s);
      },
    };
  };

  // Generate an item whose key is new to this round AND to the player's history.
  // Falls back to "new to this round" if history makes that impossible.
  J.pickUnique = function (make, keyOf, round, hist, tries) {
    tries = tries || 120;
    let fallback = null, fbKey = null;
    for (let t = 0; t < tries; t++) {
      const item = make();
      const k = keyOf(item);
      if (round.has(k)) continue;
      if (!hist || !hist.has(k)) {
        round.add(k);
        if (hist) hist.add(k);
        return item;
      }
      if (!fallback) {
        fallback = item;
        fbKey = k;
      }
    }
    if (fallback) {
      round.add(fbKey);
      if (hist) hist.add(fbKey);
      return fallback;
    }
    throw new Error('pickUnique: could not find a puzzle new to this round');
  };

  // ---------------------------------------------------------------------------
  // Background work. J.background(task, payload, fallback) runs a task in the
  // worker (js/worker.js) and resolves with the result. Where workers aren't
  // available (e.g. opening index.html straight from disk) it runs `fallback`
  // on the main thread instead.
  // ---------------------------------------------------------------------------
  let worker = null, workerFailed = false, nextId = 1;
  const pending = new Map();
  J.background = function (task, payload, fallback) {
    const local = () => new Promise((res, rej) => setTimeout(() => { try { res(fallback()); } catch (e) { rej(e); } }, 30));
    if (typeof Worker === 'undefined' || workerFailed || !/^https?:$/.test(location.protocol) || typeof document === 'undefined') return local();
    try {
      if (!worker) {
        worker = new Worker('js/worker.js');
        worker.onmessage = (e) => {
          const p = pending.get(e.data.id);
          if (!p) return;
          pending.delete(e.data.id);
          e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result);
        };
        worker.onerror = () => {
          // Worker couldn't start — finish everything waiting on the main thread.
          workerFailed = true;
          pending.forEach((p) => p.retry());
          pending.clear();
        };
      }
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject, retry: () => local().then(resolve, reject) });
        worker.postMessage({ id, task, payload });
      });
    } catch (e) {
      workerFailed = true;
      return local();
    }
  };

  // ---------------------------------------------------------------------------
  // Small helpers shared by games.
  // ---------------------------------------------------------------------------
  J.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  J.fmtTime = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
  J.stars = (score) => (score >= 85 ? 3 : score >= 60 ? 2 : 1);
  J.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // A simple stopwatch bound to an element; returns {seconds(), stop()}.
  J.stopwatch = function (el) {
    const start = Date.now();
    let stopped = false;
    const tick = () => {
      if (el) el.textContent = J.fmtTime((Date.now() - start) / 1000);
    };
    tick();
    const id = setInterval(tick, 500);
    return {
      seconds: () => (Date.now() - start) / 1000,
      stop: () => {
        if (!stopped) {
          stopped = true;
          clearInterval(id);
        }
      },
    };
  };
})();
