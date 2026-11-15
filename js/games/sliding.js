/* Sliding Puzzle — Spatial. Put the tiles back in order. Boards grow from 3×3 to
   4×4 and get scrambled more deeply as the level rises. Always solvable because
   the scramble is made of legal moves. */
(function () {
  const J = window.JOA;

  const CFG = [
    { n: 3, shuffle: 12 },
    { n: 3, shuffle: 20 },
    { n: 3, shuffle: 40 },
    { n: 3, shuffle: 120 },
    { n: 4, shuffle: 40 },
    { n: 4, shuffle: 70 },
    { n: 4, shuffle: 110 },
    { n: 4, shuffle: 180 },
    { n: 4, shuffle: 400 },
    { n: 5, shuffle: 300 },
    { n: 5, shuffle: 800 }, // Master: fully scrambled 5×5
  ];

  function neighbors(idx, n) {
    const r = Math.floor(idx / n), c = idx % n, out = [];
    if (r > 0) out.push(idx - n);
    if (r < n - 1) out.push(idx + n);
    if (c > 0) out.push(idx - 1);
    if (c < n - 1) out.push(idx + 1);
    return out;
  }

  function scramble(rng, n, moves) {
    const size = n * n;
    let board, blank;
    do {
      board = Array.from({ length: size }, (_, i) => (i + 1) % size); // 1..N-1, 0 = blank
      blank = size - 1;
      let prev = -1;
      for (let k = 0; k < moves; k++) {
        const opts = neighbors(blank, n).filter((x) => x !== prev);
        const t = rng.pick(opts);
        board[blank] = board[t];
        board[t] = 0;
        prev = blank;
        blank = t;
      }
    } while (isSolved(board));
    return board;
  }

  const isSolved = (b) => b.every((v, i) => v === (i + 1) % b.length);

  // Breadth-first search for the best next move (3×3 boards only — fast enough there).
  // Returns the index of the tile to slide into the gap, or -1.
  function bestMove(board, n) {
    if (n !== 3 || isSolved(board)) return -1;
    const goal = Array.from({ length: 9 }, (_, i) => (i + 1) % 9).join(',');
    const start = board.join(',');
    const firstMove = new Map([[start, -1]]);
    let frontier = [board.slice()];
    while (frontier.length) {
      const nextF = [];
      for (const b of frontier) {
        const key = b.join(',');
        const blank = b.indexOf(0);
        for (const t of neighbors(blank, n)) {
          const nb = b.slice();
          nb[blank] = nb[t];
          nb[t] = 0;
          const k = nb.join(',');
          if (firstMove.has(k)) continue;
          const fm = key === start ? t : firstMove.get(key);
          if (k === goal) return fm;
          firstMove.set(k, fm);
          nextF.push(nb);
        }
      }
      frontier = nextF;
    }
    return -1;
  }

  J.register({
    id: 'sliding',
    name: 'Slide Puzzle',
    icon: '🔲',
    skill: 'Spatial',
    color: '#0f9fb0',
    tagline: 'Slide the tiles back into order, 1 to the end.',
    why: 'Planning moves in your head trains spatial reasoning, planning and visual problem-solving.',
    howTo: 'Tap a tile next to the empty space to slide it in (tapping any tile in the same row or column slides the whole line). Arrow keys work too. Arrange the numbers in order, left to right, top to bottom, with the gap in the bottom-right corner. Fewer moves = higher score.',
    helpers: [
      'Tiles that can move have a <b>dashed outline</b>; tiles already in the right spot turn green.',
      'A small picture shows what the finished puzzle looks like.',
      '<b>Next move</b> lights up a good tile to slide (costs 2 points). <b>Undo</b> takes a move back.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      const { n, shuffle } = CFG[level - 1];
      const hist = J.seenHistory('sliding');
      let board = J.pickUnique(() => scramble(rng, n, shuffle), (b) => b.join(','), new Set(), hist);
      hist.save();
      let moves = 0, done = false, nextTile = -1, nextUsed = 0;
      const history = [];
      const target = n === 3 ? Math.min(shuffle, 40) : n === 4 ? Math.min(shuffle, 140) : 260;
      const goalGrid = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n))
        .map((v) => `<span class="${v ? '' : 'e'}">${v || ''}</span>`).join('');

      root.innerHTML = `
        <div class="g-bar"><span>${n}×${n}</span><span>Moves: <span class="mv">0</span></span><span class="muted">⏱ <span class="time">0:00</span></span></div>
        <div class="slide-grid" style="grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${n},1fr)"></div>
        <div class="g-center helper-only sl-help" style="margin-top:12px">
          <div class="tool-row" style="justify-content:center">
            ${n === 3 ? '<button class="btn ghost small next-btn">💡 Next move</button>' : ''}
            <button class="btn ghost small undo-btn">↩ Undo</button>
          </div>
          <div class="slide-goal">Finished puzzle:<br /><span class="slide-goal-grid" style="grid-template-columns:repeat(${n},22px)">${goalGrid}</span></div>
        </div>
        <p class="slide-goal sl-plain">Goal: 1, 2, 3… in order with the gap in the bottom-right.</p>`;
      const grid = root.querySelector('.slide-grid');
      const watch = J.stopwatch(root.querySelector('.time'));

      function render() {
        const movable = new Set(neighbors(board.indexOf(0), n));
        grid.innerHTML = board
          .map((v, i) => {
            if (v === 0) return `<div class="slide-tile empty" aria-hidden="true"></div>`;
            const cls = ['slide-tile'];
            if (v === i + 1) cls.push('home');
            if (helpers && movable.has(i)) cls.push('movable');
            if (helpers && i === nextTile) cls.push('next');
            return `<button class="${cls.join(' ')}" data-i="${i}">${v}</button>`;
          })
          .join('');
        root.querySelector('.mv').textContent = moves;
        root.querySelector('.sl-help').hidden = !helpers;
        root.querySelector('.sl-plain').hidden = helpers;
        root.querySelector('.undo-btn').disabled = !history.length || done;
      }

      // Slide every tile between `i` and the blank toward the blank.
      function slide(i) {
        if (done) return;
        const blank = board.indexOf(0);
        const br = Math.floor(blank / n), bc = blank % n, r = Math.floor(i / n), c = i % n;
        if (br !== r && bc !== c) return;
        history.push({ board: board.slice(), moves });
        nextTile = -1;
        const step = br === r ? (c < bc ? -1 : 1) : c < bc || r < br ? -n : n;
        let b = blank;
        while (b !== i) {
          board[b] = board[b + step];
          board[b + step] = 0;
          b += step;
          moves++;
        }
        render();
        if (isSolved(board)) {
          done = true;
          watch.stop();
          const score = Math.max(60, 70 + 30 * Math.min(1, target / moves) - nextUsed * 2);
          finish(score, `Solved in ${moves} moves (${J.fmtTime(watch.seconds())})${nextUsed ? ` with ${nextUsed} hint${nextUsed === 1 ? '' : 's'}` : ''}.`);
        }
      }

      grid.addEventListener('click', (e) => {
        const t = e.target.closest('[data-i]');
        if (t) slide(+t.dataset.i);
      });

      function onKey(e) {
        const blank = board.indexOf(0);
        const r = Math.floor(blank / n), c = blank % n;
        // Arrow = direction the tile moves, so the tile is on the opposite side of the blank.
        const map = { ArrowUp: r < n - 1 ? blank + n : -1, ArrowDown: r > 0 ? blank - n : -1, ArrowLeft: c < n - 1 ? blank + 1 : -1, ArrowRight: c > 0 ? blank - 1 : -1 };
        if (e.key in map) {
          e.preventDefault();
          if (map[e.key] >= 0) slide(map[e.key]);
        }
      }
      document.addEventListener('keydown', onKey);

      const nextBtn = root.querySelector('.next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (done) return;
          const blank = board.indexOf(0);
          const to = bestMove(board, n);
          nextUsed++;
          // bestMove gives the tile next to the gap that should slide in
          nextTile = to >= 0 && neighbors(blank, n).includes(to) ? to : -1;
          render();
        });
      }
      root.querySelector('.undo-btn').addEventListener('click', () => {
        if (done || !history.length) return;
        const h = history.pop();
        board = h.board;
        moves = h.moves;
        nextTile = -1;
        render();
      });

      render();
      return {
        cleanup: () => {
          watch.stop();
          document.removeEventListener('keydown', onKey);
        },
        setHelpers(on) {
          helpers = on;
          nextTile = -1;
          render();
        },
      };
    },
  });

  J._sliding = { scramble, isSolved, bestMove };
})();
