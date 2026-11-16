/* Word Problems — Reasoning. A round mixes many question STYLES (type the
   answer, pick the math, read a chart, shop from a menu, tell the time, spot
   the mistake, find the better deal…) so no two questions feel the same.
   Everything is generated fresh; styles unlock as levels rise. */
(function () {
  const J = window.JOA;

  const NAMES = ['Maya', 'Leo', 'Aisha', 'Ben', 'Sofia', 'Omar', 'Grace', 'Kenji', 'Lucia', 'Noah', 'Priya', 'Sam', 'Zoe', 'Diego', 'Hana', 'Eli', 'Nora', 'Theo'];
  const ITEMS = ['apples', 'stickers', 'marbles', 'cookies', 'shells', 'crayons', 'stamps', 'cards', 'beads', 'pencils'];
  const round2 = (n) => Math.round(n * 100) / 100;
  const fmt = (n) => (Number.isInteger(n) ? String(n) : String(round2(n)));
  const money = (n) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  const big = (n) => n.toLocaleString('en-US');
  const evalExpr = (s) =>
    Function('"use strict";return (' + s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-') + ')')();

  // ===========================================================================
  // Story templates: [minLevel, maxLevel, fn(rng, L) -> {q, a, e, expr?, op?}]
  //   expr = the number sentence that solves it, op = the single operation used
  // ===========================================================================
  const T = [
    [1, 3, (r, L) => {
      const n = r.pick(NAMES), it = r.pick(ITEMS), a = r.int(2, 4 + L * 4), b = r.int(2, 3 + L * 3);
      return { q: `${n} has ${a} ${it}. A friend gives ${n} ${b} more. How many ${it} does ${n} have now?`, a: a + b, e: `${a} + ${b} = ${a + b}`, expr: `${a} + ${b}`, op: '+' };
    }],
    [1, 3, (r, L) => {
      const n = r.pick(NAMES), it = r.pick(ITEMS), a = r.int(8, 10 + L * 6), b = r.int(1, a - 2);
      return { q: `${n} had ${a} ${it} and gave away ${b}. How many are left?`, a: a - b, e: `${a} − ${b} = ${a - b}`, expr: `${a} − ${b}`, op: '−' };
    }],
    [2, 4, (r, L) => {
      const a = r.int(2, 3 + L), b = r.int(2, 4 + L), it = r.pick(ITEMS);
      return { q: `There are ${a} boxes with ${b} ${it} in each box. How many ${it} are there altogether?`, a: a * b, e: `${a} × ${b} = ${a * b}`, expr: `${a} × ${b}`, op: '×' };
    }],
    [2, 5, (r, L) => {
      const k = r.int(2, 3 + L), each = r.int(2, 4 + L), it = r.pick(ITEMS);
      return { q: `${k * each} ${it} are shared equally among ${k} friends. How many does each friend get?`, a: each, e: `${k * each} ÷ ${k} = ${each}`, expr: `${k * each} ÷ ${k}`, op: '÷' };
    }],
    [3, 6, (r, L) => {
      const n = r.pick(NAMES), qn = r.int(2, 5), p = r.int(2, 4 + L), bill = [20, 50, 100].find((x) => x > qn * p) || 100;
      return { q: `${n} buys ${qn} notebooks that cost ${money(p)} each and pays with a ${money(bill)} bill. How much change should ${n} get, in dollars?`, a: bill - qn * p, e: `${qn} × ${money(p)} = ${money(qn * p)}; ${money(bill)} − ${money(qn * p)} = ${money(bill - qn * p)}`, expr: `${bill} − ${qn} × ${p}` };
    }],
    [3, 6, (r, L) => {
      const n = r.pick(NAMES), p = r.int(5, 10 + L * 3), d = r.int(3, 6 + L);
      return { q: `${n} reads ${p} pages every day. How many days will it take to finish a ${p * d}-page book?`, a: d, e: `${p * d} ÷ ${p} = ${d} days`, expr: `${p * d} ÷ ${p}`, op: '÷' };
    }],
    [4, 7, (r, L) => {
      const n = r.pick(NAMES), a = r.int(5, 20), bags = r.int(2, 5), per = r.int(3, 4 + L), give = r.int(2, a);
      const ans = a + bags * per - give;
      return { q: `${n} has ${a} marbles, buys ${bags} bags with ${per} marbles each, then gives ${give} to a friend. How many marbles does ${n} have now?`, a: ans, e: `${a} + ${bags}×${per} − ${give} = ${a} + ${bags * per} − ${give} = ${ans}`, expr: `${a} + ${bags} × ${per} − ${give}` };
    }],
    [4, 7, (r, L) => {
      const l = r.int(4, 6 + L * 2), w = r.int(3, l - 1);
      if (L >= 5 && r.chance(0.5)) return { q: `A rectangular garden is ${l} m long and ${w} m wide. What is its area in square meters?`, a: l * w, e: `Area = length × width = ${l} × ${w} = ${l * w} m²`, expr: `${l} × ${w}`, op: '×' };
      return { q: `A rectangular garden is ${l} m long and ${w} m wide. How many meters of fence go all the way around it?`, a: 2 * (l + w), e: `Perimeter = 2 × (${l} + ${w}) = ${2 * (l + w)} m`, expr: `2 × (${l} + ${w})` };
    }],
    [5, 8, (r, L) => {
      const s = r.int(3, 8) * 4, half = L >= 7 && r.chance(0.6), t = r.int(1, 4) + (half ? 0.5 : 0);
      return { q: `A cyclist rides at ${s} km per hour for ${t} hours. How many kilometers does the cyclist travel?`, a: s * t, e: `Distance = speed × time = ${s} × ${t} = ${s * t} km`, expr: `${s} × ${t}`, op: '×' };
    }],
    [5, 8, (r) => {
      const p = r.int(2, 15) * 20, x = r.pick([10, 15, 20, 25, 30, 40, 50, 75]);
      const ans = p - (p * x) / 100;
      return { q: `A jacket costs ${money(p)}. It is on sale for ${x}% off. What is the sale price, in dollars?`, a: ans, e: `${x}% of ${money(p)} = ${money((p * x) / 100)}; ${money(p)} − ${money((p * x) / 100)} = ${money(ans)}`, expr: `${p} − ${p} × ${x} ÷ 100` };
    }],
    [5, 9, (r) => {
      const a = r.pick(NAMES), b = r.pick(NAMES.filter((x) => x !== a));
      const x = r.int(3, 12), k = r.int(2, 4), y = r.int(2, 10), S = (k + 1) * x + 2 * y;
      return { q: `${a} is ${k} times as old as ${b}. In ${y} years, their ages will add up to ${S}. How old is ${b} now?`, a: x, e: `Let ${b} = x, ${a} = ${k}x. In ${y} years: (x+${y}) + (${k}x+${y}) = ${S} → ${k + 1}x = ${S - 2 * y} → x = ${x}` };
    }],
    [6, 9, (r) => {
      const p = r.int(1, 5), q = r.int(p + 1, 7), m = r.int(3, 12), T = (p + q) * m;
      return { q: `A jar holds red and blue marbles in the ratio ${p} : ${q}. There are ${T} marbles in total. How many are blue?`, a: q * m, e: `${p} + ${q} = ${p + q} parts; ${T} ÷ ${p + q} = ${m} per part; blue = ${q} × ${m} = ${q * m}`, expr: `${T} ÷ ${p + q} × ${q}` };
    }],
    [6, 10, (r) => {
      const n = r.pick(NAMES), s = [r.int(60, 100), r.int(60, 100), r.int(60, 100)];
      let need = r.int(60, 96);
      const total = s[0] + s[1] + s[2] + need;
      need += (4 - (total % 4)) % 4;
      const avg = (s[0] + s[1] + s[2] + need) / 4;
      return { q: `${n} scored ${s[0]}, ${s[1]} and ${s[2]} on three tests. What score does ${n} need on the fourth test to average exactly ${avg}?`, a: need, e: `Total needed = 4 × ${avg} = ${4 * avg}; ${4 * avg} − (${s[0]} + ${s[1]} + ${s[2]}) = ${need}`, expr: `4 × ${avg} − ${s[0]} − ${s[1]} − ${s[2]}` };
    }],
    [7, 10, (r) => {
      const [a, b, t] = r.pick([[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [2, 6, 1.5], [6, 3, 2], [5, 20, 4], [9, 18, 6]]);
      const x = r.pick(NAMES), y = r.pick(NAMES.filter((n) => n !== x));
      return { q: `${x} can paint a fence alone in ${a} hours. ${y} can paint it alone in ${b} hours. Working together, how many hours will it take?`, a: t, e: `Together they paint 1/${a} + 1/${b} = ${(1 / t).toFixed(3).replace(/0+$/, '')} of the fence per hour → ${t} hours` };
    }],
    [7, 10, (r) => {
      const hi = r.int(20, 90), lo = r.int(5, hi - 3);
      return { q: `Two numbers add up to ${hi + lo} and their difference is ${hi - lo}. What is the larger number?`, a: hi, e: `Larger = (sum + difference) ÷ 2 = (${hi + lo} + ${hi - lo}) ÷ 2 = ${hi}`, expr: `(${hi + lo} + ${hi - lo}) ÷ 2` };
    }],
    [8, 10, (r) => {
      const even = r.chance(0.5);
      let start = r.int(5, 60);
      if ((start % 2 === 0) !== even) start++;
      const sum = 3 * start + 6;
      return { q: `The sum of three consecutive ${even ? 'even' : 'odd'} numbers is ${sum}. What is the smallest of them?`, a: start, e: `n + (n+2) + (n+4) = ${sum} → 3n + 6 = ${sum} → n = ${start}`, expr: `(${sum} − 6) ÷ 3` };
    }],
    [8, 10, (r) => {
      const P = r.int(1, 9) * 100, x = r.pick([10, 20]);
      const up = (P * (100 + x)) / 100, final = (up * (100 - x)) / 100;
      return { q: `A bike costs ${money(P)}. Its price rises by ${x}%, then the new price falls by ${x}%. What is the final price, in dollars?`, a: final, e: `${money(P)} + ${x}% = ${money(up)}; ${money(up)} − ${x}% = ${money(final)} (not back to the start!)` };
    }],
    [9, 10, (r) => {
      const n = r.int(5, 14);
      return { q: `At a party, ${n} people each shake hands with every other person exactly once. How many handshakes happen?`, a: (n * (n - 1)) / 2, e: `${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}`, expr: `${n} × ${n - 1} ÷ 2` };
    }],
    [1, 3, (r, L) => {
      const a = r.pick(NAMES), b = r.pick(NAMES.filter((x) => x !== a)), it = r.pick(ITEMS);
      const small = r.int(2, 4 + L * 3), bigN = small + r.int(2, 3 + L * 3);
      return { q: `${a} has ${bigN} ${it}. ${b} has ${small} ${it}. How many more ${it} does ${a} have than ${b}?`, a: bigN - small, e: `${bigN} − ${small} = ${bigN - small}`, expr: `${bigN} − ${small}`, op: '−' };
    }],
    [1, 3, (r, L) => {
      const a = r.pick(NAMES), b = r.pick(NAMES.filter((x) => x !== a)), it = r.pick(ITEMS), n = r.int(2, 3 + L * 3);
      return { q: `${a} has ${n} ${it}. ${b} has twice as many. How many ${it} does ${b} have?`, a: n * 2, e: `Twice ${n} = ${n} + ${n} = ${n * 2}`, expr: `${n} × 2`, op: '×' };
    }],
  ];

  // Beginner tips, one per template above (same order).
  const TIPS = [
    'Someone gets <b>more</b>, so <b>add</b> the two numbers together.',
    'Some were given <b>away</b>, so <b>subtract</b>: what you started with − what was given away.',
    'Equal groups! <b>Multiply</b> the number of boxes by how many are in each box.',
    'Sharing equally means <b>dividing</b>: the total ÷ the number of friends.',
    'Two steps: first the cost (how many × price), then the change (bill − cost).',
    'How many days of reading fit in the book? <b>Divide</b>: book pages ÷ pages per day.',
    'Go in order: start + (bags × marbles in each bag) − marbles given away.',
    'Fence goes <b>around</b>: add all 4 sides (2 × length + 2 × width). Area = length × width.',
    'Distance = speed × time.',
    'Find the discount (price × percent ÷ 100), then subtract it from the price.',
    'Call the younger person\'s age x. Write both ages in the future, add them up, and solve for x.',
    'Add the ratio numbers to get the number of parts. Total ÷ parts = one part.',
    'The average × 4 = the total of all four tests. Subtract the three scores you know.',
    'Work out how much each person paints in 1 hour, add those, then flip the fraction.',
    'Larger number = (sum + difference) ÷ 2.',
    'Call the smallest number n. The three numbers are n, n + 2 and n + 4.',
    'One change at a time: first the rise, then the fall — taken from the <b>new</b> price.',
    'Each person shakes everyone else\'s hand, but that counts every handshake twice — so halve it.',
    '"How many more" means find the <b>difference</b>: bigger number − smaller number.',
    '"Twice as many" means <b>double</b> it: add the number to itself (or × 2).',
  ];

  // ===========================================================================
  // Shared helpers for building questions
  // ===========================================================================
  // Pick a story template for this level, preferring ones not used yet this round.
  // Which templates can produce an expression / a single operation (probed once).
  const CAN = T.map((t) => {
    const pr = J.makeRng('probe');
    const out = { expr: false, op: false };
    for (let i = 0; i < 12; i++) {
      const q = t[2](pr, t[1]);
      if (q.expr) out.expr = true;
      if (q.op) out.op = true;
    }
    return out;
  });

  function pickTemplate(r, L, rs, test) {
    const Lc = Math.min(L, 10); // Master (11) draws from the top-level stories
    const ok = T.map((t, k) => k).filter((k) => Lc >= T[k][0] && Lc <= T[k][1] && (!test || (test(k) && (!test.needs || CAN[k][test.needs]))));
    if (!ok.length) return null;
    const fresh = ok.filter((k) => !rs.usedT.has(k));
    const k = r.pick(fresh.length ? fresh : ok);
    rs.usedT.add(k);
    // Some templates only sometimes produce an expression (the garden one), so retry a few times.
    for (let tries = 0; tries < 6; tries++) {
      const q = T[k][2](r, L);
      if (!test || !test.needs || q[test.needs]) return Object.assign(q, { tip: TIPS[k], tk: k });
    }
    return null;
  }

  // Wrong number sentences: swap an operator, or flip the order of − and ÷.
  function wrongExprs(expr, ans) {
    const out = new Set();
    const idx = [...expr.matchAll(/[+−×÷]/g)].map((m) => m.index);
    for (const i of idx) {
      for (const o of ['+', '−', '×', '÷']) {
        if (o === expr[i]) continue;
        const s = expr.slice(0, i) + o + expr.slice(i + 1);
        try {
          const v = evalExpr(s);
          if (isFinite(v) && v >= 0 && Math.abs(v - ans) > 0.001) out.add(s);
        } catch (e) { /* skip */ }
      }
    }
    const m = expr.match(/^(\S+) ([−÷]) (\S+)$/);
    if (m) {
      const s = `${m[3]} ${m[2]} ${m[1]}`;
      if (Math.abs(evalExpr(s) - ans) > 0.001) out.add(s);
    }
    return [...out];
  }

  // Four number choices. Wrong answers come from realistic mistakes first.
  function numChoices(r, a, mistakes, asMoney) {
    const show = (v) => (asMoney ? money(round2(v)) : fmt(v));
    const seen = new Set([show(a)]);
    const opts = [{ label: show(a), correct: true }];
    // Only keep "realistic mistake" answers that are in the same ballpark — a wild
    // number like 1000 next to 30 would give the answer away.
    const near = (mistakes || []).filter((v) => v !== a && v <= Math.max(a * 2.5, a + 20) && v >= a / 3);
    const cands = r.shuffle(near).slice(0, 2).concat(r.shuffle([a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, a * 2, a / 2, a + 5, a + 3]));
    for (const v of cands) {
      if (opts.length >= 4) break;
      if (!isFinite(v) || v < 0) continue;
      if (!asMoney && !Number.isInteger(round2(v)) && Number.isInteger(a)) continue;
      const s = show(v);
      if (!seen.has(s)) {
        seen.add(s);
        opts.push({ label: s, correct: false });
      }
    }
    return r.shuffle(opts);
  }

  const plural = (name, n) => {
    if (n === 1) return name;
    const pw = (w) => (/(ch|sh|x|s)$/.test(w) ? w + 'es' : w + 's');
    if (name.includes(' of ')) return name.replace(/^(\S+)/, (w) => pw(w));
    return name.replace(/(\S+)$/, (w) => pw(w));
  };

  const clock = (min) => {
    min = ((min % 1440) + 1440) % 1440;
    let h = Math.floor(min / 60);
    const m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  };
  const durText = (d) => {
    const h = Math.floor(d / 60), m = d % 60;
    const hs = h ? `${h} hour${h > 1 ? 's' : ''}` : '';
    const ms = m ? `${m} minute${m > 1 ? 's' : ''}` : '';
    return [hs, ms].filter(Boolean).join(' and ');
  };

  const card = (title, body, foot) =>
    `<div class="wp-card">${title ? `<div class="wp-card-title">${title}</div>` : ''}${body}${foot ? `<div class="wp-card-foot">${foot}</div>` : ''}</div>`;

  // ===========================================================================
  // Question STYLES. make(r, L, rs) returns:
  //   { prompt, visual?, kind: 'input'|'choice', a?, options?, unit?, e, tip }
  // ===========================================================================
  const STYLES = [
    {
      id: 'solve', label: 'Solve it', icon: '🧮', min: 1, max: 10,
      make(r, L, rs) {
        const q = pickTemplate(r, L, rs);
        return { prompt: q.q, kind: 'input', a: q.a, e: q.e, tip: q.tip };
      },
    },
    {
      id: 'pick', label: 'Pick the answer', icon: '🔘', min: 1, max: 10,
      make(r, L, rs) {
        const q = pickTemplate(r, L, rs);
        const mistakes = q.expr ? wrongExprs(q.expr, q.a).map(evalExpr) : [];
        return { prompt: q.q, kind: 'choice', options: numChoices(r, q.a, mistakes), e: q.e, tip: q.tip };
      },
    },
    {
      id: 'operation', label: 'Which math?', icon: '➕', min: 1, max: 5,
      make(r, L, rs) {
        const test = (k) => true;
        test.needs = 'op';
        const q = pickTemplate(r, L, rs, test);
        if (!q) return null;
        const OPS = [['+', '➕ Add'], ['−', '➖ Subtract'], ['×', '✖️ Multiply'], ['÷', '➗ Divide']];
        return {
          prompt: `${q.q}<br><b>Which math do you need to solve it?</b>`,
          kind: 'choice',
          options: OPS.map(([o, label]) => ({ label, correct: o === q.op })),
          e: `${q.expr} = ${fmt(q.a)}`,
          tip: 'Look for clue words: <b>more / altogether</b> → add · <b>left / away / fewer</b> → subtract · <b>each / groups / twice</b> → multiply · <b>share / split equally</b> → divide.',
        };
      },
    },
    {
      id: 'judge', label: 'Right or wrong?', icon: '✅', min: 1, max: 10,
      make(r, L, rs) {
        const q = pickTemplate(r, L, rs);
        const friend = r.pick(NAMES.filter((n) => !q.q.includes(n)));
        const wrongs = (q.expr ? wrongExprs(q.expr, q.a).map(evalExpr) : []).filter((v) => Number.isInteger(v) === Number.isInteger(q.a));
        const isRight = r.chance(0.5);
        const claim = isRight ? q.a : wrongs.length ? r.pick(wrongs) : q.a + r.pick([-3, -2, -1, 1, 2, 3, 10]);
        return {
          prompt: `${q.q}<br><b>${friend}</b> says the answer is <b>${fmt(claim)}</b>. Is ${friend} right?`,
          kind: 'choice',
          options: [{ label: `👍 Yes, ${fmt(claim)} is right`, correct: isRight }, { label: '👎 No, that\'s wrong', correct: !isRight }],
          e: isRight ? `${friend} is right: ${q.e}` : `The right answer is ${fmt(q.a)}: ${q.e}`,
          tip: 'Work it out yourself first, then compare with their answer.',
        };
      },
    },
    {
      id: 'chart', label: 'Read the chart', icon: '📊', min: 1, max: 8,
      make(r, L) {
        const SETS = [
          { title: 'Favorite pets in our class', unit: 'votes', cats: [['🐶', 'Dogs'], ['🐱', 'Cats'], ['🐟', 'Fish'], ['🐰', 'Rabbits']] },
          { title: 'Fruit sold at the stand', unit: 'fruits', cats: [['🍎', 'Apples'], ['🍌', 'Bananas'], ['🍓', 'Strawberries'], ['🍊', 'Oranges']] },
          { title: 'Favorite sports', unit: 'votes', cats: [['⚽', 'Soccer'], ['🏀', 'Basketball'], ['🎾', 'Tennis'], ['🏊', 'Swimming']] },
          { title: 'Weather this month', unit: 'days', cats: [['☀️', 'Sunny'], ['🌧️', 'Rainy'], ['☁️', 'Cloudy'], ['🌬️', 'Windy']] },
          { title: 'Books read this week', unit: 'books', cats: [['📕', 'Ava'], ['📗', 'Jay'], ['📘', 'Mia'], ['📙', 'Raj']] },
        ];
        const set = r.pick(SETS);
        const n = L <= 1 ? 3 : 4;
        const cats = r.shuffle(set.cats).slice(0, n);
        const scale = L <= 3 ? 1 : L <= 6 ? 2 : r.pick([5, 10]);
        const pics = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, n);
        const vals = pics.map((p) => p * scale);
        const rows = cats.map(([ic, name], k) => `<div class="wp-chart-row"><span class="lab">${name}</span><span class="pics">${ic.repeat(pics[k])}</span></div>`).join('');
        const visual = card(set.title, rows, scale > 1 ? `Key: each picture = <b>${scale} ${set.unit}</b>` : `Key: each picture = <b>1 ${set.unit.replace(/s$/, '')}</b>`);
        const kinds = L <= 2 ? ['read', 'most', 'fewest', 'more'] : ['read', 'more', 'total', 'most', 'fewest', 'more'];
        const kind = r.pick(kinds);
        const scaleTip = scale > 1 ? ` Each picture is worth ${scale}, so multiply the pictures by ${scale}.` : '';
        const [i1, i2] = r.shuffle([...Array(n).keys()]).slice(0, 2);
        const hiI = vals[i1] > vals[i2] ? i1 : i2, loI = hiI === i1 ? i2 : i1;
        if (kind === 'most' || kind === 'fewest') {
          const target = kind === 'most' ? vals.indexOf(Math.max(...vals)) : vals.indexOf(Math.min(...vals));
          return {
            visual, kind: 'choice',
            prompt: `Which got the <b>${kind}</b> ${set.unit}?`,
            options: cats.map(([ic, name], k) => ({ label: `${ic} ${name}`, correct: k === target })),
            e: `${cats[target][1]} has the ${kind === 'most' ? 'longest' : 'shortest'} row: ${vals[target]} ${set.unit}.`,
            tip: `Compare how long each row is.`,
          };
        }
        if (kind === 'read') {
          return { visual, kind: 'input', prompt: `How many ${set.unit} for <b>${cats[i1][1]}</b>?`, a: vals[i1], e: `${pics[i1]} picture${pics[i1] > 1 ? 's' : ''}${scale > 1 ? ` × ${scale}` : ''} = ${vals[i1]}`, tip: 'Count the pictures in that row.' + scaleTip };
        }
        if (kind === 'total') {
          const sum = vals.reduce((a, b) => a + b, 0);
          return { visual, kind: 'input', prompt: `How many ${set.unit} are there <b>in total</b>?`, a: sum, e: `${vals.join(' + ')} = ${sum}`, tip: 'Find each row\'s number, then add them all.' + scaleTip };
        }
        return { visual, kind: 'input', prompt: `How many more ${set.unit} for <b>${cats[hiI][1]}</b> than for <b>${cats[loI][1]}</b>?`, a: vals[hiI] - vals[loI], e: `${vals[hiI]} − ${vals[loI]} = ${vals[hiI] - vals[loI]}`, tip: 'Find both numbers, then subtract the smaller from the bigger.' + scaleTip };
      },
    },
    {
      id: 'shop', label: 'Shop', icon: '🛒', min: 2, max: 8,
      make(r, L) {
        const MENUS = [
          { title: '🍎 Snack stand', items: [['🍎', 'apple'], ['🥪', 'sandwich'], ['🧃', 'juice box'], ['🍪', 'cookie'], ['🍌', 'banana'], ['🧁', 'cupcake']] },
          { title: '✏️ School store', items: [['✏️', 'pencil'], ['📒', 'notebook'], ['🖍️', 'box of crayons'], ['📏', 'ruler'], ['✂️', 'pair of scissors'], ['🖊️', 'pen']] },
          { title: '🧸 Toy shop', items: [['🪀', 'yo-yo'], ['🧸', 'teddy bear'], ['🎈', 'balloon'], ['🪁', 'kite'], ['🎲', 'dice set'], ['🚗', 'toy car']] },
          { title: '🍦 Ice cream truck', items: [['🍦', 'cone'], ['🍧', 'snow cone'], ['🍨', 'sundae'], ['🥤', 'milkshake'], ['🍫', 'chocolate bar'], ['🍭', 'lollipop']] },
        ];
        const menu = r.pick(MENUS);
        const items = r.shuffle(menu.items).slice(0, 4);
        const priceGen = () => (L <= 4 ? r.int(1, 9) : L <= 6 ? r.int(2, 19) / 2 : r.int(4, 40) / 4);
        const prices = [];
        while (prices.length < 4) {
          const p = priceGen();
          if (!prices.includes(p)) prices.push(p);
        }
        const rows = items.map(([ic, nm], k) => `<div class="wp-menu-row"><span>${ic} ${nm}</span><b>${money(prices[k])}</b></div>`).join('');
        const visual = card(menu.title, rows);
        const [a, b] = r.shuffle([0, 1, 2, 3]).slice(0, 2);
        const kinds = L <= 2 ? ['total', 'diff'] : L <= 3 ? ['total', 'diff', 'change'] : ['total', 'change', 'afford', 'change'];
        const kind = r.pick(kinds);
        const n1 = r.int(1, L <= 3 ? 2 : 3), n2 = r.int(1, L <= 3 ? 2 : 3);
        const tot = round2(n1 * prices[a] + n2 * prices[b]);
        const buy = `${n1} ${plural(items[a][1], n1)} and ${n2} ${plural(items[b][1], n2)}`;
        const tip = 'Find each price on the menu. Multiply by how many you buy, then add.';
        if (kind === 'total') {
          return { visual, kind: 'input', unit: '$', prompt: `You buy <b>${buy}</b>. How much do you spend, in dollars?`, a: tot, e: `${n1} × ${money(prices[a])} + ${n2} × ${money(prices[b])} = ${money(tot)}`, tip };
        }
        if (kind === 'diff') {
          const hi = prices[a] > prices[b] ? a : b, lo = hi === a ? b : a;
          return { visual, kind: 'input', unit: '$', prompt: `How much more does a <b>${items[hi][1]}</b> cost than a <b>${items[lo][1]}</b>, in dollars?`, a: round2(prices[hi] - prices[lo]), e: `${money(prices[hi])} − ${money(prices[lo])} = ${money(round2(prices[hi] - prices[lo]))}`, tip: 'Find both prices, then subtract.' };
        }
        if (kind === 'change') {
          const bill = [5, 10, 20, 50].find((x) => x > tot) || 100;
          return { visual, kind: 'input', unit: '$', prompt: `You buy <b>${buy}</b> and pay with a <b>${money(bill)}</b> bill. How much change do you get?`, a: round2(bill - tot), e: `Cost: ${n1} × ${money(prices[a])} + ${n2} × ${money(prices[b])} = ${money(tot)}. Change: ${money(bill)} − ${money(tot)} = ${money(round2(bill - tot))}`, tip: 'First find the total cost, then subtract it from the bill.' };
        }
        // Whole-dollar budget that buys k items with a little left over.
        const p = prices[a], k = r.int(2, 6);
        const haveNice = Math.round(p * k + r.next() * p * 0.9);
        const ans = Math.floor(haveNice / p + 1e-9);
        return { visual, kind: 'input', prompt: `You have <b>${money(haveNice)}</b>. How many <b>${plural(items[a][1], 2)}</b> can you buy?`, a: ans, e: `${money(haveNice)} ÷ ${money(p)} = ${fmt(round2(haveNice / p))} → you can buy ${ans} (with ${money(round2(haveNice - ans * p))} left over).`, tip: 'Divide your money by the price. You can only buy whole items, so round <b>down</b>.' };
      },
    },
    {
      id: 'sentence', label: 'Number sentence', icon: '🔣', min: 2, max: 8,
      make(r, L, rs) {
        const test = () => true;
        test.needs = 'expr';
        const q = pickTemplate(r, L, rs, test);
        if (!q) return null;
        const wrongs = r.shuffle(wrongExprs(q.expr, q.a)).slice(0, 3);
        if (wrongs.length < 2) return null;
        return {
          prompt: `${q.q}<br><b>Which number sentence solves it?</b>`,
          kind: 'choice', wide: true,
          options: r.shuffle([{ label: q.expr, correct: true }, ...wrongs.map((w) => ({ label: w, correct: false }))]),
          e: `${q.expr} = ${fmt(q.a)}`,
          tip: q.tip,
        };
      },
    },
    {
      id: 'time', label: 'Time', icon: '⏰', min: 3, max: 8,
      make(r, L) {
        const ACTS = ['A movie', 'A soccer game', 'A piano lesson', 'A bus ride', 'A baking class', 'Swim practice', 'A science show', 'A train trip'];
        const start = r.int(7 * 12, 20 * 12) * 5;
        const dur = L <= 4 ? r.pick([15, 20, 30, 45, 60, 90]) : r.int(4, 23) * 5 + (L >= 6 ? r.int(1, 2) * 60 : r.int(0, 1) * 60);
        if (L >= 4 && r.chance(0.5)) {
          return {
            kind: 'input', unit: 'min',
            prompt: `${r.pick(['The train', 'The bus', 'The ferry', 'The flight'])} leaves at <b>${clock(start)}</b> and arrives at <b>${clock(start + dur)}</b>. How many <b>minutes</b> is the trip?`,
            a: dur, e: `From ${clock(start)} to ${clock(start + dur)} is ${durText(dur)} = ${dur} minutes.`,
            tip: 'Count up to the next full hour, then add the rest. 1 hour = 60 minutes.',
          };
        }
        const end = start + dur;
        const opts = [end, end + 10, end - 10, end + 60, end - 60, end + 5, end + 30].map(clock);
        const uniq = [...new Set(opts)].slice(0, 4);
        return {
          kind: 'choice',
          prompt: `${r.pick(ACTS)} starts at <b>${clock(start)}</b> and lasts <b>${durText(dur)}</b>. What time does it end?`,
          options: r.shuffle(uniq.map((t) => ({ label: t, correct: t === clock(end) }))),
          e: `${clock(start)} + ${durText(dur)} = ${clock(end)}`,
          tip: 'Add the hours first, then the minutes. Every 60 minutes makes 1 more hour.',
        };
      },
    },
    {
      id: 'backwards', label: 'Work backwards', icon: '↩️', min: 3, max: 8,
      make(r, L) {
        const n = r.pick(NAMES), it = r.pick(ITEMS);
        const kinds = L >= 6 ? ['add', 'sub', 'share', 'money'] : L >= 4 ? ['add', 'sub', 'share'] : ['add', 'sub'];
        const kind = r.pick(kinds);
        const tip = 'Work backwards: start from the end and undo each step.';
        if (kind === 'add') {
          const a = r.int(3, 10 + L * 3), b = r.int(2, 5 + L * 2);
          return { kind: 'input', prompt: `${n} had some ${it}. Then a friend gave ${n} ${b} more. Now ${n} has ${a + b}. How many ${it} did ${n} have at the start?`, a, e: `Undo the "+${b}": ${a + b} − ${b} = ${a}`, tip };
        }
        if (kind === 'sub') {
          const left = r.int(3, 10 + L * 3), gave = r.int(2, 5 + L * 2);
          return { kind: 'input', prompt: `${n} gave away ${gave} ${it} and has ${left} left. How many did ${n} have at the start?`, a: left + gave, e: `Undo the giving away: ${left} + ${gave} = ${left + gave}`, tip };
        }
        if (kind === 'share') {
          const k = r.int(3, 8), each = r.int(3, 6 + L);
          return { kind: 'input', prompt: `${n} shared a bag of ${it} equally among ${k} friends. Each friend got ${each}. How many ${it} were in the bag?`, a: k * each, e: `Undo the sharing: ${k} × ${each} = ${k * each}`, tip };
        }
        const left = r.int(3, 20), spent = r.int(4, 25);
        return { kind: 'input', unit: '$', prompt: `${n} spent <b>${money(spent)}</b> on lunch, then spent <b>half</b> of what was left on a book. Now ${n} has <b>${money(left)}</b>. How much money did ${n} start with?`, a: 2 * left + spent, e: `Before the book: ${money(left)} × 2 = ${money(2 * left)}. Before lunch: ${money(2 * left)} + ${money(spent)} = ${money(2 * left + spent)}`, tip };
      },
    },
    {
      id: 'riddle', label: 'Number riddle', icon: '🤔', min: 3, max: 10,
      make(r, L) {
        const n = r.int(2, 6 + L * 2);
        const steps = L <= 4 ? r.int(1, 2) : L <= 7 ? 2 : 3;
        let v = n;
        const fwd = [], back = [];
        for (let s = 0; s < steps; s++) {
          const ops = ['add', 'sub', 'mul'];
          if (v % 2 === 0 && s > 0) ops.push('half');
          const op = r.pick(ops);
          if (op === 'add') { const c = r.int(2, 12); fwd.push(`add ${c}`); back.push([`subtract ${c}`, (x) => x - c]); v += c; }
          if (op === 'sub') { const c = r.int(1, Math.max(1, Math.min(9, v - 1))); fwd.push(`subtract ${c}`); back.push([`add ${c}`, (x) => x + c]); v -= c; }
          if (op === 'mul') { const c = r.pick([2, 3, 4, 5]); fwd.push(c === 2 ? 'double it' : `multiply by ${c}`); back.push([c === 2 ? 'halve it' : `divide by ${c}`, (x) => x / c]); v *= c; }
          if (op === 'half') { fwd.push('halve the result'); back.push(['double it', (x) => x * 2]); v /= 2; }
        }
        let w = v;
        const undo = back.slice().reverse().map(([t, f]) => { const before = w; w = f(w); return `${before} → ${t} → ${w}`; });
        const said = fwd.length === 1 ? fwd[0] : fwd.slice(0, -1).join(', ') + ' and then ' + fwd[fwd.length - 1];
        return {
          kind: 'input',
          prompt: `🤔 I'm thinking of a number. I ${said}, and I get <b>${v}</b>. What is my number?`,
          a: n, e: `Undo each step, last one first: ${undo.join('; ')}.`,
          tip: 'Start from the answer and undo each step in reverse: add ↔ subtract, multiply ↔ divide.',
        };
      },
    },
    {
      id: 'recipe', label: 'Recipe', icon: '🍳', min: 4, max: 8,
      make(r, L) {
        const R = r.pick([['pancakes', 'eggs'], ['cookies', 'cups of flour'], ['smoothies', 'bananas'], ['lemonade', 'lemons'], ['pizza dough', 'cups of flour'], ['fruit salad', 'apples']]);
        const p = r.pick(L >= 7 ? [2, 4, 6] : [2, 3, 4, 6]);
        const half = L >= 7 && r.chance(0.6);
        const unit = half ? r.int(1, 4) + 0.5 : r.int(1, 4);
        let t = r.int(p + 1, p * 4);
        if (half && t % 2) t++;
        const base = unit * p;
        return {
          kind: 'input',
          visual: card(`📝 ${R[0][0].toUpperCase() + R[0].slice(1)}`, `<div class="wp-menu-row"><span>Serves</span><b>${p} people</b></div><div class="wp-menu-row"><span>${R[1][0].toUpperCase() + R[1].slice(1)}</span><b>${fmt(base)}</b></div>`),
          prompt: `You want to make ${R[0]} for <b>${t} people</b>. How many ${R[1]} do you need?`,
          a: unit * t,
          e: `${fmt(base)} ÷ ${p} = ${fmt(unit)} per person; ${fmt(unit)} × ${t} = ${fmt(unit * t)}`,
          tip: 'Find how much <b>one</b> person needs (divide), then multiply by the number of people.',
        };
      },
    },
    {
      id: 'estimate', label: 'Estimate', icon: '≈', min: 4, max: 9,
      make(r, L) {
        const r1 = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.round(v / p) * p; };
        let a, b, ra, rb, est, exact, prompt, sym;
        if (r.chance(0.5)) {
          a = r.int(12, L >= 7 ? 480 : 98); b = r.int(11, 49);
          ra = r1(a); rb = r1(b); est = ra * rb; exact = a * b; sym = '×';
          prompt = `A stadium has <b>${a}</b> rows with <b>${b}</b> seats in each row. <b>About</b> how many seats are there?`;
        } else {
          a = r.int(140, L >= 7 ? 9400 : 940); b = r.int(140, L >= 7 ? 9400 : 940);
          ra = r1(a); rb = r1(b); est = ra + rb; exact = a + b; sym = '+';
          prompt = `A library lent out <b>${big(a)}</b> books in March and <b>${big(b)}</b> books in April. <b>About</b> how many books is that altogether?`;
        }
        const cands = [est, est * 10, est / 10, sym === '×' ? ra + rb : est * 2, est / 2].filter((v) => Number.isInteger(v) && v > 0);
        const opts = [...new Set(cands)].slice(0, 4).sort((x, y) => x - y);
        return {
          kind: 'choice', prompt,
          options: opts.map((v) => ({ label: `about ${big(v)}`, correct: v === est })),
          e: `Round: ${big(a)} → ${big(ra)} and ${big(b)} → ${big(rb)}. ${big(ra)} ${sym} ${big(rb)} = ${big(est)}. (Exact answer: ${big(exact)}.)`,
          tip: 'Round each number to an easy one first (like 48 → 50), then do the math in your head.',
        };
      },
    },
    {
      id: 'deal', label: 'Better deal', icon: '⚖️', min: 5, max: 10,
      make(r) {
        const prod = r.pick(['granola bars', 'pencils', 'juice boxes', 'batteries', 'tennis balls', 'yogurt cups', 'notebooks']);
        let a, b, pa, pb, ua, ub, tries = 0;
        do {
          a = r.int(3, 8); b = a + r.int(2, 10);
          const unit = r.int(20, 150) / 100;
          ua = unit; ub = unit * (r.chance(0.5) ? r.int(78, 94) / 100 : r.int(106, 125) / 100);
          pa = Math.round(a * ua * 20) / 20; pb = Math.round(b * ub * 20) / 20;
          ua = pa / a; ub = pb / b;
        } while (Math.abs(ua - ub) / Math.min(ua, ub) < 0.05 && ++tries < 30);
        const winA = ua < ub;
        const each = (v) => '$' + v.toFixed(2);
        return {
          kind: 'choice', wide: true,
          visual: card('🏷️ Two packs', `<div class="wp-menu-row"><span>Pack A: ${a} ${prod}</span><b>${money(pa)}</b></div><div class="wp-menu-row"><span>Pack B: ${b} ${prod}</span><b>${money(pb)}</b></div>`),
          prompt: `Which pack is the <b>better deal</b> (cheaper for each one)?`,
          options: [{ label: `Pack A — ${a} for ${money(pa)}`, correct: winA }, { label: `Pack B — ${b} for ${money(pb)}`, correct: !winA }],
          e: `Pack A: ${money(pa)} ÷ ${a} ≈ ${each(ua)} each. Pack B: ${money(pb)} ÷ ${b} ≈ ${each(ub)} each. Pack ${winA ? 'A' : 'B'} is cheaper per item.`,
          tip: 'Divide each price by how many are in the pack to get the price of <b>one</b>. Lower wins — the bigger pack isn\'t always cheaper!',
        };
      },
    },
    {
      id: 'mistake', label: 'Spot the mistake', icon: '🔍', min: 5, max: 10,
      make(r, L) {
        const who = r.pick(NAMES);
        // Each scenario: story + steps. A step = [text(vals) , calc(vals)].
        const scenarios = [
          () => {
            const n1 = r.int(2, 5), p1 = r.int(3, 15), n2 = r.int(2, 4), p2 = r.int(2, 12);
            const bill = [20, 50, 100, 200].find((x) => x > n1 * p1 + n2 * p2);
            return {
              story: `${who} buys ${n1} shirts at ${money(p1)} each and ${n2} hats at ${money(p2)} each, and pays with ${money(bill)}. How much change?`,
              steps: [
                [(v) => `${n1} × ${money(p1)} = ${money(v[0])}`, () => n1 * p1],
                [(v) => `${n2} × ${money(p2)} = ${money(v[1])}`, () => n2 * p2],
                [(v) => `${money(v[0])} + ${money(v[1])} = ${money(v[2])}`, (v) => v[0] + v[1]],
                [(v) => `${money(bill)} − ${money(v[2])} = ${money(v[3])}`, (v) => bill - v[2]],
              ],
            };
          },
          () => {
            const s1 = r.int(4, 12) * 10, t1 = r.int(2, 4), s2 = r.int(3, 9) * 10, t2 = r.int(1, 3);
            return {
              story: `A car drives ${t1} hours at ${s1} km/h, then ${t2} hours at ${s2} km/h. How far does it go in total?`,
              steps: [
                [(v) => `${t1} × ${s1} = ${v[0]} km`, () => t1 * s1],
                [(v) => `${t2} × ${s2} = ${v[1]} km`, () => t2 * s2],
                [(v) => `${v[0]} + ${v[1]} = ${v[2]} km`, (v) => v[0] + v[1]],
              ],
            };
          },
          () => {
            const p = r.int(3, 12) * 20, pct = r.pick([10, 20, 25, 50]);
            const bill = [50, 100, 200, 300].find((x) => x > p);
            return {
              story: `A ${money(p)} game is ${pct}% off. ${who} pays with ${money(bill)}. How much change?`,
              steps: [
                [(v) => `${pct}% of ${money(p)} = ${money(v[0])}`, () => (p * pct) / 100],
                [(v) => `${money(p)} − ${money(v[0])} = ${money(v[1])}`, (v) => p - v[0]],
                [(v) => `${money(bill)} − ${money(v[1])} = ${money(v[2])}`, (v) => bill - v[1]],
              ],
            };
          },
          () => {
            const per = r.int(2, 6), p = r.pick([2, 3, 4, 5]), t = r.int(6, 15), cost = r.int(2, 5);
            return {
              story: `A recipe for ${p} people uses ${per * p} eggs. Eggs cost ${money(cost)} for each egg. How much do the eggs cost to feed ${t} people?`,
              steps: [
                [(v) => `${per * p} ÷ ${p} = ${v[0]} eggs per person`, () => per],
                [(v) => `${v[0]} × ${t} = ${v[1]} eggs`, (v) => v[0] * t],
                [(v) => `${v[1]} × ${money(cost)} = ${money(v[2])}`, (v) => v[1] * cost],
              ],
            };
          },
        ];
        const sc = r.pick(scenarios)();
        const w = r.int(0, sc.steps.length - 1);
        const vals = [];
        sc.steps.forEach(([, calc], k) => {
          let v = calc(vals);
          if (k === w) {
            const deltas = r.shuffle([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]);
            v = v + deltas.find((d) => v + d > 0);
          }
          vals.push(v);
        });
        const texts = sc.steps.map(([text]) => text(vals));
        const visual = card(`✏️ How ${who} solved it`, texts.map((t, k) => `<div class="wp-step"><b>Step ${k + 1}</b> ${t}</div>`).join(''));
        const right = sc.steps[w][1](vals);
        return {
          kind: 'choice', visual,
          prompt: `${sc.story}<br><b>One step has a mistake. Which one?</b>`,
          options: texts.map((t, k) => ({ label: `Step ${k + 1}`, correct: k === w })),
          e: `Step ${w + 1} is wrong — it should be ${Number.isInteger(right) ? (texts[w].includes('$') ? money(right) : right) : round2(right)}. (The steps after it used the wrong number, so their math looks right but the answer is off.)`,
          tip: 'Redo each step yourself. Find the <b>first</b> one where the math doesn\'t check out.',
        };
      },
    },
  ];

  // ===========================================================================
  // Build a round: styles rotate (no style twice in a row, as many different
  // styles as the level allows), and every question is new to the round and,
  // when possible, to this player.
  // ===========================================================================
  function stylesFor(L) {
    const Lc = Math.min(L, 10); // Master (11) uses the top-level question styles
    return STYLES.filter((s) => Lc >= s.min && Lc <= s.max);
  }

  function makeSet(rng, L, count, hist) {
    const avail = stylesFor(L);
    const round = new Set();
    const rs = { usedT: new Set() };
    const out = [];
    let pool = [];
    let guard = 0;
    while (out.length < count && guard++ < 200) {
      if (!pool.length) {
        pool = rng.shuffle(avail);
        const last = out[out.length - 1];
        if (last && pool.length > 1 && pool[pool.length - 1].id === last.style) pool.unshift(pool.pop());
      }
      const st = pool.pop();
      let q;
      try {
        q = J.pickUnique(
          () => st.make(rng, L, rs) || { skip: true, key: 'skip' + Math.random() },
          (x) => (x.skip ? x.key : st.id + '|' + x.prompt.replace(/<[^>]+>/g, '') + '|' + (x.visual || '').replace(/<[^>]+>/g, '')),
          round, hist, 30
        );
      } catch (e) {
        continue;
      }
      if (q.skip) continue;
      // Templates may be used again once all of them have been used this round.
      if (rs.usedT.size >= T.filter((t) => Math.min(L, 10) >= t[0] && Math.min(L, 10) <= t[1]).length) rs.usedT.clear();
      out.push(Object.assign(q, { style: st.id, styleLabel: st.label, styleIcon: st.icon }));
    }
    return out;
  }

  // ===========================================================================
  // The game
  // ===========================================================================
  J.register({
    id: 'wordProblems',
    name: 'Word Problems',
    icon: '🧮',
    skill: 'Reasoning',
    color: '#13a37a',
    tagline: 'Stories, charts, shops, clocks and riddles — think it through and solve.',
    why: 'Translating real situations into math trains problem-solving, reading comprehension and numeracy together.',
    howTo: 'Every round mixes different kinds of questions: type the answer, pick the right math, read a picture chart, shop from a menu, work out times, solve number riddles, estimate, find the better deal, or spot the mistake in someone\'s working. More kinds unlock as the levels go up. After each answer you\'ll see how to solve it. 8 questions per round.',
    helpers: [
      '<b>Show tip</b> explains how to tackle each question.',
      'If your first answer is wrong, you get <b>one more try</b> (worth half points).',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const COUNT = 8;
      const hist = J.seenHistory('wordProblems');
      const qs = makeSet(rng, level, COUNT, hist);
      hist.save();
      let i = 0, correct = 0, right = 0;
      const watch = J.stopwatch(null);

      function syncHelpers() {
        const b = root.querySelector('.tip-btn');
        if (b) b.hidden = !helpers;
        if (!helpers) {
          const t = root.querySelector('.wp-tip');
          if (t) t.hidden = true;
        }
      }

      function show() {
        const q = qs[i];
        let retried = false;
        const answerHtml =
          q.kind === 'input'
            ? `<form class="ans-form" autocomplete="off">
                 <div class="wp-input-wrap">${q.unit === '$' ? '<span class="wp-unit">$</span>' : ''}
                   <input class="g-input" inputmode="decimal" aria-label="Your answer" placeholder="Answer" />
                   ${q.unit === 'min' ? '<span class="wp-unit">min</span>' : ''}</div>
                 <div class="btn-row" style="justify-content:center"><button class="btn" type="submit">Check</button></div>
               </form>`
            : `<div class="wp-choices ${q.wide || q.options.length === 2 ? 'wide' : ''}">${q.options
                .map((o, k) => `<button class="choice wp-choice" data-k="${k}">${o.label}</button>`)
                .join('')}</div>`;
        root.innerHTML = `
          <div class="g-bar"><span>Question ${i + 1} of ${COUNT}</span><span class="muted">✅ ${right}</span></div>
          <div class="g-progress"><i style="width:${(i / COUNT) * 100}%"></i></div>
          <div class="g-center">
            <span class="wp-badge">${q.styleIcon} ${q.styleLabel}</span>
            ${q.visual || ''}
            <p class="g-question">${q.prompt}</p>
            ${answerHtml}
            <div class="btn-row" style="justify-content:center"><button class="btn ghost small tip-btn" type="button">💡 Show tip</button></div>
            <div class="helper-tip wp-tip" hidden style="margin-top:12px;max-width:560px">${q.tip}</div>
            <div class="g-msg"></div>
            <div class="fb"></div>
          </div>`;
        root.querySelector('.tip-btn').addEventListener('click', () => {
          root.querySelector('.wp-tip').hidden = false;
        });
        syncHelpers();

        function settle(ok) {
          if (ok) {
            right++;
            correct += retried ? 0.5 : 1;
          }
          root.querySelector('.g-msg').textContent = '';
          const tb = root.querySelector('.tip-btn');
          if (tb) tb.remove();
          const answerText = q.kind === 'input' ? (q.unit === '$' ? money(round2(q.a)) : fmt(q.a)) : q.options.find((o) => o.correct).label;
          root.querySelector('.fb').innerHTML = `
            <div class="g-feedback ${ok ? 'good' : 'bad'}">
              <b>${ok ? 'Correct! 🎉' : `Not quite — the answer is ${answerText}.`}</b>
              <div class="muted">${q.e}</div>
            </div>
            <div class="btn-row" style="justify-content:center"><button class="btn next">${i + 1 < COUNT ? 'Next →' : 'Finish'}</button></div>`;
          const next = root.querySelector('.next');
          next.focus();
          next.addEventListener('click', () => {
            i++;
            if (i < COUNT) show();
            else {
              watch.stop();
              finish((correct / COUNT) * 100, `${right} of ${COUNT} correct in ${J.fmtTime(watch.seconds())}.`);
            }
          });
        }

        function tryAgain() {
          retried = true;
          const m = root.querySelector('.g-msg');
          m.className = 'g-msg bad';
          m.textContent = 'Not quite — have one more try!';
          root.querySelector('.wp-tip').hidden = false;
        }

        if (q.kind === 'input') {
          const form = root.querySelector('.ans-form');
          const input = form.querySelector('input');
          J.autoFocus(input);
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const raw = input.value.replace(/[$,\s]|min(utes)?/gi, '');
            if (raw === '' || isNaN(Number(raw))) return input.focus();
            const ok = Math.abs(Number(raw) - q.a) < 0.011;
            if (!ok && helpers && !retried) {
              tryAgain();
              return input.select();
            }
            form.querySelector('button[type=submit]').remove();
            input.disabled = true;
            settle(ok);
          });
        } else {
          root.querySelectorAll('.wp-choice').forEach((b) =>
            b.addEventListener('click', () => {
              const ok = q.options[+b.dataset.k].correct;
              if (!ok && helpers && !retried && q.options.length > 2) {
                b.disabled = true;
                b.classList.add('wrongpick');
                return tryAgain();
              }
              root.querySelectorAll('.wp-choice').forEach((c) => {
                c.disabled = true;
                if (q.options[+c.dataset.k].correct) c.classList.add('right');
              });
              if (!ok) b.classList.add('wrongpick');
              settle(ok);
            })
          );
        }
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

  J._wordProblems = { makeSet, T, STYLES, stylesFor, wrongExprs, evalExpr };
})();
