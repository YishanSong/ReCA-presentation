/* One playback lifecycle per slide document, shared by all three video slides. */
(function () {
  'use strict';
  if (window.ReCASlideVideo) return;

  const section = document.querySelector('.slide');
  const host = window.frameElement;
  let active = false;
  const records = Array.from(document.querySelectorAll('video'), function (video) {
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    return { video, version: 0, pending: false, finished: false };
  });

  function start(record) {
    const video = record.video;
    if (!active || !record.pending || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const version = record.version;
    record.pending = false;
    video.currentTime = 0;
    video.playbackRate = 1;
    video.defaultPlaybackRate = 1;
    const attempt = video.play();
    if (!attempt) return;
    attempt.then(function () {
      // An older play promise must neither revive a hidden video nor pause a
      // newer entry. Only the current activation owns playback state.
      if (!active || record.finished) video.pause();
    }).catch(function (error) {
      if (version !== record.version || !active || error.name === 'AbortError') return;
      video.dispatchEvent(new CustomEvent('reca:playback-error', { detail: error }));
      console.warn('Video playback could not start:', video.currentSrc, error);
    });
  }

  function enter(record) {
    ++record.version;
    record.video.pause();
    record.finished = false;
    record.pending = true;
    if (record.video.readyState >= HTMLMediaElement.HAVE_METADATA) record.video.currentTime = 0;
    start(record);
  }

  function setActive(next) {
    next = Boolean(next);
    if (next === active) return;
    active = next;
    records.forEach(function (record) {
      if (active) enter(record);
      else {
        ++record.version;
        record.pending = false;
        record.video.pause();
      }
    });
  }

  function replay() {
    if (active) records.forEach(enter);
  }

  records.forEach(function (record) {
    const video = record.video;
    video.addEventListener('loadeddata', function () { start(record); });
    video.addEventListener('canplay', function () { start(record); });
    video.addEventListener('playing', function () {
      if (!active || record.finished) video.pause();
    });
    video.addEventListener('ended', function () {
      // Ignore an ended event queued before a newer entry sought to zero.
      if (!video.ended) return;
      ++record.version;
      record.finished = true;
      record.pending = false;
      video.pause();
      // No seek/load/reset here: the browser retains the decoded final frame.
    });
  });

  window.ReCASlideVideo = { setActive, replay };

  function syncActivation() {
    const ownActive = section && section.classList.contains('active') && section.getAttribute('aria-hidden') !== 'true';
    const hostActive = !host || !host.classList.contains('slide') ||
      (host.classList.contains('active') && host.getAttribute('aria-hidden') !== 'true' && !host.hasAttribute('inert'));
    setActive(ownActive && hostActive);
  }
  // Also support standalone pages and activation by DOM-based navigation.
  // Unrelated mutations cannot replay an already-active or finished video.
  const observer = new MutationObserver(syncActivation);
  const options = { attributes: true, attributeFilter: ['class', 'aria-hidden', 'inert'] };
  if (section) observer.observe(section, options);
  if (host) observer.observe(host, options);
  syncActivation();
})();
