/* Color Clash — Attention. A Stroop-style focus test: tap the INK color, not the
   word. Higher levels add colors, shrink the time limit and mix in rule switches. */
(function () {
  const J = window.JOA;

  const COLORS = [
    { name: 'RED', hex: '#e03131' },
    { name: 'BLUE', hex: '#1c6fe0' },
    { name: 'GREEN', hex: '#1f9d55' },
    { name: 'YELLOW', hex: '#e8b400' },
    { name: 'PURPLE', hex: '#8a3fd1' },
    { name: 'ORANGE', hex: '#f0701e' },
  ];

  // Color-blind friendly set (based on the Okabe–Ito palette): these stay
  // distinguishable for the common types of color blindness.
  const SAFE_COLORS = [
    { name: 'BLUE', hex: '#0072B2' },
    { name: 'ORANGE', hex: '#E69F00' },
    { name: 'BLACK', hex: '#1a1a1a' },
    { name: 'YELLOW', hex: '#D9C400' },
    { name: 'PINK', hex: '#CC79A7' },
    { name: 'SKY', hex: '#56B4E9' },
  ];

  J.register({
    id: 'colorClash',
    name: 'Color Clash',
    icon: '🎨',
    skill: 'Attention',
    color: '#e03a52',
    tagline: 'Tap the ink color, not the word. Harder than it sounds!',
    why: 'Ignoring the automatic urge to read trains focus, self-control and mental flexibility.',
    howTo: 'A color word appears in a different ink color. Tap the button matching the <b>INK</b> color as fast as you can. At higher levels a black <b>WORD</b> label sometimes appears — then match the word instead! Keys 1–6 work too. 24 rounds.',
    helpers: [
      'You get <b>extra time</b> for each word.',
      'A <b>color stripe</b> under the word shows the color to tap.',
      'Practice your first 3 words without a timer.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const TRIALS = 24;
      const nColors = level <= 3 ? 3 : level <= 6 ? 4 : level <= 8 ? 5 : 6;
      const colorSafe = J.getState().settings.colorSafe;
      const palette = (colorSafe ? SAFE_COLORS : COLORS).slice(0, nColors);
      const baseLimit = Math.round(4200 - (level - 1) * 320); // ms per round
      let limit = helpers ? baseLimit * 1.6 : baseLimit;
      const congruent = Math.max(0.1, 0.45 - level * 0.035);
      const switchRate = level >= 6 ? 0.15 + (level - 6) * 0.05 : 0;
      // Never show the same word in the same ink twice in a row.
      const trials = [];
      while (trials.length < TRIALS) {
        const word = rng.pick(palette);
        const ink = rng.chance(congruent) ? word : rng.pick(palette.filter((c) => c !== word));
        const prev = trials[trials.length - 1];
        if (prev && prev.word === word && prev.ink === ink) continue;
        trials.push({ word, ink, rule: rng.chance(switchRate) ? 'word' : 'ink' });
      }
      let i = 0, correct = 0, rtTotal = 0, rtN = 0, t0 = 0, timer = null, raf = null, active = false;

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">🎨</div>
          <h2>Ready?</h2>
          <p>Tap the color of the <b>ink</b>, not the word. You have <span class="limit-txt">${(limit / 1000).toFixed(1)}</span>s per word${switchRate ? ', and watch for the <b>WORD</b> label' : ''}.</p>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', countdown);

      function countdown() {
        let n = 3;
        root.innerHTML = `<div class="g-center g-start"><div class="result-score cd">${n}</div></div>`;
        const tick = () => {
          n--;
          if (n === 0) return build();
          root.querySelector('.cd').textContent = n;
          timer = setTimeout(tick, 650);
        };
        timer = setTimeout(tick, 650);
      }

      function build() {
        root.innerHTML = `
          <div class="g-bar"><span>Round <span class="rn">1</span> of ${TRIALS}</span><span class="muted">✅ <span class="ok">0</span></span></div>
          <div class="cc-stage g-center">
            <span class="cc-rule ink">Match the INK</span>
            <div class="cc-word" style="width:100%"></div>
            <div class="cc-timer" style="width:100%"><i></i></div>
            <div class="helper-tip cc-practice" hidden style="margin:-6px 0 12px;width:100%">Practice word — no timer. Tap the color of the <b>letters</b>.</div>
            <div class="cc-btns" style="width:100%">${palette.map((c, k) => `<button class="cc-btn" data-k="${k}" style="background:${c.hex}">${c.name}<kbd>${k + 1}</kbd></button>`).join('')}</div>
            <div class="g-msg"></div>
          </div>`;
        root.querySelector('.cc-btns').addEventListener('click', (e) => {
          const b = e.target.closest('.cc-btn');
          if (b) answer(+b.dataset.k);
        });
        next();
      }

      function next() {
        if (i >= TRIALS) return end();
        const t = trials[i];
        root.querySelector('.rn').textContent = i + 1;
        const ruleEl = root.querySelector('.cc-rule');
        ruleEl.className = 'cc-rule ' + t.rule;
        ruleEl.textContent = t.rule === 'ink' ? 'Match the INK' : 'Match the WORD';
        const w = root.querySelector('.cc-word');
        w.textContent = t.word.name;
        w.style.color = t.ink.hex;
        const target = t.rule === 'ink' ? t.ink : t.word;
        w.style.boxShadow = helpers ? `inset 0 -12px 0 ${target.hex}` : '';
        const practice = helpers && i < 3; // first 3 words untimed with helpers
        root.querySelector('.cc-practice').hidden = !practice;
        t0 = performance.now();
        active = true;
        const bar = root.querySelector('.cc-timer i');
        bar.style.width = '100%';
        if (practice) return;
        const step = () => {
          const f = 1 - (performance.now() - t0) / limit;
          bar.style.width = Math.max(0, f * 100) + '%';
          if (f <= 0) return answer(-1);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }

      function answer(k) {
        if (!active) return;
        active = false;
        cancelAnimationFrame(raf);
        const t = trials[i];
        const target = t.rule === 'ink' ? t.ink : t.word;
        const rt = performance.now() - t0;
        const msg = root.querySelector('.g-msg');
        if (k >= 0 && palette[k] === target) {
          correct++;
          if (!(helpers && i < 3)) {
            rtTotal += rt;
            rtN++;
          }
          msg.className = 'g-msg good';
          msg.textContent = `✓ ${(rt / 1000).toFixed(2)}s`;
        } else {
          msg.className = 'g-msg bad';
          msg.textContent = k < 0 ? 'Too slow!' : `✗ It was ${target.name}`;
        }
        root.querySelector('.ok').textContent = correct;
        i++;
        timer = setTimeout(next, 380);
      }

      function end() {
        const acc = correct / TRIALS;
        const avgRt = rtN ? rtTotal / rtN : limit;
        const speed = J.clamp(1 - avgRt / limit, 0, 1);
        finish(acc * 80 + speed * 20 * acc, `${correct} of ${TRIALS} correct · average ${(avgRt / 1000).toFixed(2)}s per answer.`);
      }

      function onKey(e) {
        const k = parseInt(e.key, 10);
        if (k >= 1 && k <= palette.length) answer(k - 1);
      }
      document.addEventListener('keydown', onKey);
      return {
        cleanup: () => {
          clearTimeout(timer);
          cancelAnimationFrame(raf);
          document.removeEventListener('keydown', onKey);
        },
        setHelpers(on) {
          helpers = on;
          limit = on ? baseLimit * 1.6 : baseLimit;
          const w = root.querySelector('.cc-word');
          if (w && !on) w.style.boxShadow = '';
          const intro = root.querySelector('.limit-txt');
          if (intro) intro.textContent = (limit / 1000).toFixed(1);
        },
      };
    },
  });
})();
