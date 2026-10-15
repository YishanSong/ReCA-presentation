(function () {
  'use strict';

  const COLS = 8, ROWS = 6, START = 'B5', GOAL = 'G2';
  const BLOCKED = Object.freeze(['B3', 'C3', 'D2', 'D3', 'D4', 'D5', 'F4', 'F5']);
  const idAt = (x, y) => String.fromCharCode(65 + x) + (y + 1);
  const point = id => ({ x: id.charCodeAt(0) - 65, y: Number(id.slice(1)) - 1 });
  const goalPoint = point(GOAL);
  const heuristic = (x, y) => Math.abs(x - goalPoint.x) + Math.abs(y - goalPoint.y);
  // Deterministic ties: smaller f, then smaller h, then first discovery order.
  // A heap orders parents before children; it is NOT a fully sorted list.
  const compare = (a, b) => a.f - b.f || a.h - b.h || a.order - b.order;

  class MinHeap {
    constructor(emit = () => {}) { this.items = []; this.positions = new Map(); this.emit = emit; }
    get size() { return this.items.length; }
    peek() { return this.items[0]; }
    has(id) { return this.positions.has(id); }
    event(kind, focus, stable, detail) { this.emit({ kind, focus, stable, detail }); }
    swap(a, b) {
      const first = this.items[a], second = this.items[b];
      [this.items[a], this.items[b]] = [second, first];
      this.positions.set(first.id, b); this.positions.set(second.id, a);
      this.event('swap', [first.id, second.id], false, `Swap ${first.id} ↔ ${second.id}`);
    }
    up(index) {
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        this.event('compare', [this.items[parent].id, this.items[index].id], false, 'Compare parent / child');
        if (compare(this.items[parent], this.items[index]) <= 0) break;
        this.swap(parent, index); index = parent;
      }
    }
    insert(entry) {
      if (this.has(entry.id)) throw new Error('Duplicate heap entry: ' + entry.id);
      this.positions.set(entry.id, this.items.length); this.items.push(entry);
      this.event('insert', [entry.id], false, 'Insert ' + entry.id);
      this.up(this.items.length - 1);
      this.event('stable', [this.peek().id], true, 'Heap ordered · min ' + this.peek().id);
    }
    decreaseKey(entry) {
      const index = this.positions.get(entry.id);
      if (index === undefined || compare(entry, this.items[index]) > 0) throw new Error('Invalid decrease-key');
      this.items[index] = entry;
      this.event('decrease', [entry.id], false, 'Decrease key · ' + entry.id);
      this.up(index);
      this.event('stable', [this.peek().id], true, 'Heap ordered · min ' + this.peek().id);
    }
    pop() {
      if (!this.size) return undefined;
      const min = this.items[0], last = this.items.pop(); this.positions.delete(min.id);
      if (this.size) { this.items[0] = last; this.positions.set(last.id, 0); }
      this.event('extract', [min.id], this.size <= 1, 'Extract ' + min.id);
      let index = 0;
      while (2 * index + 1 < this.size) {
        const left = 2 * index + 1, right = left + 1;
        const child = right < this.size && compare(this.items[right], this.items[left]) < 0 ? right : left;
        this.event('compare', [this.items[index].id, this.items[child].id], false, 'Compare parent / child');
        if (compare(this.items[index], this.items[child]) <= 0) break;
        this.swap(index, child); index = child;
      }
      this.event('stable', this.size ? [this.peek().id] : [], true, this.size ? 'Heap ordered · min ' + this.peek().id : 'Heap empty');
      return min;
    }
  }

  function buildSearch() {
    const blocked = new Set(BLOCKED), closed = new Set(), best = new Map(), parents = new Map();
    const events = [], popped = [], iterations = [];
    let order = 0, current = null, candidate = null, neighbors = [], iteration = -1, found = false, phase = 'cost';
    function snapshot(kind, detail, focus = [], stable = true) {
      const event = Object.freeze({
        kind, detail, phase, stable, iteration, goal: found,
        current, candidate,
        focus: Object.freeze(focus.slice()), neighbors: Object.freeze(neighbors.slice()),
        heap: Object.freeze(heap.items.slice()), closed: Object.freeze([...closed]),
        best: Object.freeze(Object.fromEntries(best)), parents: Object.freeze(Object.fromEntries(parents))
      });
      events.push(event); return event;
    }
    const heap = new MinHeap(event => snapshot(event.kind, event.detail, event.focus, event.stable));
    const makeEntry = (id, g, discovery) => {
      const { x, y } = point(id), h = heuristic(x, y);
      return Object.freeze({ id, x, y, g, h, f: g + h, order: discovery });
    };
    candidate = makeEntry(START, 0, order++); best.set(START, 0);
    snapshot('compute', 'Start cost · f = 0 + 8');
    phase = 'heap'; heap.insert(candidate);
    const initial = events[events.length - 1];

    while (heap.size) {
      iteration++; const begin = events.length;
      candidate = null; neighbors = []; current = heap.peek(); phase = 'pop';
      snapshot('select', 'Pop minimum · ' + current.id, [current.id]);
      const selected = heap.pop(); popped.push(selected.id);
      if (selected.id === GOAL) {
        found = true; phase = 'repeat';
        snapshot('goal', 'Goal popped → Path found', [GOAL]);
        iterations.push(Object.freeze(events.slice(begin))); break;
      }
      closed.add(selected.id); phase = 'expand';
      // Unit-cost, four-directional movement. Right, Up, Left, Down is deliberate.
      neighbors = [[1, 0], [0, -1], [-1, 0], [0, 1]]
        .map(([dx, dy]) => [selected.x + dx, selected.y + dy])
        .filter(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !blocked.has(idAt(x, y)))
        .map(([x, y]) => idAt(x, y));
      snapshot('expand', 'Expand neighbors · ' + selected.id, neighbors);
      for (const id of neighbors) {
        if (closed.has(id)) continue;
        const g = selected.g + 1, previousG = best.get(id);
        candidate = makeEntry(id, g, heap.has(id) ? heap.items[heap.positions.get(id)].order : order);
        phase = 'cost'; snapshot('compute', `${id}: f = ${g} + ${candidate.h} = ${candidate.f}`, [id]);
        if (previousG !== undefined && g >= previousG) {
          snapshot('keep', 'Keep existing better g · ' + id, [id]); continue;
        }
        best.set(id, g); parents.set(id, selected.id); phase = 'heap';
        if (heap.has(id)) heap.decreaseKey(candidate);
        else { order++; heap.insert(candidate); }
      }
      candidate = null; neighbors = []; phase = 'repeat';
      snapshot('repeat', 'Updated heap → next extraction');
      iterations.push(Object.freeze(events.slice(begin)));
    }
    const path = [];
    if (found) { for (let id = GOAL; id !== undefined; id = parents.get(id)) path.push(id); path.reverse(); }
    return Object.freeze({ initial, events: Object.freeze(events), iterations: Object.freeze(iterations),
      popped: Object.freeze(popped), path: Object.freeze(path), final: events[events.length - 1] });
  }

  /** A readable dwell per operation, independent of iteration/event count.
   * No late-iteration compression: inserting B6 and every subsequent heap update
   * receive the same teaching pace as earlier operations. Units are seconds at 1×.
   * This is a presentation timeline, not a measurement of algorithm latency.
   */
  function buildSchedule(search) {
    const initialDuration = 1.6, reconstructionDuration = 2.5, finalHold = 3;
    const seconds = Object.freeze({
      select: .6, extract: .4, expand: .65, compute: .65, insert: .35,
      compare: .25, swap: .5, stable: .2, repeat: .3, keep: .35, goal: 1.6
    });
    const segments = [];
    let cursor = initialDuration, previous = search.initial;
    search.iterations.forEach(iteration => iteration.forEach(event => {
      const length = seconds[event.kind] === undefined ? .5 : seconds[event.kind];
      segments.push(Object.freeze({ start: cursor, end: cursor + length, previous, event }));
      cursor += length; previous = event;
    }));
    return Object.freeze({ segments: Object.freeze(segments), initialDuration,
      searchEnd: cursor, reconstructionDuration, duration: cursor + reconstructionDuration + finalHold });
  }

  // Labels describe a proposed route separately from the best route already stored.
  // A rejected proposal never changes the frontier entry or its priority.
  function presentCost(event, rejectedRoute) {
    const candidate = event.candidate, current = event.current;
    const cost = event.goal ? current : candidate || current;
    const value = `g = ${cost.g} · h = ${cost.h} → f = ${cost.f}`;
    if (!current) return { node: cost.id + ' · start cell', value, decision: 'Initialize the frontier with this route', kind: 'new' };
    if (candidate && !event.goal) {
      const storedG = event.best[candidate.id], storedF = storedG + candidate.h;
      const node = `${candidate.id} via ${current.id} · ${event.phase === 'cost' ? 'proposed' : 'accepted'} route`;
      if (event.phase === 'cost') {
        if (storedG === undefined) return { node, value, decision: 'New frontier cell → insert this route', kind: 'new' };
        if (candidate.g >= storedG) return { node, value, decision: `Keep stored g = ${storedG}, f = ${storedF} · ignore ${candidate.g > storedG ? 'worse' : 'equal'} route`, kind: 'keep' };
        return { node, value, decision: `Stored g = ${storedG}, f = ${storedF} → improve this route`, kind: 'improve' };
      }
      return { node, value, decision: event.kind === 'decrease' ? 'Better route accepted → decrease heap priority' : `Stored best: g = ${storedG}, f = ${storedF}`, kind: 'stored' };
    }
    return { node: cost.id + ' · stored best route', value,
      decision: rejectedRoute ? `Earlier route via ${rejectedRoute.via} had g = ${rejectedRoute.g} · ignored` : event.goal ? 'Goal popped → reconstruct the stored route' : 'Pop Min uses the stored frontier priority',
      kind: rejectedRoute ? 'keep' : 'stored' };
  }

  // The same production algorithm is independently testable without a DOM.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Object.freeze({ MinHeap, buildSearch, buildSchedule, presentCost, compare, BLOCKED, START, GOAL, point, heuristic });
    return;
  }

  const search = buildSearch();
  const pacing = buildSchedule(search);
  const { duration, initialDuration, searchEnd, reconstructionDuration } = pacing;
  const schedule = pacing.segments;
  // Carry a rejection explanation into that cell's later extraction. Build this
  // once from immutable events so reverse seeking renders the same explanation.
  const rejectedRoutes = new Map(), rejectionAtEvent = new Map();
  search.events.forEach(event => {
    if (event.kind === 'keep') rejectedRoutes.set(event.candidate.id, { via: event.current.id, g: event.candidate.g });
    if (!event.candidate && event.current && rejectedRoutes.has(event.current.id)) rejectionAtEvent.set(event, rejectedRoutes.get(event.current.id));
  });
  const get = id => document.getElementById('s14-' + id);
  const svgNS = 'http://www.w3.org/2000/svg';
  function element(tag, attrs, parent, text) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
  const section = document.querySelector('.slide'), scene = get('scene');
  const range = get('time'), scrubber = get('scrubber'), toggle = get('toggle'), speed = get('speed');
  const rates = [1, 1.5, 2, 3];
  const cells = new Map(), blocked = new Set(BLOCKED);
  const center = id => { const p = point(id); return { x: 76 + p.x * 46, y: 121 + p.y * 46 }; };
  for (let x = 0; x < COLS; x++) element('text', { x: 76 + x * 46, y: 87, class: 's14-axis' }, get('grid'), String.fromCharCode(65 + x));
  for (let y = 0; y < ROWS; y++) {
    element('text', { x: 36, y: 128 + y * 46, class: 's14-axis' }, get('grid'), y + 1);
    for (let x = 0; x < COLS; x++) {
      const id = idAt(x, y);
      cells.set(id, element('rect', { x: 55 + x * 46, y: 100 + y * 46, width: 42, height: 42, rx: 3, class: 's14-cell', 'data-cell': id }, get('grid')));
    }
  }
  for (const [id, label, color] of [[START, 'S', '#173d6a'], [GOAL, 'G', '#218f7c']]) {
    const p = center(id);
    element('circle', { cx: p.x, cy: p.y, r: 16, fill: color }, get('endpoints'));
    element('text', { x: p.x, y: p.y + 7, class: 's14-endpoint' }, get('endpoints'), label);
  }
  const pathPoints = search.path.map(center);
  get('path').setAttribute('d', pathPoints.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(''));
  const pathLength = (search.path.length - 1) * 46;
  get('length').textContent = (search.path.length - 1) + ' moves';
  get('path').setAttribute('stroke-dasharray', pathLength);
  const phases = [['pop', 'Pop Min', 20, 130], ['expand', 'Expand', 180, 130], ['cost', 'Compute Cost', 340, 185], ['heap', 'Update Heap', 555, 180], ['repeat', 'Repeat', 765, 150]];
  const workflow = phases.map(([phase, label, x, width], i) => {
    if (i) element('path', { d: `M${x - 26} 501H${x - 8}`, stroke: '#91a9bd', 'stroke-width': 1.5, 'marker-end': 'url(#s14-arrow)' }, get('workflow'));
    const group = element('g', { class: 's14-workflow', 'data-phase': phase }, get('workflow'));
    element('rect', { x, y: 485, width, height: 32, rx: 5 }, group);
    element('text', { x: x + width / 2, y: 508 }, group, label);
    return group;
  });

  // Rendering reads the same immutable search events at a more readable pace.
  // Seeking never reruns or mutates A*, and later iterations are not fast-forwarded.
  const slots = [{ x: 750, y: 214 }, { x: 640, y: 283 }, { x: 860, y: 283 },
    { x: 585, y: 352 }, { x: 695, y: 352 }, { x: 805, y: 352 }, { x: 915, y: 352 }];
  const heapNodes = new Map();
  // Allocate each discovered node once. No element accumulation during replay/seek.
  const discovered = new Map();
  search.events.forEach(e => e.heap.forEach(entry => discovered.set(entry.id, entry)));
  discovered.forEach(entry => {
    const node = element('g', { class: 's14-heap-node', 'data-node': entry.id, visibility: 'hidden' }, get('heap-nodes'));
    element('rect', { x: -48, y: -25, width: 96, height: 50, rx: 6 }, node);
    element('text', { x: 0, y: -3 }, node, entry.id);
    const priority = element('text', { x: 0, y: 18, class: 's14-heap-priority' }, node, 'f = ' + entry.f);
    heapNodes.set(entry.id, { node, priority });
  });
  const edges = slots.slice(1).map(() => element('line', { class: 's14-heap-edge' }, get('heap-edges')));

  function drawHeap(event, old, progress) {
    const u = ease(progress), positions = new Map();
    const previousIndex = new Map(old.heap.map((entry, index) => [entry.id, index]));
    heapNodes.forEach(({ node, priority }, id) => {
      node.setAttribute('visibility', 'hidden');
      node.setAttribute('opacity', 0); node.setAttribute('transform', 'translate(0 0)');
      node.dataset.focus = 'false'; node.dataset.min = 'false';
      ['index', 'f', 'h', 'order'].forEach(key => delete node.dataset[key]);
      priority.textContent = 'f = ' + discovered.get(id).f;
    });
    // Include an extracted root briefly as a fading, upward-moving glyph.
    const entries = event.heap.slice(0, 7);
    const removed = old.heap[0];
    if (event.kind === 'extract' && removed && !event.heap.some(e => e.id === removed.id) && u < 1) {
      const node = heapNodes.get(removed.id).node;
      node.setAttribute('visibility', 'visible'); node.setAttribute('opacity', 1 - u);
      // A small lift keeps the fading glyph below the heap heading.
      node.setAttribute('transform', `translate(${slots[0].x} ${slots[0].y - 6 * u})`);
      node.dataset.focus = 'true'; node.dataset.min = 'false';
    }
    entries.forEach((entry, index) => {
      const target = slots[index], oldIndex = previousIndex.get(entry.id);
      const from = oldIndex === undefined || oldIndex >= 7 ? { x: target.x, y: 392 } : slots[oldIndex];
      let x = from.x + (target.x - from.x) * u, y = from.y + (target.y - from.y) * u;
      if (event.kind === 'swap' && oldIndex !== undefined && oldIndex !== index && oldIndex < 7) {
        const dx = target.x - from.x, dy = target.y - from.y, distance = Math.hypot(dx, dy);
        // Paired swaps take opposite arcs, keeping both glyphs distinguishable.
        x += -dy / distance * 42 * Math.sin(Math.PI * u);
        y += dx / distance * 42 * Math.sin(Math.PI * u);
      }
      positions.set(index, { x, y });
      const { node, priority } = heapNodes.get(entry.id);
      node.setAttribute('visibility', 'visible'); node.setAttribute('transform', `translate(${x} ${y})`);
      node.setAttribute('opacity', oldIndex === undefined || oldIndex >= 7 ? u : 1);
      node.dataset.focus = String(event.focus.includes(entry.id)); node.dataset.min = String(event.stable && index === 0);
      node.dataset.index = index; node.dataset.f = entry.f; node.dataset.h = entry.h; node.dataset.order = entry.order;
      priority.textContent = 'f = ' + entry.f;
    });
    edges.forEach((edge, i) => {
      const child = i + 1, parent = Math.floor((child - 1) / 2), a = positions.get(parent), b = positions.get(child);
      edge.setAttribute('visibility', a && b ? 'visible' : 'hidden');
      if (a && b) { edge.setAttribute('x1', a.x); edge.setAttribute('y1', a.y + 25); edge.setAttribute('x2', b.x); edge.setAttribute('y2', b.y - 25); }
      else ['x1', 'y1', 'x2', 'y2'].forEach(attribute => edge.setAttribute(attribute, 0));
    });
    get('heap-count').textContent = event.heap.length > 7 ? `Top 7 of ${event.heap.length} frontier entries` : `${event.heap.length} frontier ${event.heap.length === 1 ? 'entry' : 'entries'}`;
  }

  function renderAt(time) {
    let event = search.initial, old = event, progress = 1;
    if (time >= initialDuration) {
      const segment = schedule.find(item => time < item.end);
      if (segment) { event = segment.event; old = segment.previous; progress = clamp((time - segment.start) / ((segment.end - segment.start) * .7)); }
      else event = old = search.final;
    }
    const reconstruction = ease((time - searchEnd) / reconstructionDuration);
    const closed = new Set(event.closed), open = new Set(event.heap.map(entry => entry.id));
    const candidate = event.candidate, current = event.current;
    const pathSet = new Set(search.path.slice(0, 1 + Math.floor(reconstruction * (search.path.length - 1))));
    cells.forEach((cell, id) => {
      let status = blocked.has(id) ? 'blocked' : closed.has(id) ? 'expanded' : open.has(id) ? 'frontier' : 'unseen';
      if (current && current.id === id && !event.goal) status = 'current';
      if (reconstruction > 0 && pathSet.has(id)) status = 'path';
      const fills = { blocked: '#8193A4', expanded: '#B3CFE9', frontier: '#D0EAE4', unseen: '#FFFFFF', current: '#173D6A', path: '#78C5AF' };
      cell.setAttribute('fill', fills[status]); cell.dataset.state = status;
      const focus = event.phase === 'expand' && event.neighbors.includes(id) || event.phase === 'cost' && candidate && candidate.id === id;
      cell.setAttribute('stroke', focus ? '#2f70b3' : '#d8e4ef'); cell.setAttribute('stroke-width', focus ? 3 : 1.5);
    });
    drawHeap(event, old, progress);
    const cost = presentCost(event, rejectionAtEvent.get(event));
    get('cost-node').textContent = cost.node;
    get('cost-value').textContent = cost.value;
    get('cost-decision').textContent = cost.decision;
    get('cost-decision').dataset.decision = cost.kind;
    get('operation').textContent = time < initialDuration ? 'Initialize · insert B5' : event.goal ? 'Stop after goal extraction' : event.detail;
    get('completion').setAttribute('opacity', event.goal ? 1 : 0);
    get('remaining').setAttribute('opacity', event.goal && event.heap.length ? 1 : 0);
    get('length').setAttribute('opacity', reconstruction >= 1 ? 1 : 0);
    get('path').setAttribute('stroke-dashoffset', pathLength * (1 - reconstruction));
    workflow.forEach(node => node.dataset.active = String(time < searchEnd && node.dataset.phase === event.phase));
    scene.dataset.operation = event.kind;
    scene.dataset.stage = event.phase;
    scene.dataset.heapStable = String(event.stable && progress >= 1);
    scene.dataset.current = current ? current.id : '';
    scene.dataset.candidate = candidate ? candidate.id : '';
    scene.dataset.goalPopped = String(event.goal);
  }

  function render(state) {
    renderAt(state.time);
    range.value = (state.progress * 100).toFixed(2);
    range.setAttribute('aria-valuetext', Math.round(state.progress * 100) + '% complete');
    scrubber.style.setProperty('--progress', state.progress * 100 + '%');
    section.dataset.phase = state.playing ? 'playing' : state.finished ? 'complete' : 'paused';
    toggle.textContent = state.playing ? 'Pause' : state.finished ? 'Replay' : 'Play';
    toggle.setAttribute('aria-label', toggle.textContent + ' the animation');
    speed.textContent = state.rate + '×';
    speed.setAttribute('aria-label', `Playback speed: ${state.rate} times. Click to change speed.`);
  }
  const timeline = SlideAnimation.createTimeline({ duration, rate: 1.5, onUpdate: render });
  range.addEventListener('input', () => timeline.seek(Number(range.value) / 100 * duration));
  toggle.addEventListener('click', () => timeline.playing ? timeline.pause() : timeline.play());
  speed.addEventListener('click', () => timeline.setRate(rates[(rates.indexOf(timeline.rate) + 1) % rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
