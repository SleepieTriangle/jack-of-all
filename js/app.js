/* Jack of All — app shell: routing, home (this week), play, practice library, settings. */
(function () {
  const J = window.JOA;
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  let cleanup = null;

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------
  function route() {
    if (cleanup) {
      try {
        cleanup();
      } catch (e) {
        console.error(e);
      }
      cleanup = null;
    }
    closeModal();
    const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const active = a.dataset.nav === parts[0] || (a.dataset.nav === 'home' && parts[0] === 'play') ||
        (a.dataset.nav === 'library' && parts[0] === 'practice') || (a.dataset.nav === 'friends' && parts[0] === 'friend');
      a.classList.toggle('active', active);
    });
    renderWho();
    window.scrollTo(0, 0);
    // No player yet → create one first (a friend link is remembered for after).
    if (!J.activeProfile() && parts[0] !== 'new-player') {
      if (parts[0] === 'friend' && parts[1]) sessionStorage.setItem('joa:pendingFriend', parts[1]);
      return renderNewPlayer(true);
    }
    switch (parts[0]) {
      case 'play':
        return renderPlay(parts[1]);
      case 'practice':
        return renderPractice(parts[1], parseInt(parts[2], 10));
      case 'library':
        return renderLibrary();
      case 'settings':
        return renderSettings();
      case 'progress':
        return renderProgress();
      case 'friends':
        return renderFriends();
      case 'friend':
        return renderFriendLink(parts.slice(1).join('/'));
      case 'players':
        return renderPlayers();
      case 'new-player':
        return renderNewPlayer(!J.activeProfile());
      default:
        return renderHome();
    }
  }

  // The current player's avatar + name in the top bar (tap to switch players).
  function renderWho() {
    const who = document.getElementById('who');
    if (!who) return;
    const p = J.activeProfile();
    who.hidden = !p;
    if (p) {
      who.innerHTML = `<span class="who-avatar" aria-hidden="true">${p.avatar}</span><span class="who-name">${J.esc(p.name)}</span>`;
      who.setAttribute('aria-label', `Playing as ${p.name}. Switch player`);
    }
  }
  window.addEventListener('hashchange', route);

  const go = (hash) => {
    if (location.hash === hash) route();
    else location.hash = hash;
  };

  // ---------------------------------------------------------------------------
  // Home: this week's game, the 7-day ladder, stats, skills covered
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Players (profiles): create, pick, manage
  // ---------------------------------------------------------------------------
  function avatarPicker(current, name) {
    return `<div class="avatar-grid" role="radiogroup" aria-label="Choose an avatar">${J.AVATARS.map(
      (a, k) => `<label class="avatar-opt"><input type="radio" name="${name}" value="${a}" ${a === current || (!current && k === 0) ? 'checked' : ''} /><span>${a}</span></label>`
    ).join('')}</div>`;
  }

  function renderNewPlayer(first) {
    const n = J.profiles().length;
    app.innerHTML = `
      <section class="hero welcome">
        <div class="hero-text">
          <div class="eyebrow">${first ? 'Welcome to Jack of All' : 'Add a player'}</div>
          <h1>${first ? 'Who\'s playing?' : 'New player'}</h1>
          <p class="lead">${first ? 'A new brain game every week, a little harder every day. ' : ''}Everyone on this device gets their own levels, streaks and friends.</p>
          <form class="new-player" autocomplete="off">
            <label class="field"><span>Name</span><input class="text-input" name="name" maxlength="24" placeholder="Player ${n + 1}" required /></label>
            <div class="field"><span>Pick an avatar</span>${avatarPicker(null, 'avatar')}</div>
            <div class="field"><span>Who is this player?</span><div class="bands players">${playerCards('adult', 'player')}</div></div>
            <div class="btn-row">
              <button class="btn big" type="submit">▶ Start playing</button>
              ${first ? '' : '<a class="btn ghost" href="#/players">Cancel</a>'}
            </div>
          </form>
        </div>
      </section>`;
    const form = app.querySelector('.new-player');
    form.querySelectorAll('input[name=player]').forEach((r) =>
      r.addEventListener('change', () => form.querySelectorAll('.band.player').forEach((b) => b.classList.toggle('sel', b.contains(r) && r.checked)))
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      J.createProfile({ name: f.get('name'), avatar: f.get('avatar'), player: f.get('player') || 'adult' });
      sessionStorage.setItem('joa:picked', '1');
      const pending = sessionStorage.getItem('joa:pendingFriend');
      if (pending) {
        sessionStorage.removeItem('joa:pendingFriend');
        return go('#/friend/' + pending);
      }
      go('#/home');
    });
    form.querySelector('input[name=name]').focus();
  }

  // "Who's playing today?" — shown once per visit when there are several players.
  function renderPicker() {
    const list = J.profiles();
    app.innerHTML = `
      <section class="page-head"><h1>Who's playing today?</h1></section>
      <section class="picker">${list
        .map((p) => {
          const st = J.profileState(p.id);
          return `<button class="pick-player" data-id="${p.id}">
            <span class="pick-avatar">${p.avatar}</span><b>${J.esc(p.name)}</b>
            <small>${J.PLAYERS[st.settings.player === 'kid' ? 'kid' : 'adult'].label} · 🔥 ${J.streakOf(st, J.today())}</small>
          </button>`;
        })
        .join('')}
        <a class="pick-player add" href="#/new-player"><span class="pick-avatar">➕</span><b>Add player</b></a>
      </section>`;
    app.querySelectorAll('.pick-player[data-id]').forEach((b) =>
      b.addEventListener('click', () => {
        J.switchProfile(b.dataset.id);
        sessionStorage.setItem('joa:picked', '1');
        go('#/home');
      })
    );
  }

  function renderPlayers() {
    const list = J.profiles();
    const active = J.activeProfile();
    app.innerHTML = `
      <section class="page-head"><h1>Players on this device</h1>
        <p class="lead">Each player has their own levels, streak, badges and friends. Tap a player to switch.</p></section>
      <section class="players-list">${list
        .map((p) => {
          const st = J.profileState(p.id);
          return `<article class="card player-row ${p.id === active.id ? 'current' : ''}">
            <button class="player-main" data-switch="${p.id}" aria-label="Switch to ${J.esc(p.name)}">
              <span class="pick-avatar">${p.avatar}</span>
              <span><b>${J.esc(p.name)}</b>${p.id === active.id ? ' <span class="pill">Playing now</span>' : ''}<br />
              <small class="muted">${J.PLAYERS[st.settings.player === 'kid' ? 'kid' : 'adult'].label} · 🔥 ${J.streakOf(st, J.today())}-day streak · 🏅 ${Object.keys(st.badges).length} badges</small></span>
            </button>
            <button class="btn ghost small" data-del="${p.id}" aria-label="Delete ${J.esc(p.name)}">Delete</button>
          </article>`;
        })
        .join('')}</section>
      <div class="btn-row"><a class="btn" href="#/new-player">➕ Add a player</a></div>`;
    app.querySelectorAll('[data-switch]').forEach((b) =>
      b.addEventListener('click', () => {
        J.switchProfile(b.dataset.switch);
        sessionStorage.setItem('joa:picked', '1');
        go('#/home');
      })
    );
    app.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = list.find((x) => x.id === b.dataset.del);
        if (!confirm(`Delete ${p.name} and all of their progress on this device? This can't be undone (unless you made a backup).`)) return;
        J.deleteProfile(p.id);
        J.profiles().length ? renderPlayers() : go('#/home');
        renderWho();
      })
    );
  }

  function renderHome() {
    const today = J.today();
    const wk = J.weekInfo(today);
    const g = J.games[J.gameForWeek(wk.weekIndex)];
    const st = J.getState();
    // Several players on this device: ask who's playing (once per visit).
    if (J.profiles().length > 1 && !sessionStorage.getItem('joa:picked')) return renderPicker();
    if (!st.settings.player) st.settings.player = 'adult';
    const todayKey = J.dateKey(today);
    const todayRes = st.daily[todayKey];
    const todayLevel = J.dailyLevel(g.id, st); // your next level to beat
    const unlocked = J.topLevel(g.id, st);
    const streak = J.streak(today);
    const name = st.settings.name ? `, ${J.esc(st.settings.name)}` : '';

    const weekResults = wk.days.map((d) => st.daily[J.dateKey(d)]).filter(Boolean);
    const avg = weekResults.length
      ? Math.round(weekResults.reduce((a, r) => a + r.score, 0) / weekResults.length)
      : null;

    const tiles = wk.days
      .map((d, i) => {
        const dow = i + 1;
        const key = J.dateKey(d);
        const res = st.daily[key];
        const isToday = dow === wk.dow;
        const future = dow > wk.dow;
        // Done days show the level played; today and catch-up days, your next level.
        const lvl = res && res.gameId === g.id ? res.level : future ? null : todayLevel;
        let cls = 'day';
        let status = '';
        if (res) {
          cls += ' done';
          status = `<span class="day-score">${'★'.repeat(J.stars(res.score))}<small>${res.score}</small></span>`;
        } else if (future) {
          cls += ' locked';
          status = '<span class="day-lock" aria-label="locked">🔒</span>';
        } else if (!isToday) {
          cls += ' missed';
          status = '<span class="day-catch">Catch up</span>';
        } else {
          status = '<span class="day-go">Play</span>';
        }
        if (isToday) cls += ' today';
        const inner = `
          <span class="day-name">${J.DAY_NAMES[i]}</span>
          <span class="day-date">${d.getDate()}</span>
          <span class="day-level">${lvl ? `Lv ${lvl}` : dow === 7 ? 'Boss' : 'Next'}</span>
          ${status}`;
        return future
          ? `<div class="${cls}" title="Unlocks ${J.DAY_NAMES[i]}${dow === 7 ? ' — Boss Day' : ''}">${inner}</div>`
          : `<a class="${cls}" href="#/play/${key}" title="${lvl ? `Level ${lvl} · ${J.tierName(lvl)}` : ''}">${inner}</a>`;
      })
      .join('');

    // Skills covered this cycle
    const skillCounts = {};
    Object.values(st.daily).forEach((r) => {
      skillCounts[r.gameId] = (skillCounts[r.gameId] || 0) + 1;
    });
    Object.entries(st.practice).forEach(([id, p]) => {
      skillCounts[id] = (skillCounts[id] || 0) + p.plays;
    });
    const trained = J.gameIds().filter((id) => skillCounts[id]).length;
    const skills = J.gameIds()
      .map((id) => {
        const s = J.games[id];
        const n = skillCounts[id] || 0;
        const top = J.topLevel(id, st);
        return `<a class="skill ${id === g.id ? 'current' : ''} ${n ? 'trained' : ''}" href="#/practice/${id}/${top}" style="--c:${s.color}">
          <span class="skill-icon">${s.icon}</span>
          <span><b>${s.skill}</b><small>${s.name} · Lv ${top}</small></span>
        </a>`;
      })
      .join('');

    const nextWeek = J.games[J.gameForWeek(wk.weekIndex + 1)];
    const teaser =
      wk.dow === 7
        ? `Next week: <b>${nextWeek.icon} ${nextWeek.name}</b> (${nextWeek.skill}). Get ready!`
        : 'Next week\'s game is revealed on Sunday. 🎁';

    const easing = J.struggling(g.id, st);
    const tier = J.tierOf(unlocked);
    const lockNote = `${tierBar(unlocked)}<p class="lock-note">${unlocked >= J.MAX_LEVEL
      ? '🏆 You\'ve reached Level 100 — Grandmaster!'
      : `Score <b>${J.PASS_SCORE}+</b> on Level ${unlocked} to unlock Level ${unlocked + 1}.${unlocked % J.TIER_SIZE === 0 ? ` That opens the <b>${J.TIERS[tier]}</b> tier, where puzzles get harder!` : ''}`}</p>` +
      (easing ? `<p class="lock-note">💪 After a couple of tough rounds, today drops back a tier to Level ${todayLevel}. Pass it and you're back on track!</p>` : '');
    const playLabel = `Level ${todayLevel} · ${J.tierName(todayLevel)}`;
    const cta = todayRes
      ? `<div class="done-note">✅ Today's done — ${'★'.repeat(J.stars(todayRes.score))} ${todayRes.score}/100</div>
         <div class="btn-row">
           <a class="btn" href="#/play/${todayKey}">${todayRes.gameId === g.id && todayLevel > todayRes.level ? `▶ Keep climbing: ${playLabel}` : 'Replay to beat it'}</a>
           <a class="btn ghost" href="#/practice/${g.id}/${todayLevel}">Practice more</a>
         </div>${lockNote}`
      : `<div class="btn-row"><a class="btn big" href="#/play/${todayKey}">▶ Play ${wk.dow === 7 ? 'Boss Day · ' : ''}${playLabel}</a></div>${lockNote}`;

    app.innerHTML = `
      <section class="hero" style="--c:${g.color}">
        <div class="hero-text">
          <div class="eyebrow">Week of ${J.fmtRange(wk.days[0], wk.days[6])} · ${J.DAY_NAMES[wk.dow - 1]}
            <a class="mode-pill" href="#/settings" title="Change who's playing">${J.PLAYERS[st.settings.player].icon} ${J.PLAYERS[st.settings.player].label} mode${st.settings.tune !== 'normal' ? ' · ' + J.TUNES[st.settings.tune] : ''}</a></div>
          <h1>Hey${name}! This week: <span class="hl">${g.name}</span></h1>
          <p class="lead">${g.tagline}</p>
          <p class="why"><b>${g.skill}.</b> ${g.why}</p>
          ${cta}
        </div>
        <div class="hero-art" aria-hidden="true">${g.icon}</div>
      </section>

      <section class="card" style="--c:${g.color}">
        <div class="card-head">
          <h2>Your week</h2>
          <span class="muted">Each day, play your next level. Pass it to unlock the one after.</span>
        </div>
        <div class="week">${tiles}</div>
      </section>

      <section class="stats">
        <div class="stat"><span class="stat-num">${streak}</span><span class="stat-label">🔥 day streak</span></div>
        <div class="stat"><span class="stat-num">${weekResults.length}/7</span><span class="stat-label">days this week</span></div>
        <div class="stat"><span class="stat-num">${avg === null ? '–' : avg}</span><span class="stat-label">avg score this week</span></div>
        <div class="stat"><span class="stat-num">${trained}/${J.gameIds().length}</span><span class="stat-label">brain skills trained</span></div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Every part of your brain</h2>
          <span class="muted">${teaser}</span>
        </div>
        <div class="skills">${skills}</div>
        <p class="muted small">Every week a different skill takes the spotlight, in a fresh random order. Each puzzle is generated automatically from the date, so there's always something new. Tap any skill to practice it anytime.</p>
      </section>`;
  }

  // ---------------------------------------------------------------------------
  // Play (daily) and Practice
  // ---------------------------------------------------------------------------
  function renderPlay(key) {
    const today = J.today();
    const wk = J.weekInfo(today);
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return go('#/home');
    const date = J.parseKey(key);
    const dwk = J.weekInfo(date);
    if (dwk.weekIndex !== wk.weekIndex || date > today) return go('#/home');
    const g = J.games[J.gameForWeek(wk.weekIndex)];
    const st = J.getState();
    // Your next level to beat (or one tier back after a couple of tough rounds).
    const level = J.dailyLevel(g.id, st);
    const prev = st.daily[key];
    const attempt = prev && prev.gameId === g.id ? prev.attempts : 0;
    const seed = `daily:${key}:${g.id}:${attempt}:${level}`;
    mountGame(g, level, seed, {
      eyebrow: `${J.DAY_NAMES[dwk.dow - 1]} · ${dwk.dow === 7 ? 'Boss Day' : 'Daily'}`,
      onDone: (score, summary) => {
        const rec = J.recordDaily(key, g.id, level, score);
        const newLevel = J.recordPass(g.id, level, score);
        showResult(g, score, summary, {
          best: rec.score,
          level,
          gameId: g.id,
          newLevel,
          primary: newLevel
            ? { label: `▶ Keep climbing: Level ${newLevel}`, action: () => go(`#/play/${key}`) }
            : { label: 'Back to my week', href: '#/home' },
          secondary: newLevel ? { label: 'Back to my week', href: '#/home' } : { label: 'Try again', action: () => go(`#/play/${key}`) },
          tertiary: { label: 'Practice other games', href: '#/library' },
        });
      },
    });
  }

  function renderPractice(id, level) {
    const g = J.games[id];
    if (!g) return go('#/library');
    const top = J.unlockedLevel(id);
    level = J.clamp(isNaN(level) ? top : level, 1, J.MAX_LEVEL);
    if (level > top) return renderLocked(g, level, top);
    mountGame(g, level, `practice:${id}:${level}:${Date.now()}`, {
      eyebrow: 'Practice',
      onDone: (score, summary) => {
        J.recordPractice(g.id, level, score);
        const newLevel = J.recordPass(g.id, level, score);
        const open = J.unlockedLevel(id) >= level + 1;
        showResult(g, score, summary, {
          level,
          gameId: g.id,
          newLevel,
          primary: newLevel
            ? { label: `Play Level ${newLevel} →`, href: `#/practice/${id}/${newLevel}` }
            : { label: 'Play again', action: () => go(`#/practice/${id}/${level}`) },
          secondary: newLevel
            ? { label: `Play Level ${level} again`, action: () => go(`#/practice/${id}/${level}`) }
            : level < J.MAX_LEVEL && open ? { label: `Level ${level + 1} →`, href: `#/practice/${id}/${level + 1}` } : null,
          tertiary: { label: 'All games', href: '#/library' },
        });
      },
    });
  }

  // Shown when someone opens a level they haven't unlocked yet.
  function renderLocked(g, level, top) {
    app.innerHTML = `
      <section class="play" style="--c:${g.color}">
        <div class="play-head">
          <a class="back" href="#/library" aria-label="Back">←</a>
          <div class="play-title"><div class="eyebrow">${g.skill} · Practice</div><h1>${g.icon} ${g.name}</h1></div>
          <span class="pill">Level ${level}</span>
        </div>
        <div class="game-root g-center g-start">
          <div style="font-size:3.4rem">🔒</div>
          <h2>Level ${level} is locked</h2>
          <p>Score <b>${J.PASS_SCORE} or more</b> on <b>Level ${top}</b> to unlock Level ${top + 1}. Keep passing each level to work your way up!</p>
          ${tierBar(top)}
          <div class="btn-row" style="justify-content:center"><a class="btn big" href="#/practice/${g.id}/${top}">▶ Play Level ${top}</a></div>
        </div>
      </section>`;
  }

  // Ten tier boxes (Beginner … Grandmaster). Passed tiers are full, the current
  // tier fills as you climb through it, later tiers are locked.
  function levelDots(top) {
    const cur = J.tierOf(top);
    return `<div class="lv-dots tiers" aria-label="Level ${top} of ${J.MAX_LEVEL}, ${J.tierName(top)} tier">${J.TIERS.map((name, k) => {
      const t = k + 1;
      const fill = t < cur ? 100 : t === cur ? Math.round((((top - 1) % J.TIER_SIZE) + 1) / J.TIER_SIZE * 100) : 0;
      return `<span class="${t <= cur ? 'on' : ''} ${t === cur ? 'cur' : ''}" style="--fill:${fill}%" title="Levels ${J.tierStart(t)}–${t * J.TIER_SIZE}: ${name}">${t <= cur ? J.TIER_ICONS[k] : '🔒'}</span>`;
    }).join('')}</div>`;
  }

  // Current tier with a progress bar: "Level 37 · Skilled — 7 of 10".
  function tierBar(top) {
    const t = J.tierOf(top), inTier = ((top - 1) % J.TIER_SIZE) + 1;
    return `<div class="tier-bar">
      <div class="tier-bar-head"><span>${J.TIER_ICONS[t - 1]} <b>Level ${top}</b> · ${J.TIERS[t - 1]} tier</span><span class="muted small">${inTier} of ${J.TIER_SIZE}${t < 10 ? ` · next: ${J.TIERS[t]}` : ''}</span></div>
      <div class="tier-track" role="progressbar" aria-valuemin="1" aria-valuemax="${J.MAX_LEVEL}" aria-valuenow="${top}" aria-label="Level ${top} of ${J.MAX_LEVEL}"><i style="width:${(inTier / J.TIER_SIZE) * 100}%"></i></div>
      ${levelDots(top)}
    </div>`;
  }

  function mountGame(g, level, seed, opts) {
    // Beginner helpers: everyone's first tier, and kids' learning tiers.
    const helpersAvail = J.helpersAllowed(level) && g.helpers;
    let helpersOn = helpersAvail && J.getState().settings.helpers !== false;
    app.innerHTML = `
      <section class="play" style="--c:${g.color}">
        <div class="play-head">
          <a class="back" href="${opts.eyebrow === 'Practice' ? '#/library' : '#/home'}" aria-label="Back">←</a>
          <div class="play-title">
            <div class="eyebrow">${g.skill} · ${opts.eyebrow}</div>
            <h1>${g.icon} ${g.name}</h1>
          </div>
          <span class="pill">Level ${level} · ${J.levelTag(level)}</span>
        </div>
        ${helpersAvail ? `
        <div class="helper-bar">
          <button class="helper-switch" role="switch" aria-checked="${helpersOn}">
            <span class="sw-track"><span class="sw-knob"></span></span>
            <span>🛟 Beginner helpers</span>
          </button>
          <ul class="helper-list">${g.helpers.map((h) => `<li>${h}</li>`).join('')}</ul>
        </div>` : ''}
        <details class="howto"><summary>How to play</summary><div>${g.howTo}</div></details>
        <div class="game-root"></div>
      </section>`;
    const root = app.querySelector('.game-root');
    let finished = false;
    let ctrl = null;
    const ctx = {
      seed,
      rng: J.makeRng(seed),
      // Games get the DIFFICULTY (Level 3 → 4 … Level 10 → Master 11); the player sees the level.
      level: J.difficulty(level),
      displayLevel: level,
      kid: J.isKid(),
      helpers: helpersOn,
      finish: (score, summary) => {
        if (finished) return;
        finished = true;
        score = Math.round(J.clamp(score, 0, 100));
        setTimeout(() => opts.onDone(score, summary || ''), 450);
      },
    };
    if (helpersAvail) {
      const bar = app.querySelector('.helper-bar');
      const sw = bar.querySelector('.helper-switch');
      const sync = () => {
        sw.setAttribute('aria-checked', String(helpersOn));
        bar.classList.toggle('on', helpersOn);
      };
      sync();
      sw.addEventListener('click', () => {
        helpersOn = !helpersOn;
        ctx.helpers = helpersOn;
        const s = J.getState();
        s.settings.helpers = helpersOn;
        J.saveState(s);
        sync();
        if (ctrl && ctrl.setHelpers) ctrl.setHelpers(helpersOn);
      });
    }
    try {
      ctrl = g.mount(root, ctx) || null;
      cleanup = typeof ctrl === 'function' ? ctrl : ctrl && ctrl.cleanup ? ctrl.cleanup : null;
    } catch (e) {
      console.error(e);
      root.innerHTML = `<p class="error">Something went wrong loading this game.</p>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Result modal
  // ---------------------------------------------------------------------------
  const PRAISE = [
    [95, 'Flawless. Your brain is on fire! 🔥'],
    [85, 'Brilliant work!'],
    [70, 'Strong effort — nicely done.'],
    [50, 'Good workout. You\'ll crush it next time.'],
    [0, 'Every try makes your brain stronger. Go again!'],
  ];

  function showResult(g, score, summary, o) {
    const newBadges = J.checkBadges();
    J.fx.play(o.newLevel || newBadges.length ? 'unlock' : score >= 85 ? 'win' : score >= J.PASS_SCORE ? 'ok' : 'bad');
    const stars = J.stars(score);
    const praise = PRAISE.find(([min]) => score >= min)[1];
    const btn = (b, cls) =>
      !b ? '' : b.href ? `<a class="btn ${cls}" href="${b.href}">${b.label}</a>` : `<button class="btn ${cls}" data-act="${cls}">${b.label}</button>`;
    modal.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Results" style="--c:${g.color}">
        <div class="result-stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="result-score">${score}<small>/100</small></div>
        <p class="result-praise">${praise}</p>
        ${summary ? `<p class="muted">${summary}</p>` : ''}
        ${o.best !== undefined && o.best > score ? `<p class="muted small">Your best today: ${o.best}</p>` : ''}
        ${unlockBanner(score, o)}
        ${newBadges.map((b) => `<div class="unlock-banner badge-won"><span class="unlock-icon">${b.icon}</span><b>New badge: ${b.name}</b><span>${b.desc}</span></div>`).join('')}
        <div class="btn-col">
          ${btn(o.primary, 'primary')}
          ${btn(o.secondary, 'secondary ghost')}
          ${btn(o.tertiary, 'tertiary link')}
        </div>
      </div>`;
    modal.hidden = false;
    modal.querySelectorAll('button[data-act]').forEach((b) => {
      const which = b.dataset.act.split(' ')[0];
      b.addEventListener('click', () => o[which] && o[which].action && o[which].action());
    });
    modal.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeModal));
  }

  // "Level 4 unlocked!" — or what it takes to unlock the next one.
  function unlockBanner(score, o) {
    if (!o.gameId || !J.locksOn()) return '';
    const after = (lv) => (lv >= J.MAX_LEVEL ? 'Level 100 — you\'re a Grandmaster! 🏆' : `Pass it to open Level ${lv + 1}.`);
    // Crossing into a new tier gets its own celebration.
    const newTier = o.newLevel && J.tierOf(o.newLevel) > J.tierOf(o.level);
    if (newTier) {
      const t = J.tierOf(o.newLevel);
      return `<div class="unlock-banner tier-up"><span class="unlock-icon">${J.TIER_ICONS[t - 1]}</span><b>New tier: ${J.TIERS[t - 1]}!</b><span>Level ${o.newLevel} unlocked. Puzzles get harder from here. ${o.newLevel - o.level >= 2 ? `(⚡ ${J.FAST_TRACK_SCORE}+ fast track!)` : ''}</span></div>`;
    }
    if (o.newLevel && o.newLevel - o.level >= 2) {
      return `<div class="unlock-banner"><span class="unlock-icon">⚡</span><b>Fast track! Jumped to Level ${o.newLevel}</b><span>A ${J.FAST_TRACK_SCORE}+ score skips a level. ${after(o.newLevel)}</span></div>`;
    }
    if (o.newLevel) {
      return `<div class="unlock-banner"><span class="unlock-icon">🔓</span><b>Level ${o.newLevel} unlocked!</b><span>${after(o.newLevel)}</span></div>`;
    }
    const top = J.unlockedLevel(o.gameId);
    if (o.level === top && top < J.MAX_LEVEL && score < J.PASS_SCORE) {
      return `<div class="unlock-banner locked"><span class="unlock-icon">🔒</span><b>Level ${top + 1} is still locked</b><span>Score ${J.PASS_SCORE} or more on Level ${top} to unlock it. ${score >= J.PASS_SCORE - 15 ? `You got ${score} — so close!` : 'Keep practicing — you\'ve got this!'}</span></div>`;
    }
    return '';
  }

  function closeModal() {
    modal.hidden = true;
    modal.innerHTML = '';
  }

  // ---------------------------------------------------------------------------
  // Library (practice any game at any level)
  // ---------------------------------------------------------------------------
  function renderLibrary() {
    const st = J.getState();
    const locks = J.locksOn(st);
    const cards = J.gameIds()
      .map((id) => {
        const g = J.games[id];
        const p = st.practice[id];
        const top = J.topLevel(id, st);
        const max = J.unlockedLevel(id, st);
        const def = top; // start on your highest level
        return `<article class="game-card" style="--c:${g.color}">
          <div class="game-card-top">
            <span class="game-icon">${g.icon}</span>
            <div><div class="eyebrow">${g.skill}</div><h3>${g.name}</h3></div>
          </div>
          <p>${g.tagline}</p>
          ${levelDots(top)}
          ${max === 1 ? '' : `<label class="level-pick">Level <output>${def}</output>
            <input type="range" min="1" max="${max}" value="${def}" data-id="${id}" />
          </label><p class="lock-hint tier-name" data-tier-for="${id}">${J.levelTag(def)}</p>`}
          ${locks && top < J.MAX_LEVEL ? `<p class="lock-hint">🔒 Score ${J.PASS_SCORE}+ on Level ${top} to unlock Level ${top + 1}</p>` : top >= J.MAX_LEVEL ? '<p class="lock-hint">🏆 All 100 levels unlocked</p>' : ''}
          <div class="game-card-foot">
            <a class="btn" data-play="${id}" href="#/practice/${id}/${def}">${locks && top === 1 ? 'Play Level 1' : 'Practice'}</a>
            ${p ? `<span class="muted small">${p.plays} play${p.plays === 1 ? '' : 's'}</span>` : ''}
          </div>
        </article>`;
      })
      .join('');
    app.innerHTML = `
      <section class="page-head">
        <h1>Practice any skill</h1>
        <p class="lead">Your weekly game is the main event, but you can warm up on any of them, anytime. Practice puzzles are fresh every time. Every game has <b>100 levels</b> in 10 tiers, from Beginner to Grandmaster.${locks ? ` Score <b>${J.PASS_SCORE} or more</b> to unlock the next level.` : ''}</p>
      </section>
      <section class="library">${cards}</section>`;
    app.querySelectorAll('input[type=range]').forEach((r) => {
      r.addEventListener('input', () => {
        r.previousElementSibling.textContent = r.value;
        const tag = app.querySelector(`[data-tier-for="${r.dataset.id}"]`);
        if (tag) tag.textContent = J.levelTag(+r.value);
        app.querySelector(`[data-play="${r.dataset.id}"]`).href = `#/practice/${r.dataset.id}/${r.value}`;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  function installCard() {
    let body;
    if (J.isInstalled()) {
      body = '<p class="muted">✅ Jack of All is installed on this device. Open it from your home screen anytime — it works offline too.</p>';
    } else if (J.canPromptInstall()) {
      body = `<p class="muted">Add Jack of All to your home screen or desktop. It opens like a regular app and works offline.</p>
        <button class="btn" id="install-now">⬇ Install Jack of All</button>`;
    } else if (J.isIOS()) {
      body = `<p class="muted">On iPhone or iPad, in Safari:</p>
        <ol class="ios-steps"><li>Tap the <b>Share</b> button (the square with an arrow).</li>
        <li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol>`;
    } else {
      body = `<p class="muted">Use your browser's menu and choose <b>Install app</b> or <b>Add to Home screen</b>. (Chrome, Edge, Safari and Samsung Internet all support it.)</p>`;
    }
    return `<section class="card"><h2>Install the app</h2>${body}</section>`;
  }
  document.addEventListener('joa:installable', () => {
    if (location.hash.startsWith('#/settings')) renderSettings();
  });

  function playerCards(current, name) {
    return Object.entries(J.PLAYERS)
      .map(
        ([k, p]) => `<label class="band player ${current === k ? 'sel' : ''}">
          <input type="radio" name="${name}" value="${k}" ${current === k ? 'checked' : ''} />
          <span class="player-icon">${p.icon}</span>
          <b>${p.label}</b><span>${p.desc}</span>
        </label>`
      )
      .join('');
  }

  function renderSettings() {
    const st = J.getState();
    const player = st.settings.player || 'adult';
    const tune = st.settings.tune || 'normal';
    const TUNE_HINT = { easier: 'Every tier plays a step easier', normal: 'The standard climb', harder: 'Every tier plays a step harder' };
    const tunes = Object.entries(J.TUNES)
      .map(([k, label]) => `<label class="band tune ${tune === k ? 'sel' : ''}">
          <input type="radio" name="tune" value="${k}" ${tune === k ? 'checked' : ''} />
          <b>${label}</b><small>${TUNE_HINT[k]}</small>
        </label>`)
      .join('');
    app.innerHTML = `
      <section class="page-head"><h1>Settings</h1></section>
      <section class="card">
        <div class="card-head"><h2>You</h2><a class="btn ghost small" href="#/players">👥 All players</a></div>
        <label class="field"><span>Name</span><input class="text-input" id="name" maxlength="24" value="${J.esc(st.settings.name)}" /></label>
        <div class="field"><span>Avatar</span>${avatarPicker(J.activeProfile().avatar, 'me-avatar')}</div>
      </section>
      <section class="card">
        <h2>Who's playing?</h2>
        <p class="muted">This sets how hard each level plays. Kids start very gently; adults start easy but skip the most basic puzzles.</p>
        <div class="bands players">${playerCards(player, 'player')}</div>
        <h3 class="sub-h">Fine-tune</h3>
        <div class="bands tunes">${tunes}</div>
        <label class="check-row">
          <input type="checkbox" id="helpers" ${st.settings.helpers !== false ? 'checked' : ''} />
          <span><b>🛟 Beginner helpers on Levels 1–2</b><br /><span class="muted">Extra guidance for first-timers, like how each chess piece moves, hints and undo. You can also flip it on or off inside any Level 1–2 game.</span></span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="locks" ${st.settings.locks !== false ? 'checked' : ''} />
          <span><b>🔒 Level locks</b><br /><span class="muted">Every game starts at Level 1. Score ${J.PASS_SCORE} or more to unlock the next level. Turn this off to play any level right away (your progress is still saved).</span></span>
        </label>
      </section>
      <section class="card">
        <h2>Play your way</h2>
        <label class="check-row">
          <input type="checkbox" id="smart" ${st.settings.smart !== false ? 'checked' : ''} />
          <span><b>🧠 Smart difficulty</b><br /><span class="muted">Score ${J.FAST_TRACK_SCORE}+ on your top level to skip ahead a level. Two tough rounds in a row drop the next day back one tier, then you climb again.</span></span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="sound" ${st.settings.sound !== false ? 'checked' : ''} />
          <span><b>🔊 Sounds &amp; vibration</b><br /><span class="muted">Little sounds for right and wrong answers, unlocks and badges.</span></span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="colorSafe" ${st.settings.colorSafe ? 'checked' : ''} />
          <span><b>🎨 Color-blind friendly colors</b><br /><span class="muted">Color Clash uses colors that stay easy to tell apart with color blindness.</span></span>
        </label>
      </section>
      <section class="card">
        <h2>⏰ Daily reminder</h2>
        <p class="muted">Add a repeating reminder to your phone or computer calendar so you never miss a day (and keep your streak!).</p>
        <div class="btn-row" style="align-items:center">
          <label class="field inline"><span>Remind me at</span><input type="time" id="remind-time" class="text-input" value="${J.esc(st.settings.remindAt || '18:00')}" /></label>
          <button class="btn" id="remind">📅 Add to my calendar</button>
        </div>
      </section>
      <section class="card">
        <h2>💾 Backup &amp; move devices</h2>
        <p class="muted">Progress is saved on this device only. Make a backup to keep it safe or to move to a new phone. Backups include levels, scores, badges and friends.</p>
        <div class="btn-row">
          <button class="btn" id="backup-me">Back up ${J.esc(st.settings.name)}</button>
          ${J.profiles().length > 1 ? '<button class="btn ghost" id="backup-all">Back up all players</button>' : ''}
        </div>
        <div class="backup-out" hidden>
          <textarea class="code-box" readonly aria-label="Backup code"></textarea>
          <div class="btn-row"><button class="btn small" id="backup-copy">Copy code</button><button class="btn ghost small" id="backup-file">Save as a file</button></div>
        </div>
        <h3 class="sub-h">Restore a backup</h3>
        <textarea class="code-box" id="restore-code" placeholder="Paste a backup code here" aria-label="Backup code to restore"></textarea>
        <div class="btn-row">
          <button class="btn ghost" id="restore">Restore</button>
          <label class="btn ghost">📂 Open backup file<input type="file" id="restore-file" accept=".txt,.json,text/plain" hidden /></label>
        </div>
        <div class="g-msg backup-msg"></div>
      </section>
      ${installCard()}
      <section class="card">
        <h2>How Jack of All works</h2>
        <ul class="howlist">
          <li><b>One game per week.</b> Each week, one of ${J.gameIds().length} brain skills takes the spotlight, in a random order that never repeats a game back-to-back.</li>
          <li><b>100 levels, 10 tiers.</b> Every game climbs from Level 1 to 100. Each block of 10 levels is a tier — ${J.TIERS.map((t, k) => `${J.TIER_ICONS[k]} ${t}`).join(', ')} — and each tier is a step harder.</li>
          <li><b>Earn your levels.</b> Each day you play your next level. Score ${J.PASS_SCORE}+ (2 stars) to unlock the one after, so the game gets harder as you keep passing.</li>
          <li><b>Start where it fits.</b> Kids start with gentle learning tiers and beginner helpers. Adults start easy but not too basic.</li>
          <li><b>Always fresh.</b> Every puzzle is generated automatically from the date. Missed a day? You can catch up any time that week.</li>
          <li><b>Progress stays on this device.</b> Nothing is uploaded.</li>
        </ul>
      </section>
      <section class="card danger">
        <h2>Reset progress</h2>
        <p class="muted">Clears ${J.esc(st.settings.name)}'s scores, levels, streak and badges. Other players aren't affected.</p>
        <button class="btn ghost" id="reset">Reset ${J.esc(st.settings.name)}'s progress</button>
      </section>`;
    const save = (fn) => {
      const s = J.getState();
      fn(s);
      J.saveState(s);
    };
    app.querySelector('#helpers').addEventListener('change', (e) => save((s) => (s.settings.helpers = e.target.checked)));
    app.querySelector('#locks').addEventListener('change', (e) => save((s) => (s.settings.locks = e.target.checked)));
    const me = J.activeProfile();
    app.querySelector('#name').addEventListener('input', (e) => {
      if (e.target.value.trim()) J.updateProfile(me.id, { name: e.target.value });
      renderWho();
    });
    app.querySelectorAll('input[name=me-avatar]').forEach((r) =>
      r.addEventListener('change', () => {
        J.updateProfile(me.id, { avatar: r.value });
        renderWho();
      })
    );
    ['smart', 'sound', 'colorSafe'].forEach((k) =>
      app.querySelector('#' + k).addEventListener('change', (e) => {
        save((s) => (s.settings[k] = e.target.checked));
        if (k === 'sound' && e.target.checked) J.fx.play('good');
      })
    );

    // Daily reminder → a repeating calendar event (.ics) the player saves.
    app.querySelector('#remind').addEventListener('click', () => {
      const t = app.querySelector('#remind-time').value || '18:00';
      save((s) => (s.settings.remindAt = t));
      downloadFile('jack-of-all-reminder.ics', 'text/calendar', reminderICS(t));
    });

    // Backups
    const out = app.querySelector('.backup-out');
    const msg = app.querySelector('.backup-msg');
    const say = (text, ok) => {
      msg.className = 'g-msg backup-msg ' + (ok ? 'good' : 'bad');
      msg.textContent = text;
    };
    const showBackup = async (all) => {
      const code = await J.makeBackup(all);
      out.hidden = false;
      out.querySelector('textarea').value = code;
      out.querySelector('textarea').select();
    };
    app.querySelector('#backup-me').addEventListener('click', () => showBackup(false));
    const ba = app.querySelector('#backup-all');
    if (ba) ba.addEventListener('click', () => showBackup(true));
    app.querySelector('#backup-copy').addEventListener('click', async () => {
      await copyText(out.querySelector('textarea').value);
      say('Backup code copied. Keep it somewhere safe!', true);
    });
    app.querySelector('#backup-file').addEventListener('click', () =>
      downloadFile(`jack-of-all-backup-${J.dateKey(J.today())}.txt`, 'text/plain', out.querySelector('textarea').value)
    );
    const restore = async (code) => {
      try {
        const players = await J.readBackup(code);
        if (!players.length) throw new Error('That backup has no players in it.');
        const names = players.map((p) => p.profile.name).join(', ');
        if (!confirm(`Restore ${names}? If ${players.length > 1 ? 'any of these players are' : 'this player is'} already on this device, the backup copy replaces them.`)) return;
        J.restorePlayers(players);
        J.switchProfile(players[0].profile.id);
        say(`Restored ${names}! 🎉`, true);
        renderWho();
        setTimeout(renderSettings, 900);
      } catch (e) {
        say(e.message || 'That code didn\'t work.', false);
      }
    };
    app.querySelector('#restore').addEventListener('click', () => restore(app.querySelector('#restore-code').value));
    app.querySelector('#restore-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f) restore(await f.text());
    });
    app.querySelectorAll('input[name=player]').forEach((r) =>
      r.addEventListener('change', () => {
        save((s) => {
          s.settings.player = r.value;
          if (r.value === 'kid') s.settings.helpers = true; // kids start with helpers on
        });
        renderSettings(); // level ranges shown under Fine-tune depend on the player
      })
    );
    app.querySelectorAll('input[name=tune]').forEach((r) =>
      r.addEventListener('change', () => {
        save((s) => (s.settings.tune = r.value));
        app.querySelectorAll('.tune').forEach((b) => b.classList.toggle('sel', b.contains(r)));
      })
    );
    const inst = app.querySelector('#install-now');
    if (inst) inst.addEventListener('click', async () => { if (await J.promptInstall()) renderSettings(); });
    app.querySelector('#reset').addEventListener('click', () => {
      if (confirm(`Reset ${st.settings.name}'s progress? This cannot be undone (unless you made a backup).`)) {
        J.resetState();
        go('#/home');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Progress: stats, last 4 weeks, every skill's level, badges
  // ---------------------------------------------------------------------------
  function renderProgress() {
    J.checkBadges(); // badges can also come from things outside games (like adding a friend)
    const st = J.getState();
    const today = J.today();
    const days = Array.from({ length: 28 }, (_, k) => J.addDays(today, k - 27));
    const recs = days.map((d) => ({ d, r: st.daily[J.dateKey(d)] }));
    const played = recs.filter((x) => x.r);
    const avg = played.length ? Math.round(played.reduce((a, x) => a + x.r.score, 0) / played.length) : null;
    const earned = J.BADGES.filter((b) => st.badges[b.id]);

    // Bar chart: one series (daily score), one color, pass line at 60.
    const W = 560, H = 170, padL = 28, padB = 22, bw = (W - padL) / 28;
    const y = (v) => H - padB - (v / 100) * (H - padB - 8);
    const bars = recs
      .map((x, k) => {
        const xPos = padL + k * bw + 1;
        const label = `${x.d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${x.r ? `${x.r.score}/100 · ${J.games[x.r.gameId] ? J.games[x.r.gameId].name : ''} Lv ${x.r.level}` : 'not played'}`;
        const h = x.r ? Math.max(5, H - padB - y(x.r.score)) : 0;
        return `<g class="pc-bar" tabindex="0" role="img" aria-label="${J.esc(label)}" data-tip="${J.esc(label)}">
          <rect x="${xPos - 1}" y="8" width="${bw}" height="${H - padB - 8}" fill="transparent"/>
          ${x.r ? `<path d="M${xPos},${H - padB} v${-(h - 4)} q0,-4 4,-4 h${bw - 10} q4,0 4,4 v${h - 4} z" class="pc-fill" />` : `<circle cx="${xPos + bw / 2 - 1}" cy="${H - padB - 3}" r="1.6" class="pc-empty"/>`}
          ${k % 7 === 6 ? `<text x="${xPos + bw / 2 - 1}" y="${H - 6}" text-anchor="middle" class="pc-axis">${x.d.getMonth() + 1}/${x.d.getDate()}</text>` : ''}
        </g>`;
      })
      .join('');
    const chart = `<svg class="pc-chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Daily scores for the last 4 weeks">
      ${[0, 50, 100].map((v) => `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="pc-grid"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" class="pc-axis">${v}</text>`).join('')}
      <line x1="${padL}" x2="${W}" y1="${y(J.PASS_SCORE)}" y2="${y(J.PASS_SCORE)}" class="pc-pass"/>
      <text x="${padL - 6}" y="${y(J.PASS_SCORE) + 4}" text-anchor="end" class="pc-axis pc-pass-label">pass</text>
      ${bars}
    </svg>`;
    const table = `<table class="sr-only"><caption>Daily scores, last 4 weeks</caption><tr><th>Date</th><th>Game</th><th>Score</th></tr>${played
      .map((x) => `<tr><td>${J.dateKey(x.d)}</td><td>${J.games[x.r.gameId] ? J.games[x.r.gameId].name : ''}</td><td>${x.r.score}</td></tr>`)
      .join('')}</table>`;

    const skills = J.gameIds()
      .map((id) => {
        const g = J.games[id];
        const top = J.topLevel(id, st);
        const best = Math.max(0, ...Object.values((st.practice[id] || {}).best || {}), ...Object.values(st.daily).filter((r) => r.gameId === id).map((r) => r.score));
        return `<div class="pg-skill" style="--c:${g.color}">
          <span class="skill-icon">${g.icon}</span>
          <div class="pg-skill-main"><b>${g.name}</b> <small class="muted">${g.skill}${best ? ` · best ${best}` : ''}</small>${levelDots(top)}</div>
        </div>`;
      })
      .join('');

    app.innerHTML = `
      <section class="page-head"><h1>${J.esc(st.settings.name)}'s progress</h1></section>
      <section class="stats">
        <div class="stat"><span class="stat-num">${J.streak(today)}</span><span class="stat-label">🔥 current streak</span></div>
        <div class="stat"><span class="stat-num">${J.longestStreak(st)}</span><span class="stat-label">🏆 longest streak</span></div>
        <div class="stat"><span class="stat-num">${avg === null ? '–' : avg}</span><span class="stat-label">avg score, 4 weeks</span></div>
        <div class="stat"><span class="stat-num">${earned.length}/${J.BADGES.length}</span><span class="stat-label">🏅 badges</span></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Daily scores · last 4 weeks</h2><span class="muted small">${played.length} of 28 days played</span></div>
        <div class="pc-wrap">${chart}<div class="pc-tip" hidden></div></div>${table}
      </section>
      <section class="card">
        <h2>Badges</h2>
        <div class="badges">${J.BADGES.map((b) => `<div class="badge ${st.badges[b.id] ? 'won' : ''}" title="${J.esc(b.desc)}">
          <span class="badge-icon">${st.badges[b.id] ? b.icon : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Every skill</h2>
        <div class="pg-skills">${skills}</div>
      </section>`;

    // Tooltip for bars (mouse and keyboard).
    const tip = app.querySelector('.pc-tip');
    const wrap = app.querySelector('.pc-wrap');
    const show = (g) => {
      const r = g.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      tip.textContent = g.dataset.tip;
      tip.hidden = false;
      const half = tip.offsetWidth / 2; // keep the tooltip inside the card
      tip.style.left = J.clamp(r.left - w.left + r.width / 2, half, w.width - half) + 'px';
      tip.style.top = r.top - w.top - 6 + 'px';
    };
    app.querySelectorAll('.pc-bar').forEach((g) => {
      g.addEventListener('mouseenter', () => show(g));
      g.addEventListener('focus', () => show(g));
      g.addEventListener('mouseleave', () => (tip.hidden = true));
      g.addEventListener('blur', () => (tip.hidden = true));
    });
  }

  // ---------------------------------------------------------------------------
  // Friends: share a code, add theirs, compare this week
  // ---------------------------------------------------------------------------
  function renderFriends() {
    const st = J.getState();
    const me = J.activeProfile();
    const wk = J.weekInfo(J.today());
    const myCard = J.scorecard(me, st);
    // Everyone to compare: you, other players on this device, and friends.
    const deviceRows = J.profiles().filter((p) => p.id !== me.id).map((p) => Object.assign({ kind: 'device' }, J.scorecard(p)));
    // A friend who is ALSO a player on this device shows once, with live scores.
    const onDevice = new Set(deviceRows.map((r) => r.id));
    const rows = [Object.assign({ kind: 'you' }, myCard)]
      .concat(deviceRows)
      .concat(Object.values(st.friends).filter((f) => !onDevice.has(f.id)).map((f) => Object.assign({ kind: 'friend' }, f)));
    rows.forEach((r) => {
      r.current = r.week === wk.weekIndex;
      r.total = r.current ? J.weekTotal(r.scores) : 0;
      r.top = Math.max(1, ...Object.values(r.levels || {}));
    });
    rows.sort((a, b) => b.total - a.total || b.streak - a.streak);
    const ago = (t) => {
      const m = Math.round((Date.now() - t) / 60000);
      return m < 60 ? 'just now' : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
    };
    const board = rows
      .map((r, k) => `<div class="lb-row ${r.kind === 'you' ? 'me' : ''}">
        <span class="lb-rank">${k + 1}</span>
        <span class="pick-avatar small">${r.avatar}</span>
        <span class="lb-name"><b>${J.esc(r.name)}</b><small class="muted">${r.kind === 'you' ? 'You' : r.kind === 'device' ? 'On this device' : `Friend · updated ${ago(r.at)}`}</small></span>
        <span class="lb-week" title="This week's total">${r.current ? r.total : '<small class="muted">no code this week</small>'}</span>
        <span class="lb-streak" title="Day streak">🔥 ${r.streak}</span>
        <span class="lb-top" title="Highest level reached">Lv ${r.top}</span>
        ${r.kind === 'friend' ? `<button class="btn link small" data-remove="${J.esc(r.id)}" aria-label="Remove ${J.esc(r.name)}">✕</button>` : '<span></span>'}
      </div>`)
      .join('');

    app.innerHTML = `
      <section class="page-head"><h1>Friends</h1>
        <p class="lead">Compare this week's scores with family and friends. No accounts needed: you swap <b>friend codes</b>. Send a fresh code anytime to update your score on their board.</p></section>
      <section class="card">
        <div class="card-head"><h2>This week's leaderboard</h2><span class="muted small">Week of ${J.fmtRange(wk.days[0], wk.days[6])}</span></div>
        <div class="lb-head"><span>#</span><span></span><span>Player</span><span>Week</span><span>Streak</span><span>Top</span><span></span></div>
        <div class="leaderboard">${board}</div>
        ${rows.length === 1 ? '<p class="muted small">Add a friend below to start a friendly competition!</p>' : ''}
      </section>
      <section class="card">
        <h2>Your friend code</h2>
        <p class="muted">Send this to a friend. It shares your name, avatar, this week's scores, streak and levels — nothing else.</p>
        <textarea class="code-box" id="my-code" readonly aria-label="Your friend code">Making your code…</textarea>
        <div class="btn-row">
          ${navigator.share ? '<button class="btn" id="share-code">📤 Share</button>' : ''}
          <button class="btn ${navigator.share ? 'ghost' : ''}" id="copy-link">🔗 Copy link</button>
          <button class="btn ghost" id="copy-code">Copy code</button>
        </div>
      </section>
      <section class="card">
        <h2>Add a friend</h2>
        <p class="muted">Paste the code or link your friend sent you. Pasting a newer code from the same friend updates their score.</p>
        <textarea class="code-box" id="friend-code" placeholder="Paste a friend code or link" aria-label="Friend code"></textarea>
        <div class="btn-row"><button class="btn" id="add-friend">➕ Add friend</button></div>
        <div class="g-msg friend-msg"></div>
      </section>`;

    const msg = app.querySelector('.friend-msg');
    const say = (t, ok) => {
      msg.className = 'g-msg friend-msg ' + (ok ? 'good' : 'bad');
      msg.textContent = t;
    };
    let link = '';
    J.makeFriendCode().then((code) => {
      app.querySelector('#my-code').value = code;
      link = `${location.origin}${location.pathname}#/friend/${code}`;
    });
    app.querySelector('#copy-code').addEventListener('click', async () => {
      await copyText(app.querySelector('#my-code').value);
      say('Code copied — send it to a friend!', true);
    });
    app.querySelector('#copy-link').addEventListener('click', async () => {
      await copyText(link);
      say('Link copied — when your friend opens it, you\'re added to their board.', true);
    });
    const sh = app.querySelector('#share-code');
    if (sh) sh.addEventListener('click', () => navigator.share({ title: 'Jack of All', text: `Add me on Jack of All! I'm ${me.name}.`, url: link }).catch(() => {}));
    app.querySelector('#add-friend').addEventListener('click', async () => {
      try {
        const card = await J.readFriendCode(app.querySelector('#friend-code').value);
        const isNew = J.addFriend(card);
        const won = J.checkBadges();
        say((isNew ? `${card.name} added! 🎉` : `${card.name}'s score updated.`) + (won.length ? ` New badge: ${won.map((b) => b.icon + ' ' + b.name).join(', ')}!` : ''), true);
        setTimeout(renderFriends, 900);
      } catch (e) {
        say(e.message || 'That code didn\'t work.', false);
      }
    });
    app.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        if (!confirm('Remove this friend from your leaderboard?')) return;
        J.removeFriend(b.dataset.remove);
        renderFriends();
      })
    );
  }

  // Opening a friend's link: confirm, then add them.
  async function renderFriendLink(code) {
    app.innerHTML = `<section class="card g-center g-start"><div class="spinner"></div><p>Reading friend code…</p></section>`;
    try {
      const card = await J.readFriendCode(decodeURIComponent(code));
      app.innerHTML = `
        <section class="card g-center g-start">
          <span class="pick-avatar">${card.avatar}</span>
          <h2>Add ${J.esc(card.name)} as a friend?</h2>
          <p>You'll see each other's weekly scores on your Friends leaderboard. Adding as <b>${J.esc(J.activeProfile().name)}</b>.</p>
          <div class="btn-row"><button class="btn big" id="yes">➕ Add friend</button><a class="btn ghost" href="#/home">Not now</a></div>
          <p class="muted small">Don't forget to send them your code too, from the Friends page.</p>
        </section>`;
      app.querySelector('#yes').addEventListener('click', () => {
        try {
          J.addFriend(card);
          J.checkBadges();
          J.fx.play('unlock');
          go('#/friends');
        } catch (e) {
          app.querySelector('.g-start p').textContent = e.message;
        }
      });
    } catch (e) {
      app.innerHTML = `<section class="card g-center g-start"><div style="font-size:3rem">🤔</div><h2>That link didn't work</h2><p>${J.esc(e.message || '')}</p><a class="btn" href="#/friends">Go to Friends</a></section>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
  }

  function downloadFile(name, type, text) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // A daily repeating calendar event at the chosen local time.
  function reminderICS(hhmm) {
    const [h, m] = hhmm.split(':');
    const start = J.addDays(J.today(), 1);
    const d = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`;
    const url = location.origin + location.pathname;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jack of All//Daily reminder//EN', 'BEGIN:VEVENT',
      `UID:jack-of-all-daily-${Date.now()}@jackofall`, `DTSTAMP:${now}`,
      `DTSTART:${d}T${h}${m}00`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
      'SUMMARY:🧠 Jack of All: today\'s brain game', `DESCRIPTION:Your daily puzzle is ready! ${url}`, `URL:${url}`,
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for today\'s brain game!', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
  }

  route();
})();
