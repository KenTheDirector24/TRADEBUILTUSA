(function () {
  'use strict';

  var questionEls = Array.prototype.slice.call(document.querySelectorAll('[data-quiz-question]'));

  if (!questionEls.length) {
    return;
  }

  var normalizePath = function (pathname) {
    return pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  };

  var cloudPageId = normalizePath(window.location.pathname).replace(/^\//, '').replace(/\//g, '-') || 'index';
  var SETTINGS_KEY = 'tb:quiz-settings:' + window.location.pathname;
  var ORDER_KEY = 'tb:quiz-order:' + window.location.pathname;
  var ANSWERS_KEY = 'tb:quiz-answers:' + window.location.pathname;

  var readSettings = function () {
    try {
      var raw = window.localStorage.getItem(SETTINGS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return {
        randomizeQuestions: !!(parsed && parsed.randomizeQuestions),
        randomizeAnswers: !!(parsed && parsed.randomizeAnswers)
      };
    } catch (e) {
      return { randomizeQuestions: false, randomizeAnswers: false };
    }
  };

  var writeSettings = function (settings) {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  };

  var settings = readSettings();

  var hasSavedAnswers = function () {
    try {
      var raw = window.localStorage.getItem(ANSWERS_KEY);
      return !!raw && raw !== '{}';
    } catch (e) {
      return false;
    }
  };

  var shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  };

  var relabelOptions = function (question) {
    var letters = 'ABCDEFGH';
    Array.prototype.slice.call(question.querySelectorAll('.quiz-option')).forEach(function (opt, i) {
      var letterEl = opt.querySelector('.quiz-option__letter');
      if (letterEl) {
        letterEl.textContent = letters[i] || String(i + 1);
      }
    });
  };

  var buildOrder = function () {
    var order = {
      qOrder: questionEls.map(function (_, i) { return i; }),
      optOrders: {}
    };
    if (settings.randomizeQuestions) {
      shuffle(order.qOrder);
    }
    questionEls.forEach(function (question, i) {
      var optCount = question.querySelectorAll('.quiz-option').length;
      var idxs = [];
      for (var k = 0; k < optCount; k++) {
        idxs.push(k);
      }
      if (settings.randomizeAnswers) {
        shuffle(idxs);
      }
      order.optOrders[i] = idxs;
    });
    return order;
  };

  // Moves the question blocks (and, within each, the answer options) to
  // match `order` — dividers and every other sibling stay put, only the
  // question/option slots get swapped. Re-labels A/B/C/D to match the new
  // visual position and keeps the aria-labels in sync.
  var applyOrder = function (order) {
    var container = questionEls[0].parentNode;
    var allChildren = Array.prototype.slice.call(container.children);
    var questionPositions = [];
    allChildren.forEach(function (child, i) {
      if (child.hasAttribute && child.hasAttribute('data-quiz-question')) {
        questionPositions.push(i);
      }
    });
    var newQuestionNodes = order.qOrder.map(function (origIndex) {
      return questionEls[origIndex];
    });
    questionPositions.forEach(function (pos, i) {
      allChildren[pos] = newQuestionNodes[i];
    });
    allChildren.forEach(function (child) {
      container.appendChild(child);
    });

    questionEls.forEach(function (question, origIndex) {
      var optOrder = order.optOrders[origIndex];
      var optsContainer = question.querySelector('.quiz-options');
      if (!optOrder || !optsContainer) {
        return;
      }
      var opts = Array.prototype.slice.call(optsContainer.children);
      optOrder.forEach(function (origOptIndex) {
        optsContainer.appendChild(opts[origOptIndex]);
      });
      relabelOptions(question);
    });

    Array.prototype.slice.call(document.querySelectorAll('[data-quiz-question]')).forEach(function (question, i) {
      var group = question.querySelector('.quiz-options');
      if (group) {
        group.setAttribute('aria-label', 'Answer options for question ' + (i + 1));
      }
    });
  };

  if (settings.randomizeQuestions || settings.randomizeAnswers) {
    var order = null;
    // Only reuse a stored order while an attempt is actually in progress —
    // otherwise every fresh attempt (including a retake) gets a new shuffle.
    if (hasSavedAnswers()) {
      try {
        var stored = JSON.parse(window.localStorage.getItem(ORDER_KEY) || 'null');
        if (stored && Array.isArray(stored.qOrder) && stored.qOrder.length === questionEls.length) {
          order = stored;
        }
      } catch (e) {}
    }
    if (!order) {
      order = buildOrder();
      try {
        window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
      } catch (e) {}
    }
    applyOrder(order);
  }

  // --- Settings icon + modal ---

  var startBtn = document.querySelector('[data-lesson-start]');
  if (!startBtn) {
    return;
  }

  var settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'btn btn-lg quiz-settings-btn';
  settingsBtn.setAttribute('aria-label', 'Quiz settings');
  settingsBtn.title = 'Quiz settings';
  settingsBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg><span>Settings</span>';

  startBtn.insertAdjacentElement('afterend', settingsBtn);

  var overlay = document.createElement('div');
  overlay.className = 'tb-modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="tb-modal tb-modal--quiz-settings" role="dialog" aria-modal="true" aria-labelledby="quiz-settings-title">' +
    '<button type="button" class="quiz-settings__close" aria-label="Close">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '</button>' +
    '<div class="quiz-settings__header">' +
    '<span class="quiz-settings__icon" aria-hidden="true">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</span>' +
    '<div>' +
    '<h2 id="quiz-settings-title">Quiz Settings</h2>' +
    '<p class="tb-modal__warning">Mix things up on your next attempt.</p>' +
    '</div>' +
    '</div>' +
    '<div class="quiz-settings__list">' +
    '<label class="quiz-settings__option">' +
    '<span class="quiz-settings__option-icon" aria-hidden="true">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="16 3 21 3 21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="21 16 21 21 16 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="4" x2="9" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '</span>' +
    '<span class="quiz-settings__option-text">' +
    '<span class="quiz-settings__option-title">Randomize question order</span>' +
    '<span class="quiz-settings__option-desc">Questions shuffle into a new order each attempt.</span>' +
    '</span>' +
    '<span class="quiz-settings__toggle">' +
    '<input type="checkbox" class="quiz-settings__randomize-q">' +
    '<span class="quiz-settings__toggle-track"><span class="quiz-settings__toggle-thumb"></span></span>' +
    '</span>' +
    '</label>' +
    '<label class="quiz-settings__option">' +
    '<span class="quiz-settings__option-icon" aria-hidden="true">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '</span>' +
    '<span class="quiz-settings__option-text">' +
    '<span class="quiz-settings__option-title">Randomize answer order</span>' +
    '<span class="quiz-settings__option-desc">Answer choices A, B, C, D reshuffle per question.</span>' +
    '</span>' +
    '<span class="quiz-settings__toggle">' +
    '<input type="checkbox" class="quiz-settings__randomize-a">' +
    '<span class="quiz-settings__toggle-track"><span class="quiz-settings__toggle-thumb"></span></span>' +
    '</span>' +
    '</label>' +
    '</div>' +
    '<div class="tb-modal__actions">' +
    '<button type="button" class="btn btn-sm btn-light quiz-settings__cancel">Cancel</button>' +
    '<button type="button" class="btn btn-sm btn-primary quiz-settings__save">Save</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var qCheckbox = overlay.querySelector('.quiz-settings__randomize-q');
  var aCheckbox = overlay.querySelector('.quiz-settings__randomize-a');
  var saveBtn = overlay.querySelector('.quiz-settings__save');
  var cancelBtn = overlay.querySelector('.quiz-settings__cancel');
  var closeBtn = overlay.querySelector('.quiz-settings__close');

  var openModal = function () {
    // Reset the checkboxes to the last-saved settings every time the modal
    // opens, so an unsaved (cancelled) edit from a previous open doesn't linger.
    qCheckbox.checked = settings.randomizeQuestions;
    aCheckbox.checked = settings.randomizeAnswers;
    overlay.hidden = false;
  };

  var closeModal = function () {
    overlay.hidden = true;
  };

  // Checkboxes only stage a choice; nothing is applied until Save is clicked.
  // Applying (and reloading) on every checkbox click made the modal feel like
  // it "closed out" after picking just one option.
  var saveSettings = function () {
    var next = {
      randomizeQuestions: qCheckbox.checked,
      randomizeAnswers: aCheckbox.checked
    };
    var changed = next.randomizeQuestions !== settings.randomizeQuestions || next.randomizeAnswers !== settings.randomizeAnswers;
    settings = next;
    writeSettings(settings);
    closeModal();
    if (!changed) {
      return;
    }
    var saved = (window.TB && window.TB.saveCloudProgress) ?
      window.TB.saveCloudProgress('quizzes', cloudPageId, { settings: settings }) :
      Promise.resolve();
    if (!hasSavedAnswers()) {
      // Wait for the cloud write to land before reloading — otherwise the
      // cloud-hydrate check on the reloaded page can see stale cloud data
      // and revert the setting right back.
      saved.then(function () {
        window.location.reload();
      });
    }
  };

  settingsBtn.addEventListener('click', openModal);
  saveBtn.addEventListener('click', saveSettings);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closeModal();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) {
      closeModal();
    }
  });

  if (window.TB && window.TB.hydratePageProgress) {
    window.TB.hydratePageProgress('quizzes', cloudPageId, function (data) {
      var local = readSettings();
      var cloud = (data.settings && typeof data.settings === 'object') ? {
        randomizeQuestions: !!data.settings.randomizeQuestions,
        randomizeAnswers: !!data.settings.randomizeAnswers
      } : { randomizeQuestions: false, randomizeAnswers: false };
      if (cloud.randomizeQuestions !== local.randomizeQuestions || cloud.randomizeAnswers !== local.randomizeAnswers) {
        writeSettings(cloud);
        return true;
      }
      return false;
    });
  }
})();
