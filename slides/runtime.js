(function () {
  'use strict';
  if (window.SlideRuntime) return;

  const activeListeners = new Set();
  const motionListeners = new Set();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let reducedMotion = motionQuery.matches;
  let pageHidden = false;
  let deck = null;
  let section = null;
  let host = null;

  // A cross-origin parent may hide frameElement from the child document.
  try { host = window.frameElement; } catch (error) { /* Standalone fallback. */ }

  function subscribe(listeners, listener, value) {
    if (typeof listener !== 'function') throw new TypeError('Expected a listener function.');
    listeners.add(listener);
    listener(value);
    return function () { listeners.delete(listener); };
  }

  function visible(element) {
    return !element || (
      (!element.classList.contains('slide') || element.classList.contains('active')) &&
      element.getAttribute('aria-hidden') !== 'true' && !element.hasAttribute('inert')
    );
  }

  function syncActive() {
    const next = !pageHidden && !document.hidden && visible(section) && visible(host);
    if (next === active) return;
    active = next;
    activeListeners.forEach(function (listener) { listener(active); });
  }

  function resize() {
    if (!deck) return;
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  const observer = new MutationObserver(syncActive);
  const observeOptions = { attributes: true, attributeFilter: ['class', 'aria-hidden', 'inert'] };
  if (host) observer.observe(host, observeOptions);

  function initialize() {
    deck = document.getElementById('deck');
    section = document.querySelector('.slide');
    if (section) observer.observe(section, observeOptions);
    resize();
    syncActive();
  }

  function syncMotion() {
    if (motionQuery.matches === reducedMotion) return;
    reducedMotion = motionQuery.matches;
    motionListeners.forEach(function (listener) { listener(reducedMotion); });
  }

  window.SlideRuntime = Object.freeze({
    get active() { return active; },
    get reducedMotion() { return reducedMotion; },
    onActiveChange: function (listener) { return subscribe(activeListeners, listener, active); },
    onReducedMotionChange: function (listener) { return subscribe(motionListeners, listener, reducedMotion); }
  });

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncActive);
  window.addEventListener('pagehide', function () { pageHidden = true; syncActive(); });
  window.addEventListener('pageshow', function () { pageHidden = false; syncActive(); });
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncMotion);
  else motionQuery.addListener(syncMotion);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
