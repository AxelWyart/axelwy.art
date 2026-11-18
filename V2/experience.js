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
  let displayedURL;
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
    document.documentElement.classList.add('experience-open');
    document.dispatchEvent(new Event('experience:toggle'));
  }

  function unlockPage() {
    document.documentElement.classList.remove('experience-open');
    if (savedScroll) window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
    history.scrollRestoration = previousScrollRestoration || 'auto';
    document.dispatchEvent(new Event('experience:toggle'));
  }

  async function hideSheet() {
    finishHandleDrag();
    const presentation = ++presentationID;
    closingRequested = true;
    dialog.classList.remove('is-visible');
    // A close during entry can reverse a partially completed transition.
    // Wait for the actual slide, including the zero-duration case.
    const slide = dialog.getAnimations().find(animation => animation.transitionProperty === 'transform');
    if (slide) await slide.finished.catch(() => {});
    // Forward can reopen the sheet while its exit transition is still running.
    if (presentation !== presentationID) return;
    if (dialog.open) {
      dialog.close();
      unlockPage();
      originTrigger?.focus({ preventScroll: true });
    }
    updateMetadata();
    content.replaceChildren();
    displayedURL = undefined;
    closingRequested = false;
  }

  function requestClose() {
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
      closingRequested = false;
      hideWorkHighlight();
      if (!dialog.open) {
        originTrigger = trigger || links.find((link) => link.href === history.state?.__experienceSheet?.triggerURL);
        lockPage();
      }
      content.replaceChildren(article);
      updateMetadata(page);
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      scrollGesture = undefined;
      lastWheelAt = -Infinity;
      scrollReadyAt = performance.now() + 600;
      article.querySelector('#experience-title').focus({ preventScroll: true });
      // Flush the starting position so the bottom-origin transition also works
      // on browsers that do not support @starting-style for native dialogs.
      dialog.getBoundingClientRect();
      dialog.classList.add('is-visible');
      displayedURL = url;
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
  window.addEventListener('blur', () => finishHandleDrag());
  let lastWheelAt = -Infinity;
  let scrollGesture;
  let scrollReadyAt = 0;

  function scrollBelongsToContent(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
    for (let element = target; element && element !== dialog; element = element.parentElement) {
      if (element.scrollTop > 1 && element.scrollHeight > element.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowY)) return true;
    }
    return false;
  }

  dialog.addEventListener('scroll', () => {
    scrollGesture = undefined;
  }, { passive: true });
  dialog.addEventListener('wheel', (event) => {
    if (!dialog.open || closingRequested || handleDrag || event.defaultPrevented ||
        !dialog.classList.contains('is-visible')) return;
    const now = performance.now();
    // Eligibility is fixed for the whole wheel burst. Momentum that reaches
    // the top cannot become a close gesture until the user pauses.
    if (now - lastWheelAt > 180) {
      scrollGesture = {
        eligible: dialog.scrollTop <= 1 && now >= scrollReadyAt,
        startedAt: now,
        distance: 0,
        events: 0,
      };
    }
    lastWheelAt = now;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        event.deltaY >= 0 || Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
        dialog.scrollTop > 1 || scrollBelongsToContent(event.target)) {
      scrollGesture = undefined;
      return;
    }
    if (!scrollGesture?.eligible) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dialog.clientHeight : 1;
    scrollGesture.distance += Math.min(120, -event.deltaY * unit);
    scrollGesture.events++;
    if (scrollGesture.events >= 3 && scrollGesture.distance >= 240 &&
        now - scrollGesture.startedAt >= 120) {
      scrollGesture = undefined;
      requestClose();
    }
  }, { passive: false });
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
    const sheet = event.state?.__experienceSheet;
    if (sheet?.owner === owner && sheet.url === location.href && allowedURLs.has(sheet.url)) {
      if (dialog.open && displayedURL === sheet.url) {
        // Forward during exit reverses the same sheet without remounting it.
        ++presentationID;
        closingRequested = false;
        dialog.classList.add('is-visible');
      } else {
        openExperience(sheet.url, 'history');
      }
    } else if (location.pathname === new URL(homeURL).pathname) {
      hideSheet();
    } else {
      // An unowned URL must be served as its actual document.
      location.reload();
    }
  });
})();
