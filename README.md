# ReCA-presentation
Story-driven academic presentation of ReCA (ASPLOS 2025).

`index.html` is the presentation viewer. It embeds 21 presentation pages from `slides/`, so slide titles, text, figures, and animations are edited in those individual pages. The former slide 11 is merged into slide 10 and omitted from playback; its source file is retained. Filenames stay stable, while the viewer numbers displayed pages consecutively. There is no separate slide-link menu or duplicate slide content in the viewer.

Preview `index.html` through an HTTP static server (for example, VS Code Live Server). Keeping the viewer and slide pages on the same origin lets keyboard navigation continue after clicking inside a slide. Browsers may isolate iframe documents when opening files directly with `file://`.

Use Left/Right or Page Up/Page Down to move between slides, Space for the next slide, and Home/End for the first/last slide. Keyboard shortcuts leave editable fields and modified key combinations alone. The viewer scales the 1600 × 900 slides to fit the window.

Shared slide foundations are independent of presenter or topic:

- `slides/slides.css`: the existing canvas and theme, extended with opt-in layouts, figures, summaries, typography, and source notes.
- `slides/runtime.js`: canvas scaling and active/hidden slide lifecycle.
- `slides/animation.css` and `slides/animation.js`: controls, stage highlighting, and a reusable timeline with pause, seek, replay, and playback rates.

Pages 6–10 and 16–20 reference the foundations they need, then their own `slide-XX.css`. Pages 6 and 10 keep their diagram rendering and UI bindings in `slide-06.js` and `slide-10.js`. Static pages need no dedicated JavaScript. No shared file contains presenter-specific content, figure coordinates, or a page's sequence of animation stages.

The newer pages' figures are cropped from the original PDFs, preserving vector paths and text outlines. Photographs and robot icons that were raster images in the paper remain embedded in the SVGs. Experimental curves are not redrawn.

| Slide | Evidence / original figure | Author presentation |
| --- | --- | --- |
| 7 — Dual memory | ReCA §5.2, Fig. 7, printed p. 988 | p. 36 |
| 8 — Hierarchical cooperation | ReCA §5.3, Fig. 8, printed p. 988 | pp. 37–38 |
| 9 — Cluster size | ReCA §7.3, Fig. 16, printed p. 994 | p. 52 |
| 10 — Efficient execution pipeline | ReCA §5.4, original Fig. 9, printed p. 989 | pp. 39–40 |
| 16 — End-to-end results | ReCA §7.1–7.2, Fig. 12, printed pp. 992–993 | pp. 48–49 |
| 17 — Scalability | ReCA §7.2, Fig. 13, printed p. 993 | p. 50 |
| 18 — Successive optimization configurations | ReCA §7.3, Fig. 17, printed p. 994 | p. 53 |
| 19 — Evidence boundaries | ReCA §7.1–7.3; presenter interpretation is labeled separately | — |
| 20 — Related work | [Arborist](https://arxiv.org/abs/2609.13420), Fig. 9 | — |

ReCA's paper is [Wan et al., ASPLOS 2025](https://doi.org/10.1145/3676641.3716016). The evaluation pages use the paper's reported figures and results; the author's presentation reports a different speedup in its earlier evaluation slides. Do not combine these versions.

Pages 7, 8, and 20 contain static animation foundations marked with `data-animation-placeholder`. The original figure is fully visible; stage elements and Chinese presenter notes describe future highlighting. These pages do not run animations or generate videos. Reference PDFs stay local and are excluded by `.gitignore`.

For a new animated page, load `runtime.js`, `animation.js`, and then its own script. Create a clock with `SlideAnimation.createTimeline({ duration, rate, onUpdate })`; render that page's elements from `state.progress` in `onUpdate`. `SlideAnimation.bindToSlide(timeline)` handles entry, exit, printing, and reduced-motion preference. For discrete highlights, `SlideAnimation.createStages(root).show('stage-name')` activates that page's `.animation-stage[data-stage]` elements. Stage positions and sequencing stay in the page's CSS and JavaScript.

Pages 7–10 and 16–20 have a temporary red Check marker at the lower right. Each marker is one self-contained `<div data-review-check style="...">Check</div>`; deleting that div removes it completely. Page 6 has no marker.

Slide 10 redraws Fig. 9 as native SVG in the deck's font and muted pastel colors; its footer links to the original vector extraction for comparison. The current module and its matching timeline block have a steady highlight, future blocks are faded, and completed blocks stay solid. There is no blinking, glow, or opacity animation. Finishing, leaving the slide, reduced motion, or printing reveals the full diagram. The schematic lengths illustrate the two execution strategies and are not measured timings or a reported speedup. Playback defaults to 3×, supports 1×/2×/3×, seeking, pause, and replay. The merged explanation includes on-demand message generation, multi-step execution, and monitoring with re-planning when needed.
