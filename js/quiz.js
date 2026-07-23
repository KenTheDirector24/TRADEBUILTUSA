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

  if (window.TB && window.TB.hydratePageProgress) {
    window.TB.hydratePageProgress('quizzes', cloudPageId, function (data) {
      var changed = false;

      var localAnswers = readSavedAnswers();
      var cloudAnswers = (data.answers && typeof data.answers === 'object') ? data.answers : {};
      if (JSON.stringify(cloudAnswers) !== JSON.stringify(localAnswers)) {
        try {
          if (Object.keys(cloudAnswers).length) {
            window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(cloudAnswers));
          } else {
            window.localStorage.removeItem(ANSWERS_KEY);
          }
        } catch (e) {}
        changed = true;
      }

      var localScore = window.localStorage.getItem(SCORE_KEY);
      var cloudScore = data.quizScore || null;
      if (cloudScore !== localScore) {
        try {
          if (cloudScore) {
            window.localStorage.setItem(SCORE_KEY, cloudScore);
          } else {
            window.localStorage.removeItem(SCORE_KEY);
          }
        } catch (e) {}
        changed = true;
      }

      return changed;
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

  // skipCloud: true when this is just re-rendering a restored score on page
  // load, not a real completion — avoids re-pushing stale local data to
  // Firestore on every visit, which would silently undo a cloud-side delete.
  var showResults = function (skipCloud) {
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
    if (!skipCloud && window.TB && window.TB.saveCloudProgress) {
      window.TB.saveCloudProgress('quizzes', cloudPageId, { quizScore: scoreValue });
    }
  };

  if (resultsPart) {
    if (!resultsPart.hidden) {
      showResults(true);
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
      // Cloud is authoritative, so a local-only clear would just get
      // overwritten back from Firestore on the next load — clear there too.
      if (window.TB && window.TB.saveCloudProgress) {
        window.TB.saveCloudProgress('quizzes', cloudPageId, { answers: {}, quizScore: null, partIndex: null, status: null });
      }
      window.location.reload();
    });
  }
})();
