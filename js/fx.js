/* Jack of All — sounds and vibration. Tiny synthesized sounds (no audio files),
   played automatically when any game shows a right/wrong message, plus fanfares
   for results, unlocks and badges. Respects the Sounds setting. */
(function () {
  const J = window.JOA;
  let ctx = null;

  const enabled = () => {
    try {
      return J.getState().settings.sound !== false;
    } catch (e) {
      return false;
    }
  };

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // notes: [frequency Hz, start s, length s]
  function tones(notes, type, vol) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + 0.01;
    notes.forEach(([f, start, len]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
      o.connect(g).connect(a.destination);
      o.start(t0 + start);
      o.stop(t0 + start + len + 0.05);
    });
  }

  const SOUNDS = {
    good: () => tones([[660, 0, 0.12], [880, 0.08, 0.16]], 'triangle'),
    bad: () => tones([[220, 0, 0.18], [180, 0.1, 0.22]], 'square', 0.05),
    tap: () => tones([[520, 0, 0.06]], 'sine', 0.06),
    win: () => tones([[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.32]], 'triangle'),
    ok: () => tones([[523, 0, 0.14], [659, 0.14, 0.24]], 'triangle'),
    unlock: () => tones([[784, 0, 0.1], [988, 0.08, 0.1], [1175, 0.16, 0.1], [1568, 0.24, 0.35]], 'sine', 0.1),
  };
  const BUZZ = { bad: 60, unlock: [40, 60, 40], win: [30, 40, 30] };

  J.fx = {
    play(kind) {
      if (!enabled()) return;
      try {
        if (SOUNDS[kind]) SOUNDS[kind]();
        if (BUZZ[kind] && navigator.vibrate) navigator.vibrate(BUZZ[kind]);
      } catch (e) { /* audio blocked — ignore */ }
    },
  };

  // Automatic feedback: any game message that turns "good"/"bad" plays a sound
  // and is announced to screen readers.
  const FEEDBACK = '.g-msg, .g-feedback, .lt-msg';
  let last = 0;
  function react(el) {
    if (!el.matches || !el.matches(FEEDBACK)) return;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    const now = performance.now();
    if (now - last < 120) return; // one sound per moment
    if (el.classList.contains('good')) { last = now; J.fx.play('good'); }
    else if (el.classList.contains('bad')) { last = now; J.fx.play('bad'); }
  }
  function start() {
    const app = document.getElementById('app');
    if (!app || !window.MutationObserver) return;
    new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.type === 'attributes') react(m.target);
        else m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          react(n);
          n.querySelectorAll && n.querySelectorAll(FEEDBACK).forEach((el) => {
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            react(el);
          });
        });
      });
    }).observe(app, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
