(function () {
  'use strict';

  const section = document.querySelector('.slide');
  const range = document.getElementById('s20-progress');
  const scrubber = document.getElementById('s20-scrubber');
  const toggle = document.getElementById('s20-toggle');
  const speed = document.getElementById('s20-speed');
  const papers = ['arborist', 'flash', 'remac'].map(function (name) {
    return document.querySelector('.s20-idea[data-paper="' + name + '"]');
  });
  const trees = Array.from(document.querySelectorAll('#s20-trees path'));
  const lookahead = blocks('s20-lookahead');
  const commit = blocks('s20-commit');
  const draft = blocks('s20-draft');
  const verified = blocks('s20-verified');
  const training = blocks('s20-training-suffix');
  const preserved = blocks('s20-preserved');
  const suffix = blocks('s20-suffix');
  const duration = 15;
  const ideaDuration = 4.5;
  let printing = false;

  function blocks(id) {
    return Array.from(document.querySelectorAll('#' + id + ' .s20-block'));
  }

  function clamp(value) { return Math.min(1, Math.max(0, value)); }
  function reveal(time, start, end) {
    const value = clamp((time - start) / (end - start));
    return value * value * (3 - 2 * value);
  }
  function opacity(id, value) {
    document.getElementById(id).style.opacity = String(value);
  }
  function setBlocks(items, time, start, interval, state) {
    items.forEach(function (item, index) {
      item.dataset.state = time >= start + interval * index ? state : 'pending';
    });
  }

  trees.forEach(function (path) {
    path.setAttribute('pathLength', '1');
    path.style.strokeDasharray = '1';
  });

  function render(state) {
    const local = papers.map(function (paper, index) {
      const start = index * ideaDuration;
      const elapsed = Math.min(ideaDuration, Math.max(0, state.time - start));
      paper.dataset.state = state.time < start ? 'pending' : state.time < start + ideaDuration ? 'active' : 'done';
      paper.dataset.localTime = elapsed.toFixed(3);
      return elapsed;
    });

    const arborist = local[0];
    trees.forEach(function (path) {
      path.style.strokeDashoffset = String(1 - reveal(arborist, .3, 1.4));
    });
    setBlocks(lookahead, arborist, 1.6, 0, 'ready');
    setBlocks(commit, arborist, 2.2, .45, 'accepted');

    const flash = local[1];
    setBlocks(draft, flash, .5, .18, 'proposed');
    opacity('s20-verifier', .35 + .65 * reveal(flash, 1.4, 1.7));
    verified.forEach(function (item, index) {
      item.dataset.state = flash < 2.3 ? 'pending' : index === 3 ? 'rejected' : 'accepted';
    });
    opacity('s20-flash-checks', flash >= 2.3 ? 1 : 0);
    opacity('s20-fallback', reveal(flash, 3, 3.3));

    const remac = local[2];
    opacity('s20-mask', reveal(remac, .35, .6));
    setBlocks(training, remac, 1.2, 0, 'proposed');
    setBlocks(preserved, remac, 1.9, 0, 'accepted');
    setBlocks(suffix, remac, 2.2, .25, 'proposed');

    const percent = state.progress * 100;
    range.value = percent.toFixed(2);
    range.setAttribute('aria-valuetext', Math.round(percent) + '% complete');
    scrubber.style.setProperty('--progress', percent + '%');
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', toggle.textContent + ' the animation');
    toggle.disabled = SlideRuntime.reducedMotion || printing;
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', 'Playback speed: ' + state.rate + ' times. Click to change speed.');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    section.dataset.stage = String(Math.min(3, Math.floor(state.time / ideaDuration) + 1));
    section.dataset.time = state.time.toFixed(3);
  }

  const timeline = SlideAnimation.createTimeline({ duration, rate: 1, onUpdate: render });
  function canAnimate() { return SlideRuntime.active && !SlideRuntime.reducedMotion && !printing; }

  range.addEventListener('input', function () {
    if (canAnimate()) timeline.seek(duration * Number(range.value) / 100);
    else timeline.finish();
  });
  toggle.addEventListener('click', function () {
    if (!canAnimate()) { timeline.finish(); return; }
    if (timeline.playing) timeline.pause();
    else timeline.play();
  });
  speed.addEventListener('click', function () {
    timeline.setRate(timeline.rate === 3 ? 1 : timeline.rate + 1);
  });
  window.addEventListener('beforeprint', function () { printing = true; timeline.finish(); });
  window.addEventListener('afterprint', function () { printing = false; timeline.finish(); });
  SlideAnimation.bindToSlide(timeline);
})();
