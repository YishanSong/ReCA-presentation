(function () {
  'use strict';
  const axisWidth = Number(document.querySelector('.s6-timeline').dataset.axisWidth);
  const section = document.querySelector('.slide');
  const range = document.getElementById('s6-time');
  const scrubber = document.getElementById('s6-scrubber');
  const clip = document.getElementById('s6-elapsed-clip');
  const playhead = document.getElementById('s6-playhead');
  const smallFinish = document.getElementById('s6-small-finish');
  const betterFinish = document.getElementById('s6-better-finish');
  const toggle = document.getElementById('s6-toggle');
  const speed = document.getElementById('s6-speed');

  // Only this slide's geometry, labels and controls live here.
  function render(state) {
    const x = state.progress * axisWidth;
    const progress = state.progress * 100;
    range.value = progress.toFixed(1);
    range.setAttribute('aria-valuetext', Math.round(progress) + '% complete');
    scrubber.style.setProperty('--progress', progress + '%');
    clip.setAttribute('width', x);
    playhead.setAttribute('d', `M${x} 67V132M${x} 235V300`);
    smallFinish.dataset.done = String(state.finished);
    betterFinish.dataset.done = String(x >= Number(betterFinish.dataset.end));
    section.dataset.animateResult = String(state.completedNaturally);
    section.dataset.result = state.finished ? 'visible' : 'hidden';
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    section.style.setProperty('--playback-rate', state.rate);
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', state.playing ? 'Pause the animation' : state.finished ? 'Replay the animation' : 'Play the animation');
    speed.textContent = state.rate + '\u00d7';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
  }

  const timeline = SlideAnimation.createTimeline({ duration: 12, rate: 3, onUpdate: render });
  range.addEventListener('input', function () {
    timeline.seek(timeline.duration * Number(range.value) / 100);
  });
  toggle.addEventListener('click', function () {
    if (timeline.playing) timeline.pause();
    else timeline.play();
  });
  speed.addEventListener('click', function () {
    timeline.setRate(timeline.rate === 3 ? 1 : timeline.rate + 1);
  });
  SlideAnimation.bindToSlide(timeline);
})();
