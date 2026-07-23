(function () {
  'use strict';

  var parts = Array.prototype.slice.call(document.querySelectorAll('.lesson-part'));

  if (parts.length < 2) {
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var startBtn = document.querySelector('[data-lesson-start]');
  var heroHeader = document.querySelector('.hub__header');
  var backLink = document.querySelector('.back-link');
  var dividers = Array.prototype.slice.call(document.querySelectorAll('.section-divider'));
  dividers.forEach(function (divider) {
    divider.hidden = true;
  });

  var normalizePath = function (pathname) {
    return pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  };

  var PROGRESS_KEY = 'tb:lesson-progress:' + window.location.pathname;
  var STATUS_KEY = 'tb:lesson-status:' + normalizePath(window.location.pathname);

  var isQuiz = document.querySelector('[data-quiz-question]') !== null;
  var cloudKind = isQuiz ? 'quizzes' : 'lessons';
  var cloudPageId = normalizePath(window.location.pathname).replace(/^\//, '').replace(/\//g, '-') || 'index';

  var readSavedProgress = function () {
    try {
      var raw = window.localStorage.getItem(PROGRESS_KEY);
      var parsed = raw === null ? NaN : parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < parts.length) {
        return parsed;
      }
    } catch (e) {}
    return null;
  };

  var saveProgress = function (index) {
    try {
      window.localStorage.setItem(PROGRESS_KEY, String(index));
    } catch (e) {}
    if (window.TB && window.TB.saveCloudProgress) {
      window.TB.saveCloudProgress(cloudKind, cloudPageId, { partIndex: index });
    }
  };

  var savedCurrent = readSavedProgress();
  var current = savedCurrent !== null ? savedCurrent : (startBtn ? -1 : 0);
  var animating = false;
  var completeLabel = isQuiz ? 'Finish Quiz' : 'Complete Lesson';

  if (window.TB && window.TB.hydratePageProgress) {
    window.TB.hydratePageProgress(cloudKind, cloudPageId, function (data) {
      var changed = false;

      var localIndex = readSavedProgress();
      var cloudIndex = typeof data.partIndex === 'number' ? data.partIndex : null;
      if (cloudIndex !== localIndex) {
        try {
          if (cloudIndex === null) {
            window.localStorage.removeItem(PROGRESS_KEY);
          } else {
            window.localStorage.setItem(PROGRESS_KEY, String(cloudIndex));
          }
        } catch (e) {}
        changed = true;
      }

      var localStatus = window.localStorage.getItem(STATUS_KEY);
      var cloudStatus = data.status || null;
      if (cloudStatus !== localStatus) {
        try {
          if (cloudStatus) {
            window.localStorage.setItem(STATUS_KEY, cloudStatus);
          } else {
            window.localStorage.removeItem(STATUS_KEY);
          }
        } catch (e) {}
        changed = true;
      }

      return changed;
    });
  }

  var TRANSITION_MS = 280;

  var ICON_BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NEXT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var nav = document.createElement('div');
  nav.className = 'lesson-nav-fixed';
  nav.hidden = true;

  var prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'btn btn-sm part-nav__btn part-nav__btn--prev';
  prevBtn.innerHTML = ICON_BACK + '<span>Previous</span>';
  prevBtn.addEventListener('click', function () {
    animateTo(current - 1);
  });

  var nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-sm part-nav__btn part-nav__btn--next';
  nextBtn.innerHTML = '<span>Next</span>' + ICON_NEXT;
  nextBtn.addEventListener('click', function () {
    if (current === parts.length - 1) {
      window.location.href = backLink ? backLink.href : document.referrer || window.location.href;
      return;
    }
    animateTo(current + 1);
  });

  var nextHint = document.createElement('span');
  nextHint.className = 'part-nav__hint';
  nextHint.textContent = isQuiz ? 'Answer the question above to continue' : 'Complete the task above to continue';
  nextHint.hidden = true;

  var nextWrap = document.createElement('div');
  nextWrap.className = 'part-nav__next-wrap';
  nextWrap.appendChild(nextHint);
  nextWrap.appendChild(nextBtn);

  nav.appendChild(prevBtn);
  nav.appendChild(nextWrap);
  document.body.appendChild(nav);

  var progress = document.createElement('div');
  progress.className = 'lesson-progress';
  progress.hidden = true;
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', String(isQuiz ? document.querySelectorAll('[data-quiz-question]').length : parts.length));

  var ICON_CHECK = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var stepTitles = parts.map(function (part, i) {
    var heading = part.querySelector('h1, h2, h3');
    var text = heading ? heading.textContent.trim() : '';
    text = text.replace(/^Part\s+\d+\s*:\s*/i, '');
    return text || ('Part ' + (i + 1));
  });

  var quizQuestionCount = document.querySelectorAll('[data-quiz-question]').length;
  var counterEl = null;
  var progressSteps = null;
  var dots = [];
  var connectors = [];

  if (isQuiz) {
    progress.classList.add('lesson-progress--quiz');
    counterEl = document.createElement('span');
    counterEl.className = 'lesson-progress__counter';
    progress.appendChild(counterEl);
  } else {
    progressSteps = document.createElement('div');
    progressSteps.className = 'lesson-progress__steps';

    parts.forEach(function (part, i) {
      if (i > 0) {
        var connector = document.createElement('span');
        connector.className = 'lesson-progress__connector';
        progressSteps.appendChild(connector);
        connectors.push(connector);
      }
      var dot = document.createElement('span');
      dot.className = 'lesson-progress__dot';
      dot.title = stepTitles[i];

      var numSpan = document.createElement('span');
      numSpan.className = 'lesson-progress__dot-face lesson-progress__dot-num';
      numSpan.textContent = String(i + 1);

      var checkSpan = document.createElement('span');
      checkSpan.className = 'lesson-progress__dot-face lesson-progress__dot-check';
      checkSpan.innerHTML = ICON_CHECK;

      dot.appendChild(numSpan);
      dot.appendChild(checkSpan);
      progressSteps.appendChild(dot);
      dots.push(dot);
    });

    progress.appendChild(progressSteps);
  }

  var topbar = document.querySelector('.lesson-topbar');
  if (topbar) {
    topbar.appendChild(progress);
  } else {
    var firstPart = parts[0];
    firstPart.parentNode.insertBefore(progress, firstPart);
  }

  var isPartComplete = function (part) {
    var gated = Array.prototype.slice.call(part.querySelectorAll('[data-hotspot], [data-quiz-question]'));
    if (part.hasAttribute('data-hotspot') || part.hasAttribute('data-quiz-question')) {
      gated.push(part);
    }
    return gated.every(function (el) {
      if (el.hasAttribute('data-quiz-question')) {
        return el.getAttribute('data-quiz-complete') === 'true';
      }
      return el.getAttribute('data-hotspot-complete') === 'true';
    });
  };

  var syncStatus = function (incomplete, skipCloud) {
    var value = null;
    try {
      if (current < 0) {
        window.localStorage.removeItem(STATUS_KEY);
      } else if (current === parts.length - 1 && !incomplete) {
        value = 'complete';
        window.localStorage.setItem(STATUS_KEY, value);
      } else {
        value = 'in-progress';
        window.localStorage.setItem(STATUS_KEY, value);
      }
    } catch (e) {}
    if (value && !skipCloud && window.TB && window.TB.saveCloudProgress) {
      window.TB.saveCloudProgress(cloudKind, cloudPageId, { status: value });
    }
  };

  // skipCloud: true when this is just re-rendering restored state (initial
  // page load), not a real change — avoids re-pushing stale local data to
  // Firestore on every visit, which would silently undo a cloud-side delete.
  var updateNav = function (skipCloud) {
    prevBtn.disabled = current <= 0;
    prevBtn.classList.toggle('is-invisible', current <= 0);
    var isLastPart = current > -1 && current === parts.length - 1;
    var incomplete = current > -1 && !isPartComplete(parts[current]);
    nextBtn.disabled = current < 0 || incomplete;
    nextBtn.innerHTML = isLastPart ? '<span>' + completeLabel + '</span>' : '<span>Next</span>' + ICON_NEXT;
    nextHint.hidden = !incomplete;
    syncStatus(incomplete, skipCloud);
  };

  var updateProgress = function () {
    if (current < 0) {
      return;
    }
    if (isQuiz) {
      var onQuestion = current < quizQuestionCount;
      progress.hidden = !onQuestion;
      if (onQuestion) {
        counterEl.textContent = 'Question ' + (current + 1) + ' of ' + quizQuestionCount;
        progress.setAttribute('aria-valuenow', String(current + 1));
        progress.setAttribute('aria-valuetext', counterEl.textContent);
      }
      return;
    }
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-complete', i < current);
      dot.classList.toggle('is-current', i === current);
    });
    connectors.forEach(function (connector, i) {
      connector.classList.toggle('is-complete', i < current);
    });
    progress.setAttribute('aria-valuenow', String(current + 1));
    progress.setAttribute('aria-valuetext', stepTitles[current]);
  };

  var syncChrome = function () {
    var active = current > -1;
    document.body.classList.toggle('is-lesson-active', active);
    nav.hidden = !active;
    progress.hidden = !active;
    if (heroHeader) {
      heroHeader.hidden = active;
    }
    if (active) {
      updateProgress();
    }
  };

  var showOnly = function (index) {
    parts.forEach(function (part, i) {
      part.hidden = i !== index;
    });
  };

  function animateTo(index) {
    if (animating || index < 0 || index > parts.length - 1 || index === current) {
      return;
    }

    var forward = index > current;
    var oldPart = current > -1 ? parts[current] : null;
    var newPart = parts[index];

    if (prefersReducedMotion) {
      if (oldPart) {
        oldPart.hidden = true;
      }
      current = index;
      saveProgress(current);
      newPart.hidden = false;
      syncChrome();
      updateNav();
      return;
    }

    animating = true;

    var finishReveal = function () {
      current = index;
      saveProgress(current);
      syncChrome();
      updateNav();

      var enterClass = forward ? 'lesson-part--shift-right' : 'lesson-part--shift-left';
      newPart.classList.add('lesson-part--no-transition', enterClass);
      newPart.hidden = false;
      void newPart.offsetWidth;
      newPart.classList.remove('lesson-part--no-transition');

      requestAnimationFrame(function () {
        newPart.classList.remove(enterClass);
        window.setTimeout(function () {
          animating = false;
        }, TRANSITION_MS);
      });
    };

    if (oldPart) {
      var exitClass = forward ? 'lesson-part--shift-left' : 'lesson-part--shift-right';
      oldPart.classList.add(exitClass);
      window.setTimeout(function () {
        oldPart.hidden = true;
        oldPart.classList.remove(exitClass);
        finishReveal();
      }, TRANSITION_MS);
    } else {
      finishReveal();
    }
  }

  showOnly(current);
  syncChrome();
  updateNav(true);

  document.addEventListener('hotspot:complete', updateNav);
  document.addEventListener('quiz:answered', updateNav);

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      startBtn.hidden = true;
      animateTo(0);
    });
  }
})();
