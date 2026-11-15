/* Chess — Strategy. Full rules (castling, en passant, promotion) vs. a computer
   opponent whose search depth and accuracy scale with the level. */
(function () {
  const J = window.JOA;

  const N_OFF = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const K_OFF = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const B_DIR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const R_DIR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const colorOf = (p) => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
  const opp = (c) => (c === 'w' ? 'b' : 'w');
  const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  function initial() {
    const rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
    const b = [];
    rows.forEach((r) => {
      for (const ch of r) b.push(ch === '.' ? null : ch);
    });
    return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0 };
  }

  function attacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7;
    const w = by === 'w';
    const pr = w ? r + 1 : r - 1;
    const pawn = w ? 'P' : 'p';
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
      if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
    }
    const kn = w ? 'N' : 'n', kg = w ? 'K' : 'k';
    for (const [dr, dc] of N_OFF) if (onBoard(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === kn) return true;
    for (const [dr, dc] of K_OFF) if (onBoard(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === kg) return true;
    const slide = (dirs, a, q) => {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (onBoard(rr, cc)) {
          const p = b[rr * 8 + cc];
          if (p) {
            if (p === a || p === q) return true;
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
      return false;
    };
    return slide(B_DIR, w ? 'B' : 'b', w ? 'Q' : 'q') || slide(R_DIR, w ? 'R' : 'r', w ? 'Q' : 'q');
  }

  function pseudo(s) {
    const { b, turn } = s;
    const moves = [];
    const enemy = opp(turn);
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || colorOf(p) !== turn) continue;
      const r = sq >> 3, c = sq & 7, t = p.toLowerCase();
      if (t === 'p') {
        const dir = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, last = turn === 'w' ? 0 : 7;
        const r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        if (!b[r1 * 8 + c]) {
          moves.push({ from: sq, to: r1 * 8 + c, promo: r1 === last });
          if (r === start && !b[(r + 2 * dir) * 8 + c]) moves.push({ from: sq, to: (r + 2 * dir) * 8 + c, double: true });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc;
          if (b[to] && colorOf(b[to]) === enemy) moves.push({ from: sq, to, promo: r1 === last });
          else if (to === s.ep) moves.push({ from: sq, to, ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of t === 'n' ? N_OFF : K_OFF) {
          const rr = r + dr, cc = c + dc;
          if (!onBoard(rr, cc)) continue;
          const to = rr * 8 + cc;
          if (!b[to] || colorOf(b[to]) === enemy) moves.push({ from: sq, to });
        }
        if (t === 'k') {
          const home = turn === 'w' ? 60 : 4;
          const rook = turn === 'w' ? 'R' : 'r';
          if (sq === home && !attacked(b, sq, enemy)) {
            const ks = turn === 'w' ? 'K' : 'k', qs = turn === 'w' ? 'Q' : 'q';
            if (s.castle[ks] && !b[home + 1] && !b[home + 2] && b[home + 3] === rook &&
                !attacked(b, home + 1, enemy) && !attacked(b, home + 2, enemy))
              moves.push({ from: sq, to: home + 2, castle: 'k' });
            if (s.castle[qs] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === rook &&
                !attacked(b, home - 1, enemy) && !attacked(b, home - 2, enemy))
              moves.push({ from: sq, to: home - 2, castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'b' ? B_DIR : t === 'r' ? R_DIR : B_DIR.concat(R_DIR);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (onBoard(rr, cc)) {
            const to = rr * 8 + cc;
            if (b[to]) {
              if (colorOf(b[to]) === enemy) moves.push({ from: sq, to });
              break;
            }
            moves.push({ from: sq, to });
            rr += dr;
            cc += dc;
          }
        }
      }
    }
    return moves;
  }

  function make(s, m) {
    const b = s.b.slice();
    const p = b[m.from];
    const captured = b[m.to];
    b[m.to] = p;
    b[m.from] = null;
    if (m.ep) b[m.to + (s.turn === 'w' ? 8 : -8)] = null;
    // promo is true (computer: always a queen) or the piece the player chose: 'q' 'r' 'b' 'n'
    if (m.promo) {
      const p = typeof m.promo === 'string' ? m.promo : 'q';
      b[m.to] = s.turn === 'w' ? p.toUpperCase() : p.toLowerCase();
    }
    if (m.castle === 'k') {
      b[m.to - 1] = b[m.to + 1];
      b[m.to + 1] = null;
    } else if (m.castle === 'q') {
      b[m.to + 1] = b[m.to - 2];
      b[m.to - 2] = null;
    }
    const castle = Object.assign({}, s.castle);
    if (p === 'K') castle.K = castle.Q = false;
    if (p === 'k') castle.k = castle.q = false;
    for (const sq of [m.from, m.to]) {
      if (sq === 63) castle.K = false;
      if (sq === 56) castle.Q = false;
      if (sq === 7) castle.k = false;
      if (sq === 0) castle.q = false;
    }
    return {
      b,
      turn: opp(s.turn),
      castle,
      ep: m.double ? (m.from + m.to) / 2 : -1,
      half: p.toLowerCase() === 'p' || captured || m.ep ? 0 : s.half + 1,
    };
  }

  const kingSq = (b, color) => b.indexOf(color === 'w' ? 'K' : 'k');
  const inCheck = (s) => attacked(s.b, kingSq(s.b, s.turn), opp(s.turn));
  const legal = (s) =>
    pseudo(s).filter((m) => {
      const n = make(s, m);
      return !attacked(n.b, kingSq(n.b, s.turn), n.turn);
    });

  // ---------- evaluation ----------
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };

  function evaluate(b) {
    // Positive = good for white.
    let score = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p) continue;
      const t = p.toLowerCase();
      if (p === t) {
        const mirror = (7 - (sq >> 3)) * 8 + (sq & 7);
        score -= VAL[t] + PST[t][mirror];
      } else {
        score += VAL[t] + PST[t][sq];
      }
    }
    return score;
  }

  function orderMoves(s, moves) {
    return moves
      .map((m) => {
        const victim = s.b[m.to];
        const k = (victim ? 10 * VAL[victim.toLowerCase()] - VAL[s.b[m.from].toLowerCase()] / 10 : 0) + (m.promo ? 800 : 0);
        return [k, m];
      })
      .sort((a, b) => b[0] - a[0])
      .map((x) => x[1]);
  }

  const MATE = 100000;

  function quiesce(s, alpha, beta, depth) {
    const stand = s.turn === 'w' ? evaluate(s.b) : -evaluate(s.b);
    if (depth === 0 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const caps = orderMoves(s, pseudo(s).filter((m) => s.b[m.to] || m.promo));
    for (const m of caps) {
      const n = make(s, m);
      if (attacked(n.b, kingSq(n.b, s.turn), n.turn)) continue;
      const sc = -quiesce(n, -beta, -alpha, depth - 1);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply, useQ) {
    if (depth === 0) return useQ ? quiesce(s, alpha, beta, 4) : s.turn === 'w' ? evaluate(s.b) : -evaluate(s.b);
    const moves = legal(s);
    if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
    let best = -Infinity;
    for (const m of orderMoves(s, moves)) {
      const sc = -negamax(make(s, m), depth - 1, -beta, -alpha, ply + 1, useQ);
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    return best;
  }

  const AI = {
    1: { d: 1, noise: 450, q: false },
    2: { d: 1, noise: 250, q: false },
    3: { d: 1, noise: 120, q: true },
    4: { d: 2, noise: 120, q: false },
    5: { d: 2, noise: 60, q: true },
    6: { d: 2, noise: 25, q: true },
    7: { d: 3, noise: 50, q: false },
    8: { d: 3, noise: 25, q: true },
    9: { d: 3, noise: 10, q: true },
    10: { d: 3, noise: 0, q: true },
    11: { d: 4, noise: 0, q: true }, // Master: looks one move further ahead
  };

  function chooseMove(s, level, rng) {
    const cfg = AI[level] || AI[5];
    const moves = legal(s);
    let best = null, bestScore = -Infinity;
    for (const m of orderMoves(s, moves)) {
      const n = make(s, m);
      let sc = -negamax(n, cfg.d - 1, -Infinity, Infinity, 1, cfg.q);
      sc += rng.next() * cfg.noise;
      if (sc > bestScore) {
        bestScore = sc;
        best = m;
      }
    }
    return best;
  }

  // ---------- notation ----------
  const FILES = 'abcdefgh';
  const sqName = (sq) => FILES[sq & 7] + (8 - (sq >> 3));
  function san(s, m) {
    const p = s.b[m.from].toUpperCase();
    if (m.castle) return m.castle === 'k' ? 'O-O' : 'O-O-O';
    const cap = s.b[m.to] || m.ep;
    let txt = p === 'P' ? (cap ? FILES[m.from & 7] + 'x' : '') : p + (cap ? 'x' : '');
    txt += sqName(m.to) + (m.promo ? '=' + (typeof m.promo === 'string' ? m.promo.toUpperCase() : 'Q') : '');
    const n = make(s, m);
    if (inCheck(n)) txt += legal(n).length ? '+' : '#';
    return txt;
  }

  const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const PIECE_TIPS = {
    p: '<b>♟ Pawn</b> moves straight forward 1 square (2 on its very first move), but captures 1 square <b>diagonally</b>. Reach the far side and it becomes a queen!',
    n: '<b>♞ Knight</b> moves in an <b>L shape</b>: 2 squares one way, then 1 to the side. It is the only piece that can jump over others.',
    b: '<b>♝ Bishop</b> slides <b>diagonally</b> as far as it likes, until something is in the way.',
    r: '<b>♜ Rook</b> slides in <b>straight lines</b>: up, down, left or right, as far as it likes.',
    q: '<b>♛ Queen</b> is your strongest piece. It slides <b>any direction</b>, straight or diagonal, as far as it likes. Keep her safe!',
    k: '<b>♚ King</b> moves just <b>1 square</b> in any direction. Protect it: if it is trapped (checkmate), you lose.',
  };

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const pieceHtml = (p) => `<span class="pc ${colorOf(p)}">${GLYPH[p.toLowerCase()]}&#xFE0E;</span>`;

  function insufficient(b) {
    const rest = b.filter((p) => p && p.toLowerCase() !== 'k');
    return rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0].toLowerCase()));
  }

  J.register({
    id: 'chess',
    name: 'Chess',
    icon: '♞',
    skill: 'Strategy',
    color: '#6c4cf1',
    tagline: 'Outthink the computer. It plays a little smarter every day.',
    why: 'Planning ahead, weighing options and predicting your opponent builds strategic thinking and focus.',
    howTo:
      'You play White and move first. Tap a piece to see where it can go (dots), then tap a square to move. Pawns that reach the far side become queens. Checkmate the black king to win. A win scores 100, a draw 60, and finishing a game still earns points for the workout.',
    helpers: [
      'Tap any piece to learn how it moves.',
      '<b style="color:#e03131">Red dots</b> warn you that the computer could capture your piece on that square.',
      '<b>Suggest a move</b> shows a good move when you are stuck.',
      '<b>Undo</b> takes back your last move.',
    ],
    mount(root, ctx) {
      const { rng, level, finish } = ctx;
      let helpers = ctx.helpers;
      let suggestion = null;
      const undoStack = [];
      let s = initial();
      let sel = -1;
      let targets = [];
      let last = null;
      let over = false;
      let thinking = false;
      let ply = 0;
      const history = [];
      const capturedByWhite = [], capturedByBlack = [];
      let aiTimer = null, gone = false;

      root.innerHTML = `
        <div class="chess-wrap">
          <div class="chess-board" role="grid" aria-label="Chess board"></div>
          <div class="chess-side">
            <div class="chess-status"></div>
            <div class="helper-only chess-help">
              <div class="helper-tip piece-tip"></div>
              <div class="chess-legend">Dots:<i style="background:rgba(20,20,20,.35)"></i>safe<i style="background:#e03131"></i>could be captured</div>
              <div class="tool-row" style="margin-top:8px">
                <button class="btn ghost small suggest-btn">💡 Suggest a move</button>
                <button class="btn ghost small undo-btn">↩ Undo</button>
              </div>
            </div>
            <div><div class="muted small">You captured</div><div class="chess-caps cw"></div></div>
            <div><div class="muted small">Computer captured</div><div class="chess-caps cb"></div></div>
            <div class="chess-moves"></div>
            <button class="btn ghost small resign">Resign</button>
          </div>
        </div>`;
      const boardEl = root.querySelector('.chess-board');
      const statusEl = root.querySelector('.chess-status');
      const movesEl = root.querySelector('.chess-moves');

      function status(text) {
        statusEl.textContent = text;
      }

      function render() {
        const checkSq = inCheck(s) ? kingSq(s.b, s.turn) : -1;
        let html = '';
        for (let sq = 0; sq < 64; sq++) {
          const r = sq >> 3, c = sq & 7;
          const cls = ['sq', (r + c) % 2 ? 'd' : 'l'];
          if (sq === sel) cls.push('sel');
          if (last && (sq === last.from || sq === last.to)) cls.push('last');
          if (sq === checkSq) cls.push('check');
          const t = targets.find((m) => m.to === sq);
          if (t) {
            cls.push('hint', s.b[sq] || t.ep ? 'cap' : '');
            if (helpers && attacked(make(s, t).b, t.to, 'b')) cls.push('danger');
          }
          if (helpers && suggestion && sq === suggestion.to) cls.push('suggest');
          const p = s.b[sq];
          html += `<button class="${cls.join(' ')}" data-sq="${sq}" aria-label="${sqName(sq)}${p ? ' ' + p : ''}">
            ${p ? pieceHtml(p) : ''}
            ${r === 7 ? `<span class="coord f">${FILES[c]}</span>` : ''}${c === 0 ? `<span class="coord r">${8 - r}</span>` : ''}
          </button>`;
        }
        boardEl.innerHTML = html;
        root.querySelector('.cw').innerHTML = capturedByWhite.map(pieceHtml).join('');
        root.querySelector('.cb').innerHTML = capturedByBlack.map(pieceHtml).join('');
        let mv = '';
        for (let i = 0; i < history.length; i += 2) mv += `${i / 2 + 1}. ${history[i]} ${history[i + 1] || ''}&nbsp; `;
        movesEl.innerHTML = mv;
        movesEl.scrollTop = movesEl.scrollHeight;
        renderHelp();
      }

      function renderHelp() {
        const box = root.querySelector('.chess-help');
        box.hidden = !helpers;
        if (!helpers) return;
        let tip;
        if (sel >= 0 && s.b[sel]) {
          tip = PIECE_TIPS[s.b[sel].toLowerCase()];
          if (!targets.length) tip += ' <b>This piece has no moves right now.</b>';
        } else if (!over && !thinking && inCheck(s)) {
          tip = '<b>Your king is in check!</b> You must move the king, block the attack, or capture the attacker.';
        } else {
          tip = 'Tap one of your white pieces to see how it moves.';
        }
        root.querySelector('.piece-tip').innerHTML = tip;
        root.querySelector('.undo-btn').disabled = !undoStack.length || over || thinking;
        root.querySelector('.suggest-btn').disabled = over || thinking;
      }

      function snapshot() {
        undoStack.push({ s, last, ply, hist: history.length, cw: capturedByWhite.length, cb: capturedByBlack.length });
      }

      function apply(m) {
        const victim = m.ep ? (s.turn === 'w' ? 'p' : 'P') : s.b[m.to];
        if (victim) (s.turn === 'w' ? capturedByWhite : capturedByBlack).push(victim);
        history.push(san(s, m));
        s = make(s, m);
        last = m;
        ply++;
      }

      function checkEnd() {
        const moves = legal(s);
        if (!moves.length) {
          over = true;
          if (inCheck(s)) {
            if (s.turn === 'b') {
              status('Checkmate — you win! 🏆');
              finish(100, `Checkmate in ${Math.ceil(ply / 2)} moves.`);
            } else {
              status('Checkmate — the computer wins.');
              finish(materialScore(30), 'Checkmated — but you got a real strategy workout.');
            }
          } else {
            status('Stalemate — it\'s a draw.');
            finish(60, 'Stalemate. A draw!');
          }
          return true;
        }
        if (s.half >= 100 || insufficient(s.b) || ply >= 300) {
          over = true;
          status('Draw.');
          finish(60, 'The game ended in a draw.');
          return true;
        }
        return false;
      }

      // A loss still scores something, nudged up by how much material you won.
      function materialScore(base) {
        const mine = capturedByWhite.reduce((a, p) => a + VAL[p.toLowerCase()], 0);
        return base + Math.min(25, Math.round(mine / 100) * 2);
      }

      // The computer thinks in the background worker so the board never freezes.
      let aiGen = 0;
      function aiTurn() {
        thinking = true;
        status('Computer is thinking…');
        render();
        const gen = ++aiGen;
        const seed = (ctx.seed || 'chess') + ':ai:' + ply;
        const started = Date.now();
        J.background('chessMove', { state: s, level, seed }, () => chooseMove(s, level, J.makeRng(seed))).then((m) => {
          // keep a short pause so the move doesn't appear instantly
          aiTimer = setTimeout(() => {
            if (gone || gen !== aiGen || over) return;
            apply(m);
            thinking = false;
            sel = -1;
            targets = [];
            render();
            if (!checkEnd()) status(inCheck(s) ? 'Check! Protect your king.' : 'Your move.');
          }, Math.max(0, 350 - (Date.now() - started)));
        });
      }

      function playerMove(mv) {
        snapshot();
        suggestion = null;
        apply(mv);
        sel = -1;
        targets = [];
        render();
        if (!checkEnd()) aiTurn();
      }

      // Pawn reached the far side: let the player choose what it becomes.
      function choosePromotion(mv) {
        const pick = document.createElement('div');
        pick.className = 'promo-pick';
        pick.setAttribute('role', 'dialog');
        pick.setAttribute('aria-label', 'Choose a piece for your pawn');
        pick.innerHTML = `<p><b>Your pawn made it!</b> Turn it into:</p><div class="promo-row">${['q', 'r', 'b', 'n']
          .map((p) => `<button class="choice" data-p="${p}" aria-label="${PIECE_NAMES[p]}">${pieceHtml(p.toUpperCase())}<small>${PIECE_NAMES[p]}</small></button>`)
          .join('')}</div>`;
        root.querySelector('.chess-wrap').appendChild(pick);
        pick.querySelector('button').focus();
        pick.addEventListener('click', (e) => {
          const b = e.target.closest('[data-p]');
          if (!b) return;
          pick.remove();
          playerMove(Object.assign({}, mv, { promo: b.dataset.p }));
        });
      }

      boardEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sq]');
        if (!btn || over || thinking || root.querySelector('.promo-pick')) return;
        const sq = +btn.dataset.sq;
        const mv = targets.find((m) => m.to === sq);
        if (mv) {
          if (mv.promo) return choosePromotion(mv);
          playerMove(mv);
          return;
        }
        if (s.b[sq] && colorOf(s.b[sq]) === 'w') {
          sel = sq === sel ? -1 : sq;
          targets = sel === -1 ? [] : legal(s).filter((m) => m.from === sq);
        } else {
          sel = -1;
          targets = [];
        }
        render();
      });

      root.querySelector('.resign').addEventListener('click', () => {
        if (over) return;
        if (!confirm('Resign this game?')) return;
        over = true;
        status('You resigned.');
        finish(materialScore(20), 'You resigned. Shake it off and try again!');
      });

      root.querySelector('.suggest-btn').addEventListener('click', () => {
        if (over || thinking) return;
        suggestion = chooseMove(s, 5, J.makeRng('hint:' + ply));
        sel = suggestion.from;
        targets = legal(s).filter((m) => m.from === sel);
        status(`Try moving this ${PIECE_NAMES[s.b[sel].toLowerCase()]} to the green square.`);
        render();
      });

      root.querySelector('.undo-btn').addEventListener('click', () => {
        if (over || thinking || !undoStack.length) return;
        const u = undoStack.pop();
        s = u.s;
        last = u.last;
        ply = u.ply;
        history.length = u.hist;
        capturedByWhite.length = u.cw;
        capturedByBlack.length = u.cb;
        sel = -1;
        targets = [];
        suggestion = null;
        status('Move taken back. Your move.');
        render();
      });

      status('Your move — you are White.');
      render();
      return {
        cleanup: () => {
          gone = true;
          clearTimeout(aiTimer);
        },
        setHelpers(on) {
          helpers = on;
          suggestion = null;
          render();
        },
      };
    },
  });

  // Exposed for testing.
  J._chess = { initial, legal, make, inCheck, chooseMove };
})();
