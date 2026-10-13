# ReCA-presentation
Story-driven academic presentation of ReCA (ASPLOS 2025).

`index.html` is the presentation viewer. It embeds all 22 pages in `slides/`, so slide titles, text, figures, and animations are edited in those individual pages. There is no separate slide-link menu or duplicate slide content in the viewer.

Preview `index.html` through an HTTP static server (for example, VS Code Live Server). Keeping the viewer and slide pages on the same origin lets keyboard navigation continue after clicking inside a slide. Browsers may isolate iframe documents when opening files directly with `file://`.

Use Left/Right or Page Up/Page Down to move between slides, Space for the next slide, and Home/End for the first/last slide. Keyboard shortcuts leave editable fields and modified key combinations alone. The viewer scales the 1600 × 900 slides to fit the window.
