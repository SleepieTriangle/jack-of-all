/* Jack of All — automated test suite. Open /tests/ in the running app, or run
   tests/run-tests.ps1 for a headless run. Everything runs on an in-memory store. */
(async function () {
  const J = window.JOA;
  const results = [];
  const list = document.getElementById('list');

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }
  const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg || 'not equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
  const fresh = () => {
    for (const k of Object.keys(__memory)) delete __memory[k];
  };

  const SKIP = { skip: true };
  async function test(name, fn) {
    const t0 = performance.now();
    let ok = true, err = '', skipped = false;
    try {
      fresh();
      await fn();
    } catch (e) {
      if (e === SKIP) skipped = true;
      else {
        ok = false;
        err = e && e.message ? e.message : String(e);
      }
    }
    results.push({ name, ok, err, skipped });
    const li = document.createElement('li');
    li.className = ok ? 'pass' : 'fail';
    li.innerHTML = `${skipped ? '⏭ (skipped here)' : ok ? '✔' : '✘'} ${name} <small>${Math.round(performance.now() - t0)}ms</small>${ok ? '' : `<br><small>${err.replace(/</g, '&lt;')}</small>`}`;
    list.appendChild(li);
  }

  const memHist = () => {
    const set = new Set();
    return { has: (k) => set.has(k), add: (k) => set.add(k), forget() {}, save() {} };
  };
  const newPlayer = (player) => J.createProfile({ name: 'Tester', avatar: '🦊', player: player || 'adult' });

  // ---------------------------------------------------------------- schedule
  await test('Schedule: weeks before the 15-game rotation are unchanged', () => {
    const cut = J.weekInfo(J.parseKey(J.ROTATION_V2_START)).weekIndex;
    eq([1, 2, 3, 4, 5].map((k) => J.gameForWeek(cut - 6 + k)), ['memory', 'sliding', 'colorClash', 'wordProblems', 'scramble'], 'old weeks moved');
  });
  await test('Schedule: every game once per 15 weeks, never twice in a row', () => {
    const cut = J.weekInfo(J.parseKey(J.ROTATION_V2_START)).weekIndex;
    const seq = [J.gameForWeek(cut - 1)];
    for (let w = cut; w < cut + 150; w++) seq.push(J.gameForWeek(w));
    for (let c = 0; c < 10; c++) eq(new Set(seq.slice(1 + c * 15, 16 + c * 15)).size, 15, `cycle ${c} incomplete`);
    seq.forEach((g, k) => k && assert(g !== seq[k - 1], `back-to-back at ${k}`));
  });

  // ---------------------------------------------------------------- levels
  await test('Levels: 1–2 are learning levels, 3 plays like 4, 10 is Master', () => {
    eq([1, 2, 3, 4, 9, 10].map(J.difficulty), [1, 2, 4, 5, 10, 11]);
    eq([J.levelTag(1), J.levelTag(2), J.levelTag(3), J.levelTag(10)], ['Learning', 'Learning', '', 'Master']);
  });
  await test('Levels: Kid ramp stays on learning levels most of the week', () => {
    const kid = [1, 2, 3, 4, 5, 6, 7].map((d) => J.levelFor(d, { player: 'kid', tune: 'normal' }));
    assert(kid.filter((l) => l <= 2).length >= 6, 'kid ramp too steep: ' + kid);
    eq([1, 2, 3, 4, 5, 6, 7].map((d) => J.levelFor(d, { player: 'adult', tune: 'normal' })), [2, 3, 4, 5, 6, 7, 8]);
  });

  // ---------------------------------------------------------------- profiles
  await test('Profiles: each player has separate progress', () => {
    const a = newPlayer('adult');
    J.recordDaily('2026-11-10', 'chess', 1, 90);
    const b = J.createProfile({ name: 'Kiddo', avatar: '🐼', player: 'kid' });
    eq(Object.keys(J.getState().daily).length, 0, 'new player sees old scores');
    eq(J.getState().settings.player, 'kid');
    J.switchProfile(a);
    eq(J.getState().daily['2026-11-10'].score, 90);
    J.deleteProfile(b);
    eq(J.profiles().length, 1);
  });
  await test('Profiles: an old single save becomes player 1', () => {
    __memory['jack-of-all:v1'] = JSON.stringify({ settings: { band: 'gentle', name: 'Ana' }, daily: { '2026-11-12': { gameId: 'scramble', level: 2, score: 75, attempts: 1 } } });
    const p = J.activeProfile();
    eq(p.name, 'Ana');
    eq(J.getState().settings.player, 'kid');
    eq(J.unlockedLevel('scramble'), 3, 'past pass not credited');
  });

  // ---------------------------------------------------------------- locks & smart difficulty
  await test('Locks: start at 1, passing unlocks the next level', () => {
    newPlayer();
    eq(J.unlockedLevel('sudoku'), 1);
    eq(J.recordPass('sudoku', 1, 59), null, 'a fail unlocked something');
    eq(J.recordPass('sudoku', 1, 70), 2);
    eq(J.unlockedLevel('sudoku'), 2);
    eq(J.playLevel('sudoku', 8), 2, 'daily went above unlocked');
  });
  await test('Smart: 90+ on your top level fast-tracks two levels', () => {
    newPlayer();
    eq(J.recordPass('chess', 1, 95), 3);
    assert(J.getState().stats.fastTracks === 1, 'fast track not counted');
  });
  await test('Smart: two fails in a row make the next day one level easier', () => {
    newPlayer();
    const s = J.getState();
    s.unlocked.memory = 5;
    J.saveState(s);
    eq(J.playLevel('memory', 6), 5);
    J.recordPass('memory', 5, 30);
    J.recordPass('memory', 5, 40);
    eq(J.playLevel('memory', 6), 4, 'did not ease off');
    J.recordPass('memory', 4, 80);
    eq(J.playLevel('memory', 6), 5, 'did not recover after a pass');
  });
  await test('Locks off: every level open; smart off: no fast track', () => {
    newPlayer();
    const s = J.getState();
    s.settings.locks = false;
    s.settings.smart = false;
    J.saveState(s);
    eq(J.unlockedLevel('chess'), 10);
    J.recordPass('patterns', 1, 99);
    eq(J.getState().unlocked.patterns, 2);
  });

  // ---------------------------------------------------------------- badges
  await test('Badges: earned from progress, each awarded once', () => {
    newPlayer();
    J.recordDaily('2026-11-15', 'chess', 3, 100); // a Sunday, perfect score
    const got = J.checkBadges().map((b) => b.id);
    ['first', 'perfect', 'boss'].forEach((id) => assert(got.includes(id), 'missing badge ' + id));
    eq(J.checkBadges().length, 0, 'badges awarded twice');
  });
  await test('Badges: longest streak counts consecutive days', () => {
    newPlayer();
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05'].forEach((k) => J.recordDaily(k, 'sudoku', 1, 70));
    eq(J.longestStreak(J.getState()), 3);
  });

  // ---------------------------------------------------------------- codes
  await test('Backup: a code restores a player exactly', async () => {
    const id = newPlayer();
    J.recordDaily('2026-11-11', 'memory', 2, 88);
    J.recordPass('memory', 2, 88);
    const code = await J.makeBackup(false);
    assert(/^JA1[zj]/.test(code), 'bad code prefix');
    fresh();
    const players = await J.readBackup(code);
    J.restorePlayers(players);
    J.switchProfile(id);
    eq(J.getState().daily['2026-11-11'].score, 88);
    eq(J.unlockedLevel('memory'), 3);
  });
  await test('Friends: code round trip + adding updates instead of duplicating', async () => {
    newPlayer();
    J.recordDaily(J.dateKey(J.today()), 'chess', 1, 77);
    const code = await J.makeFriendCode();
    const card = await J.readFriendCode('https://example.test/#/friend/' + code); // links work too
    eq(card.scores.filter((x) => x === 77).length, 1);
    J.createProfile({ name: 'Other', avatar: '🐼', player: 'adult' });
    assert(J.addFriend(card) === true, 'not added');
    assert(J.addFriend(card) === false, 'duplicated');
    eq(Object.keys(J.getState().friends).length, 1);
  });
  await test('Friends: a player on this device and their friend code share one id', async () => {
    const a = newPlayer();
    const code = await J.makeFriendCode();
    J.createProfile({ name: 'Other', avatar: '🐼', player: 'adult' });
    const fromCode = await J.readFriendCode(code);
    const onDevice = J.scorecard(J.profiles().find((p) => p.id === a));
    eq(onDevice.id, fromCode.id, 'leaderboard would show this player twice');
  });
  await test('Friends: your own code is refused', async () => {
    newPlayer();
    const card = await J.readFriendCode(await J.makeFriendCode());
    let threw = false;
    try { J.addFriend(card); } catch (e) { threw = true; }
    assert(threw, 'own code accepted');
  });
  await test('Friends: untrusted codes are cleaned', async () => {
    const evil = await J.encodeCode({ t: 'friend', v: 1, card: { id: 'x<y>"z', name: '<img src=x onerror=alert(1)>'.repeat(3), avatar: '<b>', streak: 1e9, scores: [500, -3, 'a', null], levels: { chess: 99 } } });
    const c = await J.readFriendCode(evil);
    assert(c.name.length <= 24, 'name not truncated');
    assert(!/[<>"]/.test(c.id), 'id not cleaned');
    eq(c.avatar, '🙂');
    eq(c.scores, [100, 0, 0, null]);
    eq(c.levels.chess, 10);
    assert(c.streak <= 100000, 'streak not clamped');
  });
  await test('Codes: garbage is rejected with a friendly message', async () => {
    let msg = '';
    try { await J.readFriendCode('hello'); } catch (e) { msg = e.message; }
    assert(/doesn't look like/.test(msg), 'unexpected: ' + msg);
  });

  // ---------------------------------------------------------------- game content
  await test('Chess: move generator is correct (perft 3 = 8,902)', () => {
    const C = J._chess;
    const perft = (s, d) => (d ? C.legal(s).reduce((n, m) => n + perft(C.make(s, m), d - 1), 0) : 1);
    eq(perft(C.initial(), 3), 8902);
  });
  await test('Chess: a pawn can become a knight (player\'s choice)', () => {
    const C = J._chess;
    const s = { b: Array(64).fill(null), turn: 'w', castle: { K: false, Q: false, k: false, q: false }, ep: -1, half: 0 };
    s.b[8] = 'P'; s.b[60] = 'K'; s.b[7] = 'k';
    const m = C.legal(s).find((x) => x.from === 8 && x.to === 0);
    assert(m && m.promo, 'no promotion move');
    eq(C.make(s, Object.assign({}, m, { promo: 'n' })).b[0], 'N');
    eq(C.make(s, m).b[0], 'Q', 'computer default is a queen');
  });
  await test('Sudoku: every level gives one unique solution', () => {
    [46, 34, 24, 22].forEach((clues, k) => {
      const g = J._sudoku.generate(J.makeRng('t' + k), clues);
      eq(J._sudoku.solve(g.puzzle.slice(), 2), 1, `clues ${clues} not unique`);
    });
  });
  await test('Word Problems: 8 valid, unique questions at every difficulty', () => {
    for (let L = 1; L <= 11; L++) for (let s = 0; s < 25; s++) {
      const qs = J._wordProblems.makeSet(J.makeRng(`wp${L}:${s}`), L, 8, null);
      eq(qs.length, 8, `L${L} short round`);
      eq(new Set(qs.map((q) => q.prompt + (q.visual || ''))).size, 8, `L${L} duplicate`);
      qs.forEach((q) => {
        if (q.kind === 'input') assert(Number.isFinite(q.a) && q.a >= 0, `L${L} bad answer in ${q.style}`);
        else eq(q.options.filter((o) => o.correct).length, 1, `L${L} ${q.style} needs exactly one right option`);
      });
    }
  });
  await test('Patterns: no repeated puzzle within a round, any difficulty', () => {
    for (let L = 1; L <= 11; L++) for (let s = 0; s < 40; s++) {
      const ps = J._patterns.makeRound(J.makeRng(`p${L}:${s}`), L, 10, memHist());
      eq(new Set(ps.map((p) => p.key)).size, 10, `L${L} repeat`);
      ps.forEach((p) => assert(p.options.includes(p.answer), 'answer missing from options'));
    }
  });
  await test('Word Scramble: one answer per word, a clue for every beginner word', () => {
    const all = Object.values(J._scramble.WORDS).flat();
    const sig = (w) => w.split('').sort().join('');
    eq(new Set(all.map(sig)).size, all.length, 'two words share letters');
    [...J._scramble.WORDS[4], ...J._scramble.WORDS[5]].forEach((w) => assert(J._scramble.CLUES[w], 'no clue for ' + w));
  });
  await test('Odd Word Out: no word in two groups; one odd word per set', () => {
    const where = {};
    Object.entries(J._oddWord.CATS).forEach(([id, [, ws]]) => ws.split(' ').forEach((w) => (where[w.toLowerCase()] = (where[w.toLowerCase()] || 0) + 1)));
    eq(Object.entries(where).filter(([, n]) => n > 1), [], 'shared words');
    for (let L = 1; L <= 11; L++) for (let s = 0; s < 30; s++) {
      const q = J._oddWord.question(J.makeRng(`ow${L}:${s}`), L, s % 2 === 0);
      assert(!J._oddWord.CATS[q.a][1].split(' ').includes(q.odd), 'odd word belongs to the group');
    }
  });
  await test('Shape Spin: "same" is always a turn, "mirror" never is', () => {
    const S = J._shapeSpin;
    for (let L = 1; L <= 11; L++) for (let s = 0; s < 40; s++) {
      const p = S.puzzle(J.makeRng(`ss${L}:${s}`), L);
      const same = S.canon(p.b) === S.canon(p.a);
      assert(p.isMirror ? !same : same, `L${L} mislabeled`);
    }
  });
  await test('Quick Math: whole-number answers; never negative in Kid mode', () => {
    for (let L = 1; L <= 11; L++) {
      const g = J._quickMath.gen(J.makeRng('qm' + L), L, true);
      for (let s = 0; s < 400; s++) {
        const [t, a] = g();
        assert(Number.isInteger(a) && a >= 0 && !/-\d/.test(t), `L${L}: ${t} = ${a}`);
      }
    }
  });
  await test('Number Hunt: every grid holds exactly its items', () => {
    for (let L = 1; L <= 11; L++) {
      const c = J._numberHunt.sequence(L);
      eq(c.order.length, c.n * c.n, `L${L}`);
    }
  });

  // ---------------------------------------------------------------- every game loads
  await test('Every game loads at every level (15 games × 11 difficulties)', async () => {
    newPlayer();
    const box = document.getElementById('scratch');
    for (const id of J.gameIds()) for (let L = 1; L <= 11; L++) {
      let ctrl;
      try {
        ctrl = J.games[id].mount(box, { seed: `t:${id}:${L}`, rng: J.makeRng(`t:${id}:${L}`), level: L, displayLevel: L, kid: L % 2 === 0, helpers: L <= 2, finish() {} });
        const start = box.querySelector('.start');
        if (start) start.click();
        if (id === 'sudoku') await new Promise((r) => setTimeout(r, 900));
        assert(!/undefined|NaN/.test(box.innerText), 'shows undefined/NaN');
        assert(box.innerText.trim().length > 0, 'renders nothing');
      } catch (e) {
        throw new Error(`${id} at difficulty ${L}: ${e.message}`);
      } finally {
        const c = typeof ctrl === 'function' ? ctrl : ctrl && ctrl.cleanup;
        if (c) c();
        box.innerHTML = '';
      }
    }
  });

  // ---------------------------------------------------------------- background worker
  await test('Background worker answers chess and sudoku requests', async () => {
    // Headless runs fast-forward time, which background workers don't support:
    // this test runs in a normal browser (open /tests/).
    if (/headless/.test(location.search)) throw SKIP;
    if (typeof Worker === 'undefined' || !/^https?:$/.test(location.protocol)) throw SKIP;
    const w = new Worker('../js/worker.js');
    const ask = (task, payload) => new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`worker did not answer "${task}" within 15s`)), 15000);
      w.onmessage = (e) => {
        clearTimeout(timer);
        e.data.error ? rej(new Error(e.data.error)) : res(e.data.result);
      };
      w.onerror = (e) => {
        clearTimeout(timer);
        rej(new Error('worker failed to start: ' + (e.message || 'unknown error')));
      };
      w.postMessage({ id: 1, task, payload });
    });
    const s = J._chess.initial();
    const m = await ask('chessMove', { state: s, level: 3, seed: 'w' });
    assert(J._chess.legal(s).some((x) => x.from === m.from && x.to === m.to), 'illegal move from worker');
    const g = await ask('sudoku', { clues: 30, seed: 'w' });
    eq(J._sudoku.solve(g.puzzle.slice(), 2), 1, 'worker sudoku not unique');
    w.terminate();
  });

  // ---------------------------------------------------------------- summary
  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped).length;
  const summary = `RESULT: ${results.length - failed.length - skipped} passed, ${failed.length} failed${skipped ? `, ${skipped} skipped` : ''}`;
  const el = document.getElementById('summary');
  el.textContent = summary;
  el.className = failed.length ? 'fail' : 'pass';
  document.getElementById('result').textContent = summary + '\n' + failed.map((f) => `FAILED: ${f.name} — ${f.err}`).join('\n');
  document.title = summary;
  window.__testsDone = { passed: results.length - failed.length, failed: failed.length, results };
})();
