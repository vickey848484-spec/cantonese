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
├── research.html           # 调研报告（9 章 + 30 条参考文献 + 6 个图表 + 计算器）
├── js/
│   ├── common.js           # 公共：localStorage / 主题 / 顶导
│   ├── quiz.js             # 题目流程 + 计分 + 倒计时
│   ├── calc.js             # 学习时长公式
│   ├── labeler.js          # 4 维 → 16 型
│   └── share.js            # 分享卡 + Canvas PNG
├── data/
│   ├── questions.json      # 10 道水平题 + 4 道 MBTI 题
│   ├── partners.json       # 语伴名单
│   ├── courses.json        # 课程列表
│   └── labels.json         # 16 型文案
├── css/
│   └── style.css           # 00后黑底蓝黄撞色风
├── api/
│   ├── subscribe.js        # 收邮箱 → Supabase
│   └── push-reminder.js    # Cron 推邮件
├── vercel.json             # 部署 + cron 配置
└── README.md
```

## 怎么改数据

### 改语伴
打开 `data/partners.json`，每条记录：

```json
{
  "id": "p1",
  "name": "阿欣",
  "emoji": "👧🏻",
  "gender": "女",
  "age": 24,
  "region": "广州",
  "level": "入门",
  "tags": ["听讲", "社交"],
  "intro": "一句话介绍",
  "contact": "wechat: xxx"
}
```

### 改课程
打开 `data/courses.json`。

### 改题目
打开 `data/questions.json`。

### 改等级名称
打开 `js/common.js`，改 `LEVELS` 数组的 `name` 字段。

### 改 16 型文案
打开 `data/labels.json`。

## 部署到 Vercel

1. 注册 [vercel.com](https://vercel.com) / [supabase.com](https://supabase.com) / [resend.com](https://resend.com)
2. Supabase 跑 SQL 建 signups 表
3. Resend 加发件域名
4. Vercel 导入项目，设环境变量：
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM`, `SITE_URL`
   - `CRON_SECRET`（防 cron 被外部触发）
5. 验证 cron：手动改一条 `start_date` 为 29 天前，看 Resend 后台
