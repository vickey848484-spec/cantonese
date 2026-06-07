/* ============================================================
 * quiz.js — 水平测试 + MBTI + 倒计时加载
 * ============================================================ */
(function (global) {
  'use strict';

  const { Store, loadJSON, getLevelByScore, confetti, getQuery } = global.Cantonese;

  let DATA = null;
  let state = null;

  function defaultState() {
    return {
      step: 0,
      levelAnswers: [],
      mbtiAnswers: [],
      levelScore: 0,
      level: null,
      mbtiCode: '',
      mbtiType: null,
      user: null,
    };
  }

  function restore() {
    const saved = Store.get(Store.KEYS.quiz);
    if (saved && typeof saved === 'object') {
      state = Object.assign(defaultState(), saved);
    } else {
      state = defaultState();
    }
  }

  function persist() { Store.set(Store.KEYS.quiz, state); }

  function getQuestionList() {
    if (!DATA) return [];
    return [...DATA.levelQuestions, ...DATA.mbtiQuestions];
  }
  function isMBTI(index) {
    return index >= DATA.levelQuestions.length;
  }

  function calcMBTICode() {
    if (!DATA) return '';
    // 字母映射必须跟 data/labels.json 里的 16 个 type key 完全一致
    //   speed:  S=速成  M=慢热
    //   learn:  P=听讲  T=倾偈
    //   social: T=社交  W=独狼
    //   style:  I=学院  E=野生
    const dims = { speed: ['S', 'M'], learn: ['P', 'T'], social: ['T', 'W'], style: ['I', 'E'] };
    const picks = { speed: 0, learn: 0, social: 0, style: 0 };
    DATA.mbtiQuestions.forEach((q, i) => {
      const ans = state.mbtiAnswers[i];
      if (ans === 0) picks[q.dimension] = 0;
      if (ans === 1) picks[q.dimension] = 1;
    });
    return dims.speed[picks.speed] + dims.learn[picks.learn] +
           dims.social[picks.social] + dims.style[picks.style];
  }

  function finalize() {
    if (!DATA) return null;
    state.levelScore = state.levelAnswers.reduce(
      (s, a, i) => s + (a === DATA.levelQuestions[i].answer ? 1 : 0), 0
    );
    state.level = getLevelByScore(state.levelScore, DATA.levelQuestions.length);
    state.mbtiCode = calcMBTICode();
    return state;
  }

  function renderQuestion(container) {
    const list = getQuestionList();
    const total = list.length;
    const idx = state.step;
    const q = list[idx];
    if (!q) return renderUserForm(container);

    const pct = Math.round((idx / total) * 100);
    const isMbti = isMBTI(idx);
    const ans = isMbti ? state.mbtiAnswers[idx - DATA.levelQuestions.length]
                       : state.levelAnswers[idx];

    container.innerHTML = `
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="question-card">
        <span class="question-num">
          ${isMbti ? '🧬 性格测试' : '📝 水平测试'} ·
          第 ${idx + 1} / ${total} 题
          ${q.category ? ` · ${q.category}` : ''}
        </span>
        <div class="question-text">${q.question}</div>
        <div class="options">
          ${q.options.map((opt, i) => `
            <button class="option" data-i="${i}">${opt}</button>
          `).join('')}
        </div>
        <div class="row mt-3" style="justify-content: space-between;">
          ${idx > 0 ? '<button class="btn btn-ghost" id="prev">← 上一题</button>' : '<span></span>'}
          <span class="text-sm muted" id="progress-text">${idx + 1} / ${total}</span>
        </div>
      </div>
    `;

    container.querySelectorAll('.option').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        if (isMbti) {
          state.mbtiAnswers[idx - DATA.levelQuestions.length] = i;
        } else {
          state.levelAnswers[idx] = i;
        }
        persist();
        setTimeout(() => {
          state.step++;
          persist();
          if (state.step >= total) {
            renderUserForm(container);
          } else {
            renderQuestion(container);
          }
        }, 200);
      });
    });

    const prev = container.querySelector('#prev');
    if (prev) prev.addEventListener('click', () => {
      state.step = Math.max(0, state.step - 1);
      persist();
      renderQuestion(container);
    });
  }

  function renderUserForm(container) {
    container.innerHTML = `
      <div class="question-card">
        <span class="question-num">📊 最后一步 · 算算你要学多久</span>
        <div class="question-text">告诉我 4 件事，给你算个准的时长 👇</div>

        <div class="stack">
          <div class="field">
            <label>你的年龄</label>
            <select class="select" id="age">
              <option value="u18">18 岁以下</option>
              <option value="18-25" selected>18 - 25</option>
              <option value="26-35">26 - 35</option>
              <option value="36-50">36 - 50</option>
              <option value="50+">50 以上</option>
            </select>
          </div>

          <div class="field">
            <label>性别</label>
            <select class="select" id="gender">
              <option value="f">女</option>
              <option value="m">男</option>
              <option value="o">其他 / 不透露</option>
            </select>
          </div>

          <div class="field">
            <label>地域（粤语接触度）</label>
            <select class="select" id="region">
              <option value="native">粤语区（广东/香港/澳门/广西）</option>
              <option value="exposed" selected>听过粤语 / 看过港剧</option>
              <option value="zero">完全没接触过</option>
            </select>
          </div>

          <div class="field">
            <label>每日学习时长（你打算投入多少）</label>
            <select class="select" id="minutes">
              <option value="15">15 分钟（佛系）</option>
              <option value="30" selected>30 分钟（标准）</option>
              <option value="60">60 分钟（认真）</option>
              <option value="90">90 分钟（卷王）</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-block btn-lg mt-3" id="submit">看结果 🚀</button>
      </div>
    `;

    container.querySelector('#submit').addEventListener('click', () => {
      const u = {
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        region: document.getElementById('region').value,
        minutes: parseInt(document.getElementById('minutes').value, 10),
      };
      state.user = u;
      Store.set(Store.KEYS.user, u);
      finalize();
      persist();
      const referredBy = Store.get('cantonese_referred_by') || null;
      const result = {
        level: state.level,
        levelScore: state.levelScore,
        levelTotal: DATA.levelQuestions.length,
        mbtiCode: state.mbtiCode,
        user: { ...u, referredBy },
        timestamp: Date.now(),
      };
      Store.set(Store.KEYS.result, result);
      // 测完后清掉 ref（避免影响下次测试）
      Store.remove('cantonese_referred_by');
      confetti(document.body, 40);
      showLoading(container, () => { location.href = 'result.html'; });
    });
  }

  // 倒计时加载（5 秒内完成 → 跳转）
  function showLoading(container, onDone) {
    const stages = [
      { icon: 'magnifying-glass', text: '分析紧你嘅答案...',   duration: 900 },
      { icon: 'calculator',        text: '揾你嘅学习时长...',   duration: 900 },
      { icon: 'dna',               text: '生成 MBTI 人格...',   duration: 1000 },
      { icon: 'funnel',            text: '匹配课程同语伴...',   duration: 900 },
      { icon: 'rocket',            text: '准备好喇！',            duration: 600 },
    ];
    const total = stages.reduce((s, st) => s + st.duration, 0); // 4300ms

    container.innerHTML = `
      <div class="question-card" style="min-height: 380px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px 24px;">
        <div style="font-size: 80px; line-height: 1; margin-bottom: 24px; color: var(--blue);" id="loading-icon"></div>
        <div class="display" style="font-size: 22px; margin-bottom: 32px; max-width: 320px; min-height: 30px;" id="loading-text">分析紧你嘅答案...</div>
        <div style="width: 100%; max-width: 320px;">
          <div class="progress"><div class="progress-fill" id="loading-bar" style="width: 0%"></div></div>
        </div>
        <div class="muted text-sm mt-2">
          倒数 <span id="loading-eta">${(total/1000).toFixed(1)}</span> 秒
        </div>
      </div>
    `;

    // 渲染图标
    const iconHost = container.querySelector('#loading-icon');
    iconHost.innerHTML = global.Cantonese.icon(stages[0].icon);

    const bar  = container.querySelector('#loading-bar');
    const text = container.querySelector('#loading-text');
    const eta  = container.querySelector('#loading-eta');

    let elapsed = 0;
    let i = 0;

    function tick() {
      if (i >= stages.length) {
        // 强制 100%
        bar.style.width = '100%';
        // 立即跳转（不等动画）
        onDone();
        return;
      }
      const stage = stages[i];
      text.textContent = stage.text;
      iconHost.innerHTML = global.Cantonese.icon(stage.icon);
      elapsed += stage.duration;
      const pct = Math.min(100, (elapsed / total) * 100);
      bar.style.width = pct + '%';
      eta.textContent = Math.max(0, ((total - elapsed) / 1000).toFixed(1));
      i++;
      setTimeout(tick, stage.duration);
    }

    setTimeout(tick, 50);
    confetti(document.body, 30);
  }

  async function init(container) {
    if (!DATA) DATA = await loadJSON('data/questions.json');
    restore();

    // 重新测一次（带 ?restart=1）或邮件回流（?ref=reminder）→ 重置 state
    if (getQuery('restart') === '1' || getQuery('ref') === 'reminder') {
      state = defaultState();
      state.user = Store.get(Store.KEYS.user) || null;
      persist();
      // 清掉 URL 参数，避免刷新再次重置
      const url = new URL(location.href);
      url.searchParams.delete('restart');
      url.searchParams.delete('ref');
      history.replaceState(null, '', url.toString());
    }

    if (state.step >= DATA.levelQuestions.length + DATA.mbtiQuestions.length) {
      renderUserForm(container);
    } else {
      renderQuestion(container);
    }
  }

  global.Quiz = { init, finalize, restore, state: () => state };
})(window);
