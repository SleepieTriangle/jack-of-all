/* Sudoku — Logic. Generates a full grid, then removes clues while keeping a
   unique solution. Fewer clues at higher levels. */
(function () {
  const J = window.JOA;

  const box = (i) => (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0);
  const popcount = (m) => {
    let n = 0;
    while (m) {
      m &= m - 1;
      n++;
    }
    return n;
  };

  // Count solutions (stopping at `limit`). If `rng` is given, fill randomly and
  // stop at the first solution, leaving it in `grid`.
  function solve(grid, limit, rng) {
    const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
    for (let i = 0; i < 81; i++) {
      const v = grid[i];
      if (v) {
        const bit = 1 << v;
        rows[(i / 9) | 0] |= bit;
        cols[i % 9] |= bit;
        boxes[box(i)] |= bit;
      }
    }
    let count = 0;
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    function rec() {
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (grid[i]) continue;
        const mask = ~(rows[(i / 9) | 0] | cols[i % 9] | boxes[box(i)]) & 0x3fe;
        const n = popcount(mask);
        if (n < bestCount) {
          best = i;
          bestMask = mask;
          bestCount = n;
          if (n === 0) return false;
        }
      }
      if (best === -1) {
        count++;
        return count >= limit;
      }
      const r = (best / 9) | 0, c = best % 9, bx = box(best);
      const order = rng ? rng.shuffle(digits) : digits;
      for (const d of order) {
        const bit = 1 << d;
        if (!(bestMask & bit)) continue;
        grid[best] = d;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[bx] |= bit;
        if (rec()) return true;
        grid[best] = 0;
        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[bx] &= ~bit;
      }
      return false;
    }
    rec();
    return count;
  }

  // Very sparse targets are hard to reach in one try, so for the hardest levels
  // build several boards and keep the one with the fewest clues.
  function generate(rng, clues) {
    const tries = clues <= 24 ? 10 : clues <= 28 ? 3 : 1;
    let best = null;
    for (let t = 0; t < tries; t++) {
      const g = generateOnce(rng, clues);
      const n = g.puzzle.filter(Boolean).length;
      if (!best || n < best.n) best = Object.assign(g, { n });
      if (n <= clues) break;
    }
    return best;
  }

  function generateOnce(rng, clues) {
    const solution = new Array(81).fill(0);
    solve(solution, 1, rng);
    const puzzle = solution.slice();
    let filled = 81;
    for (const i of rng.shuffle([...Array(81).keys()])) {
      if (filled <= clues) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (solve(puzzle.slice(), 2) !== 1) puzzle[i] = keep;
      else filled--;
    }
    return { puzzle, solution };
  }

  const CLUES = [46, 42, 39, 36, 34, 32, 30, 28, 26, 24, 22]; // 11 = Master

  J.register({
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢',
    skill: 'Logic',
    color: '#2d7be5',
    tagline: 'Fill the grid so every row, column and box has 1–9.',
    why: 'Step-by-step deduction strengthens logical reasoning, working memory and patience.',
    howTo:
      'Fill every empty square so each row, each column and each 3×3 box contains the numbers 1–9 exactly once. Tap a square, then tap a number (or type it). Turn on <b>Notes</b> to pencil in possibilities. <b>Check</b> highlights mistakes and <b>Hint</b> fills one square — each costs a few points.',
    helpers: [
      'Numbers that clash with the same row, column or box turn <b style="color:#d64545">red</b> right away.',
      'Numbers that can\'t go in the selected square are crossed out on the keypad.',
      'A tip lists which numbers <b>can</b> go in the selected square.',
      '<b>Hints</b> are free.',
    ],
    // Hard grids can take a moment to build, so that happens in the background
    // worker while a "Building your puzzle…" message shows.
    mount(root, ctx) {
      const clues = CLUES[ctx.level - 1];
      const seed = (ctx.seed || 'sudoku') + ':sudoku:';
      const hist = J.seenHistory('sudoku');
      let inner = null, gone = false, helpersNow = ctx.helpers;
      root.innerHTML = '<div class="g-center g-start"><div class="spinner" aria-hidden="true"></div><p role="status">Building your puzzle…</p></div>';
      (async () => {
        let g;
        for (let t = 0; t < 5; t++) {
          g = await J.background('sudoku', { clues, seed: seed + t }, () => generate(J.makeRng(seed + t), clues));
          if (!hist.has(g.puzzle.join(''))) break; // never repeat a grid you've had
        }
        hist.add(g.puzzle.join(''));
        hist.save();
        if (!gone) inner = play(root, Object.assign({}, ctx, { helpers: helpersNow }), g.puzzle, g.solution);
      })();
      return {
        cleanup: () => {
          gone = true;
          if (inner) inner.cleanup();
        },
        setHelpers(on) {
          helpersNow = on;
          if (inner) inner.setHelpers(on);
        },
      };
    },
  });

  function play(root, ctx, puzzle, solution) {
      const { rng, finish } = ctx;
      let helpers = ctx.helpers;
      const vals = puzzle.slice();
      const notes = Array.from({ length: 81 }, () => new Set());
      const given = puzzle.map((v) => v !== 0);
      let sel = given.indexOf(false);
      let noteMode = false;
      let hints = 0, checks = 0, wrongMarked = new Set();
      let done = false;

      root.innerHTML = `
        <div class="g-bar"><span>Clues: ${puzzle.filter(Boolean).length}</span><span class="muted">⏱ <span class="time">0:00</span></span></div>
        <div class="sudoku-wrap">
          <div class="sudoku" role="grid" aria-label="Sudoku grid"></div>
          <div class="sudoku-side">
            <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}<button data-n="0" aria-label="Erase">⌫</button></div>
            <div class="tool-row">
              <button class="btn ghost small notes-btn">✏️ Notes</button>
              <button class="btn ghost small check-btn">Check</button>
              <button class="btn ghost small hint-btn">💡 Hint</button>
            </div>
            <div class="helper-tip sudoku-tip" hidden></div>
            <div class="g-msg"></div>
          </div>
        </div>`;
      const peersOf = (i) => {
        const r = (i / 9) | 0, c = i % 9, b = box(i), out = [];
        for (let k = 0; k < 81; k++) if (k !== i && (((k / 9) | 0) === r || k % 9 === c || box(k) === b)) out.push(k);
        return out;
      };
      const usedAround = (i) => new Set(peersOf(i).map((k) => vals[k]).filter(Boolean));
      const grid = root.querySelector('.sudoku');
      const msg = root.querySelector('.g-msg');
      const watch = J.stopwatch(root.querySelector('.time'));

      function render() {
        const sv = vals[sel];
        const sr = (sel / 9) | 0, scol = sel % 9, sb = box(sel);
        let html = '';
        for (let i = 0; i < 81; i++) {
          const r = (i / 9) | 0, c = i % 9;
          const cls = ['sc'];
          if (given[i]) cls.push('given');
          if (c === 2 || c === 5) cls.push('bx');
          if (r === 2 || r === 5) cls.push('by');
          if (sel >= 0) {
            if (i === sel) cls.push('sel');
            else if (sv && vals[i] === sv) cls.push('same');
            else if (r === sr || c === scol || box(i) === sb) cls.push('peer');
          }
          if (wrongMarked.has(i)) cls.push('wrong');
          else if (helpers && vals[i] && !given[i] && usedAround(i).has(vals[i])) cls.push('wrong');
          let inner = vals[i] || '';
          if (!vals[i] && notes[i].size) {
            inner = `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${notes[i].has(n) ? n : ''}</span>`).join('')}</span>`;
          }
          html += `<button class="${cls.join(' ')}" data-i="${i}" aria-label="Row ${r + 1} column ${c + 1}${vals[i] ? ', ' + vals[i] : ', empty'}">${inner}</button>`;
        }
        grid.innerHTML = html;
        // dim numbers that are fully placed
        root.querySelectorAll('.numpad [data-n]').forEach((b) => {
          const n = +b.dataset.n;
          b.classList.toggle('done', n > 0 && vals.filter((v) => v === n).length >= 9);
        });
        // beginner helpers: blocked numbers + candidate tip
        const tip = root.querySelector('.sudoku-tip');
        const open = sel >= 0 && !given[sel];
        const used = open ? usedAround(sel) : new Set();
        root.querySelectorAll('.numpad [data-n]').forEach((b) => {
          const n = +b.dataset.n;
          b.classList.toggle('blocked', helpers && open && n > 0 && used.has(n));
        });
        tip.hidden = !helpers;
        if (helpers) {
          if (!open) tip.innerHTML = 'Tap an empty square to see which numbers could go there.';
          else {
            const can = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n));
            tip.innerHTML = can.length === 1
              ? `Only <b>${can[0]}</b> fits here — every other number is already in this row, column or box!`
              : `Numbers that could fit here: <b>${can.join(', ')}</b>`;
          }
        }
      }

      function input(n) {
        if (done || sel < 0 || given[sel]) return;
        if (noteMode && n) {
          if (vals[sel]) return;
          notes[sel].has(n) ? notes[sel].delete(n) : notes[sel].add(n);
        } else {
          vals[sel] = vals[sel] === n ? 0 : n;
          notes[sel].clear();
          wrongMarked.delete(sel);
          if (n) {
            // clear this number from notes in peers
            const r = (sel / 9) | 0, c = sel % 9, b = box(sel);
            for (let i = 0; i < 81; i++) if ((((i / 9) | 0) === r || i % 9 === c || box(i) === b)) notes[i].delete(n);
          }
        }
        render();
        checkComplete();
      }

      function checkComplete() {
        if (vals.some((v) => !v)) {
          msg.textContent = '';
          return;
        }
        if (vals.every((v, i) => v === solution[i])) {
          done = true;
          watch.stop();
          msg.className = 'g-msg good';
          msg.textContent = 'Solved! 🎉';
          const score = 100 - hints * 12 - checks * 4;
          finish(Math.max(25, score), `Solved in ${J.fmtTime(watch.seconds())} with ${hints} hint${hints === 1 ? '' : 's'}.`);
        } else {
          msg.className = 'g-msg bad';
          msg.textContent = 'Grid is full, but something\'s off. Try Check.';
        }
      }

      grid.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        sel = +b.dataset.i;
        render();
      });
      root.querySelector('.numpad').addEventListener('click', (e) => {
        const b = e.target.closest('[data-n]');
        if (b) input(+b.dataset.n);
      });
      const notesBtn = root.querySelector('.notes-btn');
      notesBtn.addEventListener('click', () => {
        noteMode = !noteMode;
        notesBtn.classList.toggle('on', noteMode);
      });
      root.querySelector('.check-btn').addEventListener('click', () => {
        if (done) return;
        wrongMarked = new Set();
        vals.forEach((v, i) => {
          if (v && v !== solution[i]) wrongMarked.add(i);
        });
        if (wrongMarked.size) {
          checks++;
          msg.className = 'g-msg bad';
          msg.textContent = `${wrongMarked.size} square${wrongMarked.size === 1 ? ' is' : 's are'} wrong.`;
        } else {
          msg.className = 'g-msg good';
          msg.textContent = 'All good so far!';
        }
        render();
      });
      root.querySelector('.hint-btn').addEventListener('click', () => {
        if (done) return;
        let i = sel >= 0 && !given[sel] && vals[sel] !== solution[sel] ? sel : -1;
        if (i < 0) {
          const empties = vals.map((v, k) => (v !== solution[k] ? k : -1)).filter((k) => k >= 0);
          if (!empties.length) return;
          i = rng.pick(empties);
        }
        if (!helpers) hints++;
        vals[i] = solution[i];
        given[i] = true;
        notes[i].clear();
        wrongMarked.delete(i);
        sel = i;
        render();
        checkComplete();
      });

      function onKey(e) {
        if (done) return;
        if (e.key >= '1' && e.key <= '9') return input(+e.key);
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') return input(0);
        if (e.key === 'n' || e.key === 'N') return notesBtn.click();
        const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (mv) {
          e.preventDefault();
          sel = J.clamp((sel < 0 ? 0 : sel) + mv, 0, 80);
          render();
        }
      }
      document.addEventListener('keydown', onKey);
      render();
      return {
        cleanup: () => {
          watch.stop();
          document.removeEventListener('keydown', onKey);
        },
        setHelpers(on) {
          helpers = on;
          render();
        },
      };
  }

  J._sudoku = { generate, solve };
})();
