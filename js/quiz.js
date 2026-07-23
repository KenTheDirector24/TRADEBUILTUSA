(function () {
  'use strict';

  var questions = Array.prototype.slice.call(document.querySelectorAll('[data-quiz-question]'));

  if (!questions.length) {
    return;
  }

  var resultsPart = document.querySelector('[data-quiz-results]');
  var scoreEl = resultsPart ? resultsPart.querySelector('[data-quiz-score]') : null;
  var retakeBtn = resultsPart ? resultsPart.querySelector('[data-quiz-retake]') : null;

  var SCORE_KEY = 'tb:quiz-score:' + window.location.pathname;
  var ANSWERS_KEY = 'tb:quiz-answers:' + window.location.pathname;
  var cloudPageId = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '').replace(/^\//, '').replace(/\//g, '-') || 'index';

  var readSavedAnswers = function () {
    try {
      var raw = window.localStorage.getItem(ANSWERS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      return {};
    }
  };

  // Maps question index -> index of the option chosen for it.
  var answers = readSavedAnswers();

  var saveAnswers = function () {
    try {
      window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
    } catch (e) {}
    if (window.TB && window.TB.saveCloudProgress) {
      window.TB.saveCloudProgress('quizzes', cloudPageId, { answers: answers });
    }
  };

  var hasLocalScore = function () {
    try {
      return !!window.localStorage.getItem(SCORE_KEY);
    } catch (e) {
      return false;
    }
  };

  var hasLocalAnswers = function () {
    return Object.keys(readSavedAnswers()).length > 0;
  };

  if (!hasLocalAnswers() && window.TB && window.TB.hydratePageProgress) {
    window.TB.hydratePageProgress('quizzes', cloudPageId, function (data) {
      var wrote = false;
      if (data.answers && typeof data.answers === 'object' && Object.keys(data.answers).length && !hasLocalAnswers()) {
        try { window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(data.answers)); } catch (e) {}
        wrote = true;
      }
      if (data.quizScore && !hasLocalScore()) {
        try { window.localStorage.setItem(SCORE_KEY, data.quizScore); } catch (e) {}
        wrote = true;
      }
      return wrote;
    });
  }

  var lockQuestion = function (question, options, chosenIndex) {
    options.forEach(function (option, i) {
      option.disabled = true;
      if (option.getAttribute('data-correct') === 'true') {
        option.classList.add('is-correct');
      } else if (i === chosenIndex) {
        option.classList.add('is-incorrect');
      }
    });
  };

  questions.forEach(function (question, qIndex) {
    var options = Array.prototype.slice.call(question.querySelectorAll('.quiz-option'));

    if (typeof answers[qIndex] === 'number' && options[answers[qIndex]]) {
      lockQuestion(question, options, answers[qIndex]);
      question.setAttribute('data-quiz-complete', 'true');
    }

    options.forEach(function (option, optIndex) {
      option.addEventListener('click', function () {
        if (question.getAttribute('data-quiz-complete') === 'true') {
          return;
        }
        answers[qIndex] = optIndex;
        lockQuestion(question, options, optIndex);
        question.setAttribute('data-quiz-complete', 'true');
        saveAnswers();
        document.dispatchEvent(new CustomEvent('quiz:answered'));
      });
    });
  });

  // Restored answers were applied before lesson-parts.js's initial nav sync
  // ran, so nudge it to re-check the current question's unlocked state.
  document.dispatchEvent(new CustomEvent('quiz:answered'));

  var showResults = function () {
    if (!scoreEl) {
      return;
    }
    var correct = 0;
    questions.forEach(function (question, qIndex) {
      var options = Array.prototype.slice.call(question.querySelectorAll('.quiz-option'));
      var chosenIndex = answers[qIndex];
      if (typeof chosenIndex === 'number' && options[chosenIndex] && options[chosenIndex].getAttribute('data-correct') === 'true') {
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
        window.localStorage.removeItem(ANSWERS_KEY);
      } catch (e) {}
      window.location.reload();
    });
  }
})();
