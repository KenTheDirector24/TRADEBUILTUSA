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

    bag.addEventListener('mouseenter', showTethers);
    bag.addEventListener('mouseleave', hideTethers);
    bag.addEventListener('focus', showTethers);
    bag.addEventListener('blur', hideTethers);

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
  }
})();
