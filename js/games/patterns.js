/* Pattern Recognition — Patterns. Picture patterns for young players, then
   number sequences with increasingly subtle rules (and hidden middle terms). */
(function () {
  const J = window.JOA;

  const SYMBOL_SETS = [
    ['🔴', '🔵', '🟢', '🟡', '🟣'],
    ['🐶', '🐱', '🐭', '🐰', '🦊'],
    ['⭐', '🌙', '☀️', '☁️', '⚡'],
    ['🍎', '🍌', '🍇', '🍓', '🍊'],
    ['▲', '●', '■', '◆', '★'],
    ['❤️', '💙', '💚', '💛', '💜'],
    ['🚗', '🚌', '🚲', '🚀', '⛵'],
    ['⚽', '🏀', '🎾', '🏈', '⚾'],
    ['🌸', '🌻', '🍀', '🌵', '🍁'],
    ['🐟', '🐙', '🐢', '🦀', '🐳'],
  ];
  // Repeating units (AB, AAB, AABB, ABB, ABC, …) — earlier ones are easier.
  const UNITS = [[0, 1], [0, 0, 1], [0, 0, 1, 1], [0, 1, 1], [0, 1, 2], [0, 1, 2, 3], [0, 0, 1, 2], [0, 1, 0, 2], [0, 1, 2, 1], [0, 1, 1, 2, 2]];

  function picture(r, L) {
    const si = r.int(0, SYMBOL_SETS.length - 1);
    const set = SYMBOL_SETS[si];
    const units = L <= 1 ? UNITS.slice(0, 3) : L <= 2 ? UNITS.slice(0, 5) : UNITS;
    const unit = r.pick(units);
    const syms = r.shuffle(set).slice(0, Math.max(...unit) + 1);
    const len = r.int(Math.max(6, unit.length * 2), unit.length * 2 + 3);
    const seq = [];
    for (let i = 0; i <= len; i++) seq.push(syms[unit[i % unit.length]]);
    const answer = seq.pop();
    const options = r.shuffle([answer, ...set.filter((s) => s !== answer).slice(0, 3)]);
    // Key ignores length and symbol order: 🔴🔵🔴🔵 and 🔵🔴🔵🔴 count as the same puzzle.
    const key = `pic|${si}|${unit.join('')}|${syms.slice().sort().join('')}`;
    return { seq, answer, options, rule: `The pattern repeats: ${unit.map((u) => syms[u]).join(' ')}`, pic: true, unitLen: unit.length, key };
  }

  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

  // [minL, maxL, fn(r, L) -> {nums, rule}]
  const GENS = [
    [2, 6, (r, L) => {
      const s = r.int(1, 20), d = r.int(2, 2 + L);
      return { nums: Array.from({ length: 6 }, (_, i) => s + i * d), rule: `Add ${d} each time.` };
    }],
    [2, 7, (r) => {
      const s = r.int(50, 99), d = r.int(3, 9);
      return { nums: Array.from({ length: 6 }, (_, i) => s - i * d), rule: `Subtract ${d} each time.` };
    }],
    [3, 9, (r) => {
      const s = r.int(1, 5), k = r.pick([2, 2, 3]);
      return { nums: Array.from({ length: 6 }, (_, i) => s * k ** i), rule: `Multiply by ${k} each time.` };
    }],
    [4, 9, (r) => {
      const s = r.int(1, 15), d0 = r.int(1, 4);
      const nums = [s];
      for (let i = 0; i < 5; i++) nums.push(nums[i] + d0 + i);
      return { nums, rule: `The gap grows by 1: +${d0}, +${d0 + 1}, +${d0 + 2}…` };
    }],
    [4, 10, (r) => {
      const s = r.int(10, 30), a = r.int(3, 9), b = r.int(1, a - 1);
      const nums = [s];
      for (let i = 0; i < 6; i++) nums.push(nums[i] + (i % 2 ? -b : a));
      return { nums, rule: `Alternate: add ${a}, then subtract ${b}.` };
    }],
    [5, 10, (r, L) => {
      const k = r.int(1, 5), c = L >= 8 ? r.int(-3, 3) : 0;
      return { nums: Array.from({ length: 6 }, (_, i) => (k + i) ** 2 + c), rule: `Square numbers${c ? (c > 0 ? ' plus ' + c : ' minus ' + -c) : ''}: ${k}², ${k + 1}², ${k + 2}²…` };
    }],
    [5, 10, (r) => {
      const a = r.int(1, 5), b = r.int(a, 8);
      const nums = [a, b];
      for (let i = 2; i < 7; i++) nums.push(nums[i - 1] + nums[i - 2]);
      return { nums, rule: 'Each number is the sum of the two before it.' };
    }],
    [6, 10, (r) => {
      const st = r.int(0, PRIMES.length - 7);
      return { nums: PRIMES.slice(st, st + 6), rule: 'Prime numbers — only divisible by 1 and themselves.' };
    }],
    [7, 10, (r) => {
      const s = r.int(1, 5), m = r.pick([2, 3]), c = r.pick([-1, 1, 2]);
      const nums = [s];
      for (let i = 0; i < 5; i++) nums.push(nums[i] * m + c);
      return { nums, rule: `Multiply by ${m}, then ${c > 0 ? 'add ' + c : 'subtract ' + -c}.` };
    }],
    [7, 10, (r) => {
      const a = r.int(1, 10), da = r.int(2, 5), b = r.int(20, 40), db = r.int(-4, 4) || 3;
      const nums = [];
      for (let i = 0; i < 7; i++) nums.push(i % 2 ? b + ((i - 1) / 2) * db : a + (i / 2) * da);
      return { nums, rule: `Two sequences take turns: one adds ${da}, the other ${db >= 0 ? 'adds ' + db : 'subtracts ' + -db}.` };
    }],
    [8, 10, (r) => {
      const k = r.int(1, 4);
      return { nums: Array.from({ length: 5 }, (_, i) => (k + i) ** 3), rule: `Cube numbers: ${k}³, ${k + 1}³, ${k + 2}³…` };
    }],
    [8, 10, (r) => {
      const s = r.int(1, 10), d0 = r.int(1, 5), dd = r.int(2, 4);
      const nums = [s];
      for (let i = 0; i < 5; i++) nums.push(nums[i] + d0 + i * dd);
      return { nums, rule: `The gaps grow by ${dd}: +${d0}, +${d0 + dd}, +${d0 + 2 * dd}…` };
    }],
    [9, 10, (r) => {
      const s = r.int(2, 6);
      const nums = [s];
      for (let i = 1; i < 6; i++) nums.push(nums[i - 1] * (i + 1));
      return { nums, rule: 'Multiply by 2, then 3, then 4, then 5…' };
    }],
  ];

  // Indexes of the number-rule generators available at a level.
  // Master (11) uses the top-level rule types, with the bigger numbers that come from L.
  const gensFor = (L) => GENS.map((g, k) => k).filter((k) => Math.min(L, 10) >= GENS[k][0] && Math.min(L, 10) <= GENS[k][1]);

  // `gi` picks a specific rule type (so a round can rotate through them).
  function numeric(r, L, gi) {
    const avail = gensFor(L);
    const g = gi !== undefined && avail.includes(gi) ? gi : r.pick(avail);
    const { nums, rule } = GENS[g][2](r, L);
    let idx = nums.length - 1;
    if (L >= 8 && r.chance(0.35)) idx = r.int(2, nums.length - 2);
    const answer = nums[idx];
    const seq = nums.map((n, i) => (i === idx ? '?' : String(n)));
    const gap = Math.max(1, Math.abs(nums[1] - nums[0]));
    const cands = new Set();
    for (const d of r.shuffle([1, -1, 2, -2, gap, -gap, gap + 1, 10, -10, 3])) {
      if (cands.size >= 3) break;
      const v = answer + d;
      if (v !== answer && !nums.includes(v)) cands.add(v);
    }
    const options = r.shuffle([answer, ...cands].map(String));
    // Key = the visible numbers. Same numbers = same puzzle, wherever the gap is.
    return { seq, answer: String(answer), options, rule, key: `num|${nums.join(',')}` };
  }

  // Build a round of puzzles: every one new to this round and (when possible)
  // new to this player, with number rules rotated so the same rule type isn't
  // used twice in a row.
  function makeRound(rng, level, count, hist) {
    const round = new Set();
    let rulePool = [];
    const out = [];
    for (let k = 0; k < count; k++) {
      const pic = level <= 2 || (level <= 4 && k % 2 === 0);
      if (pic) {
        out.push(J.pickUnique(() => picture(rng, level), (p) => p.key, round, hist));
      } else {
        const L = Math.max(level, 2);
        if (!rulePool.length) rulePool = rng.shuffle(gensFor(L));
        const gi = rulePool.pop();
        // Try this rule type first; if it has nothing new left, any rule type will do.
        let p;
        try {
          p = J.pickUnique(() => numeric(rng, L, gi), (x) => x.key, round, hist, 40);
        } catch (e) {
          p = J.pickUnique(() => numeric(rng, L), (x) => x.key, round, hist);
        }
        out.push(p);
      }
    }
    return out;
  }

  J.register({
    id: 'patterns',
    name: 'Pattern Spotter',
    icon: '🧩',
    skill: 'Patterns',
    color: '#e5862d',
    tagline: 'Crack the hidden rule and find what comes next.',
    why: 'Spotting rules in sequences is the core of fluid intelligence — it powers learning, math and problem-solving.',
    howTo: 'Look at the sequence, figure out the rule, and choose what goes in the <b>?</b> spot. At higher levels the missing piece can be in the middle. 10 puzzles per round — a quick streak bonus for fast answers.',
    helpers: [
      'The pattern is <b>split into its repeating groups</b> so the rule is easier to see.',
      '<b>Remove 2 wrong answers</b> when you are stuck.',
      'If you pick wrong, you get <b>one more try</b> (worth half points).',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const COUNT = 10;
      const hist = J.seenHistory('patterns');
      const puzzles = makeRound(rng, level, COUNT, hist);
      hist.save();
      let i = 0, correct = 0, right = 0;
      const watch = J.stopwatch(null);

      function syncHelpers() {
        const p = puzzles[i];
        const seqEl = root.querySelector('.seq');
        if (seqEl) seqEl.classList.toggle('grouped', helpers && !!p.unitLen);
        const b = root.querySelector('.fifty');
        if (b) b.hidden = !helpers;
        const tip = root.querySelector('.pat-tip');
        if (tip) tip.hidden = !(helpers && p.unitLen);
      }

      function show() {
        const p = puzzles[i];
        let retried = false;
        const items = p.seq.map((x, k) => {
          const end = p.unitLen && (k + 1) % p.unitLen === 0;
          return `<div class="seq-item ${x === '?' ? 'q' : ''} ${end ? 'unit-end' : ''}">${x}</div>`;
        });
        root.innerHTML = `
          <div class="g-bar"><span>Puzzle ${i + 1} of ${COUNT}</span><span class="muted">✅ ${right}</span></div>
          <div class="g-progress"><i style="width:${(i / COUNT) * 100}%"></i></div>
          <div class="g-center">
            <p class="g-question">What goes in the <b>?</b></p>
            <div class="seq">${items.join('')}${p.seq.includes('?') ? '' : '<div class="seq-item q">?</div>'}</div>
            ${p.unitLen ? `<div class="helper-tip pat-tip" style="margin:-8px 0 16px">The same group of ${p.unitLen} repeats. What comes next in the group?</div>` : ''}
            <div class="choices">${p.options.map((o) => `<button class="choice" data-v="${o}">${o}</button>`).join('')}</div>
            <div class="btn-row" style="justify-content:center"><button class="btn ghost small fifty">✂️ Remove 2 wrong answers</button></div>
            <div class="g-msg"></div>
            <div class="fb"></div>
          </div>`;
        syncHelpers();
        root.querySelector('.fifty').addEventListener('click', (e) => {
          const wrong = [...root.querySelectorAll('.choice:not(:disabled)')].filter((c) => c.dataset.v !== p.answer);
          rng.shuffle(wrong).slice(0, 2).forEach((c) => (c.style.visibility = 'hidden'));
          e.target.remove();
        });
        root.querySelectorAll('.choice').forEach((b) =>
          b.addEventListener('click', () => {
            const ok = b.dataset.v === p.answer;
            if (!ok && helpers && !retried) {
              retried = true;
              b.disabled = true;
              b.classList.add('wrongpick');
              const m = root.querySelector('.g-msg');
              m.className = 'g-msg bad';
              m.textContent = 'Not that one — try again!';
              return;
            }
            if (ok) {
              right++;
              correct += retried ? 0.5 : 1;
            }
            root.querySelector('.g-msg').textContent = '';
            const f = root.querySelector('.fifty');
            if (f) f.remove();
            root.querySelectorAll('.choice').forEach((c) => {
              c.disabled = true;
              if (c.dataset.v === p.answer) c.classList.add('right');
            });
            if (!ok) b.classList.add('wrongpick');
            const q = root.querySelector('.seq-item.q');
            q.textContent = p.answer;
            root.querySelector('.fb').innerHTML = `
              <div class="g-feedback ${ok ? 'good' : 'bad'}"><b>${ok ? 'Nice spot! 🎯' : 'Not this time.'}</b> <span class="muted">${p.rule}</span></div>
              <div class="btn-row" style="justify-content:center"><button class="btn next">${i + 1 < COUNT ? 'Next →' : 'Finish'}</button></div>`;
            const next = root.querySelector('.next');
            next.focus();
            next.addEventListener('click', () => {
              i++;
              if (i < COUNT) return show();
              watch.stop();
              const secs = watch.seconds();
              const speedBonus = correct >= COUNT * 0.7 && secs < COUNT * 12 ? 5 : 0;
              finish((correct / COUNT) * 95 + speedBonus, `${right} of ${COUNT} correct in ${J.fmtTime(secs)}.${speedBonus ? ' Speed bonus +5!' : ''}`);
            });
          })
        );
      }
      show();
      return {
        cleanup: () => watch.stop(),
        setHelpers(on) {
          helpers = on;
          syncHelpers();
        },
      };
    },
  });

  J._patterns = { picture, numeric, makeRound };
})();
