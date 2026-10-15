(function () {
  'use strict';
  const section = document.querySelector('.beyond-slide');
  const range = document.querySelector('.beyond-progress');
  const scrubber = document.querySelector('.beyond-scrubber');
  const toggle = document.querySelector('.beyond-toggle');
  const speed = document.querySelector('.beyond-speed');
  const status = document.querySelector('.beyond-status');
  const cards = Array.from(document.querySelectorAll('[data-paper]'));
  const rates = [1, 1.5, 2, 3];
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = (t, a, b) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
  const get = id => document.getElementById(id);
  const opacity = (id, value) => get(id).setAttribute('opacity', value.toFixed(4));
  const paint = (element, fill, stroke) => { element.style.fill = fill; element.style.stroke = stroke; };
  const blue = ['#eaf2fa', '#80a9d0'];
  const green = ['#e7f3ed', '#77ad9e'];
  const gray = ['#f4f7fa', '#d8e4ef'];
  function tint(element, palette, amount) {
    const mix = (a, b) => {
      const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      const start = rgb(a), end = rgb(b);
      return 'rgb(' + start.map((v, i) => Math.round(v + (end[i] - v) * amount)).join(',') + ')';
    };
    paint(element, mix(gray[0], palette[0]), mix(gray[1], palette[1]));
  }

  // FLASH §3, Figs. 3–4. Four blocks / a three-action accepted prefix are
  // conceptual. The Action Expert checks the proposal; fallback is available
  // for zero acceptance or phase changes, not automatically for a fourth miss.
  function flash(t) {
    const verified = t >= 3.3;
    const transfer = ease(t, 4.3, 5.6);
    paint(get('flash-draft').querySelector('rect'), ...(t < 1.5 ? blue : gray));
    paint(get('flash-expert').querySelector('rect'), ...(t >= 1.5 && t < 4.3 ? blue : gray));
    get('flash-expert').querySelector('rect').style.strokeWidth = t >= 1.5 && t < 4.3 ? '2.5' : '1.4';
    for (let i = 0; i < 4; i++) {
      const action = get('flash-action-' + i);
      action.setAttribute('transform', `translate(0 ${(i < 3 ? 82 * transfer : 0).toFixed(3)})`);
      action.setAttribute('opacity', (.35 + .65 * ease(t, .15, 1.2)).toFixed(4));
      action.dataset.result = verified ? i < 3 ? 'accepted' : 'rejected' : 'proposal';
      paint(action.querySelector('rect'), ...(verified ? i < 3 ? green : ['#f8eded', '#b9787d'] : blue));
      action.querySelector('text').textContent = 'a' + (i + 1) + (t >= 4.3 ? i < 3 ? ' ✓' : ' ×' : '');
      action.querySelector('text').style.fontSize = t >= 4.3 ? '17px' : '19px';
    }
    opacity('flash-checks', ease(t, 2.5, 3.3) * (1 - ease(t, 3.8, 4.3)));
    get('flash-prefix').setAttribute('y', (93 + 82 * transfer).toFixed(3));
    get('flash-prefix').setAttribute('x', '143');
    get('flash-prefix').style.fontSize = '17px';
    opacity('flash-prefix', ease(t, 4.3, 5.3));
    opacity('flash-fallback', .35 + .35 * ease(t, 3.3, 4.3));
    opacity('flash-full-note', .65 + .35 * ease(t, 3.3, 4.3));
    return t < 1.5 ? 'Propose an action chunk' : t < 3.3 ? 'Action Expert verifies in parallel' : t < 4.3 ? 'Accept the longest verified prefix' : 'Execute only the accepted prefix';
  }

  // WA-SpecDec §3 / Fig. 2: current-frame spatial bias is added to existing
  // visual patches before shared prefill. No new acceptance rule, appended
  // world tokens, test-time future-frame prediction, or safety guarantee.
  function world(t) {
    opacity('wa-contact', ease(t, .2, 1.2));
    get('wa-contact').setAttribute('r', (18 + 3 * ease(t, .2, 1.2)).toFixed(3));
    opacity('wa-bias', .3 + .7 * ease(t, 1.2, 2.3));
    for (let i = 0; i < 8; i++) {
      const grounded = ease(t, 1.2, 2.3);
      tint(get('wa-patch-' + i), [2, 3, 6].includes(i) ? green : blue, grounded);
    }
    tint(get('wa-prefill').querySelector('rect'), blue, ease(t, 2.4, 3.4));
    get('wa-prefill').querySelector('rect').style.strokeWidth = t >= 2.4 && t < 4.1 ? '2.5' : '1.4';
    for (const id of ['wa-draft', 'wa-target']) {
      tint(get(id).querySelector('rect'), green, ease(t, 3.8, 4.8));
      opacity(id, .5 + .5 * ease(t, 3.5, 4.5));
    }
    const transfer = ease(t, 2.3, 3.3);
    get('wa-signal').setAttribute('cy', (123 + 28 * transfer).toFixed(3));
    opacity('wa-signal', t > 2.3 && t < 3.3 ? Math.sin(Math.PI * transfer) : 0);
    get('wa-prefill').dataset.context = t >= 2.4 ? 'world-aware' : 'pending';
    get('wa-target').dataset.acceptanceRule = 'unchanged';
    return t < 1.2 ? 'Read the current physical scene' : t < 2.4 ? 'Add a spatial bias to visual tokens' : t < 4.1 ? 'Build world-aware prefill states' : 'Share context with draft and target';
  }

  // Deltoris §§4–6, Figs. 6 / 12–13. Differences are internal activations,
  // not discarded camera frames. Small-VLA speculative observation/state
  // candidates are checked in a batch to amortize weight/activation traffic.
  function delta(t) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) {
      paint(get(`delta-value-${row}-${i}`), ...(row === 1 && [3, 6].includes(i) && t >= .7 ? green : blue));
    }
    for (let i = 0; i < 12; i++) {
      const bit = get('delta-bit-' + i);
      const active = bit.dataset.nonzero === 'true' && t >= 1.5;
      paint(bit.querySelector('rect'), ...(active ? blue : gray));
      bit.querySelector('text').textContent = active ? '1' : '0';
      bit.setAttribute('opacity', (.4 + .6 * ease(t, .7, 1.5)).toFixed(4));
      bit.setAttribute('transform', 'translate(0 0)');
    }
    paint(get('delta-pe').querySelector('rect'), ...(t >= 1.5 ? blue : gray));
    get('delta-pe').querySelector('rect').style.strokeWidth = t >= 1.5 && t < 3 ? '2.5' : '1.4';
    for (let i = 0; i < 3; i++) {
      const candidate = get('delta-candidate-' + i);
      const reveal = ease(t, 3 + i * .25, 4 + i * .25);
      candidate.setAttribute('opacity', (.25 + .75 * reveal).toFixed(4));
      candidate.setAttribute('transform', `translate(${(-8 * (1 - reveal)).toFixed(3)} 0)`);
      paint(candidate.querySelector('rect'), ...(t >= 5.1 ? green : blue));
      candidate.dataset.verified = String(t >= 5.1);
    }
    paint(get('delta-batch').querySelector('rect'), ...(t >= 5.1 ? green : t >= 4.3 ? blue : gray));
    return t < 1.5 ? 'Expose small temporal differences' : t < 3 ? 'Compute sparse nonzero bits' : t < 4.5 ? 'Speculate future observations and states' : 'Batch verification to reuse loaded data';
  }

  function renderAt(time) {
    const names = ['FLASH', 'WA-SpecDec', 'Deltoris'];
    const messages = [flash(Math.min(6, time)), world(Math.max(0, Math.min(6, time - 6))), delta(Math.max(0, Math.min(6, time - 12)))];
    cards.forEach((card, i) => {
      card.dataset.state = time >= (i + 1) * 6 ? 'done' : time >= i * 6 ? 'active' : 'pending';
      card.dataset.localTime = Math.max(0, Math.min(6, time - i * 6)).toFixed(3);
    });
    const active = Math.min(2, Math.floor(time / 6));
    status.textContent = time >= 18 ? 'Three independent inference directions · Final comparison' : names[active] + ' · ' + messages[active];
  }

  function render(state) {
    renderAt(state.time);
    range.value = (state.progress * 100).toFixed(2);
    range.setAttribute('aria-valuetext', Math.round(state.progress * 100) + '% complete. ' + status.textContent);
    scrubber.style.setProperty('--progress', state.progress * 100 + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', toggle.textContent + ' the animation');
    speed.textContent = state.rate + '×';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
  }
  const timeline = SlideAnimation.createTimeline({ duration: 21, rate: 1, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(timeline.duration * Number(range.value) / 100));
  toggle.addEventListener('click', () => timeline.playing ? timeline.pause() : timeline.play());
  speed.addEventListener('click', () => timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
