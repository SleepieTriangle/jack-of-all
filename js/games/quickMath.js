/* Quick Math — Mental Math. A timed sprint of arithmetic. Problems grow from
   "3 + 4" to two-step and percentage problems. Kid mode never goes negative. */
(function () {
  const J = window.JOA;

  // Each level returns a generator: () => [text, answer]
  function gen(r, L, kid) {
    const add = (max) => { const a = r.int(1, max), b = r.int(1, max); return [`${a} + ${b}`, a + b]; };
    const sub = (max) => { const a = r.int(2, max), b = r.int(1, a); return [`${a} − ${b}`, a - b]; };
    const mul = (maxA, maxB) => { const a = r.int(2, maxA), b = r.int(2, maxB); return [`${a} × ${b}`, a * b]; };
    const div = (maxA, maxB) => { const b = r.int(2, maxB), q = r.int(2, maxA); return [`${b * q} ÷ ${b}`, q]; };
    const pick = (...fs) => r.pick(fs)();
    switch (L) {
      case 1: return () => add(5);
      case 2: return () => pick(() => add(10), () => sub(10));
      case 3: return () => pick(() => add(20), () => sub(20), () => mul(5, r.pick([2, 5, 10])));
      case 4: return () => pick(() => add(50), () => sub(50), () => mul(10, 10));
      case 5: return () => pick(() => add(99), () => sub(99), () => mul(12, 10), () => div(10, 10));
      case 6: return () => pick(() => mul(12, 12), () => div(12, 12), () => { const a = r.int(20, 99), b = r.int(11, 99); return [`${a} + ${b}`, a + b]; });
      case 7: return () => pick(() => { const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, 20); return [`${a} × ${b} + ${c}`, a * b + c]; }, () => div(12, 12), () => { const a = r.int(50, 199), b = r.int(11, 49); return [`${a} − ${b}`, a - b]; });
      case 8: return () => pick(() => { const p = r.pick([10, 20, 25, 50]), n = r.int(1, 12) * (p === 25 ? 4 : 10); return [`${p}% of ${n}`, (p * n) / 100]; }, () => { const a = r.int(4, 15); return [`${a}²`, a * a]; }, () => mul(19, 9));
      case 9: return () => pick(() => mul(99, 9), () => { const a = r.int(2, 12), b = r.int(2, 12), c = r.int(1, Math.min(12, a * b - 1)); return [`${a} × ${b} − ${c}`, a * b - c]; }, () => kid ? add(500) : (() => { const a = r.int(-20, 20), b = r.int(-20, 20); return [`${a} + (${b})`, a + b]; })());
      default: return () => pick(() => mul(25, 19), () => { const a = r.int(11, 30); return [`${a}²`, a * a]; }, () => kid ? sub(500) : (() => { const a = r.int(-30, 30), b = r.int(2, 9); return [`${a} × ${b}`, a * b]; })(), () => { const p = r.pick([15, 30, 75]), n = r.int(1, 10) * 20; return [`${p}% of ${n}`, (p * n) / 100]; });
    }
  }

  const TARGET = [14, 14, 13, 12, 12, 11, 10, 10, 9, 8, 8]; // correct answers for a perfect score (11 = Master)

  J.register({
    id: 'quickMath',
    name: 'Quick Math',
    icon: '⚡',
    skill: 'Mental Math',
    color: '#2563eb',
    tagline: 'How many can you solve before the clock runs out?',
    why: 'Fast, accurate mental arithmetic keeps number sense and processing speed sharp at any age.',
    howTo: 'Solve as many problems as you can in 60 seconds. Type the answer — it moves on by itself the moment you get it right. Stuck? <b>Skip</b> it. Use the number pad or your keyboard.',
    helpers: ['You get <b>90 seconds</b> instead of 60.', 'Small sums also show as <b>dots to count</b> (●●● + ●●).'],
    mount(root, ctx) {
      const { rng, level, finish, kid } = ctx;
      let helpers = ctx.helpers;
      const next = gen(rng, level, kid);
      let duration = helpers ? 90 : 60;
      let correct = 0, skipped = 0, t0 = 0, timer = null, cur = null, val = '', running = false, last = '';

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">⚡</div>
          <h2>Ready?</h2>
          <p>Solve as many as you can in <b class="dur">${duration}</b> seconds. Aim for <b>${TARGET[level - 1]}</b>!</p>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', start);

      function start() {
        root.innerHTML = `
          <div class="g-bar"><span>✅ <span class="ok">0</span> / ${TARGET[level - 1]}</span><span class="muted">⏱ <span class="left">${duration}</span>s</span></div>
          <div class="cc-timer"><i></i></div>
          <div class="g-center">
            <div class="qm-problem"></div>
            <div class="qm-dots" hidden></div>
            <div class="qm-answer" aria-live="polite">&nbsp;</div>
            <div class="qm-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '−', 0, '⌫'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>
            <div class="btn-row" style="justify-content:center"><button class="btn ghost small skip">Skip ⏭</button></div>
          </div>`;
        root.querySelector('.qm-pad').addEventListener('click', (e) => {
          const b = e.target.closest('[data-k]');
          if (b) key(b.dataset.k);
        });
        root.querySelector('.skip').addEventListener('click', () => {
          if (!running) return;
          skipped++;
          newProblem();
        });
        running = true;
        t0 = performance.now();
        newProblem();
        tick();
      }

      function newProblem() {
        let p;
        do p = next(); while (p[0] === last);
        last = p[0];
        cur = p;
        val = '';
        root.querySelector('.qm-problem').textContent = `${p[0]} = ?`;
        dots();
        show();
      }

      // Helper: draw small + and − problems as dots to count.
      function dots() {
        const el = root.querySelector('.qm-dots');
        const m = cur && cur[0].match(/^(\d+) ([+−]) (\d+)$/);
        if (!helpers || !m || +m[1] > 10 || +m[3] > 10) {
          el.hidden = true;
          return;
        }
        el.hidden = false;
        el.innerHTML = m[2] === '+'
          ? `<span>${'●'.repeat(+m[1])}</span> + <span>${'●'.repeat(+m[3])}</span>`
          : `<span>${'●'.repeat(+m[1] - +m[3])}</span><s>${'●'.repeat(+m[3])}</s>`;
      }

      function show() {
        root.querySelector('.qm-answer').textContent = val || ' ';
      }

      function key(k) {
        if (!running) return;
        if (k === '⌫' || k === 'Backspace') val = val.slice(0, -1);
        else if (k === '−' || k === '-') val = val.startsWith('-') ? val.slice(1) : '-' + val;
        else if (k === '.' && !val.includes('.')) val += '.';
        else if (/^\d$/.test(k) && val.replace('-', '').length < 6) val += k;
        else if (k === 'Enter') {
          if (val && Number(val) !== cur[1]) {
            const a = root.querySelector('.qm-answer');
            a.classList.remove('shake');
            void a.offsetWidth;
            a.classList.add('shake');
          }
          return;
        }
        show();
        if (val !== '' && val !== '-' && Number(val) === cur[1]) {
          correct++;
          root.querySelector('.ok').textContent = correct;
          const a = root.querySelector('.qm-answer');
          a.classList.add('good');
          if (J.fx) J.fx.play('tap');
          setTimeout(() => a.classList.remove('good'), 150);
          newProblem();
        }
      }

      function tick() {
        const el = (performance.now() - t0) / 1000;
        const left = Math.max(0, duration - el);
        root.querySelector('.left').textContent = Math.ceil(left);
        root.querySelector('.cc-timer i').style.width = (left / duration) * 100 + '%';
        if (left <= 0) return end();
        timer = setTimeout(tick, 200);
      }

      function end() {
        running = false;
        const target = TARGET[level - 1] * (duration / 60);
        finish(J.clamp((correct / target) * 100, 0, 100), `${correct} correct in ${duration} seconds${skipped ? `, ${skipped} skipped` : ''}.`);
      }

      function onKey(e) {
        if (!running) return;
        if (/^\d$/.test(e.key) || ['Backspace', '-', '.', 'Enter'].includes(e.key)) {
          e.preventDefault();
          key(e.key);
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
          if (running) dots();
          if (!running && !t0) {
            duration = on ? 90 : 60;
            const d = root.querySelector('.dur');
            if (d) d.textContent = duration;
          }
        },
      };
    },
  });

  J._quickMath = { gen };
})();
