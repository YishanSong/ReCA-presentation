(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const range = document.getElementById('s10-progress');
  const scrubber = document.getElementById('s10-scrubber');
  const caption = document.getElementById('s10-caption');
  const toggle = document.getElementById('s10-toggle');
  const speed = document.getElementById('s10-speed');
  const axisStart = 93.987;
  const axisEnd = 282.080;

  // Fig. 9's schematic sequence and relative block widths, restyled as native
  // SVG controls. They are not measured timings or an empirical speedup.
  const baselineEnds = [114.432, 134.877, 141.010, 161.455, 181.900, 188.033, 208.478, 228.923, 235.056, 255.501, 275.946, 282.080];
  const recaEnds = [114.432, 134.877, 141.010, 161.455, 167.589, 173.722, 179.855];
  const baselineModules = ['baseline-communication', 'baseline-planning', 'baseline-execution'];
  const recaModules = ['reca-planning', 'reca-communication', 'reca-send', 'reca-planning', 'reca-execution-1', 'reca-execution-2', 'reca-execution-3'];
  const modules = new Map(Array.from(document.querySelectorAll('.s10-module'), element => [element.dataset.module, element]));

  function displayX(value) { return 170 + (value - axisStart) / (axisEnd - axisStart) * 770; }

  function makeTrack(id, ends, names, y) {
    const root = document.getElementById(id);
    let start = axisStart;
    return ends.map(function (end, index) {
      const module = names[index % names.length];
      const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      element.setAttribute('class', 's10-block');
      element.dataset.module = module;
      element.dataset.kind = modules.get(module).dataset.kind;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', displayX(start) + 1);
      rect.setAttribute('y', y);
      rect.setAttribute('width', displayX(end) - displayX(start) - 2);
      rect.setAttribute('height', 34);
      rect.setAttribute('rx', 2);
      element.appendChild(rect);
      root.appendChild(element);
      const block = { start, end, module, element };
      start = end;
      return block;
    });
  }

  const tracks = [
    makeTrack('s10-baseline-blocks', baselineEnds, baselineModules, 410),
    makeTrack('s10-reca-blocks', recaEnds, recaModules, 472)
  ];

  function render(state) {
    const x = axisStart + state.progress * (axisEnd - axisStart);
    const completedModules = new Set();
    const activeModules = new Set();
    let activeReca = null;
    tracks.forEach(function (blocks, index) {
      blocks.forEach(function (block) {
        const done = state.finished || x >= block.end;
        const active = !done && x >= block.start;
        block.element.dataset.state = done ? 'done' : active ? 'active' : 'future';
        if (done) completedModules.add(block.module);
        if (active) {
          activeModules.add(block.module);
          if (index === 1) activeReca = block;
        }
      });
    });
    modules.forEach(function (element, name) {
      element.dataset.state = activeModules.has(name) ? 'active' : completedModules.has(name) ? 'done' : 'future';
    });
    const progress = state.progress * 100;
    range.value = progress.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(progress) + '% complete');
    scrubber.style.setProperty('--progress', progress + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', (state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play') + ' the animation');
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
    if (state.finished) caption.textContent = 'Same four steps \u00b7 Fewer LLM calls';
    else if (!activeReca) caption.textContent = 'ReCA is done \u00b7 Baseline keeps calling the LLM';
    else if (x >= 141.010) caption.textContent = 'One plan \u00b7 Consecutive low-level actions';
    else if (activeReca.module === 'reca-communication') caption.textContent = 'Generate a message only when needed';
    else if (activeReca.module === 'reca-send') caption.textContent = 'Execute the communication action';
    else caption.textContent = 'Plan first \u00b7 Decide whether to communicate';
  }

  const timeline = SlideAnimation.createTimeline({ duration: 20, rate: 3, onUpdate: render });
  range.addEventListener('input', function () { timeline.seek(timeline.duration * Number(range.value) / 100); });
  toggle.addEventListener('click', function () { if (timeline.playing) timeline.pause(); else timeline.play(); });
  speed.addEventListener('click', function () { timeline.setRate(timeline.rate === 3 ? 1 : timeline.rate + 1); });
  SlideAnimation.bindToSlide(timeline);
})();
