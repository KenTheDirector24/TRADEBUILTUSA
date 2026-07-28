(function () {
  var placeRequested = window.location.search.indexOf('place=1') !== -1 ||
    window.location.hash.indexOf('place') !== -1;
  if (!placeRequested) return;

  var figures = document.querySelectorAll('.hotspot__figure');
  if (!figures.length) return;

  figures.forEach(function (figure) {
    figure.hidden = false;
    figure.style.marginBottom = '24px';
  });

  var panel = document.createElement('div');
  panel.id = 'hotspot-placer-panel';
  panel.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999',
    'background:#111', 'color:#fff', 'font:12px/1.5 monospace',
    'padding:12px 14px', 'border-radius:8px', 'max-width:360px',
    'max-height:70vh', 'overflow:auto', 'box-shadow:0 8px 24px rgba(0,0,0,.4)'
  ].join(';');
  panel.innerHTML =
    '<div style="font-weight:bold;margin-bottom:6px;">Placement Mode — drag numbered markers</div>' +
    '<pre id="hotspot-placer-output" style="white-space:pre-wrap;margin:0 0 8px;"></pre>' +
    '<button id="hotspot-placer-copy" style="cursor:pointer;padding:4px 8px;">Copy positions</button>';
  document.body.appendChild(panel);

  var output = panel.querySelector('#hotspot-placer-output');

  var render = function () {
    var lines = [];
    figures.forEach(function (figure) {
      var view = figure.getAttribute('data-hotspot-view');
      var markers = figure.querySelectorAll('.hotspot__marker');
      markers.forEach(function (marker) {
        var hx = marker.style.getPropertyValue('--hx').trim();
        var hy = marker.style.getPropertyValue('--hy').trim();
        var id = marker.getAttribute('data-hotspot-id');
        var title = marker.getAttribute('data-title');
        lines.push('view ' + view + ' #' + id + ' (' + title + '): --hx: ' + hx + '; --hy: ' + hy + ';');
      });
    });
    output.textContent = lines.join('\n');
  };

  figures.forEach(function (figure) {
    var img = figure.querySelector('img');
    var markers = figure.querySelectorAll('.hotspot__marker');

    markers.forEach(function (marker) {
      marker.style.cursor = 'grab';

      var onPointerMove = function (e) {
        var rect = img.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        marker.style.setProperty('--hx', x.toFixed(1) + '%');
        marker.style.setProperty('--hy', y.toFixed(1) + '%');
        render();
      };

      var onPointerUp = function () {
        marker.style.cursor = 'grab';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      marker.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        marker.style.cursor = 'grabbing';
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      });

      marker.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }, true);
    });
  });

  panel.querySelector('#hotspot-placer-copy').addEventListener('click', function () {
    var text = output.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  });

  render();
})();
