const scroller = document.getElementById('works-scroller');

if (scroller) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const idleDelay = 3000;
  const speed = 18; // Pixels per second, independent of display refresh rate.
  const activePointers = new Set();
  let resumeAt = 0;
  let frame;
  let previousTime;
  let position = scroller.scrollLeft;
  let hovering = false;
  let visible = false;

  function pauseAutoScroll() {
    resumeAt = performance.now() + idleDelay;
    position = scroller.scrollLeft;
    previousTime = undefined;
  }

  function animateIdle(time) {
    frame = undefined;
    if (document.hidden || reducedMotion.matches || !visible) return;

    const focused = scroller.matches(':focus-visible') ||
      (scroller.contains(document.activeElement) && document.activeElement !== scroller);
    if (activePointers.size || hovering || focused || time < resumeAt) {
      previousTime = undefined;
      position = scroller.scrollLeft;
    } else {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50);
      const max = scroller.scrollWidth - scroller.clientWidth;
      previousTime = time;
      if (max > 0 && elapsed > 0) {
        // Accumulate fractional pixels so slow movement also works in browsers
        // that round scroll positions. Instant scrolling avoids CSS smoothing.
        position += speed * elapsed / 1000;
        if (position >= max) position = 0;
        scroller.scrollTo({ left: position, behavior: 'instant' });
      }
    }
    frame = requestAnimationFrame(animateIdle);
  }

  function updateAutoScroll() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    previousTime = undefined;
    position = scroller.scrollLeft;
    if (!document.hidden && !reducedMotion.matches && visible) {
      frame = requestAnimationFrame(animateIdle);
    }
  }

  scroller.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') hovering = true;
    pauseAutoScroll();
  });
  scroller.addEventListener('pointerleave', () => {
    hovering = false;
    pauseAutoScroll();
  });
  scroller.addEventListener('pointerdown', (event) => {
    activePointers.add(event.pointerId);
    pauseAutoScroll();
  }, { passive: true });
  for (const type of ['pointerup', 'pointercancel']) {
    window.addEventListener(type, (event) => {
      if (activePointers.delete(event.pointerId)) pauseAutoScroll();
    }, { passive: true });
  }
  for (const type of ['wheel', 'keydown', 'focusin', 'focusout']) {
    scroller.addEventListener(type, pauseAutoScroll, { passive: true });
  }
  scroller.addEventListener('scroll', () => {
    // Include native touch / Blossom momentum in the user's interaction.
    if (performance.now() < resumeAt) pauseAutoScroll();
  }, { passive: true });
  window.addEventListener('blur', () => {
    activePointers.clear();
    hovering = false;
    pauseAutoScroll();
  });
  document.addEventListener('visibilitychange', () => {
    pauseAutoScroll();
    updateAutoScroll();
  });
  reducedMotion.addEventListener('change', updateAutoScroll);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateAutoScroll();
  }).observe(scroller);

  // Keep keyboard navigation available even when the drag enhancement is not loaded.
  scroller.addEventListener('keydown', (event) => {
    if (event.target !== scroller || event.altKey || event.ctrlKey || event.metaKey) return;

    const step = Math.max(240, scroller.clientWidth * 0.75);
    const behavior = reducedMotion.matches ? 'instant' : 'smooth';

    switch (event.key) {
      case 'ArrowRight':
        scroller.scrollBy({ left: step, behavior });
        break;
      case 'ArrowLeft':
        scroller.scrollBy({ left: -step, behavior });
        break;
      case 'Home':
        scroller.scrollTo({ left: 0, behavior });
        break;
      case 'End':
        scroller.scrollTo({ left: scroller.scrollWidth, behavior });
        break;
      default:
        return;
    }

    event.preventDefault();
  });

  scroller.querySelectorAll('img').forEach((image) => {
    image.draggable = false;
  });
  // Cancel native image/link ghost dragging without blocking pointer events.
  scroller.addEventListener('dragstart', (event) => event.preventDefault());

  // Touch devices keep their native scrolling and momentum.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let carousel;
  let loading = false;

  async function enableDragging() {
    if (!finePointer.matches || carousel || loading) return;
    loading = true;

    try {
      // A classic script also works in direct file previews, unlike module imports.
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'vendor/blossom-carousel/blossom-carousel-core.umd.js';
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('Could not load Blossom Carousel.'));
        };
        document.head.append(script);
      });
      carousel = window.BlossomCarousel.Blossom(scroller);
      carousel.init();
    } catch (error) {
      // The native scroll container and keyboard controls remain usable.
      console.warn('Could not enable carousel dragging.', error);
    } finally {
      loading = false;
    }
  }

  finePointer.addEventListener('change', enableDragging);
  enableDragging();
}
