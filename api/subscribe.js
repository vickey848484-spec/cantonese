// api/subscribe.js
// Vercel Serverless Function: 收用户邮箱 + 写 Supabase
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { email, wechat = '', startDate, level, mbtiCode, user = {}, result = {} } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: '邮箱格式唔啱' });
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return res.status(400).json({ ok: false, error: '开始日期格式唔啱' });
  }

  // SQL to prepare in Supabase:
  //   create table signups (
  //     id uuid default gen_random_uuid() primary key,
  //     email text not null,
  //     wechat text,
  //     start_date date not null,
  //     level text,
  //     mbti_code text,
  //     user jsonb,
  //     result jsonb,
  //     source text,
  //     reminded_30 boolean default false,
  //     reminded_90 boolean default false,
  //     reminded_180 boolean default false,
  //     created_at timestamptz default now()
  //   );
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[subscribe] Supabase env not set, skipping DB write');
    return res.status(200).json({ ok: true, dev: true });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from('signups')
      .insert({
        email,
        wechat,
        start_date: startDate,
        level,
        mbti_code: mbtiCode,
        user,
        result,
        source: body.source || 'signup.html',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[subscribe] supabase error', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    console.error('[subscribe] crash', e);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
}
