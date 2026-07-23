(function () {
  'use strict';

  var questions = Array.prototype.slice.call(document.querySelectorAll('[data-quiz-question]'));

  if (!questions.length) {
    return;
  }

  var resultsPart = document.querySelector('[data-quiz-results]');
  var scoreEl = resultsPart ? resultsPart.querySelector('[data-quiz-score]') : null;
  var retakeBtn = resultsPart ? resultsPart.querySelector('[data-quiz-retake]') : null;

  var answers = {};

  var SCORE_KEY = 'tb:quiz-score:' + window.location.pathname;
  var cloudPageId = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '') || 'index';

  var hasLocalScore = function () {
    try {
      return !!window.localStorage.getItem(SCORE_KEY);
    } catch (e) {
      return false;
    }
  };

  if (!hasLocalScore() && window.TB && window.TB.hydratePageProgress) {
    window.TB.hydratePageProgress('quizzes', cloudPageId, function (data) {
      if (data.quizScore && !hasLocalScore()) {
        try { window.localStorage.setItem(SCORE_KEY, data.quizScore); } catch (e) {}
        return true;
      }
      return false;
    });
  }

  var lockQuestion = function (question, options, chosen) {
    options.forEach(function (option) {
      option.disabled = true;
      if (option.getAttribute('data-correct') === 'true') {
        option.classList.add('is-correct');
      } else if (option === chosen) {
        option.classList.add('is-incorrect');
      }
    });
  };

  questions.forEach(function (question, qIndex) {
    var options = Array.prototype.slice.call(question.querySelectorAll('.quiz-option'));

    options.forEach(function (option) {
      option.addEventListener('click', function () {
        if (question.getAttribute('data-quiz-complete') === 'true') {
          return;
        }
        answers[qIndex] = option.getAttribute('data-correct') === 'true';
        lockQuestion(question, options, option);
        question.setAttribute('data-quiz-complete', 'true');
        document.dispatchEvent(new CustomEvent('quiz:answered'));
      });
    });
  });

  var showResults = function () {
    if (!scoreEl) {
      return;
    }
    var correct = 0;
    questions.forEach(function (question, qIndex) {
      if (answers[qIndex]) {
        correct++;
      }
    });
    scoreEl.textContent = 'You scored ' + correct + ' out of ' + questions.length + '.';
    var scoreValue = correct + '/' + questions.length;
    try {
      window.localStorage.setItem(SCORE_KEY, scoreValue);
    } catch (e) {}
    if (window.TB && window.TB.saveCloudProgress) {
      window.TB.saveCloudProgress('quizzes', cloudPageId, { quizScore: scoreValue });
    }
  };

  if (resultsPart) {
    if (!resultsPart.hidden) {
      showResults();
    }
    new MutationObserver(function () {
      if (!resultsPart.hidden) {
        showResults();
      }
    }).observe(resultsPart, { attributes: true, attributeFilter: ['hidden'] });
  }

  if (retakeBtn) {
    retakeBtn.addEventListener('click', function () {
      answers = {};
      questions.forEach(function (question) {
        question.removeAttribute('data-quiz-complete');
        Array.prototype.slice.call(question.querySelectorAll('.quiz-option')).forEach(function (option) {
          option.disabled = false;
          option.classList.remove('is-correct', 'is-incorrect');
        });
      });
      try {
        window.localStorage.removeItem('tb:lesson-progress:' + window.location.pathname);
        window.localStorage.removeItem('tb:lesson-status:' + window.location.pathname.replace(/\.html$/, '').replace(/\/$/, ''));
        window.localStorage.removeItem(SCORE_KEY);
      } catch (e) {}
      window.location.reload();
    });
  }
})();
