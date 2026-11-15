/* Shape Spin — Mental Rotation. Two block shapes: is the second one the same
   shape just turned, or its mirror image? Bigger shapes and trickier turns as
   levels rise. */
(function () {
  const J = window.JOA;

  const norm = (cells) => {
    const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  const key = (cells) => norm(cells).map((c) => c.join(',')).join(';');
  const rot = (cells) => cells.map(([x, y]) => [y, -x]); // 90° turn
  const mirror = (cells) => cells.map(([x, y]) => [-x, y]);
  const rotations = (cells) => {
    const out = [cells];
    for (let i = 0; i < 3; i++) out.push(rot(out[out.length - 1]));
    return out;
  };
  const canon = (cells) => rotations(cells).map(key).sort()[0];

  // A random block shape that looks DIFFERENT from its mirror image.
  function shape(r, k) {
    for (let tries = 0; tries < 200; tries++) {
      const cells = [[0, 0]];
      const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
      while (cells.length < k) {
        const [x, y] = r.pick(cells);
        const [dx, dy] = r.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
      }
      const n = norm(cells);
      if (canon(n) !== canon(mirror(n))) return n;
    }
    return norm([[0, 0], [1, 0], [2, 0], [2, 1]]); // fallback: an L
  }

  function svg(cells, color, size) {
    const n = norm(cells);
    const w = Math.max(...n.map((c) => c[0])) + 1, h = Math.max(...n.map((c) => c[1])) + 1;
    const dim = Math.max(w, h);
    const ox = (dim - w) / 2, oy = (dim - h) / 2;
    return `<svg viewBox="-0.2 -0.2 ${dim + 0.4} ${dim + 0.4}" width="${size}" height="${size}" aria-hidden="true">${n
      .map(([x, y]) => `<rect x="${x + ox}" y="${y + oy}" width="0.92" height="0.92" rx="0.14" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="0.05"/>`)
      .join('')}</svg>`;
  }

  function puzzle(r, L) {
    const k = L <= 2 ? 4 : L <= 4 ? 5 : L <= 6 ? 6 : L <= 8 ? 7 : L <= 10 ? 8 : L <= 11 ? 9 : 10;
    const a = shape(r, k);
    const isMirror = r.chance(0.5);
    let b = isMirror ? mirror(a) : a;
    const turns = L <= 2 ? r.pick([1, 2]) : r.int(1, 3);
    for (let t = 0; t < turns; t++) b = rot(b);
    return { a, b: norm(b), isMirror, turns, key: canon(a) + (isMirror ? '|M' : '|S') + turns };
  }

  J.register({
    id: 'shapeSpin',
    name: 'Shape Spin',
    icon: '🔄',
    skill: 'Mental Rotation',
    color: '#0891b2',
    tagline: 'Same shape turned around — or a mirror image? Spin it in your head.',
    why: 'Mentally rotating objects is a core spatial skill used in reading maps, packing, building and geometry.',
    howTo: 'Look at the two block shapes. If the right one is just the left one <b>turned around</b>, tap <b>Same</b>. If it\'s a <b>flipped</b> (mirror) version that no amount of turning can match, tap <b>Mirror</b>. Keys: ← Same, → Mirror. 12 pairs.',
    helpers: ['<b>Turn it</b> spins the left shape 90° each tap so you can line them up.', 'Shapes are smaller and only turn a little.'],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const ROUNDS = 12;
      const hist = J.seenHistory('shapeSpin');
      const round = new Set();
      const puzzles = Array.from({ length: ROUNDS }, () => J.pickUnique(() => puzzle(rng, level), (p) => p.key, round, hist));
      hist.save();
      let i = 0, correct = 0, rtSum = 0, t0 = 0, spin = 0, locked = false, timer = null;

      function show() {
        const p = puzzles[i];
        spin = 0;
        locked = false;
        root.innerHTML = `
          <div class="g-bar"><span>Pair ${i + 1} of ${ROUNDS}</span><span class="muted">✅ ${correct}</span></div>
          <div class="g-progress"><i style="width:${(i / ROUNDS) * 100}%"></i></div>
          <div class="ss-pair">
            <div class="ss-box"><div class="ss-spin">${svg(p.a, '#0891b2', 150)}</div></div>
            <div class="ss-vs">?</div>
            <div class="ss-box">${svg(p.b, '#f0701e', 150)}</div>
          </div>
          <div class="btn-row" style="justify-content:center"><button class="btn ghost small turn">↻ Turn it</button></div>
          <div class="ss-choices">
            <button class="choice ss-same">✔ Same <small>(just turned)</small></button>
            <button class="choice ss-mirror">⇆ Mirror <small>(flipped)</small></button>
          </div>
          <div class="g-msg"></div>`;
        root.querySelector('.turn').hidden = !helpers;
        root.querySelector('.turn').addEventListener('click', () => {
          spin += 90;
          root.querySelector('.ss-spin').style.transform = `rotate(${spin}deg)`;
        });
        root.querySelector('.ss-same').addEventListener('click', () => answer(false));
        root.querySelector('.ss-mirror').addEventListener('click', () => answer(true));
        t0 = performance.now();
      }

      function answer(saidMirror) {
        if (locked) return;
        locked = true;
        const p = puzzles[i];
        const ok = saidMirror === p.isMirror;
        if (ok) {
          correct++;
          rtSum += Math.min(8, (performance.now() - t0) / 1000);
        }
        const msg = root.querySelector('.g-msg');
        msg.className = 'g-msg ' + (ok ? 'good' : 'bad');
        msg.textContent = ok ? (p.isMirror ? '✓ Right — it\'s a mirror image!' : '✓ Right — same shape, just turned!') : (p.isMirror ? '✗ It was a mirror image.' : '✗ It was the same shape, just turned.');
        // Show the answer: spin the left shape to match.
        const sp = root.querySelector('.ss-spin');
        sp.style.transform = `rotate(${p.turns * -90}deg) ${p.isMirror ? 'scaleX(-1)' : ''}`;
        root.querySelectorAll('.ss-choices .choice').forEach((b) => (b.disabled = true));
        i++;
        timer = setTimeout(() => (i < ROUNDS ? show() : end()), ok ? 1100 : 2000);
      }

      function end() {
        const avg = correct ? rtSum / correct : 8;
        const speed = J.clamp((6 - avg) / 4, 0, 1);
        finish((correct / ROUNDS) * 85 + speed * 15 * (correct / ROUNDS), `${correct} of ${ROUNDS} correct, about ${avg.toFixed(1)}s each.`);
      }

      function onKey(e) {
        if (e.key === 'ArrowLeft') answer(false);
        if (e.key === 'ArrowRight') answer(true);
      }
      document.addEventListener('keydown', onKey);
      show();
      return {
        cleanup: () => {
          clearTimeout(timer);
          document.removeEventListener('keydown', onKey);
        },
        setHelpers(on) {
          helpers = on;
          const t = root.querySelector('.turn');
          if (t) t.hidden = !on;
        },
      };
    },
  });

  J._shapeSpin = { puzzle, canon, mirror, rot, norm };
})();
