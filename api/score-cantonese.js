// api/score-cantonese.js
// Vercel Serverless Function: 收音頻 → Whisper 轉寫 + GPT-4o-mini 評分
// 流程：base64 audio → Whisper(yue) → GPT-4o-mini(JSON mode) → 返回四項分數 + 建議
//
// 成本（單次跟讀 ~10 秒）：
//   - Whisper: ~$0.001
//   - GPT-4o-mini: ~$0.001
//   - 合計 < ¥0.02 / 次
//
// 環境變量（Vercel Dashboard → Settings → Environment Variables）：
//   - OPENAI_API_KEY: sk-... (必填，冇 key 會返 503 dev:true)
//   - OPENAI_BASE_URL: 可選，自訂 base url（例如用 Cloudflare 代理）
//   - SCORE_CANTONESE_SECRET: 可選，設咗就要 header x-secret 對返

const OPENAI_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export const config = {
  api: { bodyParser: { sizeLimit: '6mb' } },  // base64 比 raw 大 ~33%
};

export default async function handler(req, res) {
  // CORS（防止前端直接調用時出問題）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 可選 secret（防濫用）
  const secret = process.env.SCORE_CANTONESE_SECRET;
  if (secret && req.headers['x-secret'] !== secret) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.warn('[score-cantonese] OPENAI_API_KEY not set');
    return res.status(503).json({ ok: false, error: 'AI 評分暫時關閉（未配置 API key）', dev: true });
  }

  // ===== 入參驗證 =====
  const body = req.body || {};
  const { audio, mime = 'audio/webm', duration, target } = body;

  if (typeof audio !== 'string' || audio.length < 100) {
    return res.status(400).json({ ok: false, error: '音頻數據缺失' });
  }
  if (audio.length > 5.5 * 1024 * 1024) {
    return res.status(413).json({ ok: false, error: '音頻太大（>4MB）' });
  }
  if (!target || typeof target.yue !== 'string' || !target.yue.trim()) {
    return res.status(400).json({ ok: false, error: '目標句子缺失' });
  }

  // ===== 1. base64 → Buffer → Whisper =====
  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audio, 'base64');
    if (audioBuffer.length < 200) throw new Error('audio buffer too small');
  } catch (e) {
    return res.status(400).json({ ok: false, error: '音頻解碼失敗' });
  }

  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
  const filename = `cantonese.${ext}`;
  const audioFile = new File([audioBuffer], filename, { type: mime });

  let transcript = '';
  try {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'yue');                 // Cantonese
    formData.append('response_format', 'json');
    // Whisper prompt 提示它輸出繁體 + 粵語字
    formData.append('prompt', '以下是粵語發音。繁體中文。');

    const wRes = await fetch(`${OPENAI_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });
    if (!wRes.ok) {
      const errText = await wRes.text().catch(() => '');
      console.error('[score-cantonese] whisper fail', wRes.status, errText.slice(0, 200));
      return res.status(502).json({ ok: false, error: `Whisper 失敗 (${wRes.status})` });
    }
    const wData = await wRes.json();
    transcript = (wData.text || '').trim();
    if (!transcript) {
      return res.status(400).json({ ok: false, error: '冇聽到任何嘢，請再讀一次' });
    }
  } catch (e) {
    console.error('[score-cantonese] whisper crash', e);
    return res.status(500).json({ ok: false, error: 'Whisper 服務異常' });
  }

  // ===== 2. GPT-4o-mini 評分 =====
  const targetYue = target.yue;
  const targetZh  = target.zh || '';
  const prompt = `你係一個資深嘅粵語老師，要評價學生跟讀一句粵語嘅表現。

【目標句子】粵語：${targetYue}${targetZh ? `（國語意思：${targetZh}）` : ''}
【學生實際讀出（Whisper 轉寫）】：${transcript}

請根據以下四個維度評分（每項 0-100），並畀一句具體改善建議：
- pronunciation（發音準確度）：學生讀出嚟嘅字同目標句嘅字係咪一致
- tone（聲調自然度）：粵語 6 聲 9 調嘅自然程度（單憑文字好難判斷，給保守分）
- fluency（流利度）：句子係咪連貫、冇斷、冇重複
- vocabulary（用詞正確度）：用詞同目標句嘅貼近程度（同意/近義詞可接受）

回應格式（嚴格 JSON）：
{
  "overall": <0-100 總分，加權平均>,
  "scores": {
    "pronunciation": <0-100>,
    "tone": <0-100>,
    "fluency": <0-100>,
    "vocabulary": <0-100>
  },
  "transcript": "<Whisper 轉寫原樣>",
  "tip": "<一句粵語改善建議，30 字以內，具體指出邊度可以更好>"
}

注意：
1. 如果學生讀嘅嘢同目標句完全唔相關，pronunciation 同 vocabulary 都要低過 30
2. 如果學生只讀咗一半，pronunciation 唔好高過 60
3. 唔好打滿分 100（保守），好嘅表現 85-95，正常 60-75，差 30-50
4. 用 JSON 模式輸出，唔好有任何其他文字`;

  try {
    const gRes = await fetch(`${OPENAI_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你係一個嚴格但鼓勵性嘅粵語老師。永遠用 JSON 格式回應，唔好加任何解釋。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 400,
      }),
    });
    if (!gRes.ok) {
      const errText = await gRes.text().catch(() => '');
      console.error('[score-cantonese] gpt fail', gRes.status, errText.slice(0, 200));
      return res.status(502).json({ ok: false, error: `GPT 評分失敗 (${gRes.status})` });
    }
    const gData = await gRes.json();
    const content = gData.choices?.[0]?.message?.content || '{}';

    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) {
      console.error('[score-cantonese] gpt json parse fail', content);
      return res.status(502).json({ ok: false, error: 'GPT 回應格式錯誤' });
    }

    // 邊界檢查
    const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const sc = parsed.scores || {};
    const scores = {
      pronunciation: clamp(sc.pronunciation),
      tone:          clamp(sc.tone),
      fluency:       clamp(sc.fluency),
      vocabulary:    clamp(sc.vocabulary),
    };
    const overall = clamp(parsed.overall ?? Math.round(
      (scores.pronunciation * 0.4 + scores.tone * 0.25 + scores.fluency * 0.2 + scores.vocabulary * 0.15)
    ));

    return res.status(200).json({
      ok: true,
      transcript,
      scores,
      overall,
      tip: String(parsed.tip || '繼續練習！').slice(0, 120),
    });
  } catch (e) {
    console.error('[score-cantonese] gpt crash', e);
    return res.status(500).json({ ok: false, error: 'GPT 服務異常' });
  }
}