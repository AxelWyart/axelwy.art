const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const workList = document.querySelector('[aria-labelledby="work-heading"] .entries');
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let highlightedWork = null;
let highlightFrame = 0;

function positionWorkHighlight(entry) {
  const listRect = workList.getBoundingClientRect();
  const entryRect = entry.getBoundingClientRect();
  workList.style.setProperty('--hover-y', `${entryRect.top - listRect.top}px`);
  workList.style.setProperty('--hover-height', `${entryRect.height}px`);
}

function showWorkHighlight(entry, instant = false) {
  cancelAnimationFrame(highlightFrame);
  const entering = !workList.hasAttribute('data-hover-active');
  workList.toggleAttribute('data-hover-snap', entering || instant || reducedMotion.matches);
  highlightedWork = entry;
  positionWorkHighlight(entry);
  workList.setAttribute('data-hover-active', '');
  // Commit first entry and keyboard focus immediately before restoring movement.
  if (entering || instant || reducedMotion.matches) getComputedStyle(workList, '::before').transform;
  highlightFrame = requestAnimationFrame(() => workList.removeAttribute('data-hover-snap'));
}

function hideWorkHighlight() {
  workList.removeAttribute('data-hover-active');
  highlightedWork = null;
}

workList.addEventListener('pointerover', event => {
  if (!hoverPointer.matches || event.pointerType === 'touch') return;
  const entry = event.target.closest('.entry');
  if (entry && entry !== highlightedWork) showWorkHighlight(entry);
});
workList.addEventListener('pointerleave', () => {
  const keyboardEntry = workList.querySelector('.entry:focus-visible');
  if (keyboardEntry) showWorkHighlight(keyboardEntry, true);
  else hideWorkHighlight();
});
workList.addEventListener('focusin', event => {
  const entry = event.target.closest('.entry');
  if (entry?.matches(':focus-visible')) showWorkHighlight(entry, true);
});
workList.addEventListener('focusout', event => {
  if (!workList.contains(event.relatedTarget)) hideWorkHighlight();
});
hoverPointer.addEventListener('change', hideWorkHighlight);
new ResizeObserver(() => {
  if (highlightedWork) positionWorkHighlight(highlightedWork);
}).observe(workList);

const footerWave = document.querySelector('.footer-wave');
const marineURL = 'https://marine-api.open-meteo.com/v1/marine?latitude=43.49&longitude=-1.64&current=wave_height,wave_period';

async function showFooterWave() {
  const response = await fetch(marineURL);
  if (!response.ok) return;
  const { current } = await response.json();
  const height = current?.wave_height;
  const period = current?.wave_period;
  if (!Number.isFinite(height) || height < 0 || !Number.isFinite(period) || period <= 0) return;

  const art = footerWave.querySelector('pre');
  footerWave.querySelector('figcaption span').textContent = `Forecast ${height.toFixed(1)} m · ${period.toFixed(0)} s`;
  footerWave.hidden = false;
  const amplitude = Math.min(3, height);
  let start;
  let lastFrame = -1;

  function draw(now) {
    start ??= now;
    const elapsed = now - start;
    const frame = Math.floor(elapsed / 80);
    if (frame !== lastFrame) {
      const rows = Array.from({ length: 7 }, () => Array(32).fill(' '));
      for (let x = 0; x < 32; x++) {
        const phase = x * .34 - elapsed / 1000 * Math.PI * 2 / period;
        const row = Math.round(3 - Math.sin(phase) * amplitude);
        const slope = Math.cos(phase);
        rows[row][x] = amplitude < .5 || Math.abs(slope) < .4 ? '_' : slope > 0 ? '/' : '\\';
      }
      art.textContent = rows.map(row => row.join('')).join('\n');
      lastFrame = frame;
    }
    if (!reducedMotion.matches && elapsed < 4500) requestAnimationFrame(draw);
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    requestAnimationFrame(draw);
  });
  observer.observe(footerWave);
}

showFooterWave().catch(() => {});
