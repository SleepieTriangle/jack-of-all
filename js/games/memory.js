/* Memory Match — Memory. Flip cards to find pairs; bigger boards, look-alike
   symbols and faster flip-backs at higher levels. */
(function () {
  const J = window.JOA;

  const DISTINCT = ['🐶', '🍕', '🚀', '🌈', '🎸', '🐢', '🍉', '⚽', '🎈', '🦋', '🌻', '🍩', '🐙', '🎩', '🚲', '🧁', '🦁', '🍄', '🐝', '🎲'];
  const LOOKALIKE = ['😀', '😃', '😄', '😁', '😆', '😊', '🙂', '😉', '😌', '😍', '😎', '🤓', '😏', '🙃', '😋', '😛'];
  const PAIRS = [4, 5, 6, 6, 8, 8, 10, 10, 12, 12, 14]; // 11 = Master
  const COLS = { 8: 4, 10: 5, 12: 4, 16: 4, 20: 5, 24: 6, 28: 7 };

  J.register({
    id: 'memory',
    name: 'Memory Match',
    icon: '🃏',
    skill: 'Memory',
    color: '#d6438f',
    tagline: 'Remember where every card is hiding and find all the pairs.',
    why: 'Holding locations in mind exercises short-term and working memory — the brain\'s scratchpad.',
    howTo: 'Flip two cards at a time. If they match, they stay face up. If not, they flip back — remember what you saw! Find every pair in as few moves as you can. At higher levels the symbols look alike.',
    helpers: [
      '<b>Peek</b> shows every card for 2 seconds (twice per game).',
      'Cards you have already looked at get a 👀 so you know where you have been.',
      'Cards stay face up a little longer before flipping back.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const seen = new Set();
      let peeks = 2;
      const pairs = PAIRS[level - 1];
      const pool = level >= 8 ? LOOKALIKE : level >= 6 ? rng.shuffle(DISTINCT).slice(0, 8).concat(LOOKALIKE) : DISTINCT;
      // Rotate through the pictures: prefer ones this player hasn't had recently.
      const hist = J.seenHistory('memory');
      let faces = rng.shuffle(pool.filter((f) => !hist.has(f))).slice(0, pairs);
      if (faces.length < pairs) {
        hist.forget((f) => pool.includes(f) && !faces.includes(f));
        faces = faces.concat(rng.shuffle(pool.filter((f) => !faces.includes(f))).slice(0, pairs - faces.length));
      }
      faces.forEach((f) => hist.add(f));
      hist.save();
      const deck = rng.shuffle(faces.concat(faces));
      const cols = COLS[deck.length] || 4;
      const flipBack = Math.max(550, 1100 - level * 50);
      let up = [], matched = 0, moves = 0, lock = false;
      let timer = null;

      root.innerHTML = `
        <div class="g-bar"><span>Pairs: <span class="m">0</span>/${pairs}</span><span>Moves: <span class="mv">0</span></span><span class="muted">⏱ <span class="time">0:00</span></span><button class="btn ghost small peek">👀 Peek (2)</button></div>
        <div class="mem-grid" style="grid-template-columns:repeat(${cols},1fr);max-width:${cols * 100}px">
          ${deck.map((f, i) => `<button class="mem-card" data-i="${i}" aria-label="Hidden card"><div class="mem-inner"><div class="mem-face mem-back">?</div><div class="mem-face mem-front">${f}</div></div></button>`).join('')}
        </div>`;
      const watch = J.stopwatch(root.querySelector('.time'));
      const cards = [...root.querySelectorAll('.mem-card')];
      cards.forEach((c, k) => c.setAttribute('aria-label', `Card ${k + 1}, face down`));
      // Screen readers hear what happens after each pair.
      const live = document.createElement('div');
      live.className = 'sr-only';
      live.setAttribute('aria-live', 'polite');
      root.appendChild(live);
      const announce = (t) => (live.textContent = t);
      const peekBtn = root.querySelector('.peek');

      function syncHelpers() {
        cards.forEach((c) => c.classList.toggle('seen', helpers && seen.has(+c.dataset.i)));
        peekBtn.hidden = !helpers || peeks <= 0;
      }

      peekBtn.addEventListener('click', () => {
        if (lock || peeks <= 0) return;
        peeks--;
        peekBtn.textContent = `👀 Peek (${peeks})`;
        lock = true;
        const hidden = cards.filter((c) => !c.classList.contains('up') && !c.classList.contains('matched'));
        hidden.forEach((c) => c.classList.add('up'));
        timer = setTimeout(() => {
          hidden.forEach((c) => c.classList.remove('up'));
          lock = false;
          syncHelpers();
        }, 2000);
      });

      root.querySelector('.mem-grid').addEventListener('click', (e) => {
        const c = e.target.closest('.mem-card');
        if (!c || lock || c.classList.contains('up') || c.classList.contains('matched')) return;
        seen.add(+c.dataset.i);
        c.classList.add('up');
        c.setAttribute('aria-label', deck[+c.dataset.i]);
        up.push(c);
        if (up.length < 2) return;
        moves++;
        root.querySelector('.mv').textContent = moves;
        const [a, b] = up;
        if (deck[+a.dataset.i] === deck[+b.dataset.i]) {
          announce(`Match! ${deck[+a.dataset.i]}`);
          if (J.fx) J.fx.play('good');
          a.classList.add('matched');
          b.classList.add('matched');
          up = [];
          matched++;
          root.querySelector('.m').textContent = matched;
          if (matched === pairs) {
            watch.stop();
            const score = J.clamp((100 * 1.6 * pairs) / moves, 30, 100);
            finish(score, `All ${pairs} pairs in ${moves} moves (${J.fmtTime(watch.seconds())}).`);
          }
        } else {
          announce(`No match: ${deck[+a.dataset.i]} and ${deck[+b.dataset.i]}`);
          lock = true;
          timer = setTimeout(() => {
            a.classList.remove('up');
            b.classList.remove('up');
            a.setAttribute('aria-label', 'Hidden card');
            b.setAttribute('aria-label', 'Hidden card');
            up = [];
            lock = false;
            syncHelpers();
          }, flipBack + (helpers ? 700 : 0));
        }
      });
      syncHelpers();
      return {
        cleanup: () => {
          watch.stop();
          clearTimeout(timer);
        },
        setHelpers(on) {
          helpers = on;
          syncHelpers();
        },
      };
    },
  });
})();
