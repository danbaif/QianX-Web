/* ============================================================
   3D 卡片交互
   - 指针进入：卡片跟随指针倾斜（最大 ±11°），高光跟随，文字分层视差
   - 指针离开 / 松手 / 失焦：弹性归位到 0，回到"装裱好的印刷品"原状
   - 触屏：按住拖动可倾斜，松手归位；保留纵向滚动（touch-action: pan-y）
   - 减弱动态偏好：整个模块不启动，卡片保持平放
   - 无 JS：卡片仍是完整可读的静态卡（CSS 里没有依赖 JS 的可见性）
   ============================================================ */
(function () {
  'use strict';

  var tilt = document.getElementById('tilt');
  var card = document.getElementById('card');
  if (!tilt || !card) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) return;

  var MAX = function () { return window.innerWidth < 768 ? 10 : 14; };
  var LIFT = function () { return window.innerWidth < 768 ? 12 : 18; };

  var frame = 0;

  function apply(rx, ry, gx, gy, z) {
    tilt.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    tilt.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    card.style.setProperty('--gx', gx.toFixed(1) + '%');
    card.style.setProperty('--gy', gy.toFixed(1) + '%');
    card.style.setProperty('--tz', z.toFixed(1) + 'px');
    tilt.style.setProperty('--lift', z > 0 ? '1' : '0');
  }

  function reset() {
    tilt.classList.remove('is-live', 'is-pressed', 'is-settling');
    tilt.classList.add('is-settling');
    card.style.setProperty('--glare', '0');
    apply(0, 0, 50, 20, 0);
    window.clearTimeout(reset._t);
    reset._t = window.setTimeout(function () {
      tilt.classList.remove('is-settling');
    }, 1000);
  }

  function onMove(e) {
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var px = (e.clientX - r.left) / r.width;
    var py = (e.clientY - r.top) / r.height;
    // 允许指针略微越界仍保持倾斜（贴边时不突兀回弹）
    px = Math.min(1.12, Math.max(-0.12, px));
    py = Math.min(1.12, Math.max(-0.12, py));

    var ry = (px - 0.5) * 2 * MAX();     // 左右 → 绕 Y 轴
    var rx = (0.5 - py) * 2 * MAX();     // 上下 → 绕 X 轴

    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      apply(rx, ry, px * 100, py * 100, LIFT());
    });
    card.style.setProperty('--glare', '1');
  }

  tilt.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    tilt.classList.remove('is-hint', 'is-settling');
    tilt.classList.add('is-live');
  });

  tilt.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    if (!tilt.classList.contains('is-live')) return;
    onMove(e);
  });

  tilt.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'touch') return;
    reset();
  });

  tilt.addEventListener('pointerdown', function (e) {
    tilt.classList.remove('is-hint', 'is-settling');
    tilt.classList.add('is-live', 'is-pressed');
    if (e.pointerType === 'touch') onMove(e);
  });

  tilt.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'touch') return;
    if (!tilt.classList.contains('is-pressed')) return;
    onMove(e);
  });

  function endTouch(e) {
    if (e.pointerType !== 'touch') return;
    reset();
  }
  tilt.addEventListener('pointerup', endTouch);
  tilt.addEventListener('pointercancel', endTouch);

  window.addEventListener('blur', reset);

  // 首次提示：只跑一次，让"这张卡可以动"被看见
  window.setTimeout(function () {
    if (tilt.classList.contains('is-live')) return;
    tilt.classList.add('is-hint');
    tilt.addEventListener('animationend', function once() {
      tilt.classList.remove('is-hint');
      tilt.removeEventListener('animationend', once);
    });
  }, 1400);
})();

/* ============================================================
   音乐播放器：自动播 + 进度条 + 时间；播放/暂停在播放条左侧
   ============================================================ */
