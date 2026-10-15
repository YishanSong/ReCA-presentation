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

  // DynaHMRC §3 / Fig. 2 and App. Fig. 11: profiles and plan proposals
  // precede a once-per-task election. Reflection adapts assignments later;
  // leadership is fixed and each robot still chooses its local atomic actions.
  function coordination(t) {
    const elected = ease(t, .65, 1.65);
    opacity('dyna-leader', elected);
    get('dyna-leader').dataset.elected = String(t >= 1.65);
    opacity('dyna-plan', .25 + .75 * ease(t, 1.7, 2.7));
    get('dyna-plan').setAttribute('stroke-dasharray', '400');
    get('dyna-plan').setAttribute('stroke-dashoffset', (400 * (1 - ease(t, 1.7, 2.7))).toFixed(3));
    const adapting = t >= 3.1;
    for (let i = 0; i < 3; i++) {
      const task = get('dyna-task-' + i);
      const assigned = t >= 2.3;
      paint(task.querySelector('rect'), ...(t >= 4.7 ? green : assigned ? blue : gray));
      task.querySelector('text').textContent = !assigned ? '—' : t >= 4.7 ? ['Locate', 'Place', 'Pick + carry'][i] : ['Locate', 'Pick', 'Carry'][i];
      task.setAttribute('opacity', (.4 + .6 * ease(t, 1.9, 2.8)).toFixed(4));
      task.dataset.assignment = !assigned ? 'pending' : t >= 4.7 ? 'updated' : 'initial';
      get('dyna-robot-' + i).setAttribute('transform', `translate(${[60, 200, 340][i]} ${(100 - 2 * ease(t, 2.1, 2.9) + 2 * ease(t, 4.5, 5.5)).toFixed(3)})`);
    }
    get('dyna-event').textContent = t < 1.7 ? 'Profiles & proposals → Elect once' : t < 3.1 ? 'Shared plan · Local execution' : t < 4.7 ? 'Target moves → Reflect → Reassign' : 'Same leader · Adapted task allocation';
    get('dyna-event').style.fill = adapting && t < 4.7 ? '#b56166' : '#647b93';
    return t < 1.7 ? 'Describe capabilities and elect once' : t < 3.1 ? 'Allocate by robot capabilities' : t < 4.7 ? 'Reflect on a changed target' : 'Adapt assignments with the same leader';
  }

  // Thea §4 / Figs. 6–7: independent evaluation reads current observations
  // and tool post-conditions, not the acting model's self-reported success.
  // A schematic failed grasp is shown; failure reason informs a next decision.
  function evaluation(t) {
    const reach = ease(t, 1.5, 2.5);
    const retreat = ease(t, 2.6, 3.4);
    get('thea-gripper').setAttribute('transform', `translate(${(9 * reach - 5 * retreat).toFixed(3)} ${(8 * reach - 4 * retreat).toFixed(3)})`);
    paint(get('thea-tool').querySelector('rect'), ...(t >= .8 ? blue : gray));
    paint(get('thea-evaluator').querySelector('rect'), ...(t >= 3 ? blue : gray));
    get('thea-evaluator').querySelector('rect').style.strokeWidth = t >= 3 && t < 4.3 ? '2.5' : '1.4';
    opacity('thea-verdict', ease(t, 3.1, 4.1));
    get('thea-verdict').querySelector('text').textContent = t >= 4.1 ? 'failure + reason' : 'process';
    get('thea-verdict').dataset.verdict = t >= 4.1 ? 'failure' : t >= 3.1 ? 'process' : 'pending';
    paint(get('thea-verdict').querySelector('rect'), ...(t >= 4.1 ? ['#f8eded', '#b9787d'] : blue));
    get('thea-verdict').querySelector('text').style.fill = t >= 4.1 ? '#b56166' : '#173d6a';
    opacity('thea-recovery', ease(t, 4.5, 5.5));
    opacity('thea-retry', ease(t, 4.5, 5.5));
    get('thea-graph').dataset.updated = String(t >= 5.1);
    get('thea-graph').querySelectorAll('rect').forEach(rect => paint(rect, ...(t >= 5.1 ? green : blue)));
    return t < 1.5 ? 'Ground a tool call in world state' : t < 3 ? 'Attempt the grasp' : t < 4.5 ? 'Evaluate the observed physical result' : 'Return a reason and update recovery context';
  }

  // REMAC (ICLR 2026), §§3–4 / Fig. 1. Distinguish loss masking in
  // delay-conditioned training from preserving the executed overlap during
  // sampling. Counts, delay and block widths below are schematic, not results.
  function execution(t) {
    const current = ease(t, .15, 3.7);
    const x = 20 + 221 * current;
    get('remac-playhead').setAttribute('d', `M${x.toFixed(3)} 58V180`);
    for (let i = 0; i < 8; i++) paint(get('remac-old-' + i), ...(19 + i * 45 < x ? green : gray));
    for (let i = 0; i < 6; i++) {
      const next = get('remac-next-' + i);
      const preserved = i < 3 && t >= 4.2;
      const masked = i < 3 && t >= 2.7 && t < 4.2;
      opacity('remac-next-' + i, .25 + .75 * ease(t, .8, 1.8));
      paint(next.querySelector('rect'), ...(preserved ? green : masked ? gray : blue));
      next.querySelector('rect').style.strokeDasharray = masked ? '4 3' : 'none';
      next.dataset.state = preserved ? 'preserved-prefix' : masked ? 'masked-training-prefix' : i < 3 ? 'proposed-prefix' : 'new-suffix';
      next.setAttribute('transform', `translate(0 ${(i < 3 ? -4 * ease(t, 1.4, 2.3) * (1 - ease(t, 3.5, 4.3)) : 0).toFixed(3)})`);
    }
    opacity('remac-delay', .3 + .7 * ease(t, .7, 1.7));
    opacity('remac-jump', ease(t, 1.4, 2.3) * (1 - ease(t, 3.8, 4.8)));
    opacity('remac-prefix', ease(t, 4.0, 5.0));
    get('remac-note-a').textContent = t < 2.7 ? 'Observation / execution mismatch' : 'Train: mask delayed-prefix loss';
    get('remac-note-b').textContent = t < 4.2 ? 'Possible jump at chunk boundaries' : 'Sample: preserve prefix, predict suffix';
    get('remac-note-a').style.fill = t >= 2.7 ? '#647b93' : t >= 1.4 ? '#b56166' : '#647b93';
    get('remac-note-b').style.fill = t >= 4.2 ? '#328576' : t >= 1.4 ? '#b56166' : '#647b93';
    return t < 1.5 ? 'Predict the next chunk during execution' : t < 2.7 ? 'Expose delay mismatch and boundary jumps' : t < 4.2 ? 'Train with a delay-conditioned prefix mask' : 'Preserve the overlap and generate the suffix';
  }

  function renderAt(time) {
    const names = ['DynaHMRC', 'Thea', 'REMAC'];
    const messages = [coordination(Math.min(6, time)), evaluation(Math.max(0, Math.min(6, time - 6))), execution(Math.max(0, Math.min(6, time - 12)))];
    cards.forEach((card, i) => {
      card.dataset.state = time >= (i + 1) * 6 ? 'done' : time >= i * 6 ? 'active' : 'pending';
      card.dataset.localTime = Math.max(0, Math.min(6, time - i * 6)).toFixed(3);
    });
    const active = Math.min(2, Math.floor(time / 6));
    status.textContent = time >= 18 ? 'Three independent reliability directions · Final comparison' : names[active] + ' · ' + messages[active];
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
