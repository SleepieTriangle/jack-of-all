/* Odd One Out — Perception. Find the single different picture in a grid. Grids
   grow and the odd one looks more and more like the rest. */
(function () {
  const J = window.JOA;

  const EASY = [['🍎', '🍌'], ['🐶', '🐱'], ['⭐', '🌙'], ['🚗', '🚲'], ['🌻', '🌵'], ['⚽', '🏀'], ['🐟', '🐢'], ['🎈', '🎁'], ['🍕', '🍔'], ['🐝', '🐞']];
  const MEDIUM = [['😀', '😃'], ['🐻', '🐨'], ['🌲', '🌳'], ['🍊', '🍑'], ['🐭', '🐹'], ['🌑', '🌒'], ['😊', '🙂'], ['🐺', '🦊'], ['🍏', '🍐'], ['🚕', '🚖'], ['🕐', '🕑'], ['🐕', '🐩']];
  const HARD = [['O', 'Q'], ['E', 'F'], ['b', 'd'], ['p', 'q'], ['M', 'N'], ['8', 'B'], ['C', 'G'], ['V', 'U'], ['6', '9'], ['m', 'n'], ['P', 'R'], ['5', 'S'], ['h', 'n']];

  function board(r, L) {
    const n = L <= 1 ? 3 : L <= 3 ? 4 : L <= 5 ? 5 : L <= 7 ? 6 : L <= 10 ? 7 : 8;
    let normal, odd, style = '';
    if (L <= 2) [normal, odd] = r.shuffle(r.pick(EASY));
    else if (L <= 5) [normal, odd] = r.shuffle(r.pick(L <= 3 ? EASY.concat(MEDIUM) : MEDIUM));
    else if (L <= 8) [normal, odd] = r.shuffle(r.pick(r.chance(0.5) ? MEDIUM : HARD));
    else {
      // Top levels: same symbol, the odd one is turned slightly.
      normal = odd = r.pick(['➤', '✈', '☂', '♞', '⚑', '✎', '♪']);
      // Master turns it even less.
      style = `transform:rotate(${r.pick([-1, 1]) * (L >= 11 ? r.int(8, 13) : r.int(12, 22))}deg)`;
    }
    return { n, normal, odd, style, at: r.int(0, n * n - 1) };
  }

  J.register({
    id: 'oddOneOut',
    name: 'Odd One Out',
    icon: '👀',
    skill: 'Perception',
    color: '#0e7490',
    tagline: 'One of these things is not like the others. Find it fast!',
    why: 'Visual search trains attention to detail, scanning speed and the brain\'s ability to filter out distractions.',
    howTo: 'Each board hides one picture that is different from all the rest. Tap it as fast as you can. Wrong taps cost points, and the boards get bigger and trickier. 12 boards.',
    helpers: ['After a few seconds, the <b>row</b> with the odd one lights up.', 'You get <b>more time</b> on each board.'],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const ROUNDS = 12;
      const limitBase = 6 + level * 0.8; // seconds per board
      let i = 0, total = 0, found = 0, t0 = 0, timer = null, hintTimer = null, b = null, wrong = 0;

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">👀</div>
          <h2>Ready?</h2>
          <p>Find the one picture that's different. ${ROUNDS} boards — be quick!</p>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', next);

      function limit() {
        return (helpers ? limitBase * 1.6 : limitBase) * 1000;
      }

      function next() {
        if (i >= ROUNDS) return end();
        b = board(rng, level);
        wrong = 0;
        root.innerHTML = `
          <div class="g-bar"><span>Board ${i + 1} of ${ROUNDS}</span><span class="muted">✅ ${found}</span></div>
          <div class="cc-timer"><i></i></div>
          <div class="oo-grid" style="grid-template-columns:repeat(${b.n},1fr)">
            ${Array.from({ length: b.n * b.n }, (_, k) => `<button class="oo-cell" data-k="${k}" aria-label="${k === b.at ? b.odd + (b.style ? ' (turned)' : '') : b.normal}" style="font-size:${Math.max(1, 3.4 - b.n * 0.32)}rem"><span aria-hidden="true" style="${k === b.at ? b.style : ''}">${k === b.at ? b.odd : b.normal}</span></button>`).join('')}
          </div>
          <div class="g-msg"></div>`;
        root.querySelector('.oo-grid').addEventListener('click', (e) => {
          const c = e.target.closest('.oo-cell');
          if (c) tap(+c.dataset.k, c);
        });
        t0 = performance.now();
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => {
          if (!helpers) return;
          const row = Math.floor(b.at / b.n);
          root.querySelectorAll('.oo-cell').forEach((c) => c.classList.toggle('row-hint', Math.floor(+c.dataset.k / b.n) === row));
        }, 3000);
        tick();
      }

      function tick() {
        const f = 1 - (performance.now() - t0) / limit();
        const bar = root.querySelector('.cc-timer i');
        if (bar) bar.style.width = Math.max(0, f * 100) + '%';
        if (f <= 0) return resolve(false);
        timer = setTimeout(tick, 100);
      }

      function tap(k, el) {
        if (k === b.at) return resolve(true);
        wrong++;
        el.classList.add('oo-wrong');
        el.disabled = true;
      }

      function resolve(ok) {
        clearTimeout(timer);
        clearTimeout(hintTimer);
        const t = (performance.now() - t0) / limit();
        const pts = ok ? J.clamp(1 - 0.5 * t - 0.15 * wrong, 0.2, 1) : 0;
        total += pts;
        if (ok) found++;
        root.querySelectorAll('.oo-cell').forEach((c) => (c.disabled = true));
        root.querySelector(`.oo-cell[data-k="${b.at}"]`).classList.add('oo-found');
        const msg = root.querySelector('.g-msg');
        msg.className = 'g-msg ' + (ok ? 'good' : 'bad');
        msg.textContent = ok ? `Found it in ${((performance.now() - t0) / 1000).toFixed(1)}s!` : 'Time\'s up — there it was!';
        i++;
        timer = setTimeout(next, ok ? 650 : 1400);
      }

      function end() {
        finish((total / ROUNDS) * 100, `Found ${found} of ${ROUNDS} odd ones out.`);
      }

      return {
        cleanup: () => {
          clearTimeout(timer);
          clearTimeout(hintTimer);
        },
        setHelpers(on) {
          helpers = on;
          if (!on) root.querySelectorAll('.row-hint').forEach((c) => c.classList.remove('row-hint'));
        },
      };
    },
  });

  J._oddOneOut = { board };
})();
