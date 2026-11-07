(() => {
  const nav = document.createElement('nav');
  nav.className = 'site-menu contact-button';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = `<button class="site-menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="site-menu-links"><span class="site-menu-icon" aria-hidden="true"><i></i><i></i></span></button><div class="site-menu-links" id="site-menu-links" inert><a href="/">Home</a><a href="/about">About</a><div class="site-menu-divider"></div><a href="https://www.linkedin.com/in/axelwyart/" target="_blank" rel="me noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a><a href="https://www.instagram.com/axelwyart/" target="_blank" rel="me noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a><a href="https://twitter.com/AxelWyart" target="_blank" rel="me noopener noreferrer">X <span aria-hidden="true">↗</span></a></div>`;
  document.body.append(nav);
  document.body.classList.add('has-site-menu');
  const toggle = nav.querySelector('button');
  const links = nav.querySelector('.site-menu-links');
  function setOpen(open, restoreFocus = false) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    links.inert = !open;
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('pointerdown', event => {
    if (!nav.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      event.preventDefault(); setOpen(false, true);
    }
  });
  nav.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!nav.contains(document.activeElement)) setOpen(false); });
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
})();
