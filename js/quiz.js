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
  var HISTORY_KEY = 'tb:quiz-history:' + window.location.pathname;
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

  var readHistory = function () {
    try {
      var raw = window.localStorage.getItem(HISTORY_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // Maps question index -> index of the option chosen for it.
  var answers = readSavedAnswers();
  // Most recent attempt first. Recorded once per completion — see historyRecorded below.
  var history = readHistory();
  var historyRecorded = false;

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

      var localHistory = readHistory();
      var cloudHistory = Array.isArray(data.attempts) ? data.attempts : [];
      if (JSON.stringify(cloudHistory) !== JSON.stringify(localHistory)) {
        try {
          if (cloudHistory.length) {
            window.localStorage.setItem(HISTORY_KEY, JSON.stringify(cloudHistory));
          } else {
            window.localStorage.removeItem(HISTORY_KEY);
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

  var renderHistory = function () {
    if (!resultsPart) {
      return;
    }
    var wrap = resultsPart.querySelector('.quiz-history');
    if (!history.length) {
      if (wrap) {
        wrap.remove();
      }
      return;
    }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'quiz-history';
      var heading = document.createElement('p');
      heading.className = 'quiz-history__heading';
      heading.textContent = 'Recent attempts';
      var list = document.createElement('ul');
      list.className = 'quiz-history__list';
      wrap.appendChild(heading);
      wrap.appendChild(list);
      if (retakeBtn) {
        retakeBtn.parentNode.insertBefore(wrap, retakeBtn);
      } else {
        resultsPart.querySelector('.quiz-results').appendChild(wrap);
      }
    }
    var listEl = wrap.querySelector('.quiz-history__list');
    listEl.innerHTML = '';
    history.slice(0, 3).forEach(function (entry) {
      var item = document.createElement('li');
      item.className = 'quiz-history__item';
      var scoreSpan = document.createElement('span');
      scoreSpan.className = 'quiz-history__score';
      scoreSpan.textContent = entry.score;
      var dateSpan = document.createElement('span');
      dateSpan.className = 'quiz-history__date';
      var when = new Date(entry.at);
      dateSpan.textContent = isNaN(when.getTime()) ? '' : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      item.appendChild(scoreSpan);
      item.appendChild(dateSpan);
      listEl.appendChild(item);
    });
  };

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
    if (!skipCloud) {
      // historyRecorded guards against re-appending when the results panel
      // is simply revisited (e.g. Previous/Next) without an actual retake.
      if (!historyRecorded) {
        historyRecorded = true;
        history.unshift({ score: scoreValue, at: new Date().toISOString() });
        history = history.slice(0, 5);
        try {
          window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {}
      }
      if (window.TB && window.TB.saveCloudProgress) {
        window.TB.saveCloudProgress('quizzes', cloudPageId, { quizScore: scoreValue, attempts: history });
      }
    }
    renderHistory();
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
