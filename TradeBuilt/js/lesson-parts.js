(function () {
  'use strict';

  var parts = Array.prototype.slice.call(document.querySelectorAll('.lesson-part'));

  if (parts.length < 2) {
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var startBtn = document.querySelector('[data-lesson-start]');
  var heroHeader = document.querySelector('.hub__header');
  var dividers = Array.prototype.slice.call(document.querySelectorAll('.section-divider'));
  var current = startBtn ? -1 : 0;
  var animating = false;

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
    animateTo(current + 1);
  });

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  document.body.appendChild(nav);

  var progress = document.createElement('div');
  progress.className = 'lesson-progress';
  progress.hidden = true;
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', String(parts.length));

  var ICON_CHECK = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var stepTitles = parts.map(function (part, i) {
    var heading = part.querySelector('h1, h2, h3');
    var text = heading ? heading.textContent.trim() : '';
    text = text.replace(/^Part\s+\d+\s*:\s*/i, '');
    return text || ('Part ' + (i + 1));
  });

  var progressSteps = document.createElement('div');
  progressSteps.className = 'lesson-progress__steps';

  var dots = [];
  var connectors = [];

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

  var firstPart = parts[0];
  firstPart.parentNode.insertBefore(progress, firstPart);

  var updateNav = function () {
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current < 0 || current >= parts.length - 1;
  };

  var updateProgress = function () {
    if (current < 0) {
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
    dividers.forEach(function (divider) {
      divider.hidden = active;
    });
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
      newPart.hidden = false;
      syncChrome();
      updateNav();
      return;
    }

    animating = true;

    var finishReveal = function () {
      current = index;
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
  updateNav();

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      startBtn.hidden = true;
      animateTo(0);
    });
  }
})();
