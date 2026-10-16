(function () {
  'use strict';

  const section = document.querySelector('.slide');
  const chart = document.getElementById('s18-chart');
  const barsRoot = document.getElementById('s18-bars');
  const range = document.getElementById('s18-time');
  const scrubber = document.getElementById('s18-scrubber');
  const toggle = document.getElementById('s18-toggle');
  const speed = document.getElementById('s18-speed');
  const equationResult = document.getElementById('s18-equation-result');
  const stageButtons = Array.from(document.querySelectorAll('[data-s18-stage]'));
  const legendItems = Array.from(document.querySelectorAll('[data-s18-legend]'));
  const braces = Array.from(document.querySelectorAll('.s18-brace'));
  const equationStyle = getComputedStyle(document.querySelector('.s18-equation'));
  const moduleHeight = parseFloat(equationStyle.getPropertyValue('--module-height'));
  const moduleGap = parseFloat(equationStyle.getPropertyValue('--module-gap'));
  const duration = 4;
  const initialHold = .5;
  const stageInterval = .5;
  const revealDuration = .32;
  const baselineY = 276;
  const scale = 2.4;
  let printing = false;

  // Fig. 17 labels are rounded, cumulative reductions from the configuration
  // without all five optimizations. They are not independent component gains.
  const systems = [
    { name: 'CoELA', center: 202, reductions: [0, 23, 40, 62, 82, 91] },
    { name: 'COMBO', center: 450, reductions: [0, 28, 55, 76, 81, 93] },
    { name: 'MindAgent', center: 698, reductions: [0, 25, 51, 74, 84, 92] }
  ];
  const stageNames = [
    'All five optimizations removed',
    'HW: A-star/GPU heterogenous hardware system',
    'MT: multi-step execution',
    'HC: hierarchical cooperation',
    'DM: dual memory',
    'LM: local model \u00b7 Full ReCA'
  ];

  function svgElement(name, attributes, text) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(function ([key, value]) {
      element.setAttribute(key, value);
    });
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function stageStart(stage) { return stage === 0 ? 0 : initialHold + (stage - 1) * stageInterval; }
  function clamp(value) { return Math.min(1, Math.max(0, value)); }
  function ease(value) { return value * value * (3 - 2 * value); }
  function moduleReveal(stage, time) { return stage === 0 ? 1 : ease(clamp((time - stageStart(stage)) / .24)); }

  const bars = systems.flatMap(function (system) {
    return system.reductions.map(function (reduction, stage) {
      const x = system.center - 99 + stage * 33;
      const latency = 100 - reduction;
      const group = svgElement('g', {
        class: 's18-bar-group',
        'data-system': system.name,
        'data-stage': stage,
        'data-reduction': reduction,
        'data-latency': latency,
        role: 'img',
        'aria-label': system.name + ', ' + stageNames[stage] + ': ' + latency +
          '% normalized latency' + (stage ? ', ' + reduction + '% cumulative reduction.' : '.')
      });
      const bar = svgElement('rect', {
        class: 's18-bar s18-bar-stage-' + stage,
        x: x,
        y: baselineY - latency * scale,
        width: 25,
        height: latency * scale,
        rx: 2
      });
      const label = svgElement('text', {
        class: 's18-bar-label',
        x: x + 12.5,
        y: baselineY - latency * scale - 9,
        'text-anchor': 'middle',
        'aria-hidden': 'true'
      }, stage ? reduction + '%' : '');
      group.append(bar, label);
      barsRoot.appendChild(group);
      return {
        group, bar, label, stage, latency,
        previousLatency: stage ? 100 - system.reductions[stage - 1] : 100
      };
    });
  });

  function render(state) {
    const current = state.time < initialHold ? 0 : Math.min(5, 1 + Math.floor((state.time - initialHold) / stageInterval));
    bars.forEach(function (item) {
      const revealed = item.stage === 0 || state.time >= stageStart(item.stage);
      const progress = item.stage === 0 ? 1 : ease(clamp((state.time - stageStart(item.stage)) / revealDuration));
      const latency = item.previousLatency + (item.latency - item.previousLatency) * progress;
      const height = latency * scale;
      const active = revealed && item.stage === current && !state.finished;
      const settled = revealed && progress === 1;
      item.group.dataset.state = !revealed ? 'future' : settled ? 'settled' : 'transitioning';
      item.group.setAttribute('aria-hidden', revealed ? 'false' : 'true');
      item.bar.style.visibility = revealed ? 'visible' : 'hidden';
      item.bar.style.opacity = item.stage === 0 ? '1' : String(ease(clamp((state.time - stageStart(item.stage)) / .18)));
      item.bar.setAttribute('y', (baselineY - height).toFixed(3));
      item.bar.setAttribute('height', height.toFixed(3));
      item.bar.classList.toggle('is-current', active);
      // Only the measured, rounded endpoint is ever labeled. Intermediate
      // animation heights are a visual transition, not additional data points.
      item.label.style.visibility = settled ? 'visible' : 'hidden';
      item.label.style.opacity = !state.playing || item.stage === 0 ? '1' : String(ease(clamp((state.time - stageStart(item.stage) - revealDuration) / .12)));
    });

    stageButtons.forEach(function (button) {
      const stage = Number(button.dataset.s18Stage);
      const enabled = stage === 0 || state.time >= stageStart(stage);
      const reveal = moduleReveal(stage, state.time);
      const currentButton = current === stage;
      button.classList.toggle('is-enabled', enabled);
      button.classList.toggle('is-current', currentButton);
      button.style.visibility = enabled ? 'visible' : 'hidden';
      button.style.opacity = String(reveal);
      button.style.transform = 'translateY(' + ((1 - reveal) * 9).toFixed(2) + 'px)';
      button.parentElement.style.setProperty('--module-reveal', reveal);
      button.setAttribute('aria-pressed', currentButton ? 'true' : 'false');
    });
    legendItems.forEach(function (item) {
      const stage = Number(item.dataset.s18Legend);
      const reveal = moduleReveal(stage, state.time);
      item.classList.toggle('is-current', stage === current);
      item.style.opacity = String(.5 + .5 * reveal);
    });
    const complete = state.time >= stageStart(5) + revealDuration;
    const finishReveal = complete && !state.playing ? 1 : ease(clamp((state.time - stageStart(5) - revealDuration) / .35));
    braces.forEach(function (brace) {
      const hardware = brace.classList.contains('s18-brace-hardware');
      const reveal = moduleReveal(hardware ? 1 : 2, state.time);
      if (!hardware) {
        // Keep the top at MT; extend the bottom as HC, DM and LM arrive.
        const extension = [3, 4, 5].reduce(function (sum, stage) {
          return sum + (moduleHeight + moduleGap) * moduleReveal(stage, state.time);
        }, 0);
        brace.style.height = (moduleHeight + extension).toFixed(3) + 'px';
      }
      brace.style.opacity = String(reveal);
      brace.style.transform = 'translateY(' + ((1 - reveal) * 9).toFixed(2) + 'px)';
      brace.setAttribute('aria-hidden', reveal === 0 ? 'true' : 'false');
    });
    if (equationResult) {
      equationResult.classList.toggle('is-visible', complete);
      equationResult.style.opacity = String(finishReveal);
      equationResult.setAttribute('aria-hidden', complete ? 'false' : 'true');
    }
    chart.dataset.stage = String(current);
    chart.dataset.time = state.time.toFixed(3);
    const percent = state.progress * 100;
    range.value = percent.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(percent) + '% complete. ' + stageNames[current] + '.');
    scrubber.style.setProperty('--progress', percent + '%');
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', (state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play') + ' the animation');
    toggle.disabled = SlideRuntime.reducedMotion || printing;
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', 'Playback speed: ' + state.rate + ' times. Click to change speed.');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    section.dataset.stage = String(current);
  }

  const timeline = SlideAnimation.createTimeline({ duration, rate: 1, onUpdate: render });
  function canAnimate() { return SlideRuntime.active && !SlideRuntime.reducedMotion && !printing; }
  range.addEventListener('input', function () {
    if (canAnimate()) timeline.seek(duration * Number(range.value) / 100);
    else timeline.finish();
  });
  stageButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (canAnimate()) {
        const stage = Number(button.dataset.s18Stage);
        timeline.seek(stage === 0 ? 0 : stageStart(stage) + revealDuration);
      }
      else timeline.finish();
    });
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
