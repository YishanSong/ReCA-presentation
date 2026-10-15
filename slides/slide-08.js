(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const diagram = document.getElementById('s8-diagram');
  const network = document.getElementById('s8-network');
  const local = document.getElementById('s8-local');
  const zoom = document.getElementById('s8-zoom');
  const parent = document.getElementById('s8-local-parent');
  const plan = document.getElementById('s8-plan');
  const status = document.getElementById('s8-status');
  const range = document.getElementById('s8-progress');
  const scrubber = document.getElementById('s8-scrubber');
  const toggle = document.getElementById('s8-toggle');
  const speed = document.getElementById('s8-speed');
  const messages = document.getElementById('s8-messages');
  const rings = diagram.querySelector('.s8-parent-rings');
  const paths = Array.from(diagram.querySelectorAll('.s8-links path'));
  const children = Array.from({ length: 4 }, (_, i) => document.getElementById('s8-child-' + (i + 1)));
  const clusters = Array.from(diagram.querySelectorAll('.s8-cluster'));
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = (t, start, end) => { const u = clamp((t - start) / (end - start)); return u * u * (3 - 2 * u); };
  const duration = 28;

  // Narrative order follows author slides 37 -> 38, not a runtime dependency:
  // first the parent network, then a local plan / feasibility feedback loop.
  const events = [
    { path: 'ac', start: 1.2, end: 3.0, kind: 'progress', from: 'A', to: 'C' },
    { path: 'cd', start: 2.7, end: 4.5, kind: 'progress', from: 'C', to: 'D' },
    { path: 'ab', start: 4.0, end: 5.8, kind: 'progress', reverse: true, from: 'B', to: 'A' },
    { path: 'bd', start: 5.2, end: 7.0, kind: 'progress', reverse: true, from: 'D', to: 'B' },
    ...Array.from({ length: 4 }, (_, i) => ({ path: 'child-' + (i + 1), start: 12 + i * .22, end: 14.5 + i * .22, kind: 'plan' })),
    ...Array.from({ length: 4 }, (_, i) => ({ path: 'child-' + (i + 1), start: 15.8 + i * .6, end: 17.8 + i * .6, kind: i === 2 ? 'no' : 'yes', reverse: true })),
    { path: 'child-3', start: 20.7, end: 22.7, kind: 'plan' },
    { path: 'child-3', start: 22.9, end: 24.7, kind: 'yes', reverse: true }
  ].map(event => {
    const path = document.getElementById('s8-link-' + event.path);
    const token = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    token.setAttribute('r', '7.5');
    token.setAttribute('class', 's8-message');
    token.dataset.kind = event.kind;
    token.style.display = 'none';
    messages.appendChild(token);
    return { ...event, element: path, length: path.getTotalLength(), token };
  });

  function stageAt(t) {
    if (t < 7) return ['progress', 'Update Progress'];
    if (t < 10) return ['expand', 'Intra-cluster centralized cooperation'];
    if (t < 15.8) return ['plan', 'Plan'];
    if (t < 20) return ['feedback', 'Feedback'];
    if (t < 22.9) return ['replan', 'Plan'];
    if (t < 25) return ['check', 'Feedback'];
    return ['overview', 'Hierarchical cooperative planning'];
  }

  // Each state is computed from time, so dragging backwards restores the exact
  // plan, feedback, opacity and message positions without resetting side effects.
  function render(state) {
    const t = state.time;
    const reveal = ease(t, 7.2, 9.8);
    const overview = ease(t, 25, 26.5);
    const localFocus = reveal * (1 - overview);
    const [stage, label] = stageAt(t);
    diagram.dataset.stage = stage;
    diagram.dataset.time = t.toFixed(3);
    local.style.opacity = reveal.toFixed(3);
    zoom.style.opacity = reveal.toFixed(3);
    network.style.opacity = (1 - .35 * localFocus).toFixed(3);
    clusters.forEach(cluster => {
      cluster.style.opacity = cluster.dataset.cluster === 'C' ? '1' : (1 - .18 * localFocus).toFixed(3);
    });
    rings.style.opacity = t < 7 ? '1' : '0';
    rings.querySelectorAll('circle').forEach(ring => { ring.dataset.active = 'false'; });
    paths.forEach(path => { delete path.dataset.message; });

    parent.dataset.state = stage === 'plan' || stage === 'replan' ? 'planning' : t >= 10 ? 'planned' : 'idle';
    plan.dataset.active = stage === 'plan' || stage === 'replan' ? 'true' : 'false';
    children.forEach((child, i) => {
      const planned = t >= 14.5 + i * .22;
      const reviewed = t >= 15.8 + i * .6;
      const accepted = i !== 2 || t >= 22.9;
      child.dataset.state = reviewed ? accepted ? 'yes' : 'no' : planned ? 'planned' : 'idle';
      child.querySelector('.s8-feedback-label').textContent = accepted ? 'Yes' : 'No';
    });

    events.forEach(event => {
      const active = t >= event.start && t < event.end;
      event.token.style.display = active ? '' : 'none';
      if (!active) return;
      const u = (t - event.start) / (event.end - event.start);
      const point = event.element.getPointAtLength(event.length * (event.reverse ? 1 - u : u));
      event.token.setAttribute('cx', point.x.toFixed(3));
      event.token.setAttribute('cy', point.y.toFixed(3));
      event.element.dataset.message = event.kind;
      if (event.kind === 'progress') {
        [event.from, event.to].forEach(name => { rings.querySelector('[data-parent="' + name + '"]').dataset.active = 'true'; });
      }
    });

    if (status.textContent !== label) status.textContent = label;
    const progress = state.progress * 100;
    range.value = progress.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(progress) + '% complete. ' + label + '.');
    scrubber.style.setProperty('--progress', progress + '%');
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', (state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play') + ' the animation');
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', 'Playback speed: ' + state.rate + ' times. Click to change speed.');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
  }

  const timeline = SlideAnimation.createTimeline({ duration, rate: 1, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(duration * Number(range.value) / 100));
  toggle.addEventListener('click', () => { if (timeline.playing) timeline.pause(); else timeline.play(); });
  speed.addEventListener('click', () => timeline.setRate(timeline.rate === 3 ? 1 : timeline.rate + 1));
  SlideAnimation.bindToSlide(timeline);
})();
