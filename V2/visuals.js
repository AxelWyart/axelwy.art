(() => {
  if (!window.HTMLDialogElement?.prototype.showModal) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'visual-lightbox';
  dialog.setAttribute('aria-label', 'Image preview');
  dialog.innerHTML = '<div class="visual-lightbox__viewport"><img class="visual-lightbox__image" alt=""></div>';
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  const viewport = image.parentElement;
  let origin;
  let backdropPress;
  let motion;
  let closing = false;

  function transformTo(from, to) {
    return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
  }

  function close() {
    if (!dialog.open || closing) return;
    const thumbnail = origin?.querySelector('img');
    if (!thumbnail?.isConnected || !image.offsetWidth || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }
    closing = true;
    const current = getComputedStyle(image).transform;
    motion?.cancel();
    const target = transformTo(image.getBoundingClientRect(), thumbnail.getBoundingClientRect());
    dialog.classList.add('is-closing');
    motion = image.animate([{ transform: current }, { transform: target }], {
      duration: 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards',
    });
    motion.onfinish = () => dialog.close();
  }

  document.addEventListener('click', event => {
    const thumbnail = event.target.closest?.('button.visual-trigger')?.querySelector('img');
    if (!thumbnail || dialog.open) return;

    origin = thumbnail.closest('button');
    const start = thumbnail.getBoundingClientRect();
    image.alt = thumbnail.alt;
    image.src = thumbnail.currentSrc || thumbnail.src;
    dialog.showModal();
    document.documentElement.classList.add('visual-open');

    const end = image.getBoundingClientRect();
    if (end.width && end.height && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      motion = image.animate([
        { transform: transformTo(end, start), easing: 'cubic-bezier(.22,1,.36,1)' },
        { transform: `translate(${-end.width * .006}px, ${-end.height * .006}px) scale(1.012)`, offset: .75, easing: 'ease-in-out' },
        { transform: 'translate(0, 0) scale(1)' },
      ], { duration: 360 });
    }

    if (thumbnail.dataset.fullSrc) {
      const full = new Image();
      full.src = new URL(thumbnail.dataset.fullSrc, thumbnail.baseURI).href;
      full.decode().then(() => {
        if (dialog.open && !closing && origin?.contains(thumbnail)) image.src = full.src;
      }).catch(() => {});
    }
  });

  const outside = target => target === dialog || target === viewport;
  dialog.addEventListener('pointerdown', event => { backdropPress = outside(event.target); });
  dialog.addEventListener('click', event => {
    if (backdropPress && outside(event.target)) close();
    backdropPress = false;
  });
  window.addEventListener('keydown', event => {
    if (!dialog.open || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);
  dialog.addEventListener('close', () => {
    motion?.cancel();
    closing = false;
    dialog.classList.remove('is-closing');
    document.documentElement.classList.remove('visual-open');
    image.removeAttribute('src');
    if (origin?.isConnected) origin.focus({ preventScroll: true });
    origin = undefined;
  });
  window.addEventListener('popstate', () => { if (dialog.open) dialog.close(); });
})();
