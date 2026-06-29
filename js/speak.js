/* ============================================================
 * speak.js — AI 跟讀評分頁
 * 流程：揀句 → TTS 示範（Web Speech API）→ MediaRecorder 錄音
 *       → POST /api/score-cantonese → 顯示四項分數 + 建議
 * ============================================================ */
(function () {
  'use strict';

  // ===== 3 句示範（入門 / 進階 / 高階）=====
  const SENTENCES = [
    {
      id: 's1', level: 'entry',
      yue: '你好，我叫 Vickey',
      zh: '你好，我叫 Vickey',
      py: 'nei5 hou2, ngo5 giu3 Vickey',
    },
    {
      id: 's2', level: 'mid',
      yue: '你食咗飯未啊？',
      zh: '你吃饭了吗？',
      py: 'nei5 sik6 zo2 faan6 mei6 aa3?',
    },
    {
      id: 's3', level: 'high',
      yue: '今日天氣幾好，不如我哋去行吓街？',
      zh: '今天天气真好，不如我们去逛街吧？',
      py: 'gam1 jat6 tin1 hei3 gei2 hou2, bat1 jyu4 ngo5 dei6 heoi3 haang4 haa5 gaai1?',
    },
  ];

  let currentIdx = 0;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordStartAt = 0;
  let isRecording = false;
  let isScoring = false;

  // ===== DOM refs =====
  const $ = (id) => document.getElementById(id);
  const grid = $('speak-grid');
  const micBtn = $('mic-btn');
  const micLabel = $('mic-btn-label');
  const stageStatus = $('stage-status');
  const resultCard = $('result-card');
  const retryBtn = $('retry-btn');
  const nextBtn = $('next-btn');

  function T(key) {
    try { return Cantonese.t(key); } catch (_) { return key; }
  }

  // ===== 渲染句子卡片 =====
  function renderCards() {
    grid.innerHTML = SENTENCES.map((s, i) => `
      <div class="speak-card ${i === currentIdx ? 'is-active' : ''}" data-idx="${i}" role="button" tabindex="0">
        <span class="level-tag level-${s.level}" data-i18n="speak.level.${s.level}">${T('speak.level.' + s.level)}</span>
        <div class="yue-text">${s.yue}</div>
        <div class="zh-text">${s.zh}</div>
        <button class="play-btn" type="button" data-play="${i}">${T('speak.btn.play')}</button>
      </div>
    `).join('');

    // 卡片点击 → 切换选中
    grid.querySelectorAll('.speak-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-play]')) return; // play 按钮不触发切换
        currentIdx = parseInt(card.dataset.idx, 10);
        renderCards();
        resultCard.classList.remove('is-shown');
        stageStatus.textContent = '';
      });
    });

    // ▶ 播放示範（Web Speech API，免費）
    grid.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.play, 10);
        playDemo(idx);
      });
    });
  }

  // ===== TTS 示範（Web Speech API）=====
  function playDemo(idx) {
    const s = SENTENCES[idx];
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(s.yue);
    utter.lang = 'zh-HK';
    utter.rate = 0.85;  // 慢一點，學員跟讀友善
    utter.pitch = 1.0;
    // 嘗試揀粵語聲線（部分瀏覽器只有普通話聲線，會 fall back 為 zh-HK 但聲線普通話）
    const voices = window.speechSynthesis.getVoices();
    const yueVoice = voices.find(v => /yue|粵|cantonese|hong kong/i.test(v.lang + ' ' + v.name));
    if (yueVoice) utter.voice = yueVoice;
    window.speechSynthesis.speak(utter);
  }

  // ===== 錄音狀態切換 =====
  function setRecording(on) {
    isRecording = on;
    micBtn.classList.toggle('is-recording', on);
    if (on) {
      micLabel.textContent = T('speak.btn.recording');
      stageStatus.textContent = '🎙️';
    } else {
      micLabel.textContent = T('speak.btn.record');
    }
  }
  function setScoring(on) {
    isScoring = on;
    micBtn.classList.toggle('is-scoring', on);
    micBtn.disabled = on;
    if (on) {
      micLabel.textContent = T('speak.btn.scoring');
      stageStatus.textContent = '🤔 ' + T('speak.btn.scoring');
    } else {
      micLabel.textContent = T('speak.btn.record');
    }
  }

  // ===== 開始 / 停止錄音 =====
  async function startRecording() {
    if (isScoring) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      stageStatus.textContent = '❌ ' + T('speak.tip.no-mic');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      // 優先 webm（Chrome/Firefox），Safari 會自動 fallback 到 mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      });
      mediaRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = (Date.now() - recordStartAt) / 1000;
        if (duration < 0.6) {
          stageStatus.textContent = '⚠️ ' + T('speak.tip.short');
          setRecording(false);
          return;
        }
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        submitAudio(blob, duration);
      });

      recordStartAt = Date.now();
      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      console.error('[speak] getUserMedia fail', e);
      if (e.name === 'NotAllowedError') {
        stageStatus.textContent = '❌ ' + T('speak.tip.no-mic');
      } else {
        stageStatus.textContent = '❌ ' + T('speak.tip.error');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setRecording(false);
  }

  // ===== 提交音頻到後端評分 =====
  async function submitAudio(blob, duration) {
    setScoring(true);
    stageStatus.textContent = '🤔 ' + T('speak.btn.scoring');
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // dataUrl 格式 "data:audio/webm;base64,XXX..."，只取 base64
      const base64 = String(dataUrl).split(',')[1];

      const s = SENTENCES[currentIdx];
      const res = await fetch('/api/score-cantonese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          mime: blob.type,
          duration: Math.round(duration * 10) / 10,
          target: { id: s.id, yue: s.yue, zh: s.zh },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || ('HTTP ' + res.status));
      }
      renderResult(data);
    } catch (e) {
      console.error('[speak] submit fail', e);
      stageStatus.textContent = '❌ ' + T('speak.tip.error');
    } finally {
      setScoring(false);
    }
  }

  // ===== 顯示評分結果 =====
  function renderResult(data) {
    const sc = data.scores || {};
    $('r-overall').textContent = data.overall ?? '--';
    $('r-transcript').textContent = data.transcript || '--';
    const fill = (id, val) => {
      const v = Math.max(0, Math.min(100, Number(val) || 0));
      $(id).textContent = v;
      $(id + '-bar').style.width = v + '%';
    };
    fill('r-pronunciation', sc.pronunciation);
    fill('r-tone',          sc.tone);
    fill('r-fluency',       sc.fluency);
    fill('r-vocabulary',    sc.vocabulary);
    $('r-tip').textContent = data.tip || '--';
    resultCard.classList.add('is-shown');
    stageStatus.textContent = '✅';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ===== 綁定錄音按鈕 =====
  micBtn.addEventListener('click', () => {
    if (isScoring) return;
    if (isRecording) stopRecording();
    else startRecording();
  });

  retryBtn.addEventListener('click', () => {
    resultCard.classList.remove('is-shown');
    stageStatus.textContent = '';
  });
  nextBtn.addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % SENTENCES.length;
    renderCards();
    resultCard.classList.remove('is-shown');
    stageStatus.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== 預載 voices（部分瀏覽器異步加載）=====
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  // ===== 啟動 =====
  async function boot() {
    await Cantonese.applyI18n();
    Cantonese.initTheme();
    Cantonese.injectThemeToggle();
    Cantonese.injectTopbar('speak');
    Cantonese.initIcons();
    Cantonese.initScrollReveal();
    renderCards();
    micBtn.disabled = false;
  }
  boot().catch(e => console.error('[speak] boot fail', e));
})();