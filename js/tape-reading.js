(function () {
  'use strict';

  var root = document.querySelector('[data-tape-reading]');
  if (!root) {
    return;
  }

  var NEXT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PREV_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var RESTART_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var STEPS = [
    {
      title: 'Inches',
      body: 'Whole inches are the primary measurement marks on a tape measure. They are shown by the longest lines and numbered 1, 2, 3, 4…'
    },
    {
      title: '1/2 Inch',
      body: 'The 1/2 mark divides 1 inch into two equal parts. It is the longest line between two inch marks.'
    },
    {
      title: '1/4 Inch',
      body: 'The 1/4 and 3/4 marks divide 1 inch into 4 equal parts. They are shorter than the 1/2 mark.'
    },
    {
      title: '1/8 Inch',
      body: 'The 1/8, 3/8, 5/8, and 7/8 marks divide 1 inch into 8 equal parts. They provide more precise measurements.'
    },
    {
      title: '1/16 Inch',
      body: 'The 1/16 marks divide 1 inch into 16 equal parts. These are the shortest lines and are used for the most accurate measurements on a standard tape measure.'
    }
  ];

  var total = STEPS.length;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var groups = root.querySelectorAll('[data-tape-reading-group]');
  var highlights = root.querySelectorAll('[data-tape-reading-highlight]');
  var badge = root.querySelector('[data-tape-reading-number]');
  var titleEl = root.querySelector('[data-tape-reading-title]');
  var bodyEl = root.querySelector('[data-tape-reading-body]');
  var content = root.querySelector('[data-tape-reading-content]');
  var counter = root.querySelector('[data-tape-reading-counter]');
  var prevBtn = root.querySelector('[data-tape-reading-prev]');
  var nextBtn = root.querySelector('[data-tape-reading-next]');

  prevBtn.innerHTML = PREV_ICON + '<span>Previous</span>';

  var current = 1;
  var fadeToken = 0;

  var renderControls = function () {
    prevBtn.disabled = current <= 1;
    var isLast = current >= total;
    if (isLast) {
      nextBtn.innerHTML = RESTART_ICON + '<span>Start Over</span>';
    } else {
      nextBtn.innerHTML = '<span>Next: ' + STEPS[current].title + '</span>' + NEXT_ICON;
    }
    counter.textContent = 'Step ' + current + ' of ' + total;
  };

  var render = function () {
    var step = STEPS[current - 1];
    badge.textContent = String(current);
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    groups.forEach(function (g) {
      var n = parseInt(g.getAttribute('data-tape-reading-group'), 10);
      g.classList.toggle('is-visible', n <= current);
      g.classList.toggle('is-current', n === current);
    });
    highlights.forEach(function (h) {
      var n = parseInt(h.getAttribute('data-tape-reading-highlight'), 10);
      h.classList.toggle('is-visible', n === current);
    });
    renderControls();
  };

  var goTo = function (next) {
    if (next === current) {
      return;
    }
    current = next;

    fadeToken += 1;
    var token = fadeToken;

    if (reducedMotion) {
      render();
      return;
    }

    content.classList.add('is-fading');
    window.setTimeout(function () {
      if (token !== fadeToken) return;
      render();
      void content.offsetWidth;
      requestAnimationFrame(function () {
        if (token !== fadeToken) return;
        content.classList.remove('is-fading');
      });
    }, 180);
  };

  prevBtn.addEventListener('click', function () {
    if (current > 1) {
      goTo(current - 1);
    }
  });

  nextBtn.addEventListener('click', function () {
    goTo(current >= total ? 1 : current + 1);
  });

  render();
})();
