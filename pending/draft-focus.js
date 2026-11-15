/* Draft pages that change an existing page: open at the first new or changed part.
   Mark each new or changed block with data-new (the yellow highlight). Shared by every site's
   /pending drafts; master copy in ~/jarvis/sitejobs/review-ui on the GX10 (install.py copies it).
   Skipped when the link already has a #section. */
(function () {
  if (location.hash) return;
  function go() {
    var el = document.querySelector('[data-new]');
    if (!el) return;
    // A folded FAQ item: open its answer so the reviewer can read it.
    var toggle = el.querySelector('.faq-toggle, summary');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true' && !(el.tagName === 'DETAILS' && el.open)) toggle.click();
    // Scroll this page only (scrollIntoView would also scroll the admin page around the preview).
    var top = el.getBoundingClientRect().top + window.pageYOffset - window.innerHeight / 4;
    window.scrollTo(0, Math.max(0, top));
  }
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go);
})();
