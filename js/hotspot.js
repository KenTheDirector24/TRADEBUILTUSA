(function () {
  'use strict';

  var CHECK_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var NEXT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PREV_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  document.querySelectorAll('[data-hotspot]').forEach(function (root, rootIndex) {
    var markers = root.querySelectorAll('.hotspot__marker');
    var hint = root.querySelector('[data-hotspot-hint]');
    var content = root.querySelector('[data-hotspot-content]');
    var number = root.querySelector('[data-hotspot-number]');
    var title = root.querySelector('[data-hotspot-title]');
    var body = root.querySelector('[data-hotspot-body]');
    var views = root.querySelectorAll('[data-hotspot-view]');
    var thumbs = root.querySelectorAll('[data-hotspot-thumb]');
    var panel = root.querySelector('[data-hotspot-panel]');

    var total = markers.length;

    var partKey = root.getAttribute('data-part') || rootIndex;
    var STORAGE_KEY = 'tb:hotspot-progress:' + window.location.pathname + ':' + partKey;

    var cloudPageId = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '').replace(/^\//, '').replace(/\//g, '-') || 'index';
    var cloudField = 'hotspots_' + String(partKey).replace(/[.\/\[\]~*]/g, '_');

    var readSavedFound = function () {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    var saveFound = function () {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(found)));
      } catch (e) {}
      if (window.TB && window.TB.saveCloudProgress) {
        var patch = {};
        patch[cloudField] = Array.from(found);
        window.TB.saveCloudProgress('lessons', cloudPageId, patch);
      }
    };

    var found = new Set(readSavedFound());

    if (window.TB && window.TB.hydratePageProgress) {
      window.TB.hydratePageProgress('lessons', cloudPageId, function (data) {
        var localList = readSavedFound();
        var cloudList = Array.isArray(data[cloudField]) ? data[cloudField] : [];
        var localKey = JSON.stringify(localList.slice().sort());
        var cloudKey = JSON.stringify(cloudList.slice().sort());
        if (cloudKey === localKey) {
          return false;
        }
        try {
          if (cloudList.length) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudList));
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        } catch (e) {}
        return true;
      });
    }

    var progress = document.createElement('p');
    progress.className = 'hotspot__progress';
    if (panel) {
      panel.insertBefore(progress, panel.firstChild);
    }

    root.setAttribute('data-hotspot-complete', 'false');

    var updateProgressText = function () {
      if (total && found.size >= total) {
        progress.textContent = 'All ' + total + ' functions found — nice work.';
        progress.classList.add('is-complete');
        if (root.getAttribute('data-hotspot-complete') !== 'true') {
          root.setAttribute('data-hotspot-complete', 'true');
          root.dispatchEvent(new CustomEvent('hotspot:complete', { bubbles: true }));
        }
      } else {
        progress.textContent = found.size + ' of ' + total + ' functions found';
      }
    };

    updateProgressText();

    var resetPanel = function () {
      markers.forEach(function (m) {
        m.setAttribute('aria-pressed', 'false');
      });
      hint.hidden = false;
      content.hidden = true;
    };

    markers.forEach(function (marker) {
      var badge = marker.querySelector('.hotspot__marker-badge');
      if (badge) {
        var check = document.createElement('span');
        check.className = 'hotspot__marker-check';
        check.setAttribute('aria-hidden', 'true');
        check.innerHTML = CHECK_ICON;
        badge.appendChild(check);
      }

      if (found.has(marker.getAttribute('data-hotspot-id'))) {
        marker.classList.add('is-found');
      }

      marker.addEventListener('click', function () {
        markers.forEach(function (m) {
          m.setAttribute('aria-pressed', m === marker ? 'true' : 'false');
        });

        number.textContent = 'Function ' + marker.getAttribute('data-hotspot-id');
        title.textContent = marker.getAttribute('data-title');
        body.textContent = marker.getAttribute('data-body');

        hint.hidden = true;
        content.hidden = false;

        var id = marker.getAttribute('data-hotspot-id');
        if (!found.has(id)) {
          found.add(id);
          marker.classList.add('is-found');
          saveFound();
          updateProgressText();
          updateThumbComplete(marker.closest('[data-hotspot-view]'));
          updateThumbNav();
          updateNextButton();
        }
      });
    });

    var thumbsArr = Array.prototype.slice.call(thumbs);
    var viewByTarget = {};
    views.forEach(function (view) {
      viewByTarget[view.getAttribute('data-hotspot-view')] = view;
    });

    var thumbByView = {};
    var connectors = [];
    thumbsArr.forEach(function (thumb, i) {
      thumbByView[thumb.getAttribute('data-hotspot-thumb')] = thumb;

      if (i > 0) {
        var connector = document.createElement('span');
        connector.className = 'hotspot__thumb-connector';
        connector.setAttribute('aria-hidden', 'true');
        thumb.parentNode.insertBefore(connector, thumb);
        connectors.push(connector);
      }

      var check = document.createElement('span');
      check.className = 'hotspot__thumb-check';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = CHECK_ICON;
      thumb.appendChild(check);
    });

    var isViewComplete = function (view) {
      var viewMarkers = view.querySelectorAll('.hotspot__marker');
      return viewMarkers.length > 0 && Array.prototype.every.call(viewMarkers, function (m) {
        return found.has(m.getAttribute('data-hotspot-id'));
      });
    };

    var updateThumbComplete = function (view) {
      if (!view) return;
      var thumb = thumbByView[view.getAttribute('data-hotspot-view')];
      if (!thumb) return;
      thumb.classList.toggle('is-complete', isViewComplete(view));
    };

    views.forEach(updateThumbComplete);

    var updateThumbNav = function () {
      thumbsArr.forEach(function (thumb, i) {
        var reached = true;
        if (i > 0) {
          var prevTarget = thumbsArr[i - 1].getAttribute('data-hotspot-thumb');
          var prevView = viewByTarget[prevTarget];
          reached = prevView ? isViewComplete(prevView) : true;
        }
        thumb.classList.toggle('is-locked', !reached);
      });

      connectors.forEach(function (connector, i) {
        var target = thumbsArr[i].getAttribute('data-hotspot-thumb');
        var view = viewByTarget[target];
        connector.classList.toggle('is-complete', view ? isViewComplete(view) : false);
      });
    };

    updateThumbNav();

    var nextBtn = null;
    var prevBtn = null;
    if (panel && thumbsArr.length > 1) {
      prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'btn btn-sm hotspot__panel-prev';
      prevBtn.innerHTML = PREV_ICON + '<span>Previous Image</span>';
      prevBtn.hidden = true;
      panel.appendChild(prevBtn);

      prevBtn.addEventListener('click', function () {
        var activeIndex = thumbsArr.findIndex(function (t) {
          return t.classList.contains('is-active');
        });
        var prev = thumbsArr[activeIndex - 1];
        if (prev) {
          activateView(prev);
        }
      });

      nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-sm hotspot__panel-next';
      nextBtn.innerHTML = '<span>Next Image</span>' + NEXT_ICON;
      nextBtn.disabled = true;
      panel.appendChild(nextBtn);

      nextBtn.addEventListener('click', function () {
        var activeIndex = thumbsArr.findIndex(function (t) {
          return t.classList.contains('is-active');
        });
        var next = thumbsArr[activeIndex + 1];
        if (next) {
          activateView(next);
        }
      });
    }

    var updateNextButton = function () {
      var activeView = Array.prototype.filter.call(views, function (v) {
        return !v.hidden;
      })[0];
      var activeIndex = thumbsArr.findIndex(function (t) {
        return t.classList.contains('is-active');
      });

      if (prevBtn) {
        prevBtn.hidden = !(activeIndex > 0);
      }

      if (nextBtn) {
        var hasNext = activeIndex > -1 && activeIndex < thumbsArr.length - 1;
        nextBtn.hidden = !hasNext;
        nextBtn.disabled = !(activeView && hasNext && isViewComplete(activeView));
      }
    };

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var switchView = function (target) {
      views.forEach(function (view) {
        view.hidden = view.getAttribute('data-hotspot-view') !== target;
      });

      resetPanel();
      updateNextButton();
    };

    var activateView = function (thumb) {
      var target = thumb.getAttribute('data-hotspot-thumb');

      thumbs.forEach(function (t) {
        t.classList.toggle('is-active', t === thumb);
      });

      var currentView = Array.prototype.filter.call(views, function (v) {
        return !v.hidden;
      })[0];

      if (reducedMotion || !currentView || currentView.getAttribute('data-hotspot-view') === target) {
        switchView(target);
        return;
      }

      currentView.classList.add('is-fading');

      var onFadeOut = function (e) {
        if (e.target !== currentView || e.propertyName !== 'opacity') return;
        currentView.removeEventListener('transitionend', onFadeOut);
        currentView.classList.remove('is-fading');

        switchView(target);

        var nextView = viewByTarget[target];
        if (nextView) {
          nextView.classList.add('is-fading');
          // Force reflow so the entering state transitions instead of jumping.
          void nextView.offsetWidth;
          nextView.classList.remove('is-fading');
        }
      };
      currentView.addEventListener('transitionend', onFadeOut);
    };

    updateNextButton();
  });
})();
