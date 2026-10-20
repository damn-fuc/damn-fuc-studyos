# StudyOS 本地与云端配置

本文说明哪些步骤已由仓库准备、哪些必须由项目所有者在 Supabase / GitHub Dashboard 完成。仓库提交和本地构建不会自动配置云服务或发布网站。

## 1. 本地启动

环境：Node.js 24、npm 11。

```powershell
npm ci
Copy-Item .env.example .env.local
```

在 `.env.local` 设置：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

本地运行：

```powershell
npm run dev
```

Vite base 为 `/studyos/`，本地访问地址为 `http://localhost:5173/studyos/`。也可访问 `http://127.0.0.1:5173/studyos/`。不要将 `.env.local` 提交到 Git。

## 2. Supabase Dashboard 初始设置（需手工完成）

当前 Supabase 项目已经创建：组织 `damn-fuc's Org`，项目 `StudyOS`，Project Ref `hpjnehaxhkbitokmxktt`，区域 `ap-southeast-1`。数据库表、外键、索引和 RLS 已通过 Supabase 管理连接应用并核验；本地 `.env.local` 也已写入 Project URL 和 Publishable Key，且被 `.gitignore` 排除。项目创建时的月费报价为 $0；后续费用以 Dashboard 的用量与账单为准。

以下 Auth 设置仍需项目所有者在 Supabase Dashboard 手工完成：

1. 数据库密码只保存在 Supabase / 本地 CLI，不放入前端环境变量。
2. 打开 **Authentication → Sign In / Providers → Email**，关闭新用户自助注册。若 Dashboard 另有 **User Signups / Allow new users to sign up** 开关，也确认其关闭。该仓库的本地 `supabase/config.toml` 已将 signup 关闭，但远端项目不会被此文件自动修改。
3. 在 Authentication 的用户管理中由管理员创建或邀请个人账户。网站不含注册页面。
4. 在 **Authentication → URL Configuration** 设置 Site URL：

   ```text
   https://USERNAME.github.io/studyos/
   ```

   将以下地址加入 Redirect URLs（将 `USERNAME` 替换为 GitHub 用户名）：

   ```text
   https://USERNAME.github.io/studyos/
   http://localhost:5173/studyos/
   http://127.0.0.1:5173/studyos/
   ```

   Supabase 邮件回调先返回应用 base path，再由前端的认证桥接进入 `/#/reset-password`，因此不要把 `/#/…` 写进允许列表。
5. 如要稳定发送恢复邮件，在 **Authentication → SMTP Settings** 配置自己的 SMTP 发件服务与发件人。恢复邮件模板保留 Supabase 生成的安全确认链接。

## 3. 数据库迁移和 RLS 测试

需要安装 Docker Desktop 并保持运行，且安装 Supabase CLI。登录并绑定 Supabase 项目后：

```powershell
npx supabase login
npx supabase link --project-ref hpjnehaxhkbitokmxktt
npx supabase db push
```

当前远端迁移历史与仓库文件版本已对齐。`supabase/migrations/20261018041147_studyos_initial_schema.sql` 创建七张业务表、约束、复合外键、索引、更新时间/任务完成时间触发器、权限和逐操作 RLS 策略；后续迁移记录了云端字段对齐、索引清理和 `milestones.user_id` 查询索引。原始未应用迁移保存在 `supabase/archive/20261018000000_studyos_schema.sql`。

若要先在本地验证迁移与 pgTAP：

```powershell
npx supabase start
npx supabase db reset
npx supabase test db
```

`supabase/tests/studyos_rls.test.sql` 使用合成账户测试匿名权限、跨用户隔离、本人 CRUD、关联约束、唯一约束、负时长和完成时间保护。测试账户和数据只在事务中创建并回滚。

## 4. GitHub Pages 部署（需手工完成仓库设置）

1. 将项目推送到名为 `studyos` 的 GitHub 仓库，并把默认分支设为 `main`。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Settings → Secrets and variables → Actions → Variables** 新建：

   | Variable | 值 |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable Key |

   Publishable Key 是浏览器端公开键；不要使用 `sb_secret_...`、`service_role`、数据库密码或任何 Secret Key。
4. 推送到 `main` 或在 Actions 手动运行 **Build and deploy StudyOS**。工作流执行 `npm ci`、Lint、严格类型检查、Vitest、生产构建、Playwright 浏览器检查，然后上传和部署 `dist/`。
5. 确认 GitHub Actions 的 build 与 deploy jobs 均成功，再打开：

   ```text
   https://USERNAME.github.io/studyos/
   ```

   完成变量、Supabase Auth 和 RLS 实际检查前，不应把线上站点视为可用。

## 5. 认证、隐私和数据恢复

- 登录状态由 Supabase Auth 持久化；无会话时路由门禁不渲染私人页面，切换用户或退出会清空 TanStack Query 缓存。
- 数据访问只能使用 Publishable Key；数据库 grant 与 RLS 同时限制匿名和跨用户访问。
- `VITE_` 环境变量会被打包进浏览器。只放项目 URL 和 Publishable Key。
- JSON 导出包含全部业务表字段，可用于重建记录；CSV 导出包含表名及各记录字段。导出范围受当前登录用户 RLS 限制。
- 不要把真实论文稿件、未公开研究数据或账户凭据放入公开仓库。

## 6. 本地验收

```powershell
npm run lint
npm run typecheck
npm run test:run
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run test:e2e` 使用测试专用的 Supabase URL、合成会话和拦截的测试 REST 数据，不访问真实项目；覆盖登录门禁、360 / 390 / 430px 登录与工作区、桌面侧栏、统计图表初始化、任务 CRUD、项目/里程碑/任务/活动关联、活动 CRUD，以及每日和每周复盘的唯一键更新。Supabase SQL 测试需要 Docker；没有运行数据库时只能报告为待本地或 Dashboard 环境验证。
