(function () {
  'use strict';

  document.querySelectorAll('[data-hotspot]').forEach(function (root) {
    var markers = root.querySelectorAll('.hotspot__marker');
    var hint = root.querySelector('[data-hotspot-hint]');
    var content = root.querySelector('[data-hotspot-content]');
    var number = root.querySelector('[data-hotspot-number]');
    var title = root.querySelector('[data-hotspot-title]');
    var body = root.querySelector('[data-hotspot-body]');
    var views = root.querySelectorAll('[data-hotspot-view]');
    var thumbs = root.querySelectorAll('[data-hotspot-thumb]');

    var resetPanel = function () {
      markers.forEach(function (m) {
        m.setAttribute('aria-pressed', 'false');
      });
      hint.hidden = false;
      content.hidden = true;
    };

    markers.forEach(function (marker) {
      marker.addEventListener('click', function () {
        markers.forEach(function (m) {
          m.setAttribute('aria-pressed', m === marker ? 'true' : 'false');
        });

        number.textContent = 'Part ' + marker.getAttribute('data-hotspot-id');
        title.textContent = marker.getAttribute('data-title');
        body.textContent = marker.getAttribute('data-body');

        hint.hidden = true;
        content.hidden = false;
      });
    });

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
