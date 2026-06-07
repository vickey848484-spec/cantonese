/* ============================================================
 * share.js — 分享卡（HTML 渲染 + Canvas 导出 PNG）
 * ============================================================ */
(function (global) {
  'use strict';

  function renderCard({ container, level, mbtiType, mbtiCode }) {
    if (!mbtiType) return;
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    el.innerHTML = `
      <div class="share-card" id="share-card-inner">
        <div class="share-card-inner">
          <div class="share-emoji">${mbtiType.emoji || '🌟'}</div>
          <div class="share-level">${level.short} · ${level.name}</div>
          <div class="share-title">${mbtiCode}</div>
          <div class="share-tagline">${mbtiType.tagline || ''}</div>
          <div class="share-desc">${mbtiType.desc || ''}</div>
        </div>
        <div class="share-cta">扫码 / 测一测你的粤语人格 →</div>
      </div>

      <div class="row" style="justify-content: center;">
        <button class="btn btn-ghost" id="copy-text">📋 复制文案</button>
        <button class="btn btn-blue" id="download-png">⬇️ 下载图片</button>
      </div>
    `;

    el.querySelector('#copy-text').addEventListener('click', () => {
      const txt = composeText(level, mbtiType, mbtiCode);
      copyToClipboard(txt).then(
        () => flash(el.querySelector('#copy-text'), '已复制 ✓'),
        () => flash(el.querySelector('#copy-text'), '复制失败，手动选吧')
      );
    });

    el.querySelector('#download-png').addEventListener('click', () => {
      downloadPNG(el.querySelector('#share-card-inner'));
    });
  }

  function composeText(level, mbtiType, mbtiCode) {
    return [
      `我的粤语人格：${mbtiCode} · ${mbtiType.title || ''}`,
      `${mbtiType.tagline || ''}`, '',
      `${mbtiType.desc || ''}`, '',
      `测一测你的 → 识讲粤语`,
    ].join('\n');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  function flash(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
  }

  // 黑底蓝黄撞色（无渐变）
  function downloadPNG(cardEl) {
    if (!cardEl) return;
    const level = cardEl.querySelector('.share-level')?.textContent || '';
    const code = cardEl.querySelector('.share-title')?.textContent || '';
    const tagline = cardEl.querySelector('.share-tagline')?.textContent || '';
    const desc = cardEl.querySelector('.share-desc')?.textContent || '';
    const emoji = cardEl.querySelector('.share-emoji')?.textContent || '🌟';

    const W = 720, H = 900;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // 撞色边框
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(0, 0, 8, H);
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(W - 8, 0, 8, H);

    // 撞色装饰方块
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(W - 140, 60, 80, 80);
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(60, H - 160, 80, 80);

    ctx.textAlign = 'center';

    ctx.font = '120px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(emoji, W / 2, 180);

    // level pill
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    const pillW = ctx.measureText(level).width + 48;
    drawRoundRect(ctx, W / 2 - pillW / 2, 220, pillW, 44, 4);
    ctx.fillStyle = '#ffd60a';
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(level, W / 2, 250);

    // 4 字母 code
    ctx.font = 'bold 110px "PingFang SC", sans-serif';
    ctx.fillStyle = '#ffd60a';
    ctx.fillText(code, W / 2, 380);

    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.fillStyle = '#0066ff';
    ctx.fillText(tagline, W / 2, 430);

    ctx.font = '20px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    wrapText(ctx, desc, W / 2, 510, W - 120, 32);

    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('扫码 / 测一测你的粤语人格 →', W / 2, H - 60);

    const link = document.createElement('a');
    link.download = `粤语人格-${code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const chars = text.split('');
    let line = '';
    let yy = y;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = chars[i];
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
  }

  /* ---------- 专属邀请海报（750x1334 竖图，朋友圈/小红书适用）---------- */
  function downloadPoster({ mbtiCode, mbtiType, level, ref }) {
    if (!mbtiType) return;
    const W = 750, H = 1334;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 黑底
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // 撞色横条（上下）
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(0, H - 10, W, 10);

    // 撞色侧条
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(0, 0, 8, H);

    // 撞色装饰方块（右上 + 左下）
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(W - 110, 80, 70, 70);
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(40, H - 200, 70, 70);

    // 顶部：等级徽章
    const badgeColor = level.cls === 'level-entry' ? '#0066ff'
                    : level.cls === 'level-mid'   ? '#ffd60a'
                    : '#ff3366';
    const badgeTextColor = level.cls === 'level-mid' ? '#0a0a0a' : '#fff';
    ctx.fillStyle = badgeColor;
    const badgeW = 240, badgeH = 70;
    const badgeX = (W - badgeW) / 2;
    ctx.fillRect(badgeX, 100, badgeW, badgeH);
    ctx.fillStyle = badgeTextColor;
    ctx.font = 'bold 30px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.name, W / 2, 100 + badgeH / 2);

    // 4 字母 MBTI 大字
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 240px "PingFang SC", sans-serif';
    ctx.fillText(mbtiCode, W / 2, 400);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "PingFang SC", sans-serif';
    ctx.fillText(mbtiType.title, W / 2, 540);

    // tagline
    ctx.fillStyle = '#0066ff';
    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.fillText(mbtiType.tagline || '', W / 2, 590);

    // 描述（换行）
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '22px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, mbtiType.desc, 60, 660, W - 120, 36);
    ctx.textAlign = 'center';

    // 分隔线
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 1000);
    ctx.lineTo(W - 80, 1000);
    ctx.stroke();

    // CTA 钩子
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 36px "PingFang SC", sans-serif';
    ctx.fillText('测一测你的粤语人格', W / 2, 1070);

    // 邀请码大字
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '20px "PingFang SC", sans-serif';
    ctx.fillText('你的专属邀请码', W / 2, 1115);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px monospace';
    ctx.fillText(ref, W / 2, 1170);

    // 底部
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 24px "PingFang SC", sans-serif';
    ctx.fillText('识讲粤语 · YUE 测', W / 2, 1230);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.fillText(location.origin + '/test.html', W / 2, 1270);

    // 下载
    const link = document.createElement('a');
    link.download = `粤语人格-${mbtiCode}-${ref}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  global.Share = { renderCard, composeText, copyToClipboard, downloadPNG, downloadPoster };
})(window);
