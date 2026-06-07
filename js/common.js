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
        <nav class="row" style="gap:4px;">
          ${items.map(it => `
            <a href="${it.href}" style="
              padding: 8px 12px; border-radius: 999px; font-size: 14px; font-weight: 700;
              ${active === it.key ? 'background: var(--pink); color: #fff;' : 'color: var(--text-soft);'}
            ">${it.label}</a>
          `).join('')}
        </nav>
      </div>
    `;
    document.body.prepend(bar);
  }

  global.Cantonese = {
    Store, LEVELS, loadJSON, getLevelByScore, getQuery,
    confetti, injectThemeToggle, injectTopbar, initTheme,
  };
})(window);
