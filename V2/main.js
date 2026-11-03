const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const emailLink = document.querySelector('.contact-email');
const copyButton = document.querySelector('.contact-copy');
const copyStatus = document.querySelector('.contact-status');

const copyLabel = copyButton.querySelector('.copy-label');
let copyFeedbackTimer;

copyButton.addEventListener('click', async () => {
  let message = 'Email copied';
  let copied = false;
  try {
    await navigator.clipboard.writeText(emailLink.textContent.trim());
    copied = true;
  } catch {
    message = 'Could not copy email';
  }

  clearTimeout(copyFeedbackTimer);
  copyButton.toggleAttribute('data-copied', copied);
  copyLabel.textContent = copied ? 'Copied' : 'Retry';
  copyStatus.textContent = message;
  copyFeedbackTimer = setTimeout(() => {
    copyButton.removeAttribute('data-copied');
    copyLabel.textContent = 'Copy';
    copyStatus.textContent = '';
  }, 1800);
});

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
