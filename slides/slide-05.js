(function () {
  'use strict';
  const duration = 17;
  const stageLength = 3.6;
  const transition = .3;
  const rates = [1, 1.5, 2, 3];
  const section = document.querySelector('.slide');
  const range = document.getElementById('s5-time');
  const scrubber = document.getElementById('s5-scrubber');
  const toggle = document.getElementById('s5-toggle');
  const speed = document.getElementById('s5-speed');
  const stageLabel = document.getElementById('s5-stage-label');
  const stageTitle = document.getElementById('s5-stage-title');
  const masks = document.getElementById('s5-spotlight-masks');
  const layers = document.getElementById('s5-spotlight-layers');

  // Bounds checked against the 1807 × 746 embedded source image and Wan's Slide 35.
  // Padding stays outside the original text and colored source borders.
  const pairs = [
    { label: '01 / ALGORITHM', title: 'Local LLM + planning-guided multi-step execution', challenge: [481, 82, 486, 146], idea: [1040, 82, 573, 146], arrow: [958, 137, 90, 36], level: [1618, 96, 157, 88] },
    { label: '02 / SYSTEM', title: 'Dual memory: persistent + temporary', challenge: [481, 245, 486, 149], idea: [1040, 245, 573, 149], arrow: [958, 301, 90, 36], level: [1620, 349, 152, 83] },
    { label: '03 / SYSTEM', title: 'Hierarchical cooperative planning', challenge: [481, 401, 486, 148], idea: [1040, 401, 573, 148], arrow: [958, 457, 90, 36], level: [1620, 349, 152, 83] },
    { label: '04 / HARDWARE', title: 'Adaptive A* accelerator + GPU interaction', challenge: [481, 570, 486, 150], idea: [1040, 570, 573, 150], arrow: [958, 627, 90, 36], level: [1614, 602, 164, 83] }
  ];

  function svgElement(name, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(function ([key, value]) { element.setAttribute(key, value); });
    return element;
  }

  function rectangle(bounds, attributes = {}) {
    const [x, y, width, height] = bounds;
    return svgElement('rect', Object.assign({ x, y, width, height }, attributes));
  }

  const spotlights = pairs.map(function (pair, index) {
    const id = 's5-mask-' + (index + 1);
    const mask = svgElement('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1807, height: 746, 'mask-type': 'luminance' });
    mask.append(rectangle([0, 0, 1807, 746], { fill: '#fff' }));
    [pair.challenge, pair.idea, pair.arrow, pair.level].forEach(function (bounds) {
      mask.append(rectangle(bounds, { fill: '#000', rx: 12 }));
    });
    masks.append(mask);
    const group = svgElement('g', { class: 's5-spotlight', 'data-pair': index + 1 });
    group.append(rectangle([0, 0, 1807, 746], { class: 's5-dimmer', mask: 'url(#' + id + ')' }));
    [pair.challenge, pair.idea].forEach(function (bounds) {
      group.append(rectangle(bounds, { class: 's5-focus', rx: 17 }));
    });
    layers.append(group);
    return group;
  });

  // Every visible property derives from time. No CSS transitions or independent timers
  // can retain a later frame when the presenter seeks backward.
  function renderAt(time) {
    const seconds = Math.min(duration, Math.max(0, time));
    const phase = Math.min(4, Math.floor((seconds + 1e-8) / stageLength));
    const elapsed = seconds - phase * stageLength;
    const mix = phase === 0 ? 1 : Math.min(1, Math.max(0, elapsed / transition));
    const eased = mix * mix * (3 - 2 * mix);
    spotlights.forEach(function (group, index) {
      const opacity = index === phase ? eased : index === phase - 1 ? 1 - eased : 0;
      group.style.opacity = String(opacity);
    });
    const pair = pairs[phase];
    section.dataset.stage = pair ? String(phase + 1) : 'overview';
    const label = pair ? pair.label : 'FULL OVERVIEW';
    const title = pair ? pair.title : 'Algorithm, system, and hardware work together';
    if (stageLabel.textContent !== label) stageLabel.textContent = label;
    if (stageTitle.textContent !== title) stageTitle.textContent = title;
  }

  function render(state) {
    renderAt(state.time);
    const progress = state.progress * 100;
    range.value = progress.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(progress) + '% complete. ' + stageTitle.textContent);
    scrubber.style.setProperty('--progress', progress + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', state.playing ? 'Pause the methodology animation' : state.finished ? 'Replay the methodology animation' : 'Play the methodology animation');
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
  }

  const timeline = SlideAnimation.createTimeline({ duration, rate: 1, onUpdate: render });
  range.addEventListener('input', function () { timeline.seek(duration * Number(range.value) / 100); });
  toggle.addEventListener('click', function () {
    if (timeline.playing) timeline.pause();
    else timeline.play();
  });
  speed.addEventListener('click', function () { timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]); });
  SlideAnimation.bindToSlide(timeline);
})();
