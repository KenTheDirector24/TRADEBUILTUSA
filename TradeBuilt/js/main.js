(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var footer = document.querySelector('.site-footer__legal');

  if (footer) {
    var syncFooterHeight = function () {
      document.documentElement.style.setProperty('--footer-height', footer.offsetHeight + 'px');
    };

    if ('ResizeObserver' in window) {
      new ResizeObserver(syncFooterHeight).observe(footer);
    } else {
      window.addEventListener('resize', syncFooterHeight);
    }
    syncFooterHeight();
  }

  var header = document.getElementById('site-header');
  var sentinel = document.getElementById('nav-sentinel');

  if (header && sentinel && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        header.classList.toggle('is-scrolled', !entry.isIntersecting);
      });
    });
    navObserver.observe(sentinel);
  }

  var revealEls = document.querySelectorAll('[data-reveal]');

  if (revealEls.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    var staggerCounts = new Map();
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var i = staggerCounts.get(parent) || 0;
      el.style.setProperty('--i', i);
      staggerCounts.set(parent, i + 1);
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();
