# 班务管理（Class Admin）

班务管理 · 班级事务一体化管理平台

一个面向高校班级的**一体化班务管理系统**，覆盖综合素质测评（综测）、活动参与抽签、公告发布、成员管理、民主评议等核心场景，同时提供桌面端与移动端（响应式 + 移动端专用界面）。

> 💡 无需账号即可通过 **游客模式** 体验全部功能（演示数据，已脱敏）。

---

## ✨ 功能特性

### 📊 综测管理（综合素质测评）
- **七大板块**：S 学习成绩 / A 学风考勤 / B 集会政治学习 / C 星级宿舍 / D 文体活动 / E 社会实践 / F 奖惩附加
- 学生在线填报 + 佐证照片上传，系统自动按细则计算得分
- 班委分级审核（各板块由对应负责人审核：班长 / 团支书 / 学习委员等）
- 个人综测报表（文档风格）、班级排名总面板、未填写名单追踪
- 班委民主评议（全员匿名评分 + 统计汇总）

### 🎯 活动参与系统
- 活动创建 / 轮次抽签 / 指定参与 / 自行报名
- 委托机制：抽中后可委托他人代替，对方确认后生效
- 时间线动态、导出活动图片

### 📢 公告与成员
- 公告发布（班委）、置顶、详情页
- 班级成员名录：班委核心 / 职能班委 / 普通成员分组展示
- 在线人数实时统计（24h 曲线 + 在线名单）

### 🛡️ 游客模式
- 登录页一键进入，无需账号
- 全部数据脱敏展示（姓名 → 小A/小B…，分数 → 演示值），不暴露真实信息
- 管理/审核页面自动拦截，上传文件不可访问

### 📱 多端适配
- 桌面端：十字星芒首页 + 杂志式排版
- 移动端：独立 TabBar / 卡片式交互，自动跳转移动端界面

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 20
- npm ≥ 10

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/<your-username>/class-admin.git
cd class-admin

# 2. 安装依赖
npm install

# 3. 配置环境变量（复制示例并填写）
cp .env.example .env.local
# 编辑 .env.local：
#   AUTH_SECRET=你的随机密钥（生成：openssl rand -base64 32）
#   AUTH_URL=http://localhost:3001

# 4. 初始化数据库
npx prisma db push
node prisma/seed.js        # 导入演示学生数据（可选）

# 5. 启动开发服务器
npm run dev
# 打开 http://localhost:3001
```

### 登录方式

| 方式 | 说明 |
|---|---|
| 学号登录 | 使用学号 + 密码（初始密码由 `prisma/seed.js` 设置） |
| 游客模式 | 登录页点击「游客模式 · 无需账号体验」，浏览脱敏演示数据 |

---

## 🏗️ 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | [Next.js 16](https://nextjs.org)（App Router + Turbopack） |
| 前端 | React 19 · TypeScript · TailwindCSS 4 · GSAP |
| 数据库 | Prisma 5 + SQLite |
| 认证 | NextAuth v5（Credentials + JWT + bcrypt） |
| 图标 | lucide-react |
| 部署 | 支持 PM2 / Docker / Vercel（Node.js 服务） |

---

## 📁 项目结构

```
class-admin/
├── prisma/               # 数据库 Schema 与种子数据
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── app/              # 页面路由（App Router）
│   │   ├── api/          # 后端 API 路由
│   │   ├── m/            # 移动端页面（/m）
│   │   ├── zongce/       # 综测模块
│   │   ├── activities/   # 活动模块
│   │   ├── announcements/# 公告模块
│   │   └── members/      # 成员模块
│   ├── components/       # 共享组件
│   └── lib/              # 工具库（认证/权限/游客脱敏/综测计算）
├── .env.example          # 环境变量模板
├── .gitignore
├── LICENSE               # MIT
└── SECURITY.md           # 安全策略
```

---

## 🔐 安全说明

- **游客模式**在 API 层脱敏：游客请求返回演示数据，真实姓名/分数/上传文件永不出服务器
- 管理接口均有角色校验（`role === "admin"` 或班委标签检查），非授权返回 403
- 上传文件目录（`public/uploads/`）已加入 `.gitignore`，不会随仓库发布
- 发现漏洞请参考 [SECURITY.md](SECURITY.md) 的流程私下报告

---

## 🛠️ 常用命令

```bash
npm run dev      # 开发模式（端口 3001）
npm run build    # 生产构建
npm run start    # 生产启动（端口 3001）
npm run lint     # ESLint 检查
npx prisma studio # 数据库可视化工具
```

---

## 📄 许可证

[MIT](LICENSE) © class-admin contributors
