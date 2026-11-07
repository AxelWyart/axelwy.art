(() => {
  const nav = document.createElement('nav');
  nav.className = 'site-menu contact-button';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = `<button class="site-menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu-links"><span class="site-menu-icon" aria-hidden="true"><i></i><i></i></span><span>Menu</span></button><div class="site-menu-links" id="site-menu-links" inert><a href="/">Home</a><a href="/#work-heading">Work</a><a href="/about">About</a><div class="site-menu-divider"></div><a href="mailto:hey@axelwy.art">Email me <span aria-hidden="true">↗</span></a><a href="https://calendar.notion.so/meet/axel-2f1t285t/design" target="_blank" rel="noopener noreferrer">Take a call <span aria-hidden="true">↗</span></a></div>`;
  document.body.append(nav);
  document.body.classList.add('has-site-menu');
  const toggle = nav.querySelector('button');
  const links = nav.querySelector('.site-menu-links');
  function setOpen(open, restoreFocus = false) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
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
