(function () {
  'use strict';

  var DRAFT_KEY = 'tb-devtools:quiz-builder-draft';
  var EXISTING_KEY = 'tb-devtools:quiz-builder-existing';

  var emptyQuestion = function () {
    return {
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0
    };
  };

  var defaultQuiz = function () {
    return {
      title: '',
      description: '',
      thumbName: '',
      thumbDataUrl: '',
      questions: [emptyQuestion()]
    };
  };

  var MIME_EXTENSIONS = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };

  function extensionForDataUrl(dataUrl) {
    var match = /^data:([^;]+);base64/.exec(dataUrl || '');
    return (match && MIME_EXTENSIONS[match[1]]) || 'png';
  }

  function mimeForDataUrl(dataUrl) {
    var match = /^data:([^;]+);base64/.exec(dataUrl || '');
    return (match && match[1]) || 'image/png';
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var binary = window.atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeForDataUrl(dataUrl) });
  }

  var quiz = loadDraft() || defaultQuiz();
  if (quiz.subhead && !quiz.description) {
    quiz.description = quiz.subhead;
  }
  delete quiz.subhead;
  delete quiz.slug;
  delete quiz.slugTouched;
  delete quiz.thumb;
  if (quiz.thumbName === undefined) {
    quiz.thumbName = '';
  }
  if (quiz.thumbDataUrl === undefined) {
    quiz.thumbDataUrl = '';
  }
  var existingQuizzes = loadExisting() || [];

  var titleInput = document.getElementById('qb-title');
  var descriptionInput = document.getElementById('qb-description');
  var thumbInput = document.getElementById('qb-thumb');
  var thumbRemoveBtn = document.getElementById('qb-thumb-remove');
  var thumbPreview = document.getElementById('qb-thumb-preview');
  var questionsContainer = document.getElementById('qb-questions');
  var addQuestionBtn = document.getElementById('qb-add-question');
  var downloadBtn = document.getElementById('qb-download');
  var clearBtn = document.getElementById('qb-clear');
  var statusEl = document.getElementById('qb-status');

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(quiz));
    } catch (e) {}
  }

  function loadExisting() {
    try {
      var raw = window.localStorage.getItem(EXISTING_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveExisting() {
    try {
      window.localStorage.setItem(EXISTING_KEY, JSON.stringify(existingQuizzes));
    } catch (e) {}
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function updateThumbPreview() {
    if (!quiz.thumbDataUrl) {
      thumbPreview.classList.remove('is-visible');
      thumbPreview.style.backgroundImage = '';
      thumbRemoveBtn.hidden = true;
      return;
    }
    thumbPreview.style.backgroundImage = 'url("' + quiz.thumbDataUrl + '")';
    thumbPreview.classList.add('is-visible');
    thumbRemoveBtn.hidden = false;
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', !!isError);
    if (message) {
      window.setTimeout(function () {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
        }
      }, 3000);
    }
  }

  function render() {
    questionsContainer.innerHTML = '';
    quiz.questions.forEach(function (question, qIndex) {
      questionsContainer.appendChild(renderQuestion(question, qIndex));
    });
  }

  function scrollToLastQuestion() {
    var cards = questionsContainer.querySelectorAll('.qb-question');
    var last = cards[cards.length - 1];
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function scrollToLastOption(qIndex) {
    var card = questionsContainer.querySelector('.qb-question[data-qindex="' + qIndex + '"]');
    if (!card) {
      return;
    }
    var rows = card.querySelectorAll('.qb-option-row');
    var last = rows[rows.length - 1];
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function renderQuestion(question, qIndex) {
    var card = document.createElement('div');
    card.className = 'qb-question';
    card.dataset.qindex = String(qIndex);

    var head = document.createElement('div');
    head.className = 'qb-question__head';

    var heading = document.createElement('h3');
    heading.textContent = 'Question ' + (qIndex + 1);
    head.appendChild(heading);

    if (quiz.questions.length > 1) {
      var removeQBtn = document.createElement('button');
      removeQBtn.type = 'button';
      removeQBtn.className = 'qb-remove-btn';
      removeQBtn.textContent = 'Remove Question';
      removeQBtn.addEventListener('click', function () {
        quiz.questions.splice(qIndex, 1);
        saveDraft();
        render();
      });
      head.appendChild(removeQBtn);
    }

    card.appendChild(head);

    var textField = document.createElement('div');
    textField.className = 'qb-field';
    var textLabel = document.createElement('label');
    textLabel.textContent = 'Question text';
    var textArea = document.createElement('textarea');
    textArea.value = question.text;
    textArea.addEventListener('input', function () {
      question.text = textArea.value;
      saveDraft();
    });
    textField.appendChild(textLabel);
    textField.appendChild(textArea);
    card.appendChild(textField);

    question.options.forEach(function (option, oIndex) {
      card.appendChild(renderOption(question, qIndex, oIndex));
    });

    if (question.options.length < 6) {
      var addOptBtn = document.createElement('button');
      addOptBtn.type = 'button';
      addOptBtn.className = 'qb-small-btn';
      addOptBtn.textContent = '+ Add Option';
      addOptBtn.addEventListener('click', function () {
        question.options.push('');
        saveDraft();
        render();
        scrollToLastOption(qIndex);
      });
      card.appendChild(addOptBtn);
    }

    return card;
  }

  function renderOption(question, qIndex, oIndex) {
    var row = document.createElement('div');
    row.className = 'qb-option-row';

    var radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'qb-correct-' + qIndex;
    radio.checked = question.correctIndex === oIndex;
    radio.title = 'Mark as correct answer';
    radio.addEventListener('change', function () {
      question.correctIndex = oIndex;
      saveDraft();
    });
    row.appendChild(radio);

    var text = document.createElement('input');
    text.type = 'text';
    text.value = question.options[oIndex];
    text.placeholder = 'Answer option';
    text.addEventListener('input', function () {
      question.options[oIndex] = text.value;
      saveDraft();
    });
    row.appendChild(text);

    if (question.options.length > 2) {
      var removeOptBtn = document.createElement('button');
      removeOptBtn.type = 'button';
      removeOptBtn.className = 'qb-remove-btn';
      removeOptBtn.textContent = '×';
      removeOptBtn.title = 'Remove option';
      removeOptBtn.addEventListener('click', function () {
        question.options.splice(oIndex, 1);
        if (question.correctIndex >= question.options.length) {
          question.correctIndex = 0;
        } else if (question.correctIndex > oIndex) {
          question.correctIndex -= 1;
        }
        saveDraft();
        render();
      });
      row.appendChild(removeOptBtn);
    }

    return row;
  }

  function validate() {
    var errors = [];
    if (!quiz.title.trim()) {
      errors.push('Add a quiz title.');
    }
    var slug = slugify(quiz.title);
    if (!slug) {
      errors.push('Add a quiz title so a file name can be generated.');
    }
    if (!quiz.questions.length) {
      errors.push('Add at least one question.');
    }
    quiz.questions.forEach(function (question, qIndex) {
      if (!question.text.trim()) {
        errors.push('Question ' + (qIndex + 1) + ' needs question text.');
      }
      var filled = question.options.filter(function (opt) {
        return opt.trim();
      });
      if (filled.length < 2) {
        errors.push('Question ' + (qIndex + 1) + ' needs at least two answer options.');
      }
      var correctText = question.options[question.correctIndex];
      if (!correctText || !correctText.trim()) {
        errors.push('Question ' + (qIndex + 1) + ' needs a correct answer marked with text filled in.');
      }
    });
    return { slug: slug, errors: errors };
  }

  function buildQuizPage(slug) {
    var title = escapeHtml(quiz.title);
    var description = escapeHtml(quiz.description);
    var headingId = 'quiz-' + slug + '-heading';

    var questionsHtml = quiz.questions.map(function (question, qIndex) {
      var partNum = qIndex + 1;
      var optionsHtml = question.options
        .map(function (opt, originalIndex) {
          return { text: opt, originalIndex: originalIndex };
        })
        .filter(function (entry) {
          return entry.text.trim();
        })
        .map(function (entry, oIndex) {
          var letter = String.fromCharCode(65 + oIndex);
          var isCorrect = entry.originalIndex === question.correctIndex;
          return '            <button type="button" class="quiz-option"' + (isCorrect ? ' data-correct="true"' : '') + '>\n' +
            '              <span class="quiz-option__letter" aria-hidden="true">' + letter + '</span>\n' +
            '              ' + escapeHtml(entry.text) + '\n' +
            '            </button>';
        })
        .join('\n');

      return '        <div class="section-divider" aria-hidden="true"></div>\n\n' +
        '        <div class="lesson-block lesson-block--wide lesson-part" data-part="' + partNum + '" data-quiz-question>\n' +
        '          <p class="hotspot__intro">' + escapeHtml(question.text) + '</p>\n' +
        '          <div class="quiz-options" role="group" aria-label="Answer options for question ' + partNum + '">\n' +
        optionsHtml + '\n' +
        '          </div>\n' +
        '        </div>';
    }).join('\n\n');

    var resultsPartNum = quiz.questions.length + 1;

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>TradeBuilt | ' + title + ' — HVAC/R Quizzes</title>',
      '  <meta name="description" content="' + description + '">',
      '  <meta name="theme-color" content="#14181F">',
      '',
      '  <meta property="og:title" content="' + title + ' — TradeBuilt HVAC/R Quizzes">',
      '  <meta property="og:description" content="' + description + '">',
      '  <meta property="og:type" content="website">',
      '  <meta name="twitter:card" content="summary_large_image">',
      '  <meta name="twitter:title" content="' + title + ' — TradeBuilt HVAC/R Quizzes">',
      '  <meta name="twitter:description" content="' + description + '">',
      '',
      '  <link rel="icon" type="image/x-icon" href="../assets/img/favicon.ico">',
      '  <link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicon-16.png">',
      '  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">',
      '  <link rel="icon" type="image/png" sizes="192x192" href="../assets/img/favicon-192.png">',
      '  <link rel="apple-touch-icon" sizes="180x180" href="../assets/img/favicon-180.png">',
      '',
      '  <link rel="preconnect" href="https://fonts.googleapis.com">',
      '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
      '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">',
      '',
      '  <link rel="stylesheet" href="../css/styles.css">',
      '</head>',
      '<body>',
      '  <div class="nav-sentinel" id="nav-sentinel" aria-hidden="true"></div>',
      '  <a class="skip-link" href="#main">Skip to main content</a>',
      '',
      '  <header class="site-header" id="site-header">',
      '    <div class="container site-header__inner">',
      '      <a class="logo" href="../index.html">',
      '        <img src="../assets/img/tradebuilt-logo.png" alt="TradeBuilt" width="2172" height="724">',
      '        <span class="logo__tagline">Skilled Trades Learning Platform</span>',
      '      </a>',
      '      <nav class="site-nav" aria-label="Primary">',
      '        <a href="../index.html">Home</a>',
      '        <a href="../hvacr.html" aria-current="page">HVAC/R</a>',
      '        <span class="site-nav__disabled" tabindex="0">Electrician<span class="site-nav__tooltip">In Development</span></span>',
      '        <span class="site-nav__disabled" tabindex="0">Resources<span class="site-nav__tooltip">Coming Soon</span></span>',
      '        <span class="site-nav__disabled" tabindex="0">Store<span class="site-nav__tooltip">Coming Soon</span></span>',
      '        <a href="../follow-the-build.html">Follow Us</a>',
      '      </nav>',
      '      <div class="header-actions">',
      '        <button type="button" class="btn btn-sm header-actions__signin">Sign In</button>',
      '        <button type="button" class="btn btn-sm header-actions__signup">Sign Up</button>',
      '      </div>',
      '      <div class="updates-badge">',
      '        <img src="../assets/img/Updates.png" alt="New updates weekly">',
      '      </div>',
      '    </div>',
      '  </header>',
      '',
      '  <main id="main">',
      '    <section class="hub" id="quiz-' + slug + '" aria-labelledby="' + headingId + '">',
      '      <div class="hub__bg" aria-hidden="true"></div>',
      '      <div class="container">',
      '        <div class="lesson-topbar">',
      '          <a class="back-link" href="../hvacr-quizzes.html">',
      '            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">',
      '              <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      '            </svg>',
      '            Back to Quizzes',
      '          </a>',
      '        </div>',
      '        <div class="hub__header">',
      '          <h1 id="' + headingId + '">' + title + '</h1>',
      '          <p class="hub__subhead">' + description + '</p>',
      '          <button type="button" class="btn btn-primary btn-lg" data-lesson-start>Start Quiz</button>',
      '        </div>',
      '',
      questionsHtml,
      '',
      '        <div class="section-divider" aria-hidden="true"></div>',
      '',
      '        <div class="lesson-block lesson-block--wide lesson-part" data-part="' + resultsPartNum + '" data-quiz-results>',
      '          <div class="quiz-results">',
      '            <h2 class="hotspot__heading">Quiz Complete</h2>',
      '            <p class="quiz-results__score" data-quiz-score></p>',
      '            <button type="button" class="btn btn-primary btn-lg" data-quiz-retake>Retake Quiz</button>',
      '          </div>',
      '        </div>',
      '',
      '      </div>',
      '    </section>',
      '  </main>',
      '',
      '  <footer class="site-footer">',
      '    <div class="site-footer__legal">',
      '      <p>&copy; 2026 TradeBuilt. All rights reserved. &middot; Created by Kenneth J. Thompson &middot; <span class="site-footer__veteran">Veteran Owned 🇺🇸</span></p>',
      '    </div>',
      '  </footer>',
      '',
      '  <script src="../js/main.js"></script>',
      '  <script type="module" src="../js/auth.js"></script>',
      '  <script src="../js/lesson-parts.js" defer></script>',
      '  <script src="../js/quiz.js" defer></script>',
      '</body>',
      '</html>',
      ''
    ].join('\n');
  }

  function buildManifestEntry(slug, thumbFilename) {
    return {
      slug: slug,
      title: quiz.title,
      desc: quiz.description || '',
      thumb: thumbFilename ? 'quizzes/' + thumbFilename : '',
      href: 'quizzes/' + slug + '.html'
    };
  }

  function mergeManifest(slug, thumbFilename) {
    var entry = buildManifestEntry(slug, thumbFilename);
    var merged = existingQuizzes.filter(function (q) {
      return q.slug !== slug;
    });
    merged.push(entry);
    return merged;
  }

  function downloadFile(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function writeFileToDir(dirHandle, filename, content) {
    return dirHandle.getFileHandle(filename, { create: true })
      .then(function (fileHandle) {
        return fileHandle.createWritable();
      })
      .then(function (writable) {
        return writable.write(content).then(function () {
          return writable.close();
        });
      });
  }

  titleInput.addEventListener('input', function () {
    quiz.title = titleInput.value;
    saveDraft();
  });

  descriptionInput.addEventListener('input', function () {
    quiz.description = descriptionInput.value;
    saveDraft();
  });

  thumbInput.addEventListener('change', function () {
    var file = thumbInput.files && thumbInput.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      quiz.thumbName = file.name;
      quiz.thumbDataUrl = reader.result;
      saveDraft();
      updateThumbPreview();
    };
    reader.onerror = function () {
      setStatus('Could not read that image file.', true);
    };
    reader.readAsDataURL(file);
  });

  thumbRemoveBtn.addEventListener('click', function () {
    quiz.thumbName = '';
    quiz.thumbDataUrl = '';
    thumbInput.value = '';
    saveDraft();
    updateThumbPreview();
  });

  addQuestionBtn.addEventListener('click', function () {
    quiz.questions.push(emptyQuestion());
    saveDraft();
    render();
    scrollToLastQuestion();
  });

  downloadBtn.addEventListener('click', function () {
    var result = validate();
    if (result.errors.length) {
      setStatus(result.errors[0], true);
      return;
    }
    var html = buildQuizPage(result.slug);
    var filename = result.slug + '.html';
    var thumbFilename = quiz.thumbDataUrl ? result.slug + '-thumb.' + extensionForDataUrl(quiz.thumbDataUrl) : null;
    var thumbBlob = thumbFilename ? dataUrlToBlob(quiz.thumbDataUrl) : null;
    existingQuizzes = mergeManifest(result.slug, thumbFilename);
    var manifestJson = JSON.stringify(existingQuizzes, null, 2);
    var savedNote = thumbFilename ? filename + ', ' + thumbFilename + ' and quizzes.json' : filename + ' and quizzes.json';

    if (window.showDirectoryPicker) {
      window.showDirectoryPicker()
        .then(function (dirHandle) {
          return writeFileToDir(dirHandle, filename, html)
            .then(function () {
              return writeFileToDir(dirHandle, 'quizzes.json', manifestJson);
            })
            .then(function () {
              return thumbBlob ? writeFileToDir(dirHandle, thumbFilename, thumbBlob) : null;
            });
        })
        .then(function () {
          saveExisting();
          setStatus('Saved ' + savedNote + ' to the folder you picked.');
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') {
            setStatus('Export cancelled.', true);
            return;
          }
          downloadFile(filename, html, 'text/html');
          saveExisting();
          window.setTimeout(function () {
            downloadFile('quizzes.json', manifestJson, 'application/json');
          }, 350);
          if (thumbBlob) {
            window.setTimeout(function () {
              downloadFile(thumbFilename, thumbBlob, mimeForDataUrl(quiz.thumbDataUrl));
            }, 700);
          }
          setStatus('Could not save directly — downloaded ' + savedNote + ' instead.');
        });
      return;
    }

    downloadFile(filename, html, 'text/html');
    saveExisting();
    window.setTimeout(function () {
      downloadFile('quizzes.json', manifestJson, 'application/json');
    }, 350);
    if (thumbBlob) {
      window.setTimeout(function () {
        downloadFile(thumbFilename, thumbBlob, mimeForDataUrl(quiz.thumbDataUrl));
      }, 700);
    }
    setStatus('Downloaded ' + savedNote + ' — drop them all into the /quizzes folder.');
  });

  clearBtn.addEventListener('click', function () {
    if (!window.confirm('Clear the current draft? This cannot be undone.')) {
      return;
    }
    quiz = defaultQuiz();
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    titleInput.value = '';
    descriptionInput.value = '';
    thumbInput.value = '';
    updateThumbPreview();
    render();
    setStatus('Cleared.');
  });

  titleInput.value = quiz.title;
  descriptionInput.value = quiz.description;
  updateThumbPreview();
  render();

  fetch('../quizzes/quizzes.json', { cache: 'no-store' })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (data) {
      if (!Array.isArray(data)) {
        return;
      }
      existingQuizzes = data;
      saveExisting();
    })
    .catch(function () {});
})();
