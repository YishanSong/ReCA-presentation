(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const get = id => document.getElementById('s13-' + id);
  const range = get('time'), scrubber = get('scrubber');
  const toggle = get('toggle'), speed = get('speed');
  const rates = [1, 1.5, 2, 3];
  const clamp = x => Math.max(0, Math.min(1, x));
  function ease(x) { const u = clamp(x); return u * u * u * (u * (u * 6 - 15) + 10); }

  // Faithful conversion of the eight-second source, not a normalized share chart.
  // The original schematic uses 72/16/12 -> 20/16/12 on ONE horizontal scale.
  // These widths are illustrative, not measured component-level latency data.
  function renderAt(time) {
    const llm = 1152 - 832 * ease((time - 1.45) / 2.35);
    const otherX = 160 + llm, astarX = otherX + 256;
    get('after').setAttribute('opacity', ease((time - 1.2) / .25));
    get('after-llm').setAttribute('width', llm);
    get('after-other').setAttribute('x', otherX);
    get('after-astar').setAttribute('x', astarX);
    // Other and A* retain their original absolute widths, including when seeking.
    get('llm-label').setAttribute('x', 160 + llm / 2);
    get('other-label').setAttribute('x', otherX + 128);
    get('astar-label').setAttribute('x', astarX + 96);
    get('astar-focus').setAttribute('x', astarX + 6);
    get('astar-focus').setAttribute('opacity', ease((time - 3.8) / 1));
    get('llm-focus').setAttribute('opacity', ease((time - .3) / .35) * (1 - ease((time - 1.05) / .4)) * .65);
  }

  function render(state) {
    renderAt(state.time);
    range.value = (state.progress * 100).toFixed(2);
    range.setAttribute('aria-valuetext', Math.round(state.progress * 100) + '% complete');
    scrubber.style.setProperty('--progress', state.progress * 100 + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', toggle.textContent + ' the animation');
    speed.textContent = state.rate + '×';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
  }
  const timeline = SlideAnimation.createTimeline({ duration: 8, rate: 1, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(Number(range.value) / 100 * timeline.duration));
  toggle.addEventListener('click', () => timeline.playing ? timeline.pause() : timeline.play());
  speed.addEventListener('click', () => timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
