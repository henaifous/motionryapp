/* ==========================================================================
   Motionry — shared behaviour for every page except the home page:
   mobile menu, table of contents highlight, coloured strip above the download band
   ========================================================================== */

(() => {
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.getElementById('nav-links');

  if (toggle && menu) {
    const close = () => { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // Table of contents: highlight the section in view
  const links = [...document.querySelectorAll('.policy-toc a')];
  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const setActive = (id) => links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-100px 0px -60% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  // The coloured zone strip above the download band draws in once the page is ready
  document.querySelectorAll('.download').forEach((el) => el.classList.add('is-seen'));
})();
