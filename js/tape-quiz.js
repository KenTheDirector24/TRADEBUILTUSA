(function () {
  'use strict';

  var root = document.querySelector('[data-tape-quiz]');
  if (!root) {
    return;
  }

  var questions = Array.prototype.slice.call(root.querySelectorAll('[data-tape-quiz-question]'));
  if (!questions.length) {
    return;
  }

  var counter = root.querySelector('[data-tape-quiz-counter]');
  var prevBtn = root.querySelector('[data-tape-quiz-prev]');
  var nextBtn = root.querySelector('[data-tape-quiz-next]');

  var panCrop = function (crop) {
    var img = crop.querySelector('.lesson-block__hero');
    var targetX = parseFloat(crop.getAttribute('data-target-x'));
    var containerWidth = crop.clientWidth;
    var imgWidth = img.getBoundingClientRect().width;
    if (!containerWidth || !imgWidth) {
      return;
    }
    var targetPx = (targetX / 100) * imgWidth;
    var offset = targetPx - containerWidth / 2;
    var maxOffset = Math.max(0, imgWidth - containerWidth);
    offset = Math.min(Math.max(offset, 0), maxOffset);
    img.style.left = (-offset) + 'px';
  };

  var total = questions.length;
  var current = 0;
  var answered = questions.map(function () { return false; });
  var answeredCount = 0;

  var render = function () {
    questions.forEach(function (q, i) {
      q.hidden = i !== current;
    });
    counter.textContent = 'Question ' + (current + 1) + ' of ' + total;
    prevBtn.disabled = current === 0;
    var isLast = current === total - 1;
    nextBtn.hidden = isLast;
    nextBtn.disabled = !answered[current];

    var activeCrop = questions[current].querySelector('[data-tape-quiz-crop]');
    if (activeCrop) {
      panCrop(activeCrop);
    }
  };

  // The lesson-part hosting this quiz starts hidden (display: none) until
  // lesson-parts.js activates it, so widths are 0 at this script's init and
  // any explicit pan call at that point is a no-op. ResizeObserver re-fires
  // once the part becomes visible (and on any later resize), which is what
  // actually applies the pan.
  var crops = Array.prototype.slice.call(root.querySelectorAll('[data-tape-quiz-crop]'));
  if ('ResizeObserver' in window) {
    var cropObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        panCrop(entry.target);
      });
    });
    crops.forEach(function (crop) {
      cropObserver.observe(crop);
    });
  } else {
    window.addEventListener('resize', function () {
      var activeCrop = questions[current].querySelector('[data-tape-quiz-crop]');
      if (activeCrop) {
        panCrop(activeCrop);
      }
    });
  }

  prevBtn.addEventListener('click', function () {
    if (current > 0) {
      current -= 1;
      render();
    }
  });

  nextBtn.addEventListener('click', function () {
    if (current < total - 1 && answered[current]) {
      current += 1;
      render();
    }
  });

  questions.forEach(function (question, qIndex) {
    var options = Array.prototype.slice.call(question.querySelectorAll('.quiz-option'));

    options.forEach(function (option) {
      option.addEventListener('click', function () {
        if (answered[qIndex]) {
          return;
        }
        answered[qIndex] = true;
        answeredCount += 1;

        options.forEach(function (opt) {
          opt.disabled = true;
          if (opt.getAttribute('data-correct') === 'true') {
            opt.classList.add('is-correct');
          } else if (opt === option) {
            opt.classList.add('is-incorrect');
          }
        });

        render();

        if (answeredCount === total) {
          root.setAttribute('data-gate-complete', 'true');
          root.dispatchEvent(new CustomEvent('gate:complete', { bubbles: true }));
        }
      });
    });
  });

  render();
})();
