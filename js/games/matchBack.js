/* Match Back — Working Memory. The classic "N-back" task: pictures (kids) or
   letters (adults) appear one at a time; tap MATCH when the current one is the
   same as the one N steps back. N grows from 1 to 3. */
(function () {
  const J = window.JOA;

  const KID_ITEMS = ['🐶', '🐱', '🐸', '🐵', '🐷', '🐰', '🦁', '🐼'];
  const ADULT_ITEMS = 'BCDFGHJKLMNPRSTV'.split('');

  function makeStream(r, L, kid) {
    const n = L <= 3 ? 1 : L <= 7 ? 2 : L <= 11 ? 3 : 4;
    const pool = (kid ? KID_ITEMS : ADULT_ITEMS).slice(0, kid ? 4 + Math.min(4, Math.floor(L / 2)) : 6 + L);
    const length = 20 + n;
    const seq = [];
    for (let t = 0; t < length; t++) {
      if (t >= n && r.chance(0.32)) seq.push(seq[t - n]);
      else {
        let v;
        do v = r.pick(pool); while (t >= n && v === seq[t - n]);
        seq.push(v);
      }
    }
    return { n, seq };
  }

  const WORDS = { 1: 'the one just before', 2: 'the one 2 back', 3: 'the one 3 back' };

  J.register({
    id: 'matchBack',
    name: 'Match Back',
    icon: '🔁',
    skill: 'Working Memory',
    color: '#be185d',
    tagline: 'Does this one match the one from before? Keep the trail in your head.',
    why: 'The "N-back" task is one of the most studied working-memory exercises — it trains holding and updating information on the fly.',
    howTo: 'Pictures or letters appear one at a time. Tap <b>MATCH</b> (or press the space bar) when the one on screen is the same as the one <b>N steps back</b>. Easy tiers: just the one before. Harder tiers: two, then three, and at Grandmaster even four back! Don\'t tap when it\'s not a match.',
    helpers: ['A <b>trail</b> shows the last few items, with the one to compare highlighted.', 'Items stay on screen <b>longer</b>.'],
    mount(root, ctx) {
      const { rng, level, finish, kid } = ctx;
      let helpers = ctx.helpers;
      const { n, seq } = makeStream(rng, level, kid);
      const baseMs = Math.max(level >= 11 ? 1500 : 1900, 3000 - level * 110); // Master is faster
      let t = -1, pressed = false, hits = 0, misses = 0, fas = 0, matches = 0, timer = null, running = false;

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">🔁</div>
          <h2>${n}-back</h2>
          <p>Tap <b>MATCH</b> when the ${kid ? 'picture' : 'letter'} is the same as <b>${WORDS[n]}</b>.</p>
          <div class="mb-example">${n === 1 ? `${kid ? '🐶 🐶' : 'K K'} → MATCH` : n === 2 ? `${kid ? '🐶 🐸 🐶' : 'K R K'} → MATCH` : `${kid ? '🐶 🐸 🐵 🐶' : 'K R T K'} → MATCH`}</div>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', () => {
        root.innerHTML = `
          <div class="g-bar"><span>${n}-back · <span class="pos">0</span> / ${seq.length}</span><span class="muted">✅ <span class="hit">0</span></span></div>
          <div class="mb-trail"></div>
          <div class="mb-stage"><span class="mb-item"></span></div>
          <div class="g-msg"></div>
          <div class="g-center"><button class="btn big mb-btn">MATCH!</button></div>`;
        root.querySelector('.mb-btn').addEventListener('click', press);
        running = true;
        step();
      });

      function ms() {
        return helpers ? baseMs + 900 : baseMs;
      }

      function trail() {
        const el = root.querySelector('.mb-trail');
        if (!helpers || t < 1) {
          el.innerHTML = '';
          return;
        }
        const from = Math.max(0, t - n);
        el.innerHTML = seq.slice(from, t).map((v, k) => `<span class="${from + k === t - n ? 'cmp' : ''}">${v}</span>`).join('') + '<span class="now">?</span>';
      }

      function step() {
        // score the item that just finished
        if (t >= n) {
          const isMatch = seq[t] === seq[t - n];
          if (isMatch) {
            matches++;
            if (!pressed) {
              misses++;
              flashMsg('Missed a match!', 'bad');
            }
          }
        }
        t++;
        if (t >= seq.length) return end();
        pressed = false;
        root.querySelector('.pos').textContent = t + 1;
        const item = root.querySelector('.mb-item');
        item.textContent = seq[t];
        item.className = 'mb-item show' + (kid ? '' : ' letter');
        trail();
        timer = setTimeout(() => {
          item.className = 'mb-item';
          timer = setTimeout(step, 350);
        }, ms() - 350);
      }

      function flashMsg(text, cls) {
        const m = root.querySelector('.g-msg');
        m.className = 'g-msg ' + cls;
        m.textContent = text;
      }

      function press() {
        if (!running || pressed || t < 0) return;
        pressed = true;
        if (t >= n && seq[t] === seq[t - n]) {
          hits++;
          root.querySelector('.hit').textContent = hits;
          flashMsg('✓ Match!', 'good');
        } else {
          fas++;
          flashMsg(t < n ? 'Too early — nothing to compare yet.' : '✗ Not a match.', 'bad');
        }
      }

      function end() {
        running = false;
        const nonMatches = seq.length - n - matches;
        const hitRate = matches ? hits / matches : 1;
        const faRate = nonMatches ? fas / nonMatches : 0;
        finish(hitRate * 65 + (1 - J.clamp(faRate * 2, 0, 1)) * 35, `Caught ${hits} of ${matches} matches${fas ? `, ${fas} false alarm${fas === 1 ? '' : 's'}` : ''}.`);
      }

      function onKey(e) {
        if (e.code === 'Space' && running) {
          e.preventDefault();
          press();
        }
      }
      document.addEventListener('keydown', onKey);
      return {
        cleanup: () => {
          clearTimeout(timer);
          document.removeEventListener('keydown', onKey);
        },
        setHelpers(on) {
          helpers = on;
          if (running) trail();
        },
      };
    },
  });

  J._matchBack = { makeStream };
})();
