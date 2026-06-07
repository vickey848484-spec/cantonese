// api/subscribe.js
// Vercel Serverless Function: 收用户邮箱 + 写 Airtable
//
// 部署前置：
//   1. 在 Airtable 建一个 base "Cantonese Signups"
//      字段：email / wechat / startDate / level / mbtiCode / source / timestamp / reminded_30 / reminded_90 / reminded_180
//   2. 去 https://airtable.com/create/tokens 拿 Personal Access Token
//      权限：data.records:read + data.records:write on the base
//   3. 在 Vercel 后台设环境变量：
//      AIRTABLE_TOKEN  = patxxxxxx
//      AIRTABLE_BASE_ID = appxxxxxx
//      AIRTABLE_TABLE   = Signups
//   4. 本地可用 `vercel dev` 测试

import { createClient } from '@supabase/supabase-js';
// 改用 Supabase 演示（更省事），下面用 Supabase 写。
// 如果想用 Airtable，把上面 import 删掉，把实现换成 Airtable REST。

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

  // ---------- 写到 Supabase ----------
  // 准备 SQL：
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
    // 没配置数据库：开发期直接 200，避免阻塞
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
