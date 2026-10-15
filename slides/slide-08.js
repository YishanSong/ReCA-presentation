(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const diagram = document.getElementById('s8-diagram');
  const network = document.getElementById('s8-network');
  const networkHeading = document.getElementById('s8-network-heading');
  const interHeading = document.getElementById('s8-inter-heading');
  const hierarchyHeading = document.getElementById('s8-hierarchy-heading');
  const headingWidth = networkHeading.getComputedTextLength();
  const headingBaseSize = Number.parseFloat(getComputedStyle(networkHeading).fontSize);
  const local = document.getElementById('s8-local');
  const zoom = document.getElementById('s8-zoom');
  const summary = document.getElementById('s8-summary');
  const parent = document.getElementById('s8-local-parent');
  const plan = document.getElementById('s8-plan');
  const status = document.getElementById('s8-status');
  const range = document.getElementById('s8-progress');
  const scrubber = document.getElementById('s8-scrubber');
  const toggle = document.getElementById('s8-toggle');
  const speed = document.getElementById('s8-speed');
  const networkMessages = document.getElementById('s8-network-messages');
  const localMessages = document.getElementById('s8-local-messages');
  const rings = diagram.querySelector('.s8-parent-rings');
  const paths = Array.from(diagram.querySelectorAll('.s8-links path'));
  const children = Array.from({ length: 4 }, (_, i) => document.getElementById('s8-child-' + (i + 1)));
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = (t, start, end) => { const u = clamp((t - start) / (end - start)); return u * u * (3 - 2 * u); };
  const duration = 20;

  // Narrative order follows author slides 37 -> 38, not a runtime dependency:
  // Reveal the hierarchy rather than creating new agents: the children are
  // initially hidden, then the same parent network moves left for a local zoom.
  const events = [
    { path: 'ac', start: .35, end: .95, kind: 'progress', from: 'A', to: 'C' },
    { path: 'cd', start: .90, end: 1.50, kind: 'progress', from: 'C', to: 'D' },
    { path: 'ab', start: 1.30, end: 1.95, kind: 'progress', reverse: true, from: 'B', to: 'A' },
    { path: 'bd', start: 1.80, end: 2.45, kind: 'progress', reverse: true, from: 'D', to: 'B' },
    { path: 'ad', start: 2.05, end: 2.65, kind: 'progress', from: 'A', to: 'D' },
    { path: 'cb', start: 2.50, end: 3.10, kind: 'progress', reverse: true, from: 'B', to: 'C' },
    { path: 'ac', start: 3.85, end: 4.45, kind: 'progress', from: 'A', to: 'C' },
    { path: 'cd', start: 4.80, end: 5.40, kind: 'progress', from: 'C', to: 'D' },
    ...Array.from({ length: 4 }, (_, i) => ({ path: 'child-' + (i + 1), start: 7.05 + i * .08, end: 7.80 + i * .08, kind: 'plan' })),
    ...Array.from({ length: 4 }, (_, i) => ({ path: 'child-' + (i + 1), start: 8.45 + i * .16, end: 9.20 + i * .16, kind: i === 2 ? 'no' : 'yes', reverse: true })),
    { path: 'child-3', start: 10.15, end: 10.90, kind: 'plan' },
    { path: 'child-3', start: 11.10, end: 11.85, kind: 'yes', reverse: true }
  ].map(event => {
    const path = document.getElementById('s8-link-' + event.path);
    const token = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    token.setAttribute('r', '7.5');
    token.setAttribute('class', 's8-message');
    token.dataset.kind = event.kind;
    token.style.display = 'none';
    (event.kind === 'progress' ? networkMessages : localMessages).appendChild(token);
    return { ...event, element: path, length: path.getTotalLength(), token };
  });

  function stageAt(t) {
    if (t < 2.6) return ['decentralized', 'Decentralized cooperation'];
    if (t < 3.55) return ['inter-cluster', 'Inter-cluster decentralized cooperation'];
    if (t < 4.6) return ['clusters', 'Update Progress'];
    if (t < 6.5) return ['expand', 'Intra-cluster centralized cooperation'];
    if (t < 8.45) return ['plan', 'Plan'];
    if (t < 10.05) return ['feedback', 'Feedback'];
    if (t < 11.1) return ['replan', 'Plan'];
    if (t < 12.8) return ['check', 'Feedback'];
    return ['summary', 'Hierarchical cooperative planning'];
  }

  // Each state is computed from time, so dragging backwards restores the exact
  // plan, feedback, opacity and message positions without resetting side effects.
  function render(state) {
    const t = state.time;
    const compact = ease(t, 2.6, 3.55);
    const childrenReveal = ease(t, 3.55, 4.5);
    const shift = ease(t, 4.6, 5.6);
    const reveal = ease(t, 5.6, 6.4);
    const closeLocal = ease(t, 12.8, 13.35);
    const summaryReveal = ease(t, 13.35, 14.1);
    const oldHeading = 1 - ease(t, 12.8, 13.15);
    const [stage, label] = stageAt(t);
    diagram.dataset.stage = stage;
    diagram.dataset.time = t.toFixed(3);

    // Large parent-only network in the center -> children -> whole network left.
    // Message dots live inside this transformed group, so they remain on edges.
    const scale = 1.4 - .4 * compact;
    const x = (710 - 357 * scale) * (1 - shift);
    const y = -82 * (1 - compact) * (1 - shift);
    network.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(3)})`);
    network.style.setProperty('--cluster-opacity', childrenReveal.toFixed(3));
    network.style.setProperty('--children-opacity', childrenReveal.toFixed(3));
    network.style.setProperty('--children-offset', (8 * (1 - childrenReveal)).toFixed(3) + 'px');

    // The opening title becomes the inter-cluster subtitle before moving left.
    const headingSize = 42 - 18 * compact;
    const headingX = (710 - headingWidth * headingSize / (2 * headingBaseSize)) * (1 - shift) + 4 * shift;
    networkHeading.style.fontSize = headingSize.toFixed(3) + 'px';
    networkHeading.style.fill = `rgb(${Math.round(126 - 26 * compact)}, ${Math.round(113 + 10 * compact)}, ${Math.round(154 - 7 * compact)})`;
    networkHeading.setAttribute('x', headingX.toFixed(3));
    networkHeading.setAttribute('y', (44 + 20 * compact).toFixed(3));
    networkHeading.style.opacity = oldHeading.toFixed(3);
    interHeading.setAttribute('x', headingX.toFixed(3));
    interHeading.style.opacity = (compact * oldHeading).toFixed(3);
    hierarchyHeading.style.opacity = ease(t, 13.2, 13.65).toFixed(3);

    // Expand the upper-right C cluster into the local cooperation view.
    const localScale = .32 + .68 * reveal;
    const localX = 471 + (1088 - 471) * reveal - 1088 * localScale;
    const localY = 184 + (246 - 184) * reveal - 246 * localScale;
    local.setAttribute('transform', `translate(${localX.toFixed(3)} ${localY.toFixed(3)}) scale(${localScale.toFixed(3)})`);
    local.style.opacity = (reveal * (1 - closeLocal)).toFixed(3);
    zoom.style.opacity = (reveal * (1 - closeLocal)).toFixed(3);
    zoom.querySelector('path').setAttribute('d', `M590 98L${590 + 126 * reveal} ${98 - 4 * reveal}M590 272L${590 + 126 * reveal} ${272 + 198 * reveal}`);
    summary.style.opacity = summaryReveal.toFixed(3);
    summary.style.transform = `translateX(${(12 * (1 - summaryReveal)).toFixed(3)}px)`;
    summary.setAttribute('aria-hidden', summaryReveal < 1 ? 'true' : 'false');
    status.style.opacity = (1 - closeLocal).toFixed(3);
    rings.style.opacity = t < 5.6 ? '1' : '0';
    rings.querySelectorAll('circle').forEach(ring => { ring.dataset.active = 'false'; });
    paths.forEach(path => { delete path.dataset.message; });

    parent.dataset.state = stage === 'plan' || stage === 'replan' ? 'planning' : t >= 6.5 ? 'planned' : 'idle';
    plan.dataset.active = stage === 'plan' || stage === 'replan' ? 'true' : 'false';
    children.forEach((child, i) => {
      const planned = t >= 7.8 + i * .08;
      const reviewed = t >= 8.45 + i * .16;
      const accepted = i !== 2 || t >= 11.1;
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
