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

  const art = footerWave.querySelector('span');
  const crest = height >= 1.5 ? ' _)\'-. ' : '  ,(  ';
  const trough = height >= 1.5 ? '   \'.,_' : "`-'   ";
  const width = crest.length;
  const count = height >= 1.5 ? 3 : 2;
  const delay = Math.max(90, Math.min(300, period * 1000 / (width * 6)));
  let offset = 0;
  let timer;
  let visible = false;
  let paused = false;

  function draw() {
    const shift = line => {
      const repeated = line.repeat(count + 1);
      return repeated.slice(offset, offset + width * count);
    };
    art.textContent = shift(crest) + '\n' + shift(trough);
    offset = (offset + 1) % width;
  }

  function updateAnimation() {
    clearInterval(timer);
    footerWave.disabled = reducedMotion.matches;
    if (visible && !paused && !reducedMotion.matches) timer = setInterval(draw, delay);
  }

  draw();
  footerWave.hidden = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateAnimation();
  }).observe(footerWave);
  footerWave.addEventListener('click', () => {
    paused = !paused;
    footerWave.setAttribute('aria-label', paused ? 'Play wave animation' : 'Pause wave animation');
    updateAnimation();
  });
  reducedMotion.addEventListener('change', updateAnimation);
}

showFooterWave().catch(() => {});
