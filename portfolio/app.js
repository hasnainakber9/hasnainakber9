/* Portfolio behaviour: builds the film list, the Shorts grid and the hero strip from works.js,
   plays silent previews only while they are on screen, and opens the YouTube player on request. */
(function () {
  'use strict';
  var W = window.WORKS || { films: [], shorts: [], strip: [] };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- films ---------- */
  var filmList = $('filmList');
  W.films.forEach(function (f, i) {
    var art = el('article', 'film rv');
    var screen = el('button', 'film__screen');
    screen.type = 'button';
    screen.setAttribute('aria-label', 'Play ' + f.title);
    var img = el('img');
    img.src = f.poster; img.alt = f.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 1280; img.height = 720;
    screen.appendChild(img);
    screen.appendChild(el('span', 'play', 'Play · ' + f.length));
    screen.addEventListener('click', function () {
      if (screen.querySelector('iframe')) return;
      screen.appendChild(ytFrame(f.yt, f.title));
      screen.style.cursor = 'default';
      var p = screen.querySelector('.play'); if (p) p.remove();
    });
    var text = el('div', 'film__text');
    text.appendChild(el('p', 'film__no', 'Film ' + pad(i + 1) + ' / ' + pad(W.films.length)));
    text.appendChild(el('h3', 'film__title', f.title));
    text.appendChild(el('p', 'film__log', f.logline));
    var meta = el('p', 'film__meta');
    f.meta.forEach(function (m) { meta.appendChild(el('span', '', m)); });
    text.appendChild(meta);
    art.appendChild(screen); art.appendChild(text);
    filmList.appendChild(art);
  });

  /* ---------- shorts ---------- */
  var grid = $('shortGrid');
  W.shorts.forEach(function (s) {
    var card = el('button', 'card rv');
    card.type = 'button';
    card.setAttribute('aria-label', 'Watch: ' + s.title);
    var screen = el('span', 'card__screen');
    screen.appendChild(loop(s.id, s.title));
    screen.appendChild(el('span', 'card__no', s.id.toUpperCase()));
    screen.appendChild(el('span', 'play', 'Sound on'));
    card.appendChild(screen);
    card.appendChild(el('span', 'card__title', s.title));
    card.appendChild(el('span', 'card__tag', s.tag));
    card.addEventListener('click', function () { openPlayer(s.yt, s.title, 'tall'); });
    grid.appendChild(card);
  });

  /* ---------- long-form explainers ---------- */
  var longList = $('longList');
  (W.long || []).forEach(function (l) {
    var card = el('button', 'long rv');
    card.type = 'button';
    card.setAttribute('aria-label', 'Watch: ' + l.title);
    var screen = el('span', 'long__screen');
    var img = el('img');
    img.src = l.poster; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 1280; img.height = 720;
    screen.appendChild(img);
    screen.appendChild(el('span', 'play', 'Play \u00b7 ' + l.length));
    card.appendChild(screen);
    card.appendChild(el('span', 'long__title', l.title));
    card.appendChild(el('span', 'long__tag', l.tag));
    card.addEventListener('click', function () { openPlayer(l.yt, l.title, 'wide'); });
    longList.appendChild(card);
  });

  /* ---------- hero strip (two copies for a seamless roll) ---------- */
  var strip = $('strip');
  [0, 1].forEach(function (copy) {
    W.strip.forEach(function (id, i) {
      var cell = el('div', 'strip__cell');
      if (copy) cell.setAttribute('aria-hidden', 'true');
      cell.appendChild(loop(id, ''));
      cell.appendChild(el('span', '', pad(i + 1) + 'A'));
      strip.appendChild(cell);
    });
  });

  function loop(id, title) {
    var v = el('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = 'media/shorts/' + id + '.jpg';
    v.dataset.src = 'media/shorts/' + id + '.mp4';
    v.dataset.auto = '1';
    if (title) v.setAttribute('aria-label', 'Silent preview of ' + title); else v.setAttribute('aria-hidden', 'true');
    return v;
  }

  /* ---------- play previews only while visible ---------- */
  var feature = $('featureVideo'), featureToggle = $('featureToggle'), featurePaused = reduce;
  feature.dataset.auto = '1';
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.dataset.src && !v.src) v.src = v.dataset.src;
          if (reduce || (v === feature && featurePaused)) return;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) { v.pause(); }
      });
    }, { rootMargin: '120px 0px', threshold: 0.15 });
    document.querySelectorAll('video[data-auto]').forEach(function (v) { vio.observe(v); });

    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv, .slate, .steps li, .feature__grid > *').forEach(function (n, i) {
      n.classList.add('rv'); n.style.transitionDelay = (i % 4) * 70 + 'ms'; rio.observe(n);
    });
  } else {
    document.querySelectorAll('.rv').forEach(function (n) { n.classList.add('in'); });
  }
  function syncToggle() {
    featureToggle.textContent = featurePaused ? 'Play' : 'Pause';
    featureToggle.setAttribute('aria-label', (featurePaused ? 'Play' : 'Pause') + ' the preview');
  }
  syncToggle();
  featureToggle.addEventListener('click', function () {
    featurePaused = !featurePaused;
    if (featurePaused) feature.pause(); else { var p = feature.play(); if (p && p.catch) p.catch(function () {}); }
    syncToggle();
  });

  /* ---------- YouTube player ---------- */
  function ytFrame(id, title) {
    var f = el('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1';
    f.title = title;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    return f;
  }
  var player = $('player'), frame = $('playerFrame'), lastFocus = null;
  function openPlayer(id, title, shape) {
    if (!player.showModal) { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
    lastFocus = document.activeElement;
    player.classList.toggle('is-tall', shape === 'tall');
    player.classList.toggle('is-wide', shape !== 'tall');
    $('playerTitle').textContent = title;
    $('playerOut').href = 'https://www.youtube.com/watch?v=' + id;
    frame.textContent = '';
    frame.appendChild(ytFrame(id, title));
    player.showModal();
  }
  function closePlayer() { if (player.open) player.close(); }
  player.addEventListener('close', function () { frame.textContent = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  player.addEventListener('click', function (e) { if (e.target === player) closePlayer(); });
  $('playerClose').addEventListener('click', closePlayer);
  document.querySelectorAll('[data-yt]').forEach(function (b) {
    b.addEventListener('click', function () { openPlayer(b.dataset.yt, b.dataset.title || '', b.dataset.shape); });
  });

  /* ---------- small things ---------- */
  var tc = $('tc'), t0 = performance.now();
  if (tc && !reduce) {
    setInterval(function () {
      var ms = performance.now() - t0, s = Math.floor(ms / 1000);
      tc.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(Math.floor((ms % 1000) / 1000 * 24));
    }, 1000 / 12);
  }
  $('year').textContent = new Date().getFullYear();
  var ep = document.querySelector('[data-stat="episodes"]');
  if (ep && W.episodesPublished) ep.textContent = W.episodesPublished;
})();
