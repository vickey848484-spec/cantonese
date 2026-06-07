/* ============================================================
 * common.js — 公共工具：localStorage / 主题切换 / 数据获取
 * ============================================================ */
(function (global) {
  'use strict';

  const KEYS = {
    quiz: 'cantonese_quiz_state',     // 答题进度
    result: 'cantonese_result',        // 最终测试结果
    user: 'cantonese_user',            // 用户信息
    theme: 'cantonese_theme',          // dark / light
  };

  const Store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) {}
    },
    KEYS,
  };

  /* ---------- 主题切换 ---------- */
  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
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

  /* ---------- 粤语字注音 ----------
   * 字典：粤语字 → 普通话
   * 长词在前避免被拆开
   */
  const JYUT_LIST = [
    // 等级 / 标签名
    ['听唔明仔',     '听不懂的人'],
    ['识少少扮代表', '装懂王'],
    ['嘴替本替',     '嘴替本尊'],

    // 短语（长词）
    ['唔该晒',       '谢谢'],
    ['听唔明',       '听不懂'],
    ['唔该',         '谢谢'],
    ['老友记',       '老朋友'],
    ['食字',         '谐音梗'],
    ['执生',         '临场应变'],
    ['饮茶',         '喝早茶'],
    ['食烟',         '抽烟'],
    ['利是逗来',     '红包拿来'],
    ['倾偈',         '聊天'],
    ['我哋',         '我们'],
    ['一齐',         '一起'],
    ['咩嚟㗎',       '什么东西'],
    ['搞掂',         '搞定'],
    ['几劲',         '厉害'],
    ['扮代表',       '装懂'],
    ['嘴替',         '嘴替'],
    ['边度',         '哪里'],
    ['点解',         '为什么'],
    ['几时',         '什么时候'],
    ['边个',         '谁'],
    ['咁啱',         '正好'],
    ['咁样',         '这样'],
    ['啲嘢',         '东西'],
    ['靓仔',         '帅哥'],
    ['靓女',         '美女'],

    // 单字（粤语高频字）
    ['嘅', '的'],
    ['咩', '什么'],
    ['咗', '了'],
    ['唔', '不'],
    ['係', '是'],
    ['嚟', '来'],
    ['揾', '找'],
    ['哋', '们'],
    ['乜', '什么'],
    ['冇', '没有'],
    ['咁', '那么'],
    ['啲', '些'],
    ['啱', '合适'],
    ['嗰', '那个'],
    ['喎', '啊'],
    ['係', '是'],
    ['边', '哪'],
    ['啦', '啦'],
    ['喇', '了'],
    ['睇', '看'],
    ['攞', '拿'],
    ['畀', '给'],
    ['瞓', '睡'],
    ['返', '回'],
    ['喺', '在'],
    ['度', '里'],
    ['嘢', '东西'],
  ];

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 自动扫描 root 内所有文本节点，把粤语字替换成 <ruby> 注音标签
   * 跳过：script / style / .no-jyut / input / textarea / 已处理的 ruby
   */
  function applyJyut(root) {
    if (!root) root = document.body;
    // 长词在前
    const keys = JYUT_LIST.map(([k]) => k).sort((a, b) => b.length - a.length);
    const dict = Object.fromEntries(JYUT_LIST);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script, style, .no-jyut, ruby, .jyut-done, input, textarea'))
          return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);

    for (const node of targets) {
      let html = node.nodeValue;
      let changed = false;
      for (const k of keys) {
        const re = new RegExp(escapeReg(k), 'g');
        if (re.test(html)) {
          html = html.replace(re, `<ruby>${k}<rt>${dict[k]}</rt></ruby>`);
          changed = true;
        }
      }
      if (changed) {
        const tmp = document.createElement('span');
        tmp.className = 'jyut-done';
        tmp.innerHTML = html;
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        node.replaceWith(frag);
      }
    }
  }

  /* ---------- 加载 JSON 数据 ---------- */
  async function loadJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`加载 ${path} 失败：${res.status}`);
    return res.json();
  }

  /* ---------- 等级名称与映射 ---------- */
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

  /* ---------- URL query 解析 ---------- */
  function getQuery(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* ---------- Confetti 小动效（不依赖库）---------- */
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

  /* ---------- 注入主题切换按钮 ---------- */
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

  /* ---------- 顶部导航 ---------- */
  function injectTopbar(active) {
    const items = [
      { key: 'home',   label: '首页',   href: 'index.html' },
      { key: 'test',   label: '测一测', href: 'test.html' },
      { key: 'course', label: '选课',   href: 'course.html' },
      { key: 'partner',label: '找语伴', href: 'partner.html' },
    ];
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="topbar-inner">
        <a class="logo" href="index.html"><span class="pink">识</span><span class="blue">讲</span>粤语</a>
        <nav class="row" style="gap:4px;">
          ${items.map(it => `
            <a href="${it.href}" style="
              padding: 8px 12px; border-radius: 999px; font-size: 14px; font-weight: 600;
              ${active === it.key ? 'background: var(--pink); color: #fff;' : 'color: var(--text-soft);'}
            ">${it.label}</a>
          `).join('')}
        </nav>
      </div>
    `;
    document.body.prepend(bar);
  }

  /* ---------- 暴露 ---------- */
  global.Cantonese = {
    Store,
    LEVELS,
    loadJSON,
    getLevelByScore,
    getQuery,
    confetti,
    injectThemeToggle,
    injectTopbar,
    initTheme,
    applyJyut,
    JYUT_LIST,
  };
})(window);
