# 识讲粤语 · YUE 测

粤语学习网站：水平自测 + MBTI 风格人格 + 学习时长 + 课程 / 语伴匹配 + 1/3/6 月自测推送。

## 本地预览

```bash
cd "/Users/vickeyl./iCloud云盘（归档）/Desktop/AI/Web"
python3 -m http.server 8000
```

然后浏览器打开 [http://localhost:8000](http://localhost:8000)。

> 注意：`/api/*` 路由在本地 http server 里跑不了（那是 Vercel Serverless Function）。
> 留邮箱页会 fallback 到 localStorage，不影响本地看效果。
> 完整 API 流程要 `npx vercel dev` 才会跑（需要装 Vercel CLI）。

## 文件结构

```
Web/
├── index.html              # 首页
├── test.html               # 水平测试 + MBTI 测试
├── result.html             # 结果页（等级 / 人格 / 时长 / 分享卡）
├── partner.html            # 语伴推荐
├── course.html             # 课程推荐
├── signup.html             # 留邮箱
├── js/
│   ├── common.js           # 公共：localStorage / 主题 / 顶导
│   ├── quiz.js             # 题目流程 + 计分
│   ├── calc.js             # 学习时长公式
│   ├── labeler.js          # 4 维 → 16 型
│   └── share.js            # 分享卡 + Canvas PNG
├── data/
│   ├── questions.json      # 10 道水平题 + 4 道 MBTI 题
│   ├── partners.json       # 语伴名单
│   ├── courses.json        # 课程列表
│   └── labels.json         # 16 型文案
├── css/
│   └── style.css           # 00后亚文化风
├── api/
│   ├── subscribe.js        # 收邮箱 → Supabase
│   └── push-reminder.js    # Cron 推邮件
├── vercel.json             # 部署 + cron 配置
└── README.md
```

## 怎么改数据（上线前必看）

### 改语伴
打开 `data/partners.json`，每条记录：

```json
{
  "id": "p1",
  "name": "阿欣",            // 显示名
  "emoji": "👧🏻",            // 头像占位
  "gender": "女",
  "age": 24,
  "region": "广州",
  "level": "入门",            // 入门 / 进阶 / 高阶
  "tags": ["听讲", "社交"],   // MBTI 标签：速成/慢热 + 听讲/倾偈 + 社交/独狼 + 学院/野生
  "intro": "一句话介绍",
  "contact": "wechat: xxx"   // 联系方式
}
```

### 改课程
打开 `data/courses.json`：

```json
{
  "id": "c1",
  "title": "课程名",
  "level": "入门",            // 入门 / 进阶 / 高阶
  "tags": ["速成", "学院"],   // MBTI 标签
  "type": "视频课",           // 视频课 / 1v1 直播 / 社群共学
  "duration": "2 周",
  "price": "¥99",
  "emoji": "🎯",
  "highlight": "一句话卖点",
  "link": "https://..."       // 课程购买链接
}
```

### 改题目
打开 `data/questions.json`：
- `levelQuestions` 数组：水平题，10 道
- `mbtiQuestions` 数组：MBTI 题，4 道，每道必须带 `dimension` 字段（speed / learn / social / style）

### 改等级名称
打开 `js/common.js`，改 `LEVELS` 数组里的 `name` 字段。

### 改 16 型文案
打开 `data/labels.json`，每型有：`title / emoji / tagline / desc / advice / matchTags`。

## 部署到 Vercel（5 步）

### 1. 注册
- [vercel.com](https://vercel.com) 用 GitHub 注册
- [supabase.com](https://supabase.com) 注册（免费 PostgreSQL）
- [resend.com](https://resend.com) 注册（免费 3000 邮件/月）

### 2. Supabase 建表
登录 Supabase → SQL Editor → 跑：

```sql
create table signups (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  wechat text,
  start_date date not null,
  level text,
  mbti_code text,
  user jsonb,
  result jsonb,
  source text,
  reminded_30 boolean default false,
  reminded_90 boolean default false,
  reminded_180 boolean default false,
  created_at timestamptz default now()
);
```

### 3. Resend 配发件域名
Resend 后台 → Domains → Add Domain → 按提示加 DNS 记录 → 验证。

### 4. Vercel 部署
- 把代码 push 到 GitHub
- Vercel 后台 → Import Project → 选这个 repo
- 等 build 通过
- **环境变量**（Project Settings → Environment Variables）：
  ```
  SUPABASE_URL              = https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi...
  RESEND_API_KEY            = re_xxxxxx
  RESEND_FROM               = "Vickey 老师" <hello@your-domain.com>
  SITE_URL                  = https://cantonese-xxx.vercel.app
  CRON_SECRET               = 随机字符串（防止别人手动调 cron）
  ```

### 5. 验证 cron
Vercel 后台 → Deployments → 看 Logs，搜 `push-reminder` 看到 `checked 0` 即正常。
也可以手测：

```bash
curl -X POST https://cantonese-xxx.vercel.app/api/push-reminder \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 1/3/6 月推送怎么跑

`vercel.json` 配的是 UTC 时间 `0 1 * * *` = 北京时间 9:00。

逻辑：
1. 每天早上 9:00（北京）Vercel 触发 `api/push-reminder.js`
2. 函数查 Supabase：找出 `start_date = 今天 - 30/90/180 天` 且 `reminded_XX = false` 的用户
3. 给每个用户发 Resend 邮件
4. 标记 `reminded_XX = true`（避免重复发）

如果想看推送效果：
- Supabase 手动改一条 `start_date` 为 29 天前
- 等第二天 9:00 看 Resend Dashboard
- 或者现在 `curl` 调 `/api/push-reminder`（Vercel 会立刻跑）

## 主题切换

页面右下角 🌓 按钮可切深色 / 亮色。状态存 localStorage。

## 已知限制

- **本地 server 不能跑 API** —— `/api/subscribe` 在 `python3 -m http.server` 下不存在。前端 fallback 到 localStorage 兜底。
- **微信扫码登录没做** —— 公众号模板消息申请周期 7 天，建议先用邮件跑通流程。
- **没有账号体系** —— 邮箱就是 ID。删 email 记录 = 退订。
- **没有退订页** —— `unsubscribe.html` 还没写，用户点退订会 404。补一个简单的就行（下一步）。
- **题目是占位** —— 上线前需要 Vickey 审一遍题目的准确度。

## 下一步

1. Vickey 审题目 + 改语伴数据 + 改课程数据
2. 部署 Vercel + 配 Supabase + Resend
3. 写 `unsubscribe.html`
4. 跑一周看推送打开率，调文案
5. 接入抖音/小红书引流链接
