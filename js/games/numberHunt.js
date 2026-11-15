/* Number Hunt — Visual Scanning. A "Schulte table": tap 1, 2, 3… in order in a
   scrambled grid. Bigger grids, counting down, and 1-A-2-B "trail" order at
   higher levels. */
(function () {
  const J = window.JOA;
  const LETTERS = 'ABCDEFGHIJKLMNOPQR';

  // Returns the items in the order they must be tapped.
  function sequence(L) {
    const nums = (n) => Array.from({ length: n }, (_, i) => String(i + 1));
    const trail = (nNum, nLet) => {
      const out = [];
      for (let i = 0; i < Math.max(nNum, nLet); i++) {
        if (i < nNum) out.push(String(i + 1));
        if (i < nLet) out.push(LETTERS[i]);
      }
      return out;
    };
    switch (L) {
      case 1: case 2: return { n: 3, order: nums(9), mark: true, how: 'Tap 1 to 9 in order.' };
      case 3: return { n: 4, order: nums(16), mark: true, how: 'Tap 1 to 16 in order.' };
      case 4: return { n: 4, order: nums(16), mark: false, how: 'Tap 1 to 16 in order. Found numbers don\'t disappear!' };
      case 5: return { n: 5, order: nums(25), mark: false, how: 'Tap 1 to 25 in order.' };
      case 6: return { n: 5, order: nums(25).reverse(), mark: false, how: 'Count DOWN: tap 25 to 1.' };
      case 7: return { n: 4, order: trail(8, 8), mark: false, how: 'Alternate numbers and letters: 1, A, 2, B, 3, C…' };
      case 8: return { n: 6, order: nums(36), mark: false, how: 'Tap 1 to 36 in order.' };
      case 9: return { n: 5, order: trail(13, 12), mark: false, how: 'Alternate: 1, A, 2, B… all the way to 13.' };
      case 10: return { n: 6, order: trail(18, 18), mark: false, how: 'Alternate: 1, A, 2, B… all the way to 18, R.' };
      case 11: return { n: 7, order: nums(49).reverse(), mark: false, how: 'Master: count DOWN from 49 to 1.' };
      default: return { n: 8, order: nums(64), mark: false, how: 'Grandmaster: find 1 to 64 in a giant grid.' };
    }
  }

  const COLORS = ['#e03131', '#1c6fe0', '#1f9d55', '#e8b400', '#8a3fd1', '#f0701e', '#0f9fb0', '#d6438f'];

  J.register({
    id: 'numberHunt',
    name: 'Number Hunt',
    icon: '🔢',
    skill: 'Visual Scanning',
    color: '#7c3aed',
    tagline: 'Find 1, 2, 3… in a scrambled grid as fast as you can.',
    why: 'Scanning for targets in order trains focus, peripheral vision and quick visual processing — a favorite of speed-reading and attention coaches.',
    howTo: 'Numbers (and later letters) are scattered around the grid. Tap them in order, as fast as you can. Higher levels count down, or mix numbers and letters (1, A, 2, B…). Wrong taps cost a few points.',
    helpers: ['Found items <b>fade out</b> so the grid gets easier.', 'If you\'re stuck for a few seconds, the next one <b>glows</b>.', 'The time target is more relaxed.'],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const cfg = sequence(level);
      const layout = rng.shuffle(cfg.order);
      const colorful = level >= 2;
      let next = 0, wrong = 0, t0 = 0, idle = null, watch = null;

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">🔢</div>
          <h2>Ready?</h2>
          <p>${cfg.how}</p>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', start);

      function start() {
        root.innerHTML = `
          <div class="g-bar"><span>Find: <b class="nh-next">${cfg.order[0]}</b></span><span class="muted">⏱ <span class="time">0:00</span></span></div>
          <div class="nh-grid" style="grid-template-columns:repeat(${cfg.n},1fr)">
            ${layout.map((v) => `<button class="nh-cell" data-v="${v}" style="${colorful ? `color:${rng.pick(COLORS)};` : ''}font-size:${Math.max(1, 2.6 - cfg.n * 0.22)}rem">${v}</button>`).join('')}
          </div>
          <div class="g-msg"></div>`;
        root.querySelector('.nh-grid').addEventListener('click', (e) => {
          const c = e.target.closest('.nh-cell');
          if (c) tap(c);
        });
        watch = J.stopwatch(root.querySelector('.time'));
        t0 = performance.now();
        armIdle();
      }

      function armIdle() {
        clearTimeout(idle);
        idle = setTimeout(() => {
          if (!helpers) return;
          const c = root.querySelector(`.nh-cell[data-v="${cfg.order[next]}"]`);
          if (c) c.classList.add('glow');
        }, 5000);
      }

      function tap(c) {
        if (next >= cfg.order.length) return;
        if (c.dataset.v !== cfg.order[next]) {
          wrong++;
          if (J.fx) J.fx.play('bad');
          c.classList.remove('nope');
          void c.offsetWidth;
          c.classList.add('nope');
          return;
        }
        c.classList.remove('glow');
        if (cfg.mark || helpers) c.classList.add('done');
        else {
          c.classList.add('flash');
          setTimeout(() => c.classList.remove('flash'), 200);
        }
        next++;
        if (next >= cfg.order.length) return end();
        root.querySelector('.nh-next').textContent = cfg.order[next];
        armIdle();
      }

      function end() {
        clearTimeout(idle);
        watch.stop();
        const secs = (performance.now() - t0) / 1000;
        const perItem = helpers || ctx.kid ? 2.2 : level <= 3 ? 1.6 : level <= 6 ? 1.3 : 1.5;
        const target = cfg.order.length * perItem;
        const score = J.clamp((100 * target) / secs, 30, 100) - wrong * 3;
        finish(score, `All ${cfg.order.length} found in ${secs.toFixed(1)} seconds${wrong ? ` with ${wrong} wrong tap${wrong === 1 ? '' : 's'}` : ''}.`);
      }

      return {
        cleanup: () => {
          clearTimeout(idle);
          if (watch) watch.stop();
        },
        setHelpers(on) {
          helpers = on;
          if (!on) root.querySelectorAll('.glow').forEach((c) => c.classList.remove('glow'));
        },
      };
    },
  });

  J._numberHunt = { sequence };
})();
