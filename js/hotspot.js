(function () {
  'use strict';

  var CHECK_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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

    var STORAGE_KEY = 'tb:hotspot-progress:' + window.location.pathname + ':' + (root.getAttribute('data-part') || rootIndex);

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
    };

    var found = new Set(readSavedFound());

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
        }
      });
    });

    var thumbByView = {};
    thumbs.forEach(function (thumb) {
      thumbByView[thumb.getAttribute('data-hotspot-thumb')] = thumb;

      var check = document.createElement('span');
      check.className = 'hotspot__thumb-check';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = CHECK_ICON;
      thumb.appendChild(check);
    });

    var updateThumbComplete = function (view) {
      if (!view) return;
      var thumb = thumbByView[view.getAttribute('data-hotspot-view')];
      if (!thumb) return;
      var viewMarkers = view.querySelectorAll('.hotspot__marker');
      var allFound = viewMarkers.length > 0 && Array.prototype.every.call(viewMarkers, function (m) {
        return found.has(m.getAttribute('data-hotspot-id'));
      });
      thumb.classList.toggle('is-complete', allFound);
    };

    views.forEach(updateThumbComplete);

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var target = thumb.getAttribute('data-hotspot-thumb');

        thumbs.forEach(function (t) {
          var isActive = t === thumb;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        views.forEach(function (view) {
          view.hidden = view.getAttribute('data-hotspot-view') !== target;
        });

        resetPanel();
      });
    });
  });
})();
