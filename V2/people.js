// Delegation keeps standalone pages and fetched experience sheets in sync.
function positionTooltip(item) {
  const tooltip = item.querySelector('[role="tooltip"]');
  const dialog = item.closest('dialog');
  const bounds = dialog?.getBoundingClientRect();
  const left = Math.max(16, (bounds?.left ?? 0) + 16);
  const right = Math.min(document.documentElement.clientWidth - 16, (bounds?.right ?? innerWidth) - 16);
  const anchor = item.getBoundingClientRect();
  const idealLeft = anchor.left + anchor.width / 2 - tooltip.offsetWidth / 2;
  const clampedLeft = Math.max(left, Math.min(idealLeft, right - tooltip.offsetWidth));
  tooltip.style.setProperty('--tooltip-shift', `${clampedLeft - idealLeft}px`);
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const item = document.activeElement?.closest?.('.collaborator-item') ||
    document.querySelector('.collaborator-item:has(.collaborator-link:hover)');
  if (!item || item.hasAttribute('data-tooltip-dismissed')) return;
  const tooltip = item.querySelector('[role="tooltip"]');
  if (!tooltip || getComputedStyle(tooltip).visibility !== 'visible') return;
  event.preventDefault();
  event.stopPropagation();
  item.setAttribute('data-tooltip-dismissed', '');
}, true);
for (const type of ['focusin', 'pointerover']) {
  document.addEventListener(type, event => {
    const item = event.target.closest?.('.collaborator-item');
    if (!item || item.contains(event.relatedTarget)) return;
    item.removeAttribute('data-tooltip-dismissed');
    positionTooltip(item);
  });
}
window.addEventListener('resize', () => {
  document.querySelectorAll('.collaborator-item:has(.collaborator-link:is(:hover, :focus-visible))')
    .forEach(positionTooltip);
});
