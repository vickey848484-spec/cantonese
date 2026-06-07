/* ============================================================
 * common.js — 公共工具：localStorage / 主题切换 / 顶导
 * ============================================================ */
(function (global) {
  'use strict';

  const KEYS = {
    quiz: 'cantonese_quiz_state',
    result: 'cantonese_result',
    user: 'cantonese_user',
    theme: 'cantonese_theme',
  };

  const Store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (_) { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) {}
    },
    KEYS,
  };

  function applyTheme(theme) {
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
    Store.set(KEYS.theme, theme);
  }
  function toggleTheme() {
    const cur = Store.get(KEYS.theme, 'dark');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }
  function initTheme() {
    const saved = Store.get(KEYS.theme, 'dark');
    applyTheme(saved);
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`加载 ${path} 失败：${res.status}`);
    return res.json();
  }

  const LEVELS = [
    { key: 'entry',  code: 0, name: '听唔明仔',     short: '入门', cls: 'level-entry' },
    { key: 'mid',    code: 1, name: '识少少扮代表', short: '进阶', cls: 'level-mid'   },
    { key: 'high',   code: 2, name: '嘴替本替',     short: '高阶', cls: 'level-high'  },
  ];
  function getLevelByScore(score, total) {
    const pct = score / total;
    if (pct < 0.4) return LEVELS[0];
    if (pct < 0.75) return LEVELS[1];
    return LEVELS[2];
  }

  function getQuery(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function confetti(target, count = 30) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return;
    const colors = ['#ff3366', '#00e5ff', '#ccff00', '#b367ff', '#ffd60a'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = `
        position: fixed; left: ${50 + (Math.random() - 0.5) * 60}%;
        top: 30%; width: 10px; height: 14px;
        background: ${colors[i % colors.length]};
        border-radius: 2px;
        pointer-events: none; z-index: 9999;
        animation: confetti ${1.2 + Math.random() * 0.8}s ease-out forwards;
        animation-delay: ${Math.random() * 0.3}s;
      `;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2500);
    }
  }

  function injectThemeToggle() {
    if (document.getElementById('theme-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.title = '切换主题';
    btn.textContent = '🌓';
    btn.addEventListener('click', () => {
      toggleTheme();
      btn.textContent = Store.get(KEYS.theme, 'dark') === 'dark' ? '🌓' : '☀️';
    });
    document.body.appendChild(btn);
  }

  function injectTopbar(active) {
    const items = [
      { key: 'home',    label: '首页',   href: 'index.html' },
      { key: 'test',    label: '测一测', href: 'test.html' },
      { key: 'course',  label: '选课',   href: 'course.html' },
      { key: 'partner', label: '找语伴', href: 'partner.html' },
      { key: 'research',label: '调研',   href: 'research.html' },
    ];
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="topbar-inner">
        <a class="logo" href="index.html"><span class="pink">识</span>讲粤语</a>
        <nav class="row topbar-nav" style="gap:4px;">
          ${items.map(it => `
            <a href="${it.href}" class="topbar-link ${active === it.key ? 'is-active' : ''}">${it.label}</a>
          `).join('')}
        </nav>
      </div>
    `;
    document.body.prepend(bar);
  }

  /* ---------- 自定义光标（桌面端）---------- */
  function initCustomCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // 移动端跳过
    if (document.getElementById('custom-cursor')) return;
    document.body.classList.add('has-custom-cursor');

    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
    document.body.appendChild(cursor);

    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;
    let raf = null;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx - 3}px, ${my - 3}px)`;
      if (!raf) raf = requestAnimationFrame(loop);
    });

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    // 悬停可点击元素时光标变大
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .card, .partner-card, .course-card, .card-flat, input, select, label')) {
        cursor.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .card, .partner-card, .course-card, .card-flat, input, select, label')) {
        cursor.classList.remove('is-hover');
      }
    });

    // 离开窗口时隐藏
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
  }

  /* ---------- 滚动触发动画（IntersectionObserver）---------- */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));
  }

  global.Cantonese = {
    Store, LEVELS, loadJSON, getLevelByScore, getQuery,
    confetti, injectThemeToggle, injectTopbar, initTheme,
    initCustomCursor, initScrollReveal,
  };
})(window);
