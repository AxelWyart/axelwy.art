(() => {
  // Real links remain the baseline for unsupported browsers and file:// previews.
  if (!/^https?:$/.test(location.protocol) ||
      typeof HTMLDialogElement === 'undefined' ||
      typeof HTMLDialogElement.prototype.showModal !== 'function' ||
      !window.fetch || !window.AbortController || !history.pushState) return;

  const links = [...document.querySelectorAll('[aria-labelledby="work-heading"] a[data-experience]')];
  if (!links.length) return;

  const homeURL = location.href;
  const allowedURLs = new Set(links.map((link) => link.href));
  const owner = `${Date.now()}-${Math.random()}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const metadataSelectors = [
    'title', 'meta[name="description"]', 'link[rel="canonical"]',
    'meta[property="og:title"]', 'meta[property="og:description"]',
    'meta[property="og:url"]', 'meta[property="og:image"]',
    'meta[property="og:image:width"]', 'meta[property="og:image:height"]',
    'meta[property="og:image:alt"]', 'meta[name="twitter:title"]',
    'meta[name="twitter:description"]', 'meta[name="twitter:image"]',
    'meta[name="twitter:image:alt"]', 'script[type="application/ld+json"]',
  ];
  const homeMetadata = metadataSelectors.map((selector) => ({
    selector,
    node: document.head.querySelector(selector)?.cloneNode(true),
  }));

  // pushState changes the base URL too. Pin it so the homepage's lazy images,
  // stylesheets and carousel scripts still resolve from the original document.
  if (!document.querySelector('base')) {
    const base = document.createElement('base');
    base.href = document.baseURI;
    document.head.prepend(base);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'experience-dialog';
  dialog.setAttribute('aria-labelledby', 'experience-title');
  dialog.innerHTML = `
    <div class="experience-toolbar">
      <button type="button" class="experience-handle" aria-label="Drag down or activate to close experience"><span aria-hidden="true"></span></button>
      <button type="button" class="experience-close" aria-label="Close experience"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="experience-content"></div>`;
  const content = dialog.querySelector('.experience-content');
  const handle = dialog.querySelector('.experience-handle');
  const status = document.createElement('p');
  status.className = 'experience-navigation-status';
  status.setAttribute('role', 'status');
  document.body.append(dialog, status);
  links.forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));

  let controller;
  let busyLink;
  let requestID = 0;
  let presentationID = 0;
  let openingFrame;
  let originTrigger;
  let savedScroll;
  let previousScrollRestoration;
  let closingRequested = false;
  let handleDrag;
  let suppressHandleClick = false;
  let scrollDismissDistance = 0;
  let scrollDismissEvents = 0;
  let scrollDismissStartedAt = 0;
  let lastOverscrollAt = 0;
  let scrollDismissReadyAt = Infinity;
  let scrollDismissResetTimer;
  let previousScrollTop = 0;
  let touchPull;

  function resetScrollDismiss() {
    clearTimeout(scrollDismissResetTimer);
    scrollDismissDistance = 0;
    scrollDismissEvents = 0;
    scrollDismissStartedAt = 0;
    lastOverscrollAt = 0;
    dialog.classList.remove('is-scroll-dismiss-armed');
  }

  function scrollBelongsToContent(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
    // Let an embedded scroll area finish its own upward scrolling first.
    for (let element = target; element && element !== dialog; element = element.parentElement) {
      if (element.scrollTop > 1 && element.scrollHeight > element.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowY)) return true;
    }
    return false;
  }

  function finishHandleDrag(dismiss = false) {
    if (!handleDrag) return;
    const { pointerID, moved } = handleDrag;
    handleDrag = undefined;
    suppressHandleClick = moved;
    if (handle.hasPointerCapture(pointerID)) handle.releasePointerCapture(pointerID);
    // Commit the last pointer position before restoring the CSS transition.
    // It can then settle back or continue down from exactly that position.
    dialog.getBoundingClientRect();
    dialog.classList.remove('is-dragging');
    if (dismiss) dialog.classList.remove('is-visible');
    dialog.style.removeProperty('transform');
    if (dismiss) requestClose();
  }

  function cancelPending() {
    requestID++;
    controller?.abort();
    controller = undefined;
    busyLink?.removeAttribute('aria-busy');
    busyLink = undefined;
    status.textContent = '';
  }

  function updateMetadata(source) {
    for (const { selector, node } of homeMetadata) {
      const next = source ? source.head.querySelector(selector) : node;
      const current = document.head.querySelector(selector);
      if (next) {
        const clone = document.importNode(next, true);
        if (current) current.replaceWith(clone);
        else document.head.append(clone);
      } else current?.remove();
    }
  }

  function lockPage() {
    savedScroll = { x: scrollX, y: scrollY };
    previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    document.body.style.setProperty('--experience-scroll-offset', `-${savedScroll.y}px`);
    document.documentElement.classList.add('experience-open');
    document.dispatchEvent(new Event('experience:toggle'));
  }

  function unlockPage() {
    document.documentElement.classList.remove('experience-open');
    document.body.style.removeProperty('--experience-scroll-offset');
    if (savedScroll) window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
    history.scrollRestoration = previousScrollRestoration || 'auto';
    document.dispatchEvent(new Event('experience:toggle'));
  }

  async function hideSheet() {
    resetScrollDismiss();
    touchPull = undefined;
    finishHandleDrag();
    const presentation = ++presentationID;
    cancelAnimationFrame(openingFrame);
    dialog.classList.remove('is-visible');
    if (dialog.open && !reducedMotion.matches) {
      await new Promise((resolve) => {
        const finish = (event) => {
          if (event && (event.target !== dialog || event.propertyName !== 'transform')) return;
          dialog.removeEventListener('transitionend', finish);
          clearTimeout(timeout);
          resolve();
        };
        const timeout = setTimeout(finish, 560);
        dialog.addEventListener('transitionend', finish);
      });
    }
    // Forward can reopen the sheet while its exit transition is still running.
    if (presentation !== presentationID) return;
    if (dialog.open) {
      dialog.close();
      unlockPage();
      originTrigger?.focus({ preventScroll: true });
    }
    updateMetadata();
    content.replaceChildren();
    closingRequested = false;
  }

  function requestClose() {
    resetScrollDismiss();
    touchPull = undefined;
    cancelPending();
    if (closingRequested) return;
    closingRequested = true;
    if (history.state?.__experienceSheet?.owner === owner) {
      // Only go back across an entry created by this document. A standalone
      // experience uses a real “Back to selected work” link instead.
      history.back();
    } else {
      hideSheet();
    }
  }

  function importArticle(page, url) {
    const source = page.querySelector('[data-experience-content]');
    if (!source?.querySelector('#experience-title')) throw new Error('Missing experience content.');
    const article = document.importNode(source, true);
    // Keep imported SVG definitions distinct from the company icons on the home.
    article.querySelectorAll('svg').forEach(svg => {
      const ids = Array.from(svg.querySelectorAll('[id]'), node => node.id);
      svg.querySelectorAll('*').forEach(node => {
        Array.from(node.attributes).forEach(attribute => {
          let value = attribute.value;
          ids.forEach(id => { value = value.replaceAll(`#${id}`, `#sheet-${id}`); });
          if (attribute.name === 'id') value = `sheet-${attribute.value}`;
          node.setAttribute(attribute.name, value);
        });
      });
    });
    // The article is shared with the standalone page, whose assets and links
    // are relative to that page. Resolve them before inserting into the home.
    article.querySelectorAll('[href], [src], [srcset], [poster], [data-full-src]').forEach((element) => {
      for (const attr of ['href', 'src', 'poster', 'data-full-src']) {
        if (element.hasAttribute(attr)) element.setAttribute(attr, new URL(element.getAttribute(attr), url).href);
      }
      if (element.hasAttribute('srcset')) {
        element.setAttribute('srcset', element.getAttribute('srcset').split(',').map((candidate) => {
          const [path, ...descriptor] = candidate.trim().split(/\s+/);
          return [new URL(path, url).href, ...descriptor].join(' ');
        }).join(', '));
      }
    });
    // Scripts belong to the full page, never to the fetched article fragment.
    article.querySelectorAll('script').forEach((script) => script.remove());
    return article;
  }

  async function openExperience(url, mode, trigger) {
    cancelPending();
    const request = requestID;
    const abort = new AbortController();
    controller = abort;
    busyLink = trigger;
    busyLink?.setAttribute('aria-busy', 'true');
    status.textContent = 'Opening experience…';
    // A failed or stalled enhancement falls back to ordinary page navigation.
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html') ||
          new URL(response.url).origin !== location.origin) throw new Error('Could not load experience.');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (request !== requestID) return;
      const article = importArticle(page, response.url);
      finishHandleDrag();
      ++presentationID;
      cancelAnimationFrame(openingFrame);
      closingRequested = false;
      if (contactPanel.matches(':popover-open')) contactPanel.hidePopover();
      hideWorkHighlight();
      if (!dialog.open) {
        originTrigger = trigger || links.find((link) => link.href === history.state?.__experienceSheet?.triggerURL);
        lockPage();
      }
      content.replaceChildren(article);
      updateMetadata(page);
      if (!dialog.open) dialog.showModal();
      resetScrollDismiss();
      touchPull = undefined;
      previousScrollTop = 0;
      dialog.scrollTop = 0;
      scrollDismissReadyAt = performance.now() + 500;
      article.querySelector('#experience-title').focus({ preventScroll: true });
      // Flush the starting position so the bottom-origin transition also works
      // on browsers that do not support @starting-style for native dialogs.
      dialog.getBoundingClientRect();
      openingFrame = requestAnimationFrame(() => dialog.classList.add('is-visible'));
      if (mode !== 'history') {
        const state = {
          ...history.state,
          __experienceSheet: { owner, url, triggerURL: originTrigger?.href },
        };
        if (mode === 'replace') history.replaceState(state, '', url);
        else history.pushState(state, '', url);
      }
    } catch (error) {
      if (request !== requestID) return;
      if (mode === 'history') location.replace(url);
      else location.assign(url);
    } finally {
      clearTimeout(timeout);
      if (request === requestID) {
        busyLink?.removeAttribute('aria-busy');
        busyLink = undefined;
        controller = undefined;
        status.textContent = '';
      }
    }
  }

  // Real work links enhance into sheets; modified clicks still open standalone pages.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-experience]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') || !allowedURLs.has(link.href)) return;
    event.preventDefault();
    openExperience(link.href, dialog.open ? 'replace' : 'push', link);
  });

  dialog.querySelector('.experience-close').addEventListener('click', requestClose);
  handle.addEventListener('click', (event) => {
    // A drag ends with a synthetic pointer click. Keyboard activation (detail
    // zero) and ordinary clicks keep the handle usable as a close button.
    if (suppressHandleClick && event.detail !== 0) {
      suppressHandleClick = false;
      event.preventDefault();
      return;
    }
    suppressHandleClick = false;
    requestClose();
  });
  handle.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || handleDrag || closingRequested ||
        !dialog.open || !dialog.classList.contains('is-visible')) return;
    event.preventDefault();
    resetScrollDismiss();
    touchPull = undefined;
    suppressHandleClick = false;
    const transform = getComputedStyle(dialog).transform;
    const offset = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    handleDrag = {
      pointerID: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      startOffset: offset,
      distance: 0,
      velocity: 0,
      moved: false,
    };
    dialog.classList.add('is-dragging');
    dialog.style.transform = `translateY(${offset}px)`;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (event.pointerId !== handleDrag?.pointerID) return;
    const elapsed = event.timeStamp - handleDrag.lastTime;
    if (elapsed > 0) handleDrag.velocity = (event.clientY - handleDrag.lastY) / elapsed;
    handleDrag.lastY = event.clientY;
    handleDrag.lastTime = event.timeStamp;
    handleDrag.distance = event.clientY - handleDrag.startY;
    handleDrag.moved ||= Math.abs(handleDrag.distance) > 5;
    // Keep the sheet attached to the viewport's bottom edge when pulling up.
    // A negative translation would expose the backdrop underneath its footer.
    const offset = Math.max(0, handleDrag.startOffset + handleDrag.distance);
    dialog.style.transform = `translateY(${offset}px)`;
  });
  handle.addEventListener('pointerup', (event) => {
    if (event.pointerId !== handleDrag?.pointerID) return;
    const { distance, velocity, lastTime } = handleDrag;
    const threshold = Math.min(128, Math.max(72, dialog.clientHeight * .18));
    const flick = distance > 24 && velocity > .55 && event.timeStamp - lastTime < 100;
    finishHandleDrag(distance >= threshold || flick);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    handle.addEventListener(type, (event) => {
      if (event.pointerId === handleDrag?.pointerID) finishHandleDrag();
    });
  }
  window.addEventListener('blur', () => {
    finishHandleDrag();
    resetScrollDismiss();
    touchPull = undefined;
  });
  dialog.addEventListener('scroll', () => {
    const top = Math.max(0, dialog.scrollTop);
    if (top > 1 || previousScrollTop > 1) {
      // Reaching the top while reading is not a dismissal gesture. Give the
      // incoming scroll momentum time to settle before counting extra effort.
      scrollDismissReadyAt = performance.now() + 350;
      resetScrollDismiss();
      touchPull = undefined;
    }
    previousScrollTop = top;
  }, { passive: true });
  dialog.addEventListener('wheel', (event) => {
    if (!dialog.open || closingRequested || handleDrag || event.defaultPrevented ||
        !dialog.classList.contains('is-visible')) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.deltaY >= 0 ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY) || dialog.scrollTop > 1 ||
        scrollBelongsToContent(event.target)) {
      resetScrollDismiss();
      return;
    }
    // Only excess upward scrolling at the top is consumed. The article keeps
    // its normal scrolling in both directions everywhere else.
    event.preventDefault();
    const now = performance.now();
    if (now < scrollDismissReadyAt) return;
    if (now - lastOverscrollAt > 400) resetScrollDismiss();
    if (!scrollDismissEvents) scrollDismissStartedAt = now;
    lastOverscrollAt = now;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dialog.clientHeight : 1;
    scrollDismissDistance += Math.min(120, -event.deltaY * unit);
    scrollDismissEvents++;
    if (scrollDismissDistance >= 80) dialog.classList.add('is-scroll-dismiss-armed');
    clearTimeout(scrollDismissResetTimer);
    scrollDismissResetTimer = setTimeout(resetScrollDismiss, 400);
    if (scrollDismissEvents >= 3 && scrollDismissDistance >= 240 && now - scrollDismissStartedAt >= 120) {
      requestClose();
    }
  }, { passive: false });
  dialog.addEventListener('touchstart', (event) => {
    touchPull = undefined;
    resetScrollDismiss();
    if (event.touches.length !== 1 || !dialog.open || closingRequested || handleDrag ||
        !dialog.classList.contains('is-visible') || dialog.scrollTop > 1 ||
        performance.now() < scrollDismissReadyAt || scrollBelongsToContent(event.target) ||
        (event.target instanceof Element && event.target.closest('.experience-handle, .experience-close'))) return;
    const touch = event.touches[0];
    touchPull = { id: touch.identifier, x: touch.clientX, y: touch.clientY, startedAt: performance.now() };
  }, { passive: true });
  dialog.addEventListener('touchmove', (event) => {
    if (!touchPull) return;
    const touch = event.touches[0];
    if (event.touches.length !== 1 || touch.identifier !== touchPull.id || dialog.scrollTop > 1) {
      touchPull = undefined;
      resetScrollDismiss();
      return;
    }
    const distance = touch.clientY - touchPull.y;
    if (distance < 0 || Math.abs(touch.clientX - touchPull.x) > distance) {
      touchPull = undefined;
      resetScrollDismiss();
      return;
    }
    // A new downward pull that starts at the top is the touch equivalent of
    // insisting on scrolling beyond that boundary. Short pulls stay open.
    if (event.cancelable) event.preventDefault();
    if (distance >= 48) dialog.classList.add('is-scroll-dismiss-armed');
    if (distance >= 140 && performance.now() - touchPull.startedAt >= 120) requestClose();
  }, { passive: false });
  for (const type of ['touchend', 'touchcancel']) {
    dialog.addEventListener(type, () => {
      touchPull = undefined;
      resetScrollDismiss();
    }, { passive: true });
  }
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const stops = [...dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
      .filter((element) => element.tabIndex >= 0 && !element.disabled &&
        !element.closest('[inert]') && element.getClientRects().length);
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog || active?.id === 'experience-title')) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  // Require both press and release on the backdrop. Selecting text and
  // releasing outside the sheet must not accidentally dismiss it.
  const onBackdrop = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom);
  };
  let backdropPress = false;
  dialog.addEventListener('pointerdown', (event) => { backdropPress = onBackdrop(event); });
  dialog.addEventListener('click', (event) => {
    if (backdropPress && onBackdrop(event)) requestClose();
    backdropPress = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && controller && !dialog.open) cancelPending();
  });
  // Keyboard events inside a demo frame do not bubble to the surrounding sheet.
  window.addEventListener('message', (event) => {
    if (!dialog.open || event.origin !== location.origin || event.data?.type !== 'nudge-demo:escape') return;
    const frames = [...dialog.querySelectorAll('iframe[data-experience-demo]')];
    if (frames.some(frame => frame.contentWindow === event.source)) requestClose();
  });
  window.addEventListener('popstate', (event) => {
    cancelPending();
    closingRequested = false;
    const sheet = event.state?.__experienceSheet;
    if (sheet?.owner === owner && sheet.url === location.href && allowedURLs.has(sheet.url)) {
      openExperience(sheet.url, 'history');
    } else if (location.pathname === new URL(homeURL).pathname) {
      hideSheet();
    } else {
      // An unowned URL must be served as its actual document.
      location.reload();
    }
  });
})();
