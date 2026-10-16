(function () {
  'use strict';
  const duration = 15, rates = Object.freeze([1, 1.5, 2, 3]);
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { const u = clamp(n); return u * u * (3 - 2 * u); };
  // Same unit-cost C5 iteration, heuristic and deterministic ties as Slide 14.
  // Presentation seconds express teaching pace, not measured hardware latency.
  const compare = (a, b) => a.f - b.f || a.h - b.h || a.order - b.order;
  const entry = (id, g, h, order) => Object.freeze({ id, x: id.charCodeAt(0) - 65, y: Number(id.slice(1)) - 1, g, h, f: g + h, order });
  function buildTrace() {
    const items = [entry('C5',1,7,1), entry('B4',1,7,2), entry('A5',1,9,3), entry('B6',1,9,4)];
    const costs = Object.freeze([entry('C4',2,6,5),entry('C6',2,8,6)]), events = [];
    const save = (kind, stable, focus) => { const e = Object.freeze({kind,stable,focus:Object.freeze(focus),heap:Object.freeze(items.slice())}); events.push(e); return e; };
    const initial = save('initial',true,['C5']);
    items[0]=items.pop(); save('extract',false,['C5']);
    [items[0],items[1]]=[items[1],items[0]]; save('sift-after-pop',true,['B4','B6']);
    items.push(costs[0]); save('insert-c4',false,['C4']);
    [items[3],items[1]]=[items[1],items[3]]; save('sift-c4-first',false,['C4','B6']);
    [items[1],items[0]]=[items[0],items[1]]; save('sift-c4-root',true,['C4','B4']);
    items.push(costs[1]); save('insert-c6',true,['C6']);
    const final = save('ready',true,['C4']);
    return Object.freeze({initial,final,events:Object.freeze(events),costs,excluded:Object.freeze({blocked:Object.freeze(['D5']),closed:Object.freeze(['B5'])})});
  }
  const trace = buildTrace();
  const segments = Object.freeze([
    {start:.75,end:1.4,index:1}, {start:1.55,end:2.2,index:2},
    {start:9.2,end:9.65,index:3}, {start:9.75,end:10.2,index:4},
    {start:10.3,end:10.85,index:5}, {start:11,end:11.55,index:6}
  ]);
  /** Pure state selection. No search or DOM state changes when time moves backward. */
  function stateAt(seconds) {
    const t = Math.max(0, Math.min(duration, Number(seconds) || 0));
    const stage = t < 3 ? 'pop' : t < 6 ? 'read' : t < 9 ? 'cost' : t < 12 ? 'update' : 'complete';
    let heap = trace.initial, previous = heap, progress = 1;
    for (const s of segments) {
      if(t < s.start) break;
      heap = trace.events[s.index]; previous = trace.events[s.index-1];
      progress = ease((t-s.start)/(s.end-s.start));
    }
    if (t >= 12) { heap = trace.final; previous = heap; progress = 1; }
    return {time:t,stage,heap,previous,progress,
      current: ease((t-.75)/.65), currentVisible:t>=.75,
      neighbors:clamp((t-3.35)/.65), costs:clamp((t-6.55)/.55),
      stored:clamp((t-11.55)/.4),
      focusLLM:t<.65 ? .65*(1-t/.65) : t>=12 ? .5 : 0,
      focusSearch:t<1.2 ? .7 : t>=12 ? .45 : .2,
      focusAPU:t>=.65 && t<12 ? 1 : .45,
      focusDRAM:t>=12 ? .5 : stage==='read' ? .45 : 0};
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Object.freeze({duration,rates,compare,buildTrace,trace,stateAt}); return;
  }
  const get = name => document.getElementById('s15-' + name);
  const section = document.querySelector('.slide'), scene = get('scene');
  const svgNS='http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    const node=document.createElementNS(svgNS,tag);
    Object.entries(attrs).forEach(([name,value])=>node.setAttribute(name,value));
    if(text!==undefined)node.textContent=text;
    parent.appendChild(node);return node;
  }
  const slots=[{x:155,y:160},{x:80,y:225},{x:230,y:225},{x:40,y:290},{x:120,y:290}];
  const nodes=new Map(), known=new Map();
  trace.events.forEach(e=>e.heap.forEach(n=>known.set(n.id,n)));
  known.forEach(n=>{
    const node=el('g',{class:'s15-heap-node','data-node':n.id},get('heap-nodes'));
    el('rect',{x:-31,y:-23,width:62,height:46,rx:5},node);
    el('text',{x:0,y:-2},node,n.id);el('text',{x:0,y:17,class:'s15-priority'},node,'f = '+n.f);
    nodes.set(n.id,node);
  });
  const edges=slots.slice(1).map(()=>el('line',{class:'s15-heap-edge'},get('heap-edges')));
  const explanations={
    pop:['1 / 4','Pop min frontier node','HU extracts C5, then restores parent–child heap order.'],
    read:['2 / 4','Read neighboring states','Controller selects C4 and C6. Skip blocked D5 and closed B5.'],
    cost:['3 / 4','Compute neighbor costs','CCU evaluates g, h and f for both eligible neighbors in parallel.'],
    update:['4 / 4','Update frontier heap','Store costs locally. HU inserts C4 and C6, then restores heap order.'],
    complete:['','Specialized hardware accelerates each A* iteration','without removing sequential dependencies.']
  };
  function renderAt(time) {
    const s=stateAt(time), positions=new Map(), oldIndex=new Map(s.previous.heap.map((n,i)=>[n.id,i]));
    // Every dynamic attribute is assigned on every render, including hidden glyphs.
    nodes.forEach(node=>{
      node.setAttribute('visibility','hidden');node.setAttribute('opacity',0);node.setAttribute('transform','translate(0 0)');
      node.dataset.min='false';node.dataset.focus='false';
      ['index','f','h','order'].forEach(k=>delete node.dataset[k]);
    });
    s.heap.heap.forEach((n,i)=>{
      const old=oldIndex.get(n.id), target=slots[i];
      const from=old===undefined ? {x:664,y:n.id==='C4'?244:302} : slots[old];
      let x=from.x+(target.x-from.x)*s.progress,y=from.y+(target.y-from.y)*s.progress;
      if(old!==undefined && old!==i && s.heap.kind.startsWith('sift')) {
        if (s.heap.kind === 'sift-c4-first') {
          // Two horizontal lanes separate the compact child/leaf pair before
          // their vertical exchange. Cards stay wholly inside the Heap Unit.
          const lane = from.y < target.y ? 35 : 125, u = s.progress;
          if (u < .25) { x = from.x + (lane-from.x)*ease(u/.25); y = from.y; }
          else if (u < .75) { x = lane; y = from.y + (target.y-from.y)*ease((u-.25)/.5); }
          else { x = lane + (target.x-lane)*ease((u-.75)/.25); y = target.y; }
        } else {
          const dx=target.x-from.x,dy=target.y-from.y,d=Math.hypot(dx,dy);
          x-=dy/d*40*Math.sin(Math.PI*s.progress);y+=dx/d*40*Math.sin(Math.PI*s.progress);
        }
      }
      const node=nodes.get(n.id);positions.set(i,{x,y});
      node.setAttribute('visibility','visible');node.setAttribute('opacity',old===undefined?s.progress:1);node.setAttribute('transform',`translate(${x} ${y})`);
      node.dataset.min=String(s.heap.stable&&s.progress===1&&i===0);
      node.dataset.focus=String(s.stage!=='complete'&&s.heap.focus.includes(n.id));
      node.dataset.index=i;node.dataset.f=n.f;node.dataset.h=n.h;node.dataset.order=n.order;
    });
    edges.forEach((edge,index)=>{
      const child=index+1,a=positions.get((child-1)>>1),b=positions.get(child);
      const visible=!!a&&!!b && (oldIndex.has(s.heap.heap[child].id)||s.progress>.8);
      edge.setAttribute('visibility',visible?'visible':'hidden');
      for(const [key,value]of Object.entries({x1:a?a.x:0,y1:a?a.y+23:0,x2:b?b.x:0,y2:b?b.y-23:0}))edge.setAttribute(key,value);
    });
    const current=get('current');current.setAttribute('opacity',s.currentVisible?1:0);
    current.setAttribute('transform',`translate(${155+(429-155)*s.current} ${160+(161.5-160)*s.current})`);
    ['c4','c6'].forEach(id=>{
      get('neighbor-'+id).setAttribute('opacity',s.neighbors);
      get('cost-'+id).setAttribute('opacity',s.costs);
      get('read-'+id).setAttribute('opacity',s.stage==='read'||s.stage==='cost'?s.neighbors:0);
    });
    get('parallel').setAttribute('opacity',s.stage==='cost'||s.stage==='complete'?1:.35);
    get('stored').setAttribute('opacity',s.stored);
    get('return').setAttribute('opacity',s.stage==='update'?1:0);
    get('hu').dataset.active=String(s.stage==='pop'||s.stage==='update'||s.stage==='complete');
    get('sp').dataset.active=String(s.stage==='read'||s.stage==='update'||s.stage==='complete');
    get('ccu').dataset.active=String(s.stage==='cost'||s.stage==='complete');
    [['llm',s.focusLLM],['search',s.focusSearch],['apu',s.focusAPU],['dram',s.focusDRAM]].forEach(([name,opacity])=>get('focus-'+name).setAttribute('opacity',opacity));
    const [number,title,detail]=explanations[s.stage];
    get('operation').replaceChildren();
    if(number){const label=document.createElement('span');label.textContent=number;get('operation').append(label);}
    get('operation').append(document.createTextNode(title));get('detail').textContent=detail;
    document.querySelector('.s15-explanation').dataset.complete=String(s.stage==='complete');
    scene.dataset.stage=s.stage;scene.dataset.time=s.time;scene.dataset.heapStable=String(s.heap.stable&&s.progress===1);scene.dataset.operation=s.heap.kind;
  }
  const range=get('time'),scrubber=get('scrubber'),toggle=get('toggle'),speed=get('speed');
  function render(state) {
    renderAt(state.time);range.value=(state.progress*100).toFixed(2);
    range.setAttribute('aria-valuetext',Math.round(state.progress*100)+'% complete');scrubber.style.setProperty('--progress',state.progress*100+'%');
    section.dataset.phase=state.playing?'playing':state.finished?'complete':'paused';
    toggle.textContent=state.playing?'Pause':state.finished?'Replay':'Play';toggle.setAttribute('aria-label',toggle.textContent+' the APU animation');
    speed.textContent=state.rate+'×';speed.setAttribute('aria-label',`Playback speed: ${state.rate} times. Click to change speed.`);
  }
  const timeline=SlideAnimation.createTimeline({duration,rate:1,onUpdate:render});
  range.addEventListener('input',()=>timeline.seek(Number(range.value)/100*duration));
  toggle.addEventListener('click',()=>timeline.playing?timeline.pause():timeline.play());
  speed.addEventListener('click',()=>timeline.setRate(rates[(rates.indexOf(timeline.rate)+1)%rates.length]));
  SlideAnimation.bindToSlide(timeline);
})();
