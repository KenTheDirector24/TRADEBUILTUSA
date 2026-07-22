(function () {
  'use strict';

  var grid = document.getElementById('quizzes-grid');
  if (!grid) {
    return;
  }

  var subhead = document.querySelector('.hub__subhead');

  var escapeHtml = function (text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  var renderCard = function (quiz) {
    var thumb = quiz.thumb || 'assets/img/Quizzes.png';
    var li = document.createElement('li');
    li.innerHTML =
      '<a class="hub-card" href="' + escapeHtml(quiz.href) + '">' +
      '  <span class="hub-card__thumb-wrap">' +
      '    <img class="hub-card__thumb" src="' + escapeHtml(thumb) + '" alt="" width="1024" height="1536">' +
      '  </span>' +
      '  <div class="hub-card__content">' +
      '    <h2 class="hub-card__title">' + escapeHtml(quiz.title) + '</h2>' +
      '    <p class="hub-card__desc">' + escapeHtml(quiz.desc) + '</p>' +
      '  </div>' +
      '  <span class="hub-card__cta">' +
      '    Start quiz' +
      '    <svg class="hub-card__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '    </svg>' +
      '  </span>' +
      '</a>';
    return li;
  };

  fetch('quizzes/quizzes.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load quizzes manifest');
      }
      return response.json();
    })
    .then(function (quizzes) {
      if (!Array.isArray(quizzes) || !quizzes.length) {
        return;
      }
      quizzes.forEach(function (quiz) {
        if (quiz && quiz.href && quiz.title) {
          grid.appendChild(renderCard(quiz));
        }
      });
      if (subhead) {
        subhead.textContent = 'Test your HVAC/R knowledge with scored quizzes and instant feedback.';
      }
      if (window.TB && window.TB.applyHubCardStatus) {
        window.TB.applyHubCardStatus(grid);
      }
    })
    .catch(function () {});
})();
