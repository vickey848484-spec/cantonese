/* ============================================================
 * common.js — 公共工具：localStorage / 主題切換 / 頂導
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
    if (!res.ok) throw new Error(`加載 ${path} 失敗：${res.status}`);
    return res.json();
  }

  const LEVELS = [
    { key: 'entry',  code: 0, name: '聽唔明仔',     short: '入門', cls: 'level-entry' },
    { key: 'mid',    code: 1, name: '識少少扮代表', short: '進階', cls: 'level-mid'   },
    { key: 'high',   code: 2, name: '嘴替本替',     short: '高階', cls: 'level-high'  },
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
    btn.title = '切換主題';
    btn.textContent = '🌓';
    btn.addEventListener('click', () => {
      toggleTheme();
      btn.textContent = Store.get(KEYS.theme, 'dark') === 'dark' ? '🌓' : '☀️';
    });
    document.body.appendChild(btn);
  }

  function injectTopbar(active) {
    const items = [
      { key: 'home',    i18n: 'topbar.home',     href: 'index.html' },
      { key: 'test',    i18n: 'topbar.test',     href: 'test.html' },
      { key: 'partner', i18n: 'topbar.partner',  href: 'partner.html' },
      { key: 'course',  i18n: 'topbar.course',   href: 'course.html' },
      { key: 'qa',      i18n: 'topbar.qa',       href: 'qa.html' },
      { key: 'research',i18n: 'topbar.research', href: 'research.html' },
      { key: 'about',   i18n: 'topbar.about',    href: 'about.html' },
    ];
    const lang = getLang();
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="topbar-inner">
        <a class="logo" href="index.html"><span class="pink" style="font-size: 30px;">識</span><span style="font-size: 22px;">講粵語</span></a>
        <nav class="row topbar-nav" style="gap:4px;">
          ${items.map(it => `
            <a href="${it.href}" class="topbar-link ${active === it.key ? 'is-active' : ''}" data-i18n="${it.i18n}">${t(it.i18n, lang)}</a>
          `).join('')}
        </nav>
        <button class="topbar-lang" id="lang-toggle" title="切換語言 / Language">
          ${LANG_LABEL[lang] || lang.toUpperCase()}
        </button>
      </div>
    `;
    document.body.prepend(bar);

    // 語言切換器
    const btn = bar.querySelector('#lang-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = getLang();
        const idx = (LANGS.indexOf(cur) + 1) % LANGS.length;
        const next = LANGS[idx];
        setLang(next);
        // 直接刷新当前页（最简单粗暴但可靠）
        location.reload();
      });
    }
  }

  /* ---------- 自定義光標（桌面端）---------- */
  function initCustomCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // 移動端跳過
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

    // 懸停可點擊元素時光標變大
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

    // 離開窗口時隱藏
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));
  }

  /* ---------- 滾動觸發動畫（IntersectionObserver）---------- */
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

  /* ---------- thiings 風格 SVG 圖標 ----------
   * 24x24 viewBox，1.5px 描邊，currentColor 繼承
   * 用法: Cantonese.icon('rocket', 'class="big"') 或 ${Cantonese.icon('rocket')}
   */
  const ICONS = {
    // UI 基礎
    'rocket':           '<path d="M12 2 L18 8 L12 22 L6 8 Z M9 8 L15 8 M9 11 L15 11"/>',
    'arrow-right':      '<path d="M5 12 L19 12 M13 6 L19 12 L13 18"/>',
    'arrow-counter-clockwise': '<path d="M3 12 A9 9 0 1 0 6 5.5 M3 4 L3 9 L8 9"/>',
    'check-circle':     '<circle cx="12" cy="12" r="9"/><path d="M8 12 L11 15 L16 9"/>',
    'circle-half':      '<circle cx="12" cy="12" r="9"/><path d="M12 3 L12 21"/>',
    'sparkle':          '<path d="M12 3 L13.5 9 L19 10.5 L13.5 12 L12 18 L10.5 12 L5 10.5 L10.5 9 Z M19 4 L20 6 L22 7 L20 8 L19 10 L18 8 L16 7 L18 6 Z"/>',
    'confetti':         '<path d="M5 5 L7 7 M19 5 L17 7 M5 19 L8 16 M19 19 L16 16 M12 12 L13 11 M9 14 L10 15 M15 9 L14 10 M12 3 L12 5 M12 19 L12 21 M3 12 L5 12 M19 12 L21 12"/>',

    // 互動/溝通
    'envelope':         '<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 7 L12 13 L21 7"/>',
    'envelope-simple':  '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 7 L12 13 L21 7"/>',
    'handshake':        '<path d="M3 12 L7 8 L10 11 L7 14 Z M21 12 L17 8 L14 11 L17 14 Z M10 11 L14 11 L14 14 L10 14 Z M7 14 L7 17 L10 14"/>',
    'heart':            '<path d="M12 21 C5 15 3 11 3 8 A5 5 0 0 1 12 6 A5 5 0 0 1 21 8 C21 11 19 15 12 21 Z" fill="currentColor" stroke="none"/>',
    'graduation-cap':   '<path d="M2 9 L12 4 L22 9 L12 14 Z" fill="currentColor" stroke="currentColor"/><path d="M6 11 L6 16 C6 17 9 19 12 19 C15 19 18 17 18 16 L18 11 M22 9 L22 14"/>',
    'share-network':    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11 L16 7 M8 13 L16 17"/>',
    'chat-circle-dots': '<path d="M21 12 A9 9 0 1 1 12 3 A9 9 0 0 1 21 12 Z M8 10 L8 10.01 M12 10 L12 10.01 M16 10 L16 10.01"/>',
    'microphone':       '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11 A7 7 0 0 0 19 11 M12 18 L12 21"/>',
    'star':             '<path d="M12 3 L14.5 9 L21 9.5 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.5 L9.5 9 Z"/>',

    // 概念/數據
    'target':           '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    'crosshair':        '<circle cx="12" cy="12" r="9"/><path d="M12 3 L12 7 M12 17 L12 21 M3 12 L7 12 M17 12 L21 12"/>',
    'dna':              '<path d="M6 4 C10 8 14 8 18 4 M6 20 C10 16 14 16 18 20 M6 8 C10 12 14 12 18 8 M6 16 C10 12 14 12 18 16"/>',
    'lightbulb':        '<path d="M9 17 L9 19 A1 1 0 0 0 10 20 L14 20 A1 1 0 0 0 15 19 L15 17 M12 3 A6 6 0 0 0 7 10 C7 13 9 14 9 17 L15 17 C15 14 17 13 17 10 A6 6 0 0 0 12 3 Z"/>',
    'brain':            '<path d="M8 6 A3 3 0 0 0 8 12 L8 18 A3 3 0 0 0 14 18 L14 12 A3 3 0 0 0 14 6 A3 3 0 0 0 8 6 Z M9 9 L9 15 M11 9 L11 15 M13 9 L13 15 M15 9 L15 15"/>',
    'clock':            '<circle cx="12" cy="12" r="9"/><path d="M12 7 L12 12 L16 14"/>',
    'hourglass':        '<path d="M7 3 L17 3 L17 7 L13 12 L17 17 L17 21 L7 21 L7 17 L11 12 L7 7 Z"/>',
    'magnifying-glass': '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15 L20 20"/>',
    'calculator':       '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 7 L16 7 M8 11 L9 11 M11 11 L12 11 M14 11 L15 11 M8 15 L9 15 M11 15 L12 15 M14 15 L15 15 M8 18 L9 18 M11 18 L12 18"/>',
    'funnel':           '<path d="M3 4 L21 4 L14 13 L14 20 L10 18 L10 13 Z"/>',
    'book-open':        '<path d="M12 6 C9 4 5 4 3 4 L3 19 C5 19 9 19 12 21 M12 6 C15 4 19 4 21 4 L21 19 C19 19 15 19 12 21"/>',
    'flame':            '<path d="M12 3 C12 3 8 7 8 11 C8 14 9 16 12 18 C15 16 16 14 16 11 C16 7 12 3 12 3 Z M12 8 C12 8 10 11 10 13 C10 15 11 16 12 17 C13 16 14 15 14 13 C14 11 12 8 12 8 Z"/>',
    'plant':            '<path d="M12 22 L12 14 M12 14 C12 11 9 8 6 8 C6 11 9 14 12 14 Z M12 14 C12 11 15 8 18 8 C18 11 15 14 12 14 Z M12 14 C12 9 9 5 4 5 C4 9 7 13 12 14 Z M12 14 C12 9 15 5 20 5 C20 9 17 13 12 14 Z"/>',
    'coffee':           '<path d="M4 8 L17 8 L17 16 A3 3 0 0 1 14 19 L7 19 A3 3 0 0 1 4 16 Z M17 10 L20 10 L20 14 L17 14 M8 3 L8 5 M11 3 L11 5 M14 3 L14 5"/>',
    'moon':             '<path d="M20 14 A8 8 0 1 1 10 4 A6 6 0 0 0 20 14 Z"/>',
    'flower':           '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>',
    'flower-lotus':     '<path d="M12 21 C8 18 5 14 5 10 C5 7 8 6 12 8 C16 6 19 7 19 10 C19 14 16 18 12 21 Z M12 8 C12 5 10 3 8 4 C9 6 11 7 12 8 Z M12 8 C12 5 14 3 16 4 C15 6 13 7 12 8 Z"/>',
    'leaf':             '<path d="M5 19 C5 11 11 5 19 5 C19 13 13 19 5 19 Z M5 19 L11 13"/>',
    'dice-five':        '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/>',
    'bolt':             '<path d="M13 2 L4 14 L11 14 L9 22 L20 10 L13 10 Z"/>',
    'smiley':           '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M8 14 A5 4 0 0 0 16 14"/>',
    'fox':              '<path d="M4 8 L9 12 L7 19 L12 16 L17 19 L15 12 L20 8 L14 10 L12 5 L10 10 Z" fill="#FF3366" stroke="#0a0a0a" stroke-width="1.5"/><circle cx="10" cy="13" r="1" fill="#0a0a0a"/><circle cx="14" cy="13" r="1" fill="#0a0a0a"/><path d="M12 15.5 L11 17 L13 17 Z" fill="#0a0a0a"/>',
    'crown':            '<path d="M3 9 L6 17 L18 17 L21 9 L17 12 L12 5 L7 12 Z" fill="#FFD60A" stroke="#0a0a0a" stroke-width="1.5"/><circle cx="12" cy="13" r="1.3" fill="#0066FF"/><circle cx="6.5" cy="12" r="0.8" fill="#FF3366"/><circle cx="17.5" cy="12" r="0.8" fill="#FF3366"/>',
    'egg':              '<path d="M3 16 C3 20 6 21 8 21 L8 11 L3 13 Z" fill="#FFD60A" stroke="#0a0a0a" stroke-width="1.5"/><path d="M21 16 C21 20 18 21 16 21 L16 11 L21 13 Z" fill="#FFD60A" stroke="#0a0a0a" stroke-width="1.5"/><circle cx="12" cy="14" r="3.5" fill="#FFFFFF" stroke="#FF3366" stroke-width="1.5"/><circle cx="10.5" cy="13.5" r="0.7" fill="#0a0a0a"/><circle cx="13.5" cy="13.5" r="0.7" fill="#0a0a0a"/><path d="M11 15.5 L12 17 L13 15.5 Z" fill="#0066FF"/>',
    'user':             '<circle cx="12" cy="8" r="4"/><path d="M4 21 C4 16 7 13 12 13 C17 13 20 16 20 21"/>',
    'bowl-food':        '<path d="M3 11 L21 11 L19 19 A2 2 0 0 1 17 21 L7 21 A2 2 0 0 1 5 19 Z M9 8 C9 9 10 10 12 10 C14 10 15 9 15 8 M7 9 C7 10 8 10 9 10 M15 9 C15 10 16 10 17 10"/>',
    'train':            '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M9 7 L15 7 M6 12 L18 12 M8 17 L6 21 M16 17 L18 21"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/>',
    'television':       '<rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M3 9 L21 9 M8 21 L16 21 M12 18 L12 21"/>',
    'briefcase':        '<rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9 7 L9 5 A1 1 0 0 1 10 4 L14 4 A1 1 0 0 1 15 5 L15 7 M3 13 L21 13"/>',
  };

  function icon(name, attrs = '') {
    if (!name) return '';
    const clean = String(name).replace(/^ph-/, '');
    const path = ICONS[clean];
    if (!path) return '';
    return `<svg class="ti ti-${clean}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${path}</svg>`;
  }

  /* ---------- 多語言 i18n ---------- */
  const LANGS = ['zh-HK', 'zh-CN', 'en'];
  const LANG_LABEL = { 'zh-HK': '繁', 'zh-CN': '简', 'en': 'EN' };
  let I18N = null;

  function getLang() {
    // 优先级：URL 参数 > localStorage > 浏览器语言 > 默认
    const fromUrl = Cantonese_getQuery('lang');
    if (fromUrl && LANGS.indexOf(fromUrl) >= 0) {
      Store.set('cantonese_lang', fromUrl);
      return fromUrl;
    }
    const saved = Store.get('cantonese_lang');
    if (saved && LANGS.indexOf(saved) >= 0) return saved;
    const nav = (navigator.language || 'zh-HK').toLowerCase();
    if (nav.indexOf('en') === 0) return 'en';
    if (nav.indexOf('zh-cn') === 0 || nav.indexOf('zh-sg') === 0) return 'zh-CN';
    return 'zh-HK';
  }
  function Cantonese_getQuery(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function setLang(lang) {
    Store.set('cantonese_lang', lang);
  }
  // 占位 — 实际 i18n 数据由 applyI18n 异步加载
  function t(key, lang) {
    lang = lang || getLang();
    if (!I18N || !I18N.ui || !I18N.ui[key]) return key;
    const entry = I18N.ui[key];
    let s = entry[lang] || entry['zh-HK'] || entry['en'] || key;
    // 简单占位替换 ${var}
    if (arguments.length > 2) {
      for (let i = 2; i < arguments.length; i++) {
        s = s.replaceAll('$' + (i - 1), arguments[i]);
      }
    }
    return s;
  }
  // 异步加载 i18n 字典 + 替换所有 [data-i18n] 占位
  async function applyI18n() {
    if (!I18N) {
      try {
        const res = await fetch('data/i18n.json', { cache: 'no-store' });
        I18N = await res.json();
      } catch (e) {
        console.warn('[i18n] load fail', e);
        return;
      }
    }
    const lang = getLang();
    document.documentElement.lang = (lang === 'zh-HK' || lang === 'zh-CN') ? 'zh-Hant' : 'en';
    // 替换 [data-i18n]（textContent，保留 HTML 标签转义）
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      const s = t(k, lang);
      if (s && s !== k) el.textContent = s;
    });
    // 替换 [data-i18n-html]（innerHTML，保留 HTML 标签）
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const k = el.getAttribute('data-i18n-html');
      const s = t(k, lang);
      if (s && s !== k) el.innerHTML = s;
    });
  }

  /* ---------- 傳播三件套：邀請碼 + 分享文案 ---------- */
  function genReferralCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
  function getReferralCode() {
    let code = Store.get('cantonese_referral');
    if (!code) {
      code = genReferralCode();
      Store.set('cantonese_referral', code);
    }
    return code;
  }

  const SHARE_TEMPLATES = {
    xiaohongshu: (mbtiCode, mbtiType, ref) =>
      `測了下粵語人格，超準！\n\n` +
      `你是 ${mbtiCode} · ${mbtiType.title}\n` +
      `${mbtiType.tagline}\n\n` +
      `一分鐘測出你的粵語人格 👇\n` +
      `${location.origin}/test.html?ref=${ref}\n\n` +
      `#粵語學習 #MBTI #自我認知 #學習博主`,

    wechat: (mbtiCode, mbtiType, ref) =>
      `我剛測了一個超準的粵語人格測試\n` +
      `測出來是 ${mbtiCode} · ${mbtiType.title}\n` +
      `${mbtiType.tagline}\n\n` +
      `你也來測下，看你是哪掛的 👇\n` +
      `${location.origin}/test.html?ref=${ref}`,

    moments: (mbtiCode, mbtiType, ref) =>
      `測了下我的粵語人格 → ${mbtiCode} ${mbtiType.title}\n` +
      `${mbtiType.tagline}\n\n` +
      `你也來測？\n` +
      `${location.origin}/test.html?ref=${ref}`,

    simple: (mbtiCode, mbtiType, ref) =>
      `測了下我的粵語人格：${mbtiCode} ${mbtiType.title}\n` +
      `${location.origin}/test.html?ref=${ref}`,
  };

  // 分享按鈕點擊後短暫反饋
  function flashShare(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
  }

  /* ---------- Q&A 渲染（10 個常見問題，三語 i18n）---------- */
  async function renderQA(container, data) {
    const filterEl = container.querySelector('#qa-filter');
    const listEl = container.querySelector('#qa-list');
    const lang = getLang();
    I18N = data;  // 注入字典

    // 兼容两种数据源：i18n.json（多语）或 qa.json（单语）
    const items = data.qa || data.items || [];

    function pick(obj) {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      return obj[lang] || obj['zh-HK'] || obj['zh-CN'] || obj['en'] || '';
    }

    function render(filterText) {
      const ft = (filterText || '').trim().toLowerCase();
      const matched = items.map(it => ({
        q: pick(it.q),
        a: pick(it.a),
        tag: pick(it.tag) || '',
      })).filter(it =>
        !ft || it.q.toLowerCase().includes(ft) || it.a.toLowerCase().includes(ft) || it.tag.toLowerCase().includes(ft)
      );
      if (!matched.length) {
        const noMatch = lang === 'en' ? `No match for "${filterText}"`
                       : lang === 'zh-CN' ? `没找到匹配「${filterText}」的问题`
                       : `沒找到匹配「${filterText}」嘅問題`;
        listEl.innerHTML = `<p class="muted text-sm center" style="padding: 24px;">${noMatch}</p>`;
        return;
      }
      const countLabel = lang === 'en' ? `${matched.length} FAQ · click to expand`
                       : lang === 'zh-CN' ? `共 ${matched.length} 个常见问题 · 点击展开`
                       : `共 ${matched.length} 個常見問題 · 點擊展開`;
      listEl.innerHTML = `
        <div class="text-sm muted" style="margin-bottom: 12px;">${countLabel}</div>
        <div class="stack">
          ${matched.map((it, i) => `
            <details class="qa-item">
              <summary class="qa-q">
                <span class="qa-q-tag">${it.tag}</span>
                <span class="qa-q-text">${it.q}</span>
              </summary>
              <div class="qa-a">${it.a}</div>
            </details>
          `).join('')}
        </div>
      `;
    }

    if (filterEl) {
      filterEl.addEventListener('input', e => render(e.target.value));
    }
    render('');
  }

  /* 把頁面上所有 data-icon 佔位元素替換為內聯 SVG */
  function initIcons(root) {
    if (!root) root = document;
    const placeholders = root.querySelectorAll('[data-icon]');
    placeholders.forEach(el => {
      const name = el.getAttribute('data-icon');
      if (!name) return;
      el.innerHTML = icon(name);
    });
  }

  global.Cantonese = {
    Store, LEVELS, loadJSON, getLevelByScore, getQuery,
    confetti, injectThemeToggle, injectTopbar, initTheme,
    initCustomCursor, initScrollReveal,
    icon, initIcons, ICONS,
    getReferralCode, genReferralCode, SHARE_TEMPLATES, flashShare,
    renderQA,
    t, applyI18n, getLang, setLang, LANGS,
  };
})(window);
