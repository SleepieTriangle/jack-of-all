/* Jack of All — badges. Each badge is a rule over the player's saved progress.
   J.checkBadges() awards any newly earned ones and returns them. */
(function () {
  const J = window.JOA;

  const plays = (s) => Object.keys(s.daily).length + Object.values(s.practice).reduce((a, p) => a + (p.plays || 0), 0);
  const allScores = (s) => Object.values(s.daily).map((r) => r.score).concat(...Object.values(s.practice).map((p) => Object.values(p.best || {})));
  const topLevel = (s) => Math.max(1, ...Object.values(s.unlocked || {}));
  const gamesPlayed = (s) => new Set(Object.values(s.daily).map((r) => r.gameId).concat(Object.keys(s.practice))).size;

  J.BADGES = [
    { id: 'first', icon: '🌱', name: 'First Steps', desc: 'Finish your first game.', test: (s) => plays(s) >= 1 },
    { id: 'streak3', icon: '🔥', name: 'On a Roll', desc: 'Play 3 days in a row.', test: (s) => J.longestStreak(s) >= 3 },
    { id: 'streak7', icon: '📅', name: 'Week Warrior', desc: 'Play 7 days in a row.', test: (s) => J.longestStreak(s) >= 7 },
    { id: 'streak30', icon: '🏆', name: 'Unstoppable', desc: 'Play 30 days in a row.', test: (s) => J.longestStreak(s) >= 30 },
    { id: 'perfect', icon: '💯', name: 'Perfect!', desc: 'Score 100 on any game.', test: (s) => allScores(s).some((x) => x >= 100) },
    { id: 'boss', icon: '👊', name: 'Boss Beater', desc: `Pass a Sunday Boss Day (${J.PASS_SCORE}+).`, test: (s) => Object.entries(s.daily).some(([k, r]) => J.parseKey(k).getDay() === 0 && r.score >= J.PASS_SCORE) },
    { id: 'fullweek', icon: '🗓️', name: 'Full House', desc: 'Play all 7 days of one week.', test: (s) => {
      const weeks = {};
      Object.keys(s.daily).forEach((k) => { const w = J.weekInfo(J.parseKey(k)).weekIndex; weeks[w] = (weeks[w] || 0) + 1; });
      return Object.values(weeks).some((n) => n >= 7);
    } },
    { id: 'lv3', icon: '⬆️', name: 'Level Up', desc: 'Unlock Level 3 in any game.', test: (s) => topLevel(s) >= 3 },
    { id: 'lv6', icon: '🌟', name: 'Rising Star', desc: 'Unlock Level 6 in any game.', test: (s) => topLevel(s) >= 6 },
    { id: 'master', icon: '👑', name: 'Master', desc: 'Unlock Master (Level 10) in any game.', test: (s) => topLevel(s) >= 10 },
    { id: 'fasttrack', icon: '⚡', name: 'Fast Track', desc: `Skip a level with a ${J.FAST_TRACK_SCORE}+ score.`, test: (s) => (s.stats && s.stats.fastTracks) > 0 },
    { id: 'wellrounded', icon: '🧠', name: 'Well-Rounded', desc: 'Reach Level 3 in 8 different games.', test: (s) => Object.values(s.unlocked || {}).filter((l) => l >= 3).length >= 8 },
    { id: 'allgames', icon: '🃏', name: 'Jack of All Trades', desc: 'Play every game at least once.', test: (s) => gamesPlayed(s) >= J.gameIds().length },
    { id: 'practice25', icon: '🎯', name: 'Practice Makes Perfect', desc: 'Play 25 practice rounds.', test: (s) => Object.values(s.practice).reduce((a, p) => a + (p.plays || 0), 0) >= 25 },
    { id: 'friend', icon: '🤝', name: 'Better Together', desc: 'Add a friend.', test: (s) => Object.keys(s.friends || {}).length >= 1 },
  ];

  J.checkBadges = function () {
    const s = J.getState();
    const fresh = J.BADGES.filter((b) => !s.badges[b.id] && b.test(s));
    if (fresh.length) {
      fresh.forEach((b) => (s.badges[b.id] = Date.now()));
      J.saveState(s);
    }
    return fresh;
  };
})();
