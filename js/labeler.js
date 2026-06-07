/* ============================================================
 * labeler.js — 4 维 → 16 型 MBTI 风格标签
 * 输入：4 字母代码 (如 SPWI)
 * 输出：{ title, emoji, tagline, desc, advice, matchTags }
 * ============================================================ */
(function (global) {
  'use strict';

  let DATA = null;

  async function load() {
    if (DATA) return DATA;
    DATA = await global.Cantonese.loadJSON('data/labels.json');
    return DATA;
  }

  // 把 4 字母代码转成完整类型对象
  function resolve(code) {
    if (!DATA) return null;
    return DATA.types[code] || null;
  }

  // 4 维字母的展开说明（用于详情展示）
  function dimensionsOf(code) {
    if (!DATA || !code) return [];
    const d = DATA.dimensions;
    return [
      { key: 'speed',  label: d.speed[code[0]]  || code[0],  pole: code[0] },
      { key: 'learn',  label: d.learn[code[1]]  || code[1],  pole: code[1] },
      { key: 'social', label: d.social[code[2]] || code[2], pole: code[2] },
      { key: 'style',  label: d.style[code[3]]  || code[3],  pole: code[3] },
    ];
  }

  global.Labeller = { load, resolve, dimensionsOf };
})(window);
