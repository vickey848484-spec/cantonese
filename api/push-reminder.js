// api/push-reminder.js
// Vercel Cron Job: 每天 9:00 (北京時間) 跑一次
// 找出 startDate + 30/90/180 天的用户，發郵件提醒重新自測
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const REMIND_DAYS = [30, 90, 180];

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_FROM = process.env.RESEND_FROM || 'Vickey 老師 <hello@example.com>';
  const SITE_URL = process.env.SITE_URL || 'http://localhost:8000';

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: 'env not set' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const summary = { checked: 0, sent: [], skipped: [] };

  for (const days of REMIND_DAYS) {
    const target = new Date(today);
    target.setDate(today.getDate() - days);
    const targetStr = target.toISOString().split('T')[0];

    const flag = `reminded_${days}`;
    const { data: rows, error } = await supabase
      .from('signups')
      .select('id, email, level, mbti_code, wechat')
      .eq('start_date', targetStr)
      .eq(flag, false);

    if (error) {
      console.error(`[reminder] query ${days}d error`, error);
      continue;
    }

    summary.checked += rows.length;

    for (const u of rows) {
      try {
        await sendReminder({
          resend, from: RESEND_FROM, to: u.email,
          days, level: u.level, mbtiCode: u.mbti_code, siteUrl: SITE_URL,
        });
        await supabase.from('signups').update({ [flag]: true }).eq('id', u.id);
        summary.sent.push({ email: u.email, days });
      } catch (e) {
        console.error('[reminder] send fail', u.email, e);
        summary.skipped.push({ email: u.email, reason: e.message });
      }
    }
  }

  return res.status(200).json({ ok: true, date: todayStr, ...summary });
}

async function sendReminder({ resend, from, to, days, level, mbtiCode, siteUrl }) {
  const LEVEL_LABEL = { entry: '入門', mid: '進階', high: '高階' };
  const HEADLINES = {
    30:  { zh: '一個月喇！你升級咗未？', emoji: '🌱' },
    90:  { zh: '3 個月喇！是時候 show 一下', emoji: '🔥' },
    180: { zh: '半年喇！粵語人認證？', emoji: '🏆' },
  };

  const tag = HEADLINES[days] || HEADLINES[30];
  const subject = `${tag.emoji} ${tag.zh}`;
  const testUrl = `${siteUrl}/test.html?ref=reminder&u=${encodeURIComponent(to)}`;

  const html = `
    <div style="font-family: 'PingFang SC', sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #f5f7ff; border-radius: 16px;">
      <div style="font-size: 48px; text-align: center; margin: 16px 0;">${tag.emoji}</div>
      <h1 style="font-size: 28px; text-align: center; color: #ffd60a;">${tag.zh}</h1>
      <p style="text-align: center; color: #a0a8c8; margin: 16px 0;">
        你嘅等級：<strong>${LEVEL_LABEL[level] || level}</strong> ·
        人格：<strong>${mbtiCode}</strong>
      </p>
      <p style="text-align: center; line-height: 1.6; margin: 24px 0;">
        ${days === 30
          ? '一個月前你測過嘅「聽唔明仔」/「識少少扮代表」/「嘴替本替」<br>依家可能已經升級啦 —— 重新測一次睇下！'
          : days === 90
          ? '3 個月喇，唔少學員已經可以同香港朋友傾偈無障礙。<br>你㗎呢？重新測一次，睇下你升級咗未！'
          : '半年喇！如果你能睇明呢封郵件嘅標題 ——<br>你大概已經系「嘴替本替」啦。重新測一次認證下！'}
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${testUrl}" style="display: inline-block; background: #ffd60a; color: #0a0a0a; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 900;">
          🚀 重新自測
        </a>
      </div>
      <p style="text-align: center; color: #a0a8c8; font-size: 13px; margin-top: 32px;">
        唔想再收到提醒？<a href="${siteUrl}/unsubscribe.html?e=${encodeURIComponent(to)}" style="color: #0066ff;">退訂</a>
      </p>
    </div>
  `;

  await resend.emails.send({ from, to, subject, html });
}