(function () {
  'use strict';
  var bgm = document.getElementById('bgm');
  var btn = document.getElementById('musicToggle');
  var player = document.getElementById('player');
  var fill = document.getElementById('playerFill');
  var timeEl = document.getElementById('playerTime');
  if (!bgm || !btn) return;
  bgm.volume = 0.4;   // 初始音量调小

  function fmt(v) { if (!isFinite(v)) return '0:00'; v = Math.floor(v); return Math.floor(v / 60) + ':' + ('0' + (v % 60)).slice(-2); }
  function setState(p) {
    btn.classList.toggle('is-playing', p);
    if (player) player.classList.toggle('is-playing', p);
    btn.setAttribute('aria-pressed', p ? 'true' : 'false');
    btn.setAttribute('aria-label', p ? '暂停音乐' : '播放音乐');
  }
  function tryPlay() {
    var pr = bgm.play();
    if (pr && pr.then) pr.then(function () { setState(true); }).catch(function () {});
  }

  bgm.addEventListener('play', function () { setState(true); });
  bgm.addEventListener('pause', function () { setState(false); });
  bgm.addEventListener('timeupdate', function () {
    if (fill && bgm.duration) fill.style.width = (bgm.currentTime / bgm.duration * 100).toFixed(2) + '%';
    if (timeEl) timeEl.textContent = fmt(bgm.currentTime) + (bgm.duration ? ' / ' + fmt(bgm.duration) : '');
  });
  bgm.addEventListener('loadedmetadata', function () {
    if (timeEl) timeEl.textContent = '0:00 / ' + fmt(bgm.duration);
  });
  bgm.addEventListener('error', function () {
    if (player) player.classList.add('is-mute');
    btn.disabled = true;
    btn.setAttribute('aria-label', '未找到音乐文件');
  });

  tryPlay();

  var armed = false;
  function arm(e) {
    if (e.target && e.target.closest && e.target.closest('#musicToggle')) return;
    if (armed) return;
    armed = true;
    if (bgm.paused) tryPlay();
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, arm, { passive: true });
  });

  btn.addEventListener('click', function () {
    if (btn.disabled || (player && player.classList.contains('is-mute'))) return;
    if (bgm.paused) tryPlay();
    else bgm.pause();
  });
})();

/* ============================================================
   祝福按钮：点击后从按钮弹出四字祝福词
   ============================================================ */
(function () {
  'use strict';
  var bar = document.getElementById('bless');
  var btn = document.getElementById('blessBtn');
  if (!bar || !btn) return;

  var COLORS = ['#FF6A52','#FFD08A','#FFF2E6','#FF9A76','#F5C76A','#FFB199','#FF8A5C'];
  var WORDS = ['生日快乐','万事胜意','平安喜乐','心想事成','前程似锦','岁岁平安','顺遂无虞','皆得所愿','岁岁欢愉','长乐未央','喜乐安康','诸事顺遂','得偿所愿','福暖四季','如你所愿','星河长明'];
  var last = [];

  function pick() {
    var pool = WORDS.filter(function (w) { return last.indexOf(w) === -1; });
    if (!pool.length) pool = WORDS;
    var w = pool[Math.floor(Math.random() * pool.length)];
    last.push(w);
    if (last.length > 6) last.shift();
    return w;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  btn.addEventListener('click', function () {
    var n = 8;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var el = document.createElement('span');
        el.className = 'bless-word';
        el.textContent = pick();
        // 均匀横向铺开 + 三排向下落到卡片上，避免挤成一团
        var dx = ((i / (n - 1)) - 0.5) * 300;
        var dy = -(70 + (i % 3) * 50) + rand(-8, 8);
        var rot = rand(-16, 16);
        el.style.setProperty('--dx', dx.toFixed(0) + 'px');
        el.style.setProperty('--dy', dy.toFixed(0) + 'px');
        el.style.setProperty('--rot', rot.toFixed(0) + 'deg');
        el.style.color = COLORS[i % COLORS.length];
        el.style.animationDelay = (i * 0.05).toFixed(2) + 's';
        bar.appendChild(el);
        setTimeout(function () { el.remove(); }, 2200);
      })(i);
    }
  });
})();
