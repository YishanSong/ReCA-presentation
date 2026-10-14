(function () {
  'use strict';
  const duration = 12;
  let playbackRate = 3;
  const axisWidth = 828;
  const deck = document.getElementById('deck');
  const section = document.querySelector('.slide');
  const range = document.getElementById('s6-time');
  const scrubber = document.getElementById('s6-scrubber');
  const clock = document.getElementById('s6-clock');
  const timeLabel = document.getElementById('s6-time-label');
  const clip = document.getElementById('s6-elapsed-clip');
  const playhead = document.getElementById('s6-playhead');
  const smallFinish = document.getElementById('s6-small-finish');
  const betterFinish = document.getElementById('s6-better-finish');
  const toggle = document.getElementById('s6-toggle');
  const speed = document.getElementById('s6-speed');
  const host = window.frameElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let running = false;
  let elapsed = duration;
  let frame = null;
  let baseline = 0;

  function resize() {
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    running = false;
  }

  function render(seconds, animateResult) {
    elapsed = Math.min(duration, Math.max(0, seconds));
    const x = elapsed / duration * axisWidth;
    const label = elapsed.toFixed(1) + ' s';
    range.value = elapsed.toFixed(1);
    range.setAttribute('aria-valuetext', label);
    clock.textContent = label;
    timeLabel.textContent = label;
    scrubber.style.setProperty('--progress', elapsed / duration * 100 + '%');
    clip.setAttribute('width', x);
    playhead.setAttribute('d', `M${x} 67V132M${x} 235V300`);
    smallFinish.dataset.done = String(elapsed >= duration);
    betterFinish.dataset.done = String(elapsed >= 7);
    section.dataset.animateResult = String(Boolean(animateResult));
    section.dataset.result = elapsed >= duration ? 'visible' : 'hidden';
    section.dataset.phase = running ? 'playing' : elapsed >= duration ? 'complete' : 'paused';
    toggle.textContent = running ? 'Pause' : elapsed >= duration ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', running ? 'Pause the animation' : elapsed >= duration ? 'Replay the animation' : 'Play the animation');
  }

  function tick(now) {
    if (!active || !running) return;
    const seconds = (now - baseline) / 1000 * playbackRate;
    if (seconds >= duration) {
      stop();
      render(duration, true);
      return;
    }
    render(seconds, false);
    frame = requestAnimationFrame(tick);
  }

  function play(restart) {
    stop();
    if (!active) return;
    if (restart || elapsed >= duration) elapsed = 0;
    running = true;
    baseline = performance.now() - elapsed * 1000 / playbackRate;
    render(elapsed, false);
    frame = requestAnimationFrame(tick);
  }

  function syncActivation() {
    const ownActive = section.classList.contains('active') && section.getAttribute('aria-hidden') !== 'true';
    const hostActive = !host || !host.classList.contains('slide') ||
      (host.classList.contains('active') && host.getAttribute('aria-hidden') !== 'true' && !host.hasAttribute('inert'));
    const next = ownActive && hostActive && !document.hidden;
    if (next === active) return;
    active = next;
    stop();
    if (active && !reducedMotion.matches) play(true);
    else render(duration, false);
  }

  range.addEventListener('input', function () {
    const seconds = Number(range.value);
    stop();
    render(seconds, false);
  });
  toggle.addEventListener('click', function () {
    if (running) {
      stop();
      render(elapsed, false);
    } else play(false);
  });
  speed.addEventListener('click', function () {
    const now = performance.now();
    if (running) elapsed = Math.min(duration, (now - baseline) / 1000 * playbackRate);
    playbackRate = playbackRate === 3 ? 1 : playbackRate + 1;
    if (running) {
      if (elapsed >= duration) stop();
      else baseline = now - elapsed * 1000 / playbackRate;
    }
    speed.textContent = playbackRate + '×';
    speed.setAttribute('aria-label', `Playback speed: ${playbackRate} times. Click to change speed.`);
    section.style.setProperty('--playback-rate', playbackRate);
    render(elapsed, false);
  });

  // Hidden iframes do not run a clock. Entering this page starts a fresh pass.
  const observer = new MutationObserver(syncActivation);
  const options = { attributes: true, attributeFilter: ['class', 'aria-hidden', 'inert'] };
  observer.observe(section, options);
  if (host) observer.observe(host, options);
  document.addEventListener('visibilitychange', syncActivation);
  reducedMotion.addEventListener('change', function () {
    stop();
    if (reducedMotion.matches) render(duration, false);
    else if (active) play(true);
  });
  window.addEventListener('beforeprint', function () { stop(); render(duration, false); });
  window.addEventListener('pagehide', function () { stop(); active = false; });
  window.addEventListener('pageshow', syncActivation);
  window.addEventListener('resize', resize);
  resize();
  render(duration, false);
  syncActivation();
})();
