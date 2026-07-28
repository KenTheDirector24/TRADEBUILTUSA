(function () {
  'use strict';

  document.querySelectorAll('.lesson-block__hero').forEach(function (hero) {
    var img = hero.querySelector('img');
    if (!img) return;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var ready = false;

    var prepare = function () {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      try {
        ctx.drawImage(img, 0, 0);
        ready = true;
      } catch (e) {
        ready = false;
      }
    };

    if (img.complete && img.naturalWidth) {
      prepare();
    } else {
      img.addEventListener('load', prepare);
    }

    var setActive = function (active) {
      hero.classList.toggle('is-pixel-hover', active);
    };

    img.addEventListener('mousemove', function (e) {
      if (!ready) return;
      var rect = img.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
      var y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
        setActive(false);
        return;
      }
      var alpha;
      try {
        alpha = ctx.getImageData(x, y, 1, 1).data[3];
      } catch (e) {
        alpha = 255;
      }
      setActive(alpha > 10);
    });

    img.addEventListener('mouseleave', function () {
      setActive(false);
    });
  });
})();
