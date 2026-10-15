(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const diagram = document.querySelector('.s10-diagram');
  const defs = diagram.querySelector('defs');
  const range = document.getElementById('s10-progress');
  const scrubber = document.getElementById('s10-scrubber');
  const caption = document.getElementById('s10-caption');
  const toggle = document.getElementById('s10-toggle');
  const speed = document.getElementById('s10-speed');
  const elapsedClip = document.getElementById('s10-elapsed-clip');
  const playhead = document.getElementById('s10-playhead');
  const plotStart = 170;
  const plotWidth = 770;

  // Preserve Fig. 9's sequence. Display proportions are adjusted for readable
  // execution blocks; these illustrative units are not measured timings.
  const units = { communication: 19, planning: 19, execution: 9 };
  const baselineSequence = Array.from({ length: 4 }, function () {
    return ['baseline-communication', 'baseline-planning', 'baseline-execution'];
  }).flat();
  const recaSequence = ['reca-planning', 'reca-communication', 'reca-send', 'reca-planning', 'reca-execution-1', 'reca-execution-2', 'reca-execution-3'];

  function svgElement(name, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(function ([key, value]) { element.setAttribute(key, value); });
    return element;
  }

  const modules = new Map(Array.from(diagram.querySelectorAll('.s10-module'), function (element) {
    const base = element.querySelector('rect');
    base.setAttribute('class', 's10-module-base');
    const inner = {
      x: Number(base.getAttribute('x')) + 1.2,
      y: Number(base.getAttribute('y')) + 1.2,
      width: Number(base.getAttribute('width')) - 2.4,
      height: Number(base.getAttribute('height')) - 2.4,
      rx: 4.8
    };
    const clipId = 's10-fill-' + element.dataset.module;
    const clipPath = svgElement('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
    const clip = svgElement('rect', { x: inner.x, y: inner.y, width: 0, height: inner.height });
    clipPath.appendChild(clip);
    defs.appendChild(clipPath);
    const pending = svgElement('rect', { ...inner, class: 's10-module-pending' });
    const progress = svgElement('rect', { ...inner, class: 's10-module-progress', 'clip-path': `url(#${clipId})` });
    element.insertBefore(pending, base.nextSibling);
    element.insertBefore(progress, pending.nextSibling);
    return [element.dataset.module, { element, kind: element.dataset.kind, clip, width: inner.width }];
  }));

  const totalUnits = baselineSequence.reduce(function (sum, name) { return sum + units[modules.get(name).kind]; }, 0);
  function displayX(value) { return plotStart + value / totalUnits * plotWidth; }

  function makeTrack(id, sequence, y) {
    const root = document.getElementById(id);
    let start = 0;
    return sequence.map(function (name) {
      const module = modules.get(name);
      const end = start + units[module.kind];
      const element = svgElement('g', { class: 's10-block', 'data-module': name, 'data-kind': module.kind });
      const box = { x: displayX(start) + 1, y, width: displayX(end) - displayX(start) - 2, height: 34, rx: 2 };
      element.appendChild(svgElement('rect', { ...box, class: 's10-block-base' }));
      element.appendChild(svgElement('rect', { ...box, class: 's10-block-progress', 'clip-path': 'url(#s10-elapsed)' }));
      element.appendChild(svgElement('rect', { ...box, class: 's10-block-focus' }));
      root.appendChild(element);
      const block = { start, end, module: name, element };
      start = end;
      return block;
    });
  }

  const tracks = [
    makeTrack('s10-baseline-blocks', baselineSequence, 410),
    makeTrack('s10-reca-blocks', recaSequence, 472)
  ];
  const newCycle = tracks[1][3];
  const cycleNote = document.getElementById('s10-new-cycle');
  const multiStepStart = tracks[1][4].start;

  function render(state) {
    const elapsed = state.progress * totalUnits;
    const completedModules = new Set();
    const activeModules = new Map();
    let activeReca = null;
    tracks.forEach(function (blocks, index) {
      blocks.forEach(function (block) {
        const done = state.finished || elapsed >= block.end;
        const active = !done && elapsed >= block.start;
        block.element.dataset.state = done ? 'done' : active ? 'active' : 'future';
        if (done) completedModules.add(block.module);
        if (active) {
          activeModules.set(block.module, (elapsed - block.start) / (block.end - block.start));
          if (index === 1) activeReca = block;
        }
      });
    });
    modules.forEach(function (module, name) {
      const active = activeModules.has(name);
      module.element.dataset.state = active ? 'active' : completedModules.has(name) ? 'done' : 'future';
      module.clip.setAttribute('width', active ? module.width * activeModules.get(name) : 0);
    });
    // A single persistent clip keeps elapsed blocks solid; there is no white
    // mask and no recoloring when a timeline block changes from active to done.
    const elapsedWidth = state.progress * plotWidth;
    elapsedClip.setAttribute('width', elapsedWidth);
    const x = plotStart + elapsedWidth;
    playhead.setAttribute('d', `M${x} 404V450M${x} 466V512`);
    const progress = state.progress * 100;
    range.value = progress.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(progress) + '% complete');
    scrubber.style.setProperty('--progress', progress + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', (state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play') + ' the animation');
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
    cycleNote.dataset.active = String(activeReca === newCycle);
    if (state.finished) caption.textContent = 'Same four steps \u00b7 Fewer LLM calls';
    else if (!activeReca) caption.textContent = 'ReCA is done \u00b7 Baseline keeps calling the LLM';
    else if (activeReca === newCycle) caption.textContent = 'New planning cycle \u00b7 Re-plan if needed';
    else if (elapsed >= multiStepStart) caption.textContent = 'One plan guides multiple actions';
    else if (activeReca.module === 'reca-communication') caption.textContent = 'Generate a message only when needed';
    else if (activeReca.module === 'reca-send') caption.textContent = 'Execute the communication action';
    else caption.textContent = 'Plan first \u00b7 Decide whether to communicate';
  }

  const timeline = SlideAnimation.createTimeline({ duration: 20, rate: 2, onUpdate: render });
  range.addEventListener('input', function () { timeline.seek(timeline.duration * Number(range.value) / 100); });
  toggle.addEventListener('click', function () { if (timeline.playing) timeline.pause(); else timeline.play(); });
  speed.addEventListener('click', function () { timeline.setRate(timeline.rate === 3 ? 1 : timeline.rate + 1); });
  SlideAnimation.bindToSlide(timeline);
})();
