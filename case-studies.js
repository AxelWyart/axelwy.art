(() => {
  // Real links remain the baseline for unsupported browsers and file:// previews.
  if (!/^https?:$/.test(location.protocol) ||
      typeof HTMLDialogElement === 'undefined' ||
      typeof HTMLDialogElement.prototype.showModal !== 'function' ||
      !window.fetch || !window.AbortController || !history.pushState) return;

  const links = [...document.querySelectorAll('#works-scroller a[data-case-study]')];
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
  dialog.className = 'case-sheet';
  dialog.setAttribute('aria-labelledby', 'case-study-title');
  dialog.innerHTML = `
    <div class="case-sheet-toolbar">
      <button type="button" class="case-sheet-handle" aria-label="Drag down or activate to close case study"><span aria-hidden="true"></span></button>
      <a class="case-text-link" data-full-page>Open full page <span aria-hidden="true">↗</span></a>
      <button type="button" class="case-close" aria-label="Close case study">Close <span aria-hidden="true">×</span></button>
    </div>
    <div class="case-sheet-content"></div>`;
  const content = dialog.querySelector('.case-sheet-content');
  const fullPage = dialog.querySelector('[data-full-page]');
  const handle = dialog.querySelector('.case-sheet-handle');
  const status = document.createElement('p');
  status.className = 'case-navigation-status';
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
    document.body.style.setProperty('--case-scroll-offset', `-${savedScroll.y}px`);
    document.documentElement.classList.add('case-study-open');
    document.dispatchEvent(new Event('case-study:toggle'));
  }

  function unlockPage() {
    document.documentElement.classList.remove('case-study-open');
    document.body.style.removeProperty('--case-scroll-offset');
    if (savedScroll) window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
    history.scrollRestoration = previousScrollRestoration || 'auto';
    document.dispatchEvent(new Event('case-study:toggle'));
  }

  async function hideSheet() {
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
        const timeout = setTimeout(finish, 320);
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
    cancelPending();
    if (closingRequested) return;
    closingRequested = true;
    if (history.state?.__caseStudySheet?.owner === owner) {
      // Only go back across an entry created by this document. A standalone
      // case study uses a real “Back to selected work” link instead.
      history.back();
    } else {
      hideSheet();
    }
  }

  function importArticle(page, url) {
    const source = page.querySelector('[data-case-study-content]');
    if (!source?.querySelector('#case-study-title')) throw new Error('Missing case-study content.');
    const article = document.importNode(source, true);
    // The article is shared with the standalone page, whose assets and links
    // are relative to that page. Resolve them before inserting into the home.
    article.querySelectorAll('[href], [src], [srcset], [poster]').forEach((element) => {
      for (const attr of ['href', 'src', 'poster']) {
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

  async function openCase(url, mode, trigger) {
    cancelPending();
    const request = requestID;
    const abort = new AbortController();
    controller = abort;
    busyLink = trigger;
    busyLink?.setAttribute('aria-busy', 'true');
    status.textContent = 'Opening case study…';
    // A failed or stalled enhancement falls back to ordinary page navigation.
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html') ||
          new URL(response.url).origin !== location.origin) throw new Error('Could not load case study.');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (request !== requestID) return;
      const article = importArticle(page, response.url);
      finishHandleDrag();
      ++presentationID;
      cancelAnimationFrame(openingFrame);
      closingRequested = false;
      if (!dialog.open) {
        originTrigger = trigger || links.find((link) => link.href === history.state?.__caseStudySheet?.triggerURL);
        lockPage();
      }
      content.replaceChildren(article);
      fullPage.href = url;
      updateMetadata(page);
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      article.querySelector('#case-study-title').focus({ preventScroll: true });
      // Flush the starting position so the bottom-origin transition also works
      // on browsers that do not support @starting-style for native dialogs.
      dialog.getBoundingClientRect();
      openingFrame = requestAnimationFrame(() => dialog.classList.add('is-visible'));
      if (mode !== 'history') {
        const state = {
          ...history.state,
          __caseStudySheet: { owner, url, triggerURL: originTrigger?.href },
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

  // Bubble after the carousel's handlers, so a drag never opens a case study.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-case-study]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') || !allowedURLs.has(link.href)) return;
    event.preventDefault();
    openCase(link.href, dialog.open ? 'replace' : 'push', link);
  });

  dialog.querySelector('.case-close').addEventListener('click', requestClose);
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
    // Give upward movement a little resistance instead of a hard stop.
    const distance = handleDrag.distance < 0
      ? -Math.min(24, Math.sqrt(-handleDrag.distance) * 2)
      : handleDrag.distance;
    dialog.style.transform = `translateY(${handleDrag.startOffset + distance}px)`;
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
  window.addEventListener('blur', () => finishHandleDrag());
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
    if (event.shiftKey && (active === first || active === dialog || active?.id === 'case-study-title')) {
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
  window.addEventListener('popstate', (event) => {
    cancelPending();
    closingRequested = false;
    const sheet = event.state?.__caseStudySheet;
    if (sheet?.owner === owner && sheet.url === location.href && allowedURLs.has(sheet.url)) {
      openCase(sheet.url, 'history');
    } else if (location.pathname === new URL(homeURL).pathname) {
      hideSheet();
    } else {
      // An unowned URL must be served as its actual document.
      location.reload();
    }
  });
})();
