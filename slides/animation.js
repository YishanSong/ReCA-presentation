(function () {
  'use strict';
  if (window.SlideAnimation) return;

  function positive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + ' must be a finite positive number.');
    return value;
  }

  /** A clock only: each slide owns its drawing, labels and controls. */
  function createTimeline(options = {}) {
    const duration = positive(options.duration === undefined ? 1 : options.duration, 'duration');
    let rate = positive(options.rate === undefined ? 1 : options.rate, 'rate');
    const onUpdate = options.onUpdate === undefined ? function () {} : options.onUpdate;
    if (typeof onUpdate !== 'function') throw new TypeError('onUpdate must be a function.');
    let time = 0;
    let playing = false;
    let destroyed = false;
    let frame = null;
    let lastNow = 0;

    function cancelFrame() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    }

    function sample(now) {
      if (!playing) return;
      time = Math.min(duration, time + Math.max(0, now - lastNow) / 1000 * rate);
      lastNow = now;
    }

    function update(completedNaturally = false) {
      if (destroyed) return;
      onUpdate({ time, progress: time / duration, rate, playing, finished: time >= duration, completedNaturally });
    }

    function schedule() {
      if (destroyed || !playing || frame !== null) return;
      const scheduled = requestAnimationFrame(function (now) {
        if (scheduled !== frame || destroyed || !playing) return;
        frame = null;
        sample(now);
        const completed = time >= duration;
        if (completed) playing = false;
        update(completed);
        // onUpdate may pause, destroy, seek, or start a replacement pass.
        schedule();
      });
      frame = scheduled;
    }

    const timeline = {
      get duration() { return duration; },
      get time() { return time; },
      get rate() { return rate; },
      get playing() { return playing; },
      get finished() { return time >= duration; },
      play: function ({ restart = false } = {}) {
        if (destroyed) return;
        const now = performance.now();
        sample(now);
        cancelFrame();
        if (restart || time >= duration) time = 0;
        lastNow = now;
        playing = true;
        update();
        schedule();
      },
      pause: function () {
        if (destroyed) return;
        sample(performance.now());
        cancelFrame();
        playing = false;
        update();
      },
      seek: function (seconds) {
        if (destroyed) return;
        const next = Number(seconds);
        cancelFrame();
        playing = false;
        time = Number.isNaN(next) ? 0 : Math.min(duration, Math.max(0, next));
        update();
      },
      setRate: function (nextRate) {
        if (destroyed) return;
        positive(nextRate, 'rate');
        sample(performance.now());
        rate = nextRate;
        if (time >= duration) { playing = false; cancelFrame(); }
        update();
      },
      finish: function () {
        if (destroyed) return;
        cancelFrame();
        playing = false;
        time = duration;
        update();
      },
      destroy: function () {
        cancelFrame();
        playing = false;
        destroyed = true;
      }
    };
    update();
    return timeline;
  }

  /** Finish hidden/reduced-motion slides and optionally replay on entry. */
  function bindToSlide(timeline, { autoplay = true, replayOnEnter = true } = {}) {
    const runtime = window.SlideRuntime;
    if (!runtime) throw new Error('Load runtime.js before binding an animation to a slide.');
    let active = runtime.active;
    let reducedMotion = runtime.reducedMotion;
    let initialized = false;

    function sync() {
      if (!initialized) return;
      if (!active || reducedMotion) timeline.finish();
      else if (autoplay) timeline.play({ restart: replayOnEnter });
    }

    // Both subscriptions report their initial value. Apply it once, after setup.
    const offActive = runtime.onActiveChange(function (value) { active = value; sync(); });
    const offMotion = runtime.onReducedMotionChange(function (value) { reducedMotion = value; sync(); });
    function beforePrint() { timeline.finish(); }
    window.addEventListener('beforeprint', beforePrint);
    initialized = true;
    sync();
    return function () {
      initialized = false;
      offActive();
      offMotion();
      window.removeEventListener('beforeprint', beforePrint);
    };
  }

  /** Opt-in stage classes; this helper does not invent a sequence or timing. */
  function createStages(root, { selector = '.animation-stage[data-stage]', activeClass = 'is-active' } = {}) {
    const elements = Array.from(root.querySelectorAll(selector));
    function show(names) {
      const selected = new Set(Array.isArray(names) ? names : [names]);
      elements.forEach(function (element) {
        element.classList.toggle(activeClass, selected.has(element.dataset.stage));
      });
    }
    return { show, clear: function () { show([]); } };
  }

  window.SlideAnimation = Object.freeze({ createTimeline, bindToSlide, createStages });
})();
