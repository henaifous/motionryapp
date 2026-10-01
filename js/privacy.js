/* ==========================================================================
   Motionry — privacy page: highlight the section in view in the table of contents
   ========================================================================== */

const links = [...document.querySelectorAll('.policy-toc a')];
const sections = links.map((link) => document.querySelector(link.getAttribute('href')));

function setActive(id) {
  links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-100px 0px -60% 0px' });

  sections.forEach((section) => observer.observe(section));
}
