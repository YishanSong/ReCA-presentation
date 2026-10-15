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
    const elected = ease(t, .7, 2.1);
    opacity('dyna-leader', elected);
    get('dyna-leader').dataset.elected = String(t >= 2.1);
    opacity('dyna-plan', .25 + .75 * ease(t, 2.3, 4.2));
    get('dyna-plan').setAttribute('stroke-dasharray', '400');
    get('dyna-plan').setAttribute('stroke-dashoffset', (400 * (1 - ease(t, 2.3, 4.2))).toFixed(3));
    const moved = ease(t, 5.2, 6.2);
    get('dyna-target').setAttribute('transform', `translate(${(260 + 16 * moved).toFixed(3)} ${(132 - 21 * moved).toFixed(3)})`);
    opacity('dyna-target-origin', .35 * moved);
    const reassigned = t >= 7.8;
    const focus = ease(t, 7.8, 7.9) * (1 - ease(t, 8.4, 8.5));
    for (let i = 0; i < 3; i++) {
      const task = get('dyna-task-' + i);
      const assigned = t >= 3.5;
      const affected = i > 0 && focus > 0;
      paint(task.querySelector('rect'), ...(reassigned ? green : assigned ? blue : gray));
      task.querySelector('rect').style.stroke = affected ? '#2f70b3' : reassigned ? green[1] : assigned ? blue[1] : gray[1];
      task.querySelector('rect').style.strokeWidth = affected ? '2.8' : '1.4';
      task.querySelector('text').textContent = !assigned ? '—' : reassigned ? ['Locate', 'Place', 'Pick+Carry'][i] : ['Locate', 'Pick', 'Carry'][i];
      task.setAttribute('opacity', (.4 + .6 * ease(t, 3, 4.2)).toFixed(4));
      task.dataset.assignment = !assigned ? 'pending' : reassigned ? 'updated' : 'initial';
      const arrow = get('dyna-assignment-' + i);
      arrow.style.stroke = affected ? '#2f70b3' : '#a9bfd2';
      arrow.style.strokeWidth = affected ? '2.8' : '1.7';
      get('dyna-robot-' + i).setAttribute('transform', `translate(${[60, 200, 340][i]} ${(100 - 2 * ease(t, 3, 4.2) + 2 * ease(t, 7.8, 9)).toFixed(3)})`);
    }
    get('dyna-event').textContent = t < 2.3 ? 'Profiles & proposals → Elect once' : t < 5.2 ? 'Shared plan · Local execution' : t < 7.8 ? 'Target moves → Reflect → Reassign' : 'Same leader · Adapted task allocation';
    get('dyna-event').style.fill = t >= 5.2 && t < 7.8 ? '#b56166' : '#647b93';
    return t < 2.3 ? 'Describe capabilities and elect once' : t < 5.2 ? 'Allocate by robot capabilities' : t < 7.8 ? 'Reflect on a changed target' : 'Adapt assignments with the same leader';
  }

  // Thea §4 / Figs. 6–7: independent evaluation reads current observations
  // and tool post-conditions, not the acting model's self-reported success.
  // A schematic failed grasp is shown; failure reason informs a next decision.
  function evaluation(t) {
    const reach = ease(t, 2.2, 4);
    const close = ease(t, 4, 4.8);
    const lift = ease(t, 5, 6);
    const dx = 19 * reach, dy = 5 * reach - 20 * lift;
    get('thea-gripper').setAttribute('transform', `translate(${dx.toFixed(3)} ${dy.toFixed(3)})`);
    get('thea-arm').setAttribute('d', `M41 189V169L65 145L${(109 + dx).toFixed(3)} ${(139 + dy).toFixed(3)}`);
    get('thea-left-finger').setAttribute('d', `M${(99 + 5 * close).toFixed(3)} 152V171H${(105 + 5 * close).toFixed(3)}`);
    get('thea-right-finger').setAttribute('d', `M${(119 - 5 * close).toFixed(3)} 152V171H${(113 - 5 * close).toFixed(3)}`);
    // The object stays on the tabletop as the empty gripper lifts.
    get('thea-object').setAttribute('y', '174');
    opacity('thea-failure', ease(t, 5.4, 6.2));
    paint(get('thea-tool').querySelector('rect'), ...(t >= 1 ? blue : gray));
    paint(get('thea-evaluator').querySelector('rect'), ...(t >= 5.5 ? blue : gray));
    get('thea-evaluator').querySelector('rect').style.strokeWidth = t >= 5.5 && t < 7.6 ? '2.5' : '1.4';
    opacity('thea-verdict', ease(t, 5.5, 6.2));
    get('thea-verdict').querySelector('text').textContent = t >= 7.2 ? 'failure + reason' : 'Evaluating…';
    get('thea-verdict').dataset.verdict = t >= 7.2 ? 'failure' : t >= 5.5 ? 'evaluating' : 'pending';
    paint(get('thea-verdict').querySelector('rect'), ...(t >= 7.2 ? ['#f8eded', '#b9787d'] : blue));
    get('thea-verdict').querySelector('text').style.fill = t >= 7.2 ? '#b56166' : '#173d6a';
    opacity('thea-recovery', ease(t, 8, 9.2));
    opacity('thea-retry', ease(t, 8, 9.2));
    get('thea-graph').dataset.updated = String(t >= 8.5);
    get('thea-graph').querySelectorAll('rect').forEach(rect => paint(rect, ...(t >= 8.5 ? green : blue)));
    return t < 2.2 ? 'Ground a tool call in world state' : t < 5 ? 'Attempt the grasp' : t < 6.2 ? 'Observe an empty lift; the object stays' : t < 8 ? 'Evaluate the observed physical result' : 'Return a reason and update recovery context';
  }

  // REMAC (ICLR 2026), §§3–4 / Fig. 1. Distinguish loss masking in
  // delay-conditioned training from preserving the executed overlap during
  // sampling. Counts, delay and block widths below are schematic, not results.
  function execution(t) {
    // The offline strip is a separate explanation, never a live action state.
    const x = 20 + 221 * ease(t, .2, 4) + 130 * ease(t, 6.5, 9.3);
    get('remac-playhead').setAttribute('d', `M${x.toFixed(3)} 75V103` + (x >= 109 ? `M${x.toFixed(3)} 132V156` : ''));
    for (let i = 0; i < 8; i++) paint(get('remac-old-' + i), ...(19 + i * 45 < x ? green : gray));
    for (let i = 0; i < 6; i++) {
      const next = get('remac-next-' + i);
      const preserved = i < 3 && t >= 6.5;
      opacity('remac-next-' + i, .3 + .7 * ease(t, .8, 2.5));
      paint(next.querySelector('rect'), ...(preserved ? green : blue));
      next.querySelector('rect').style.strokeDasharray = 'none';
      next.dataset.state = preserved ? 'preserved-prefix' : i < 3 ? 'proposed-prefix' : 'new-suffix';
      next.setAttribute('transform', 'translate(0 0)');
    }
    const explainingTraining = t >= 4.5 && t < 6.5;
    paint(get('remac-training-panel'), ...(explainingTraining ? blue : gray));
    get('remac-training-panel').style.strokeWidth = explainingTraining ? '2' : '1';
    get('remac-training-label').style.fill = explainingTraining ? '#2f70b3' : '#53677e';
    get('remac-training').dataset.context = 'offline';
    for (let i = 0; i < 6; i++) {
      const block = get('remac-train-' + i);
      paint(block.querySelector('rect'), ...(i < 3 ? gray : blue));
      block.dataset.state = i < 3 ? 'masked-loss' : 'supervised-suffix';
    }
    opacity('remac-delay', .3 + .7 * ease(t, 1.5, 2.5));
    opacity('remac-jump', ease(t, 2.5, 3.8) * (1 - ease(t, 6.5, 7.8)));
    opacity('remac-prefix', ease(t, 6.5, 7.8));
    opacity('remac-note-a', .3 + .7 * ease(t, 2, 3.5));
    opacity('remac-note-b', ease(t, 6.5, 8));
    get('remac-note-a').style.fill = '#b56166';
    get('remac-note-b').style.fill = '#328576';
    return t < 2.5 ? 'Predict the next chunk during execution' : t < 4.5 ? 'Expose delay mismatch and boundary jumps' : t < 6.5 ? 'Separate offline concept: mask prefix loss' : 'Runtime: preserve the overlap, predict the suffix';
  }

  function renderAt(time) {
    const names = ['DynaHMRC', 'Thea', 'REMAC'];
    const local = cards.map((_, i) => Math.max(0, Math.min(10, time - i * 10)));
    const messages = [coordination(local[0]), evaluation(local[1]), execution(local[2])];
    cards.forEach((card, i) => {
      card.dataset.state = time >= (i + 1) * 10 ? 'done' : time >= i * 10 ? 'active' : 'pending';
      card.dataset.localTime = local[i].toFixed(3);
    });
    const active = Math.min(2, Math.floor(time / 10));
    status.textContent = time >= 30 ? 'Three independent directions — not integrated into ReCA' : names[active] + ' · ' + messages[active];
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
  const timeline = SlideAnimation.createTimeline({ duration: 33, rate: 1, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(timeline.duration * Number(range.value) / 100));
  toggle.addEventListener('click', () => timeline.playing ? timeline.pause() : timeline.play());
  speed.addEventListener('click', () => timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
