(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LEAVE_DURATION = 180;

  document.body.classList.add('is-ready');

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.remove('is-leaving');
      document.body.classList.add('is-ready');
    }
  });

  document.addEventListener('click', function (e) {
    if (prefersReducedMotion || e.defaultPrevented || e.button !== 0) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    var link = e.target.closest('a[href]');
    if (!link) {
      return;
    }

    if (link.target && link.target !== '' && link.target !== '_self') {
      return;
    }
    if (link.hasAttribute('download')) {
      return;
    }

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return;
    }

    if (url.origin !== window.location.origin) {
      return;
    }

    var isSamePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (isSamePage) {
      return;
    }

    e.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(function () {
      window.location.href = link.href;
    }, LEAVE_DURATION);
  });

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

    window.setTimeout(function () {
      revealEls.forEach(function (el) {
        el.classList.add('is-visible');
      });
      revealObserver.disconnect();
    }, 2000);
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  var applyHubCardStatus = function (root) {
    var hubCards = (root || document).querySelectorAll('.hub-card[href]');
    if (!hubCards.length) {
      return;
    }

    var STATUS_PREFIX = 'tb:lesson-status:';
    var normalizeStatusPath = function (pathname) {
      return pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    };

    hubCards.forEach(function (card) {
      if (card.querySelector('.hub-card__status')) {
        return;
      }

      var url;
      try {
        url = new URL(card.getAttribute('href'), window.location.href);
      } catch (e) {
        return;
      }
      if (url.origin !== window.location.origin) {
        return;
      }

      var status;
      try {
        status = window.localStorage.getItem(STATUS_PREFIX + normalizeStatusPath(url.pathname));
      } catch (e) {
        status = null;
      }
      if (status !== 'in-progress' && status !== 'complete') {
        return;
      }

      var cta = card.querySelector('.hub-card__cta');
      if (!cta) {
        return;
      }

      var ctaTextNode = Array.prototype.filter.call(cta.childNodes, function (n) {
        return n.nodeType === Node.TEXT_NODE && (n.textContent.trim() === 'Start lesson' || n.textContent.trim() === 'Start quiz');
      })[0];
      if (ctaTextNode) {
        var noun = ctaTextNode.textContent.trim() === 'Start quiz' ? 'quiz' : 'lesson';
        var ctaLabel = status === 'complete' ? 'Review ' + noun : 'Continue ' + noun;
        ctaTextNode.textContent = ctaTextNode.textContent.replace('Start ' + noun, ctaLabel);
      }

      var badge = document.createElement('span');
      badge.className = 'hub-card__status hub-card__status--' + status;
      badge.textContent = status === 'complete' ? 'Completed' : 'In Progress';
      card.appendChild(badge);
    });
  };

  applyHubCardStatus(document);

  window.TB = window.TB || {};
  window.TB.applyHubCardStatus = applyHubCardStatus;

  var bag = document.querySelector('.hero__bag');
  var heroContent = document.querySelector('.hero__content');
  var tetherTargets = document.querySelectorAll('[data-tether-target]');

  if (bag && heroContent && tetherTargets.length && !prefersReducedMotion) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var tetherSvg = document.createElementNS(svgNS, 'svg');
    tetherSvg.setAttribute('class', 'tether-layer');
    tetherSvg.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tetherSvg);

    var tethers = Array.prototype.map.call(tetherTargets, function (target) {
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('class', 'tether-line');
      var pulse = document.createElementNS(svgNS, 'circle');
      pulse.setAttribute('class', 'tether-pulse');
      pulse.setAttribute('r', 3.5);
      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'tether-dot');
      dot.setAttribute('r', 3.5);
      dot.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'opacity' && dot.style.opacity === '1') {
          pulse.classList.add('is-pulsing');
        }
      });
      tetherSvg.appendChild(path);
      tetherSvg.appendChild(pulse);
      tetherSvg.appendChild(dot);
      return { target: target, path: path, dot: dot, pulse: pulse, length: 0 };
    });

    var curvePath = function (x1, y1, x2, y2) {
      var dy = y1 - y2;
      var c1y = y1 - dy * 0.5;
      var c2y = y2 + dy * 0.5;
      return 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + c1y + ', ' + x2 + ' ' + c2y + ', ' + x2 + ' ' + y2;
    };

    var positionTethers = function () {
      var bagRect = bag.getBoundingClientRect();
      var startX = bagRect.left + bagRect.width * 0.5;
      var startY = bagRect.top + bagRect.height * 0.18;

      tethers.forEach(function (t) {
        var r = t.target.getBoundingClientRect();
        var endX = r.left + r.width * 0.5;
        var endY = r.bottom + 8;
        t.path.setAttribute('d', curvePath(startX, startY, endX, endY));
        t.dot.setAttribute('cx', endX);
        t.dot.setAttribute('cy', endY);
        t.pulse.setAttribute('cx', endX);
        t.pulse.setAttribute('cy', endY);
        t.length = t.path.getTotalLength();
        t.path.style.strokeDasharray = t.length;
        if (!tetherSvg.classList.contains('is-active')) {
          t.path.style.strokeDashoffset = t.length;
        }
      });
    };

    var tetherActive = false;
    var pointerActive = false;

    var showTethers = function () {
      positionTethers();
      tetherActive = true;
      tetherSvg.classList.add('is-active');
      heroContent.classList.add('is-tethering');
      tethers.forEach(function (t, i) {
        t.path.style.strokeDashoffset = t.length;
        t.path.style.transitionDelay = (i * 60) + 'ms';
        t.dot.style.transitionDelay = (i * 60 + 260) + 'ms';
        requestAnimationFrame(function () {
          t.path.style.strokeDashoffset = '0';
          t.dot.style.opacity = '1';
        });
      });
    };

    var hideTethers = function () {
      tetherActive = false;
      tetherSvg.classList.remove('is-active');
      heroContent.classList.remove('is-tethering');
      tethers.forEach(function (t, i) {
        t.path.style.transitionDelay = (i * 40) + 'ms';
        t.dot.style.transitionDelay = '0ms';
        t.path.style.strokeDashoffset = t.length;
        t.pulse.classList.remove('is-pulsing');
        t.dot.style.opacity = '0';
      });
    };

    bag.addEventListener('mouseenter', function () {
      pointerActive = true;
      showTethers();
    });
    bag.addEventListener('mouseleave', function () {
      pointerActive = false;
      hideTethers();
    });
    bag.addEventListener('focus', function () {
      pointerActive = true;
      showTethers();
    });
    bag.addEventListener('blur', function () {
      pointerActive = false;
      hideTethers();
    });

    var tetherResizeRaf = null;
    window.addEventListener('resize', function () {
      if (tetherResizeRaf) {
        return;
      }
      tetherResizeRaf = requestAnimationFrame(function () {
        tetherResizeRaf = null;
        if (tetherActive) {
          positionTethers();
        }
      });
    });

    positionTethers();

    window.setTimeout(function () {
      if (pointerActive) {
        return;
      }
      showTethers();
      window.setTimeout(function () {
        if (!pointerActive) {
          hideTethers();
        }
      }, 2200);
    }, 700);
  }
})();
