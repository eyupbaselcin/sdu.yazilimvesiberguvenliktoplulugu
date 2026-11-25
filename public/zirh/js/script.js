// ZIRH '26 — sade JavaScript (React gerektirmez)

// 0. Ana sayfaya gömülü mod (?gomulu=1): menü/footer gizlenir, yükseklik üst sayfaya bildirilir
(function () {
  var gomulu = window.parent !== window && /[?&]gomulu=1/.test(location.search);
  if (!gomulu) return;
  document.documentElement.classList.add('gomulu');
  var bildir = function () {
    window.parent.postMessage({ tur: 'zirh-yukseklik', yukseklik: document.body.scrollHeight }, location.origin);
  };
  window.addEventListener('load', bildir);
  document.addEventListener('DOMContentLoaded', function () {
    bildir();
    if (window.ResizeObserver) new ResizeObserver(bildir).observe(document.body);
    // Sayfa içi bağlantılar (#program vb.) ana sayfada doğru yere kaysın
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var hedef = document.querySelector(a.getAttribute('href'));
        var cerceve = window.frameElement;
        if (!hedef || !cerceve) return;
        e.preventDefault();
        var y = cerceve.getBoundingClientRect().top + hedef.getBoundingClientRect().top + window.parent.scrollY - 20;
        window.parent.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  });
})();
(function () {
  'use strict';

  // 1. Arka plan ağ animasyonu
  var canvas = document.getElementById('networkCanvas');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var particles = [];
    var resize = function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    var count = Math.min(55, Math.floor(window.innerWidth / 25));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 1
      });
    }

    var draw = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 240, 255, ' + 0.14 * (1 - dist / 140) + ')';
            ctx.lineWidth = 0.8;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  // 2. Mobil menü
  var menuBtn = document.getElementById('mobileMenuBtn');
  var menu = document.getElementById('mobileMenu');
  var menuIcon = document.getElementById('mobileMenuIcon');
  var setMenu = function (open) {
    menu.classList.toggle('hidden', !open);
    menuIcon.classList.toggle('fa-bars', !open);
    menuIcon.classList.toggle('fa-xmark', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menu.classList.contains('hidden'));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }

  // 3. Geri sayım (14 Aralık 2026 09:30, TR saati)
  var target = new Date('2026-12-14T09:30:00+03:00').getTime();
  var cdBox = document.getElementById('countdown');
  var cdEls = cdBox ? cdBox.querySelectorAll('.grid > div > span:first-child') : [];
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var tick = function () {
    if (cdEls.length !== 4) return;
    var d = Math.max(0, target - Date.now());
    var vals = [
      Math.floor(d / 86400000),
      Math.floor((d % 86400000) / 3600000),
      Math.floor((d % 3600000) / 60000),
      Math.floor((d % 60000) / 1000)
    ];
    for (var i = 0; i < 4; i++) cdEls[i].textContent = pad(vals[i]);
  };
  tick();
  setInterval(tick, 1000);

  // 4. Program sekmeleri
  var ACTIVE = 'px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-cyber-cyan text-slate-950 shadow-lg cursor-pointer';
  var PASSIVE = 'px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-slate-300 hover:text-white cursor-pointer';
  var tabs = ['main', 'ctf', 'workshops'];
  tabs.forEach(function (name) {
    var btn = document.getElementById('tab-' + name);
    if (!btn) return;
    btn.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var b = document.getElementById('tab-' + t);
        var c = document.getElementById('content-' + t);
        if (b) b.className = t === name ? ACTIVE : PASSIVE;
        if (c) c.classList.toggle('hidden', t !== name);
      });
    });
  });

  // 5. SSS akordeon
  var faq = document.getElementById('faqAccordion');
  if (faq) {
    faq.querySelectorAll(':scope > div > button').forEach(function (btn, idx) {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var body = document.getElementById('faq-body-' + idx);
        var icon = document.getElementById('faq-icon-' + idx);
        var open = body.classList.contains('hidden');
        body.classList.toggle('hidden', !open);
        if (icon) icon.classList.toggle('rotate-180', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  // 6. KVKK / Açık Rıza modalları
  var closeModals = function () {
    document.querySelectorAll('.legal-modal').forEach(function (m) { m.classList.add('hidden'); });
    document.body.style.overflow = '';
  };
  document.querySelectorAll('[data-legal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = document.getElementById('legal-' + btn.getAttribute('data-legal'));
      if (!m) return;
      m.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  });
  document.querySelectorAll('.legal-modal').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('[data-close]')) closeModals();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModals();
  });
})();
