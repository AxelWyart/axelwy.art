(() => {
  const list = document.querySelector('[aria-labelledby="work-heading"] .entries');
  if (!list) return;

  const desktop = matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const links = [...list.querySelectorAll('a.entry[data-work-preview]')];
  if (!links.length) return;

  let preview;
  let active;
  let frame = 0;
  let previousTime = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let vx = 0;
  let vy = 0;
  const cards = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const allowed = () => desktop.matches && !document.documentElement.classList.contains('experience-open');

  function prepare() {
    if (preview || !desktop.matches) return;
    preview = document.createElement('div');
    preview.className = 'work-preview';
    preview.setAttribute('aria-hidden', 'true');
    for (const link of links) {
      const card = document.createElement('div');
      card.className = 'work-preview-card';
      card.style.setProperty('--preview-tilt', `${Number(link.dataset.previewTilt) || 0}deg`);
      const image = new Image(600, 400);
      image.alt = '';
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.draggable = false;
      image.addEventListener('load', () => {
        if (active === link && allowed()) reveal(link);
      });
      image.addEventListener('error', () => {
        if (active === link) hide();
      });
      image.src = link.dataset.workPreview;
      card.append(image);
      preview.append(card);
      cards.set(link, { card, image });
    }
    document.body.append(preview);
  }

  function reveal(link) {
    const item = cards.get(link);
    if (!item?.image.complete || !item.image.naturalWidth || active !== link || !allowed()) return;
    for (const [entry, { card }] of cards) card.toggleAttribute('data-active', entry === link);
    preview.setAttribute('data-visible', '');
  }

  function paint() {
    const lean = reduced.matches ? 0 : clamp(vx * .006, -2, 2);
    preview.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${lean.toFixed(2)}deg)`;
  }

  function follow(time) {
    frame = 0;
    if (!active) return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .032) : 1 / 60;
    previousTime = time;
    vx += (340 * (targetX - x) - 30 * vx) * dt;
    vy += (340 * (targetY - y) - 30 * vy) * dt;
    x += vx * dt;
    y += vy * dt;
    if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(vx) + Math.abs(vy) < .15) {
      x = targetX;
      y = targetY;
      vx = vy = previousTime = 0;
      paint();
      return;
    }
    paint();
    frame = requestAnimationFrame(follow);
  }

  function place(event, entering) {
    const width = preview.offsetWidth;
    const height = preview.offsetHeight;
    const margin = 24; // Includes room for the tilted corners.
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = innerHeight;
    let left;
    let top;
    if (reduced.matches) {
      const bounds = active.getBoundingClientRect();
      left = bounds.right - width + 12;
      top = bounds.top - height - 24;
      if (top < margin) top = bounds.bottom + 24;
    } else {
      left = event.clientX + 28;
      if (left + width > viewportWidth - margin) left = event.clientX - width - 28;
      top = event.clientY - height - 24;
      if (top < margin) top = event.clientY + 28;
    }
    targetX = clamp(left, margin, viewportWidth - width - margin);
    targetY = clamp(top, margin, viewportHeight - height - margin);
    if (entering || reduced.matches) {
      cancelAnimationFrame(frame);
      frame = previousTime = vx = vy = 0;
      x = targetX;
      y = targetY;
      paint();
    } else if (!frame) frame = requestAnimationFrame(follow);
  }

  function show(link, event) {
    prepare();
    if (!preview) return;
    const entering = !preview.hasAttribute('data-visible');
    active = link;
    place(event, entering);
    reveal(link);
  }

  function hide() {
    active = undefined;
    preview?.removeAttribute('data-visible');
    cancelAnimationFrame(frame);
    frame = previousTime = vx = vy = 0;
  }

  list.addEventListener('pointermove', event => {
    if (!allowed() || event.pointerType !== 'mouse') return;
    const entry = event.target.closest('.entry');
    if (entry && !entry.hasAttribute('data-work-preview')) return hide();
    if (entry && entry !== active) show(entry, event);
    else if (active && !reduced.matches) place(event, false);
  });
  list.addEventListener('pointerover', event => {
    if (!allowed() || event.pointerType !== 'mouse') return;
    const entry = event.target.closest('.entry');
    if (entry?.hasAttribute('data-work-preview')) show(entry, event);
    else if (entry) hide();
  });
  list.addEventListener('pointerleave', hide);
  list.addEventListener('pointercancel', hide);
  list.addEventListener('click', hide);
  document.addEventListener('experience:toggle', hide);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Tab') hide();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  window.addEventListener('blur', hide);
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide, { passive: true });
  desktop.addEventListener('change', () => { hide(); prepare(); });
  reduced.addEventListener('change', hide);
  prepare();
})();
