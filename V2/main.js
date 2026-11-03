const contactButton = document.querySelector('.contact-button');
const contactPanel = document.querySelector('#contact-links');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function positionContact() {
  const rect = contactButton.getBoundingClientRect();
  const mobile = window.innerWidth < 768;
  const width = mobile ? 209 : 190;
  const height = mobile ? 196 : 180;
  contactPanel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  contactPanel.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - height - 8))}px`;
}

contactButton.addEventListener('click', event => {
  contactPanel.toggleAttribute('data-keyboard', event.detail === 0);
});
contactPanel.addEventListener('beforetoggle', event => {
  contactPanel.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  if (event.newState !== 'open') return;
  positionContact();
  if (reducedMotion.matches || contactPanel.hasAttribute('data-keyboard')) return;
  const mobile = window.innerWidth < 768;
  const width = mobile ? 209 : 190;
  const height = mobile ? 196 : 180;
  const buttonWidth = mobile ? 94 : 88;
  contactPanel.animate([
    { width: `${buttonWidth}px`, height: '44px', borderRadius: '22px', transform: 'scale(1)', opacity: 1 },
    { offset: .24, width: `${buttonWidth + (width - buttonWidth) * .2}px`, height: `${44 + (height - 44) * .2}px`, transform: 'scale(.65)' },
    { width: `${width}px`, height: `${height}px`, borderRadius: mobile ? '32px' : '30px', transform: 'scale(1)', opacity: 1 }
  ], { duration: 450, easing: 'cubic-bezier(.2, 0, 0, 1)' });
  contactPanel.querySelectorAll('a').forEach((link, index) => {
    link.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], {
      duration: 300, delay: 120 + index * 30, fill: 'backwards', easing: 'cubic-bezier(.2, 0, 0, 1)'
    });
  });
});
contactPanel.addEventListener('toggle', event => {
  contactButton.setAttribute('aria-expanded', String(event.newState === 'open'));
});
contactPanel.addEventListener('click', event => {
  if (event.target.closest('a')) contactPanel.hidePopover();
});
window.addEventListener('resize', positionContact);
window.addEventListener('scroll', () => {
  if (contactPanel.matches(':popover-open')) contactPanel.hidePopover();
}, { passive: true });


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
