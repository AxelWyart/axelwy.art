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

  const art = footerWave.querySelector('[aria-hidden]');
  footerWave.querySelector('#footer-wave-forecast').textContent = `Waves around ${height.toFixed(1)} m every ${period.toFixed(1)} s`;
  // Use vertical rows for height and horizontal spacing for the forecast period.
  // Sub-metre conditions read as surface ripples instead of breaking crests.
  const profile = [
    { below: 0.5, rows: ['..'] },
    { below: 1, rows: ['_.._'] },
    { below: 2, rows: ['  ,(', "`-'"] },
    { below: 3, rows: ['  _', " / `-.", "'     '"] },
    { below: Infinity, rows: ['   _,', '  /  `.', ' /     `', "'"] },
  ].find(band => height < band.below);
  const profileWidth = Math.max(...profile.rows.map(row => row.length));
  const width = Math.max(profileWidth + 1, Math.min(12, Math.round(period)));
  const count = width <= 7 ? 3 : 2;
  const delay = period * 1000 / width;
  let offset = 0;
  let timer;
  let visible = false;
  let paused = false;

  function draw() {
    const shift = line => {
      const repeated = line.padEnd(width).repeat(count + 1);
      return repeated.slice(offset, offset + width * count);
    };
    art.textContent = profile.rows.map(shift).join('\n');
    offset = (offset + 1) % width;
  }

  function updateAnimation() {
    clearInterval(timer);

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

const avatarLink = document.querySelector('.avatar-link');
avatarLink.addEventListener('pointermove', event => {
  if (!hoverPointer.matches || event.pointerType === 'touch') return;
  const bounds = avatarLink.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  avatarLink.style.setProperty('--avatar-x', `${(x - bounds.width / 2) * .055}px`);
  avatarLink.style.setProperty('--avatar-y', `${(y - bounds.height / 2) * .055}px`);
  avatarLink.style.setProperty('--avatar-tip-x', `${x + 18}px`);
  avatarLink.style.setProperty('--avatar-tip-y', `${y - 5}px`);
});
avatarLink.addEventListener('pointerleave', () => {
  avatarLink.style.removeProperty('--avatar-x');
  avatarLink.style.removeProperty('--avatar-y');
});

document.querySelectorAll('.client-funding').forEach(item => {
  const tooltip = item.querySelector('.client-funding-tooltip');
  const count = item.querySelector('.funding-count');
  const amount = Number(count.dataset.amount);
  const currency = count.dataset.currency;
  let frame;
  let active = false;

  function updateFunding() {
    const visible = item.matches(':hover, :focus-within');
    if (visible === active) return;
    active = visible;
    cancelAnimationFrame(frame);
    if (!visible) {
      count.textContent = `${currency}${amount}M`;
      return;
    }
    const start = performance.now();
    function draw(now) {
      const progress = Math.max(0, Math.min(1, (now - start) / 450));
      const value = Math.round(amount * (1 - (1 - progress) ** 3));
      count.textContent = `${currency}${value}M`;
      if (progress < 1) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
  }

  item.addEventListener('pointermove', event => {
    if (!hoverPointer.matches || event.pointerType === 'touch') return;
    const bounds = item.getBoundingClientRect();
    const x = Math.max(8, Math.min(event.clientX + 14, document.documentElement.clientWidth - tooltip.offsetWidth - 8));
    item.style.setProperty('--funding-x', `${x - bounds.left}px`);
    item.style.setProperty('--funding-y', `${event.clientY - bounds.top - 8}px`);
    item.setAttribute('data-pointer', '');
  });
  item.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible')) item.removeAttribute('data-pointer');
  });

  for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
    item.addEventListener(event, () => queueMicrotask(updateFunding));
  }
});
