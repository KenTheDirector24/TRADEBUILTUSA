(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LEAVE_DURATION = 400;

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
    precision: {
      title: 'Precision',
      desc: 'Awarded for passing a quiz with a perfect score.',
      img: '/assets/Achievements/Precision.png',
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
