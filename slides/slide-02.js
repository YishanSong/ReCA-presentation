(function () {
  'use strict';
  const section = document.querySelector('.slide');
  const scene = document.getElementById('s2-scene');
  const range = document.getElementById('s2-time');
  const scrubber = document.getElementById('s2-scrubber');
  const toggle = document.getElementById('s2-toggle');
  const speed = document.getElementById('s2-speed');
  const status = document.getElementById('s2-status');
  const pear = document.getElementById('s2-pear');
  const message = document.getElementById('s2-message');
  const rates = [1, 1.5, 2, 3];
  const duration = 22;
  const floor = 360;
  const gripOffset = 26;
  const pi = Math.PI;
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, u) => a + (b - a) * u;
  const pointMix = (a, b, u) => ({ x: mix(a.x, b.x, u), y: mix(a.y, b.y, u) });
  const smooth = value => { const u = clamp(value); return u * u * (3 - 2 * u); };
  const progress = (t, start, end) => smooth((t - start) / (end - start));
  const pulse = (t, start, end, edge = .3) => progress(t, start, start + edge) * (1 - progress(t, end - edge, end));
  const number = value => value.toFixed(3);
  const translate = (x, y) => `translate(${number(x)} ${number(y)})`;
  function opacity(id, value) { document.getElementById(id).setAttribute('opacity', number(value)); }

  function rig(id) {
    const root = document.getElementById(id);
    const limbs = {};
    root.querySelectorAll('[data-limb]').forEach(group => {
      limbs[group.dataset.limb] = {
        paths: group.querySelectorAll('path'), joint: group.querySelector('.s2-joint'),
        hand: group.querySelector('.s2-hand'), foot: group.querySelector('.s2-foot')
      };
    });
    return { root, limbs, shell: root.querySelector('.s2-shell'), head: root.querySelector('.s2-head'), eyes: root.querySelector('.s2-eyes'), light: root.querySelector('.s2-indicator') };
  }
  const alice = rig('s2-alice');
  const bob = rig('s2-bob');

  // Two equal-length links keep elbows/knees connected throughout reach and walk.
  function limb(part, from, to, length, bend) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.max(.001, Math.hypot(dx, dy));
    const height = Math.sqrt(Math.max(0, length * length - distance * distance / 4));
    const joint = { x: (from.x + to.x) / 2 - dy / distance * height * bend, y: (from.y + to.y) / 2 + dx / distance * height * bend };
    const path = `M${number(from.x)} ${number(from.y)}L${number(joint.x)} ${number(joint.y)}L${number(to.x)} ${number(to.y)}`;
    part.paths.forEach(el => el.setAttribute('d', path));
    part.joint.setAttribute('cx', number(joint.x));
    part.joint.setAttribute('cy', number(joint.y));
    if (part.hand) {
      part.hand.setAttribute('cx', number(to.x));
      part.hand.setAttribute('cy', number(to.y));
    }
    if (part.foot) {
      const center = Number(part.foot.getAttribute('x')) + Number(part.foot.getAttribute('width')) / 2;
      part.foot.setAttribute('transform', translate(to.x - center, to.y));
    }
  }

  // Distance-driven feet: stance moves backward relative to the body, while the
  // swing foot lifts and advances. Eased starts/stops blend into a planted pose.
  function walking(distance, direction, blend) {
    const cycle = distance / 52;
    function foot(side, offset) {
      const phase = ((cycle + offset) % 1 + 1) % 1;
      const stance = phase < .5;
      const u = stance ? phase * 2 : (phase - .5) * 2;
      const stride = stance ? mix(13, -13, u) : mix(-13, 13, smooth(u));
      return { x: mix(side * 16, side * 12 + stride * direction, blend), y: stance ? 0 : -Math.sin(pi * u) * 9 * blend };
    }
    return { left: foot(-1, 0), right: foot(1, .5), swing: Math.sin(cycle * 2 * pi) * blend, bob: -Math.abs(Math.sin(cycle * 2 * pi)) * 2 * blend };
  }

  function blink(t, when) {
    const u = (t - when) / .2;
    return u > 0 && u < 1 ? 1 - .94 * Math.sin(pi * u) : 1;
  }

  function drawAgent(agent, pose) {
    agent.root.setAttribute('transform', translate(pose.x, floor));
    agent.shell.setAttribute('transform', translate(0, pose.bob));
    agent.head.setAttribute('transform', `${translate(0, pose.bob)} rotate(${number(pose.tilt)} 0 -143)`);
    agent.eyes.setAttribute('transform', `translate(${number(pose.gaze)} -145.5) scale(1 ${number(pose.blink)}) translate(0 145.5)`);
    agent.light.setAttribute('opacity', number(pose.light));
    const shift = p => ({ x: p.x, y: p.y + pose.bob });
    limb(agent.limbs['left-arm'], shift({ x: -31, y: -102 }), shift(pose.leftHand), 33, 1);
    limb(agent.limbs['right-arm'], shift({ x: 31, y: -102 }), shift(pose.rightHand), 33, -1);
    limb(agent.limbs['left-leg'], shift({ x: -12, y: -47 }), pose.leftFoot, 26, 1);
    limb(agent.limbs['right-leg'], shift({ x: 12, y: -47 }), pose.rightFoot, 26, -1);
  }

  function storyAt(t) {
    if (t < 1.3) return 'A shared mission';
    if (t < 3.1) return 'Discovering the plate';
    if (t < 4.5) return 'Recall: Bob spotted pears';
    if (t < 7.8) return 'Request: fetch one pear';
    if (t < 11.5) return 'Bob approaches the pear';
    if (t < 13.1) return 'Bob picks up the pear';
    if (t < 14.6) return 'Pear retrieved';
    if (t < 20) return 'Bob returns to the center';
    return 'Pear retrieved';
  }

  // Every pose and overlay is a pure function of this timestamp. There are no
  // accumulated movement deltas, CSS animation clocks, or attachment side effects.
  function renderAt(time) {
    const t = Math.max(0, Math.min(duration, time));
    const settling = 1 - progress(t, 19.2, 20);
    const idle = Math.sin(t * pi / 2) * .65 * progress(t, .1, .5) * settling;
    const discover = pulse(t, 1.3, 3.4);
    const communicate = pulse(t, 4.5, 7.8);
    const acknowledge = pulse(t, 6.9, 7.8, .2);
    const approach = progress(t, 7.8, 11.5);
    const turn = progress(t, 14.1, 14.6);
    const returning = progress(t, 14.6, 20);
    const aliceMove = progress(t, 8.5, 12.5);
    const aliceBlend = pulse(t, 8.5, 12.5, .45);
    const bobBlend = pulse(t, 7.8, 11.5, .4) + pulse(t, 14.6, 20, .5);
    const isReturning = t >= 14.6;
    const bobDistance = isReturning ? 277 * returning : 122 * approach;
    const bobWalk = walking(bobDistance, isReturning ? -1 : 1, bobBlend);
    const aliceWalk = walking(75 * aliceMove, -1, aliceBlend);
    const bobX = mix(685, 807, approach) - 277 * returning;
    const bobBob = idle + bobWalk.bob;

    let rightHand = { x: 45 - bobWalk.swing * 7, y: -49 + bobWalk.swing * 4 };
    const grasp = { x: 78, y: -120 };
    const raised = { x: 76, y: -139 };
    const carrying = { x: 60, y: -78 };
    if (t >= 11.8 && t < 13.1) rightHand = pointMix({ x: 45, y: -49 }, grasp, progress(t, 11.8, 13.1));
    else if (t >= 13.1 && t < 13.65) rightHand = pointMix(grasp, raised, progress(t, 13.1, 13.65));
    else if (t >= 13.65) rightHand = pointMix(raised, carrying, progress(t, 13.65, 14.5));

    drawAgent(alice, {
      x: 240 - 75 * aliceMove, bob: idle + aliceWalk.bob,
      tilt: discover * 8 + communicate * 3 - aliceMove * 4,
      gaze: discover * 3 + communicate * 2 - aliceMove * 3,
      blink: blink(t, .8) * blink(t, 4) * blink(t, 15), light: .72 + discover * .28,
      leftHand: { x: -45 + aliceWalk.swing * 7, y: -49 - aliceWalk.swing * 4 },
      rightHand: pointMix({ x: 45 - aliceWalk.swing * 7, y: -49 + aliceWalk.swing * 4 }, { x: 66, y: -104 }, Math.max(discover, communicate * .7)),
      leftFoot: aliceWalk.left, rightFoot: aliceWalk.right
    });
    drawAgent(bob, {
      x: bobX, bob: bobBob,
      tilt: acknowledge * Math.sin(progress(t, 6.9, 7.8) * pi * 2) * 5 + approach * 3 - turn * 6,
      gaze: approach * 3 - turn * 6,
      blink: blink(t, 2.8) * blink(t, 8.8) * blink(t, 14), light: .72 + acknowledge * .28,
      leftHand: { x: -45 + bobWalk.swing * 7, y: -49 - bobWalk.swing * 4 },
      rightHand, leftFoot: bobWalk.left, rightFoot: bobWalk.right
    });

    // Match the table position exactly at grasp, then attach the single pear to
    // the moving hand. Blending the tiny idle offset avoids a pickup discontinuity.
    const attached = t >= 13.1;
    const handPear = { x: bobX + rightHand.x, y: floor + bobBob + rightHand.y - gripOffset };
    const pearPosition = attached ? pointMix({ x: 885, y: 214 }, handPear, progress(t, 13.1, 13.22)) : { x: 885, y: 214 };
    pear.setAttribute('transform', translate(pearPosition.x, pearPosition.y));
    pear.dataset.held = String(attached);
    document.getElementById('s2-grip').setAttribute('transform', translate(pearPosition.x, pearPosition.y + gripOffset));
    opacity('s2-grip', progress(t, 13.1, 13.3));

    opacity('s2-plate-focus', discover * .9);
    opacity('s2-perception', discover * .75);
    opacity('s2-pear-focus', Math.max(pulse(t, 3.1, 4.5), pulse(t, 9.3, 11.8)) * .8);
    opacity('s2-memory-link', pulse(t, 3.1, 4.5) * .75);
    opacity('s2-memory', pulse(t, 3.2, 4.6) * .9);
    opacity('s2-communication', communicate);
    opacity('s2-ack', acknowledge);
    opacity('s2-pickup-check', pulse(t, 13.35, 14.5, .2));
    const u = progress(t, 5.1, 6.9);
    const envelopeX = (1 - u) * (1 - u) * 270 + 2 * (1 - u) * u * 465 + u * u * 680;
    const envelopeY = (1 - u) * (1 - u) * 205 + 2 * (1 - u) * u * 73 + u * u * 205;
    message.setAttribute('transform', translate(envelopeX, envelopeY));
    scene.dataset.time = number(t);
    const story = storyAt(t);
    if (status.textContent !== story) status.textContent = story;
    return story;
  }

  function render(state) {
    const story = renderAt(state.time);
    const percent = state.progress * 100;
    range.value = percent.toFixed(1);
    range.setAttribute('aria-valuetext', `${Math.round(percent)}% complete. ${story}.`);
    scrubber.style.setProperty('--progress', percent + '%');
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', state.playing ? 'Pause the animation' : state.finished ? 'Replay the animation' : 'Play the animation');
    speed.textContent = state.rate + '×';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
  }

  const timeline = SlideAnimation.createTimeline({ duration, rate: 1.5, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(duration * Number(range.value) / 100));
  toggle.addEventListener('click', () => {
    if (timeline.playing) timeline.pause();
    else timeline.play();
  });
  speed.addEventListener('click', () => timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
