/* Light Trail — Sequence Memory. Pads light up in a growing sequence; repeat it.
   More pads, faster flashes and longer trails as levels rise; at the top levels
   you repeat it BACKWARDS. */
(function () {
  const J = window.JOA;

  const PADS = [
    { c: '#e03131', e: '🍎' }, { c: '#1c6fe0', e: '🐳' }, { c: '#1f9d55', e: '🐸' }, { c: '#e8b400', e: '⭐' },
    { c: '#8a3fd1', e: '🍇' }, { c: '#f0701e', e: '🦊' }, { c: '#0f9fb0', e: '💧' }, { c: '#d6438f', e: '🌸' }, { c: '#5b6270', e: '🐘' },
  ];

  J.register({
    id: 'lightTrail',
    name: 'Light Trail',
    icon: '💡',
    skill: 'Sequence Memory',
    color: '#d97706',
    tagline: 'Watch the lights, then repeat the trail. It grows every round!',
    why: 'Holding an ever-longer sequence in mind is a classic test and trainer of short-term memory and attention.',
    howTo: 'Watch the pads light up, then tap them in the same order. Each round adds one more step. Make a mistake and you lose a life. At the top levels, repeat the trail <b>backwards</b>! Reach the target length for a perfect score.',
    helpers: [
      'The lights flash <b>more slowly</b>.',
      '<b>Show me again</b> replays the trail once per round.',
      'You get <b>3 lives</b> instead of 2.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const nPads = level <= 3 ? 4 : level <= 6 ? 6 : 9;
      const cols = nPads === 4 ? 2 : 3;
      const startLen = 2 + Math.floor(level / 3); // 2 … 5
      const goal = startLen + 6 + (level >= 11 ? 2 : 0); // Master needs a longer trail
      const backwards = level >= 9;
      const baseFlash = Math.max(330, 820 - level * 50);
      const flashMs = () => (helpers ? baseFlash + 300 : baseFlash);
      let seq = [];
      let pos = 0, lives = helpers ? 3 : 2, best = 0, showing = false, replayed = false;
      let timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));

      root.innerHTML = `
        <div class="g-center g-start">
          <div style="font-size:3rem">💡</div>
          <h2>Ready?</h2>
          <p>Watch the trail, then repeat it${backwards ? ' <b>backwards</b> (last one first)' : ''}. Reach <b>${goal}</b> steps to win.</p>
          <button class="btn big start">Start</button>
        </div>`;
      root.querySelector('.start').addEventListener('click', build);

      function build() {
        root.innerHTML = `
          <div class="g-bar"><span>Trail: <span class="len">${startLen}</span> / ${goal}</span><span class="lives"></span></div>
          <div class="g-msg lt-msg">Watch…</div>
          <div class="lt-grid" style="grid-template-columns:repeat(${cols},1fr)">
            ${PADS.slice(0, nPads).map((p, k) => `<button class="lt-pad" data-k="${k}" style="--pad:${p.c}" disabled><span>${p.e}</span></button>`).join('')}
          </div>
          <div class="btn-row" style="justify-content:center"><button class="btn ghost small replay" hidden>🔁 Show me again</button></div>`;
        root.querySelector('.lt-grid').addEventListener('click', (e) => {
          const b = e.target.closest('.lt-pad');
          if (b && !showing) press(+b.dataset.k);
        });
        root.querySelector('.replay').addEventListener('click', () => {
          if (showing || replayed) return;
          replayed = true;
          pos = 0;
          play();
        });
        for (let i = 0; i < startLen; i++) seq.push(rng.int(0, nPads - 1));
        renderLives();
        later(play, 600);
      }

      function renderLives() {
        root.querySelector('.lives').textContent = '❤️'.repeat(lives);
        root.querySelector('.len').textContent = seq.length;
        root.querySelector('.replay').hidden = !helpers || replayed;
      }

      function setPads(disabled) {
        root.querySelectorAll('.lt-pad').forEach((p) => (p.disabled = disabled));
      }

      function flash(k, ms) {
        const pad = root.querySelector(`.lt-pad[data-k="${k}"]`);
        if (!pad) return;
        pad.classList.add('lit');
        later(() => pad.classList.remove('lit'), ms * 0.7);
      }

      function play() {
        showing = true;
        setPads(true);
        const msg = root.querySelector('.lt-msg');
        msg.className = 'g-msg lt-msg';
        msg.textContent = 'Watch…';
        const ms = flashMs();
        seq.forEach((k, i) => later(() => flash(k, ms), i * ms));
        later(() => {
          showing = false;
          setPads(false);
          msg.textContent = backwards ? 'Your turn — backwards!' : 'Your turn!';
          renderLives();
        }, seq.length * ms);
      }

      function press(k) {
        flash(k, 300);
        const want = backwards ? seq[seq.length - 1 - pos] : seq[pos];
        const msg = root.querySelector('.lt-msg');
        if (k !== want) {
          lives--;
          msg.className = 'g-msg lt-msg bad';
          if (lives <= 0) return end();
          msg.textContent = `Oops! ${lives} ${lives === 1 ? 'life' : 'lives'} left — watch again.`;
          pos = 0;
          setPads(true);
          renderLives();
          later(play, 1300);
          return;
        }
        pos++;
        if (pos < seq.length) return;
        best = seq.length;
        if (best >= goal) return end();
        msg.className = 'g-msg lt-msg good';
        msg.textContent = `✓ ${seq.length} in a row!`;
        seq.push(rng.int(0, nPads - 1));
        pos = 0;
        replayed = false;
        setPads(true);
        later(() => {
          renderLives();
          play();
        }, 900);
      }

      function end() {
        setPads(true);
        const steps = Math.max(0, best - startLen + 1);
        const score = best >= goal ? 100 : J.clamp((steps / (goal - startLen + 1)) * 90, 10, 90);
        finish(score, best ? `Longest trail: ${best} step${best === 1 ? '' : 's'} (goal ${goal}).` : 'Keep practicing — watch closely!');
      }

      return {
        cleanup: () => timers.forEach(clearTimeout),
        setHelpers(on) {
          helpers = on;
          if (root.querySelector('.lives')) renderLives();
        },
      };
    },
  });
})();
