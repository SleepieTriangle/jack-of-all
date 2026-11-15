/* Jack of All — installable app support: service worker + install button. */
(function () {
  const J = window.JOA;

  // Offline support. Service workers only run on https:// or localhost.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // If a page was already controlled and a NEW worker takes over, an update
    // has arrived: offer to refresh (never force it mid-game).
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      const bar = document.getElementById('update-bar');
      if (bar) bar.hidden = false;
    });
    const refresh = document.getElementById('update-now');
    if (refresh) refresh.addEventListener('click', () => location.reload());

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js')
        .then((reg) => {
          // Check for updates now and then while the app stays open.
          setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') reg.update().catch(() => {});
          });
        })
        .catch((e) => console.warn('Service worker failed to register', e));
    });
  }

  const btn = document.getElementById('install-btn');
  let deferred = null;

  J.isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  J.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  J.canPromptInstall = () => !!deferred;

  // Chrome, Edge, Android, Samsung Internet: the browser tells us when install is possible.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
    document.dispatchEvent(new Event('joa:installable'));
  });

  J.promptInstall = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
    return outcome === 'accepted';
  };

  btn.addEventListener('click', J.promptInstall);

  window.addEventListener('appinstalled', () => {
    deferred = null;
    btn.hidden = true;
  });
})();
