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
    var userInteracted = false;
    var tetherHintTimeout = null;
    var tetherHintHideTimeout = null;

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

    var cancelTetherHint = function () {
      userInteracted = true;
      if (tetherHintTimeout) {
        window.clearTimeout(tetherHintTimeout);
        tetherHintTimeout = null;
      }
      if (tetherHintHideTimeout) {
        window.clearTimeout(tetherHintHideTimeout);
        tetherHintHideTimeout = null;
      }
      if (tetherActive && !pointerActive) {
        hideTethers();
      }
    };

    document.addEventListener('pointerdown', function (e) {
      if (e.target !== bag && !bag.contains(e.target)) {
        cancelTetherHint();
      }
    }, true);
    document.addEventListener('keydown', function () {
      cancelTetherHint();
    }, true);

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

    tetherHintTimeout = window.setTimeout(function () {
      tetherHintTimeout = null;
      if (pointerActive || userInteracted) {
        return;
      }
      showTethers();
      tetherHintHideTimeout = window.setTimeout(function () {
        tetherHintHideTimeout = null;
        if (!pointerActive) {
          hideTethers();
        }
      }, 2200);
    }, 700);
  }

  var popWrap = document.querySelector('.hero__bag-wrap');
  var popItems = popWrap ? Array.prototype.slice.call(popWrap.querySelectorAll('.hero__pop-item')) : [];

  if (popWrap && popItems.length) {
    if (prefersReducedMotion) {
      popWrap.classList.add('is-open');
    } else {
      window.setTimeout(function () {
        popWrap.classList.add('is-open');
      }, 500);

      var lastWiggleItem = null;

      var scheduleWiggle = function () {
        var delay = 2500 + Math.random() * 2000;
        window.setTimeout(function () {
          var candidates = popItems.filter(function (el) {
            return el !== lastWiggleItem;
          });
          var item = candidates[Math.floor(Math.random() * candidates.length)];
          lastWiggleItem = item;
          item.classList.remove('is-wiggling');
          void item.offsetWidth;
          item.classList.add('is-wiggling');
          scheduleWiggle();
        }, delay);
      };

      popItems.forEach(function (el) {
        el.addEventListener('animationend', function (e) {
          if (e.animationName === 'hero-pop-wiggle') {
            el.classList.remove('is-wiggling');
          }
        });
      });

      window.setTimeout(scheduleWiggle, 1800);
    }
  }

  // Achievement-unlock celebration. Root-absolute image path since this
  // script runs from multiple directory depths (e.g. quizzes/*.html).
  var ACHIEVEMENT_INFO = {
    recruit: {
      title: 'TradeBuilt Recruit',
      desc: 'Awarded for joining TradeBuilt.',
      img: '/assets/Achievements/TradeBuiltRecruit.webp',
    },
    breakingGround: {
      title: 'Breaking Ground',
      desc: 'Awarded for completing your first lesson.',
      img: '/assets/Achievements/BreakingGround.webp',
    },
  };

  // Builds a jagged polyline (as an SVG "points" string) from (x1,y1) to
  // (x2,y2), nudging interior points sideways so it reads as a lightning
  // bolt rather than a straight line.
  function buildBoltPoints(x1, y1, x2, y2, segments, jitter) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var x = x1 + dx * t;
      var y = y1 + dy * t;
      if (i > 0 && i < segments) {
        var offset = (Math.random() * 2 - 1) * jitter;
        x += nx * offset;
        y += ny * offset;
      }
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    return pts.join(' ');
  }

  function buildLightningFlash() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var cx = w / 2;
    var cy = h * 0.4;
    var edgePoints = [
      [0, h * 0.35],
      [w, h * 0.3],
      [w * 0.5, 0],
      [0, h * 0.8],
      [w, h * 0.75],
    ];
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'achievement-unlock-flash');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    edgePoints.forEach(function (edge, i) {
      var poly = document.createElementNS(svgNS, 'polyline');
      poly.setAttribute('points', buildBoltPoints(edge[0], edge[1], cx, cy, 6, 22));
      poly.setAttribute('pathLength', '100');
      poly.setAttribute('class', 'achievement-bolt');
      poly.style.animationDelay = (i * 0.09).toFixed(2) + 's';
      svg.appendChild(poly);
    });

    return svg;
  }

  function showAchievementUnlock(id) {
    var info = ACHIEVEMENT_INFO[id];
    if (!info) {
      return;
    }

    var overlay = document.createElement('div');
    overlay.className = 'achievement-unlock-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Achievement unlocked: ' + info.title);
    overlay.innerHTML =
      '<div class="achievement-unlock-modal">' +
      '  <div class="achievement-unlock-badge-wrap">' +
      '    <div class="achievement-unlock-glow" aria-hidden="true"></div>' +
      '    <img class="achievement-unlock-badge" src="' + info.img + '" alt="" width="512" height="512">' +
      '  </div>' +
      '  <p class="achievement-unlock-eyebrow">Achievement Unlocked!</p>' +
      '  <h2 class="achievement-unlock-title">' + info.title + '</h2>' +
      '  <p class="achievement-unlock-desc">' + info.desc + '</p>' +
      '  <button type="button" class="btn btn-primary btn-sm achievement-unlock-dismiss">Congratulations!</button>' +
      '</div>';
    var flash = buildLightningFlash();
    overlay.insertBefore(flash, overlay.firstChild);
    document.body.appendChild(overlay);
    flash.addEventListener('animationend', function () {
      flash.remove();
    });

    var badge = overlay.querySelector('.achievement-unlock-badge');
    badge.addEventListener('animationend', function onSpinInEnd(e) {
      if (e.animationName === 'achievement-badge-spin-in') {
        badge.classList.add('is-idle');
        badge.removeEventListener('animationend', onSpinInEnd);
      }
    });

    overlay.querySelector('.achievement-unlock-dismiss').addEventListener('click', function () {
      flash.remove();
      suckBadgeIntoNav(overlay, badge);
    });
  }

  // Flies the unlocked badge (and its glow) into the "Achievements" nav
  // link as one unit, then removes the overlay once it lands (with a
  // fallback timer in case the animation event never fires, e.g. the tab
  // was backgrounded).
  function suckBadgeIntoNav(overlay, badge) {
    var navLink = document.querySelector('.site-nav a.js-auth-gate[href$="achievements.html"]');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wrap = overlay.querySelector('.achievement-unlock-badge-wrap');

    var cleanedUp = false;
    function cleanup() {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      overlay.remove();
      if (navLink) {
        navLink.classList.add('is-achievement-pulse');
        window.setTimeout(function () {
          navLink.classList.remove('is-achievement-pulse');
        }, 700);
      }
    }

    if (!navLink || !wrap || reduceMotion) {
      cleanup();
      return;
    }

    var modal = overlay.querySelector('.achievement-unlock-modal');
    var wrapRect = wrap.getBoundingClientRect();
    var navRect = navLink.getBoundingClientRect();
    var dx = (navRect.left + navRect.width / 2) - (wrapRect.left + wrapRect.width / 2);
    var dy = (navRect.top + navRect.height / 2) - (wrapRect.top + wrapRect.height / 2);

    modal.querySelectorAll('.achievement-unlock-eyebrow, .achievement-unlock-title, .achievement-unlock-desc, .achievement-unlock-dismiss').forEach(function (el) {
      el.classList.add('achievement-unlock-fade-out');
    });

    wrap.style.setProperty('--suck-x', dx + 'px');
    wrap.style.setProperty('--suck-y', dy + 'px');
    badge.classList.remove('is-idle');
    wrap.classList.add('is-sucking-in');
    overlay.classList.add('is-dismissing');

    wrap.addEventListener('animationend', cleanup);
    window.setTimeout(cleanup, 900);
  }

  (function checkPendingAchievement() {
    var pending;
    try {
      pending = window.sessionStorage.getItem('tb:achievement-pending');
      if (pending) {
        window.sessionStorage.removeItem('tb:achievement-pending');
      }
    } catch (e) {
      return;
    }
    if (!pending) {
      return;
    }
    window.setTimeout(function () {
      showAchievementUnlock(pending);
    }, 400);
  })();
})();
