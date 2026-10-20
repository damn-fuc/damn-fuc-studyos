# StudyOS 技术架构

## 1. 架构概览

```text
浏览器
  ├─ React / TypeScript / Vite 静态应用 (GitHub Pages)
  │    ├─ HashRouter、受保护路由、React Hook Form + Zod
  │    ├─ TanStack Query、功能模块页面与 shadcn/ui
  │    └─ ECharts 统计
  └─ Supabase Publishable Key + 当前用户 JWT
       ├─ Supabase Auth (邮箱密码 / 恢复)
       └─ PostgREST → PostgreSQL（RLS 在每次请求上授权）
```

浏览器是唯一应用运行端；没有服务器代理或 Service Role Key。Supabase Publishable Key 本身不授权读取私人表，业务访问必须通过已验证的 Auth JWT 和表级 RLS。GitHub Pages 上的配置只能包含 Supabase URL 和 Publishable Key。

## 2. 技术边界

- React、TypeScript `strict`、Vite、Tailwind CSS（官方 Vite 插件）、shadcn/ui、lucide-react。
- HashRouter 负责 SPA 页面状态，避免 Pages 对路径刷新返回 404。
- React Router 管导航；TanStack Query 管远端缓存和异步状态；Supabase SDK 是唯一业务数据访问入口。
- React Hook Form 管编辑状态，Zod schemas 在浏览器输入层验证；数据库约束再次校验关键不变量。
- ECharts 仅用于统计模块。日期、周界限、持续天数和导出作为纯函数，以便单元测试。
- `src/types/database.ts` 是与 SQL migration 同步维护的 Supabase 数据库类型；更改 migration 时要同步更新类型。

## 3. 目录边界

```text
src/
  app/                  路由、Providers、错误边界
  components/           共用布局与基础 UI
    ui/                 shadcn/ui 组件
  layouts/              登录壳与应用壳
  pages/                页面级组合，不放数据访问细节
  features/
    auth/                登录、恢复、会话门禁
    tasks/               任务 schema、Supabase service、表单
    logs/                活动、每日复盘与周报数据服务
    projects/            项目、里程碑、归档
    analytics/           日期汇总、纯统计、ECharts
    settings/            偏好和数据导出
  hooks/                 共享时间 hook
  lib/                   Supabase client、日期、CSV、错误处理
  styles/                Tailwind 入口与语义 CSS 变量
  types/                 数据库类型与域类型
supabase/migrations/     可审阅的 SQL schema 与 RLS
tests/                   Vitest 测试初始化
e2e/                     Playwright 浏览器检查
.github/workflows/       类型、测试、构建和 Pages 发布
docs/                    产品、设计、架构与实施记录
```

## 4. 路由与认证流程

- `/#/login`：邮箱密码登录、请求恢复邮件；无注册链接。
- `/#/`：Supabase PKCE 从根页面查询串交换会话；恢复事件由认证桥接进入恢复页面。
- `/#/reset-password`：仅在 `PASSWORD_RECOVERY` 会话事件后开放，校验并提交新密码。
- `/#/`、`/#/tasks`、`/#/logs`、`/#/projects`、`/#/analytics`、`/#/weekly`、`/#/settings`：必须有有效用户会话。
- Supabase 恢复/验证邮件的 `redirectTo` 使用站点根 URL（不含 `#`）；客户端收到 `PASSWORD_RECOVERY` 后把 HashRouter 路由改到恢复页面，避免认证 token fragment 与 router fragment 冲突。
- `onAuthStateChange` 订阅与启动时的 `getSession()` 恢复会话；退出/用户切换会清除 QueryClient 缓存。配置缺失时呈现说明而不构造假后端。

## 5. 数据模型与外键

业务表都使用 UUID 主键、`user_id` 指向 `auth.users(id)`、`created_at / updated_at`。可由父子关系推导归属的关联仍显式存 `user_id`，并使用复合唯一键和复合外键阻止跨用户引用。

| 表 | 关键字段 / 约束 |
| --- | --- |
| `user_settings` | `id`、唯一 `user_id`、`display_name`、`timezone` 默认 `Asia/Shanghai`、`weekly_goal_minutes` 非负、`theme` |
| `projects` | `id`、`user_id`、`name`、`description`、`kind`、`status`、`goal`、JSONB `external_links`、`archived_at`；`(id,user_id)` 唯一 |
| `milestones` | `project_id` + `user_id` 复合引用 projects；标题、说明、`due_date`、状态、排序；`(id,project_id,user_id)` 唯一 |
| `tasks` | `user_id`、标题、说明、分类、优先级、状态、`scheduled_date`、`due_date`、数据库触发器维护的 `completed_at`；可选项目和里程碑复合外键；里程碑存在时项目必须存在 |
| `activity_logs` | `user_id`、`activity_date date`、分类、标题、内容、`duration_minutes >= 0`、Markdown notes、可选项目复合外键 |
| `daily_reviews` | `user_id`、`review_date date`、收获、困难、明日计划；唯一 `(user_id, review_date)` |
| `weekly_reviews` | `user_id`、星期一 `week_start date`、成果、问题、下周目标；唯一 `(user_id, week_start)` |

主要查询索引：各表按 `user_id`；活动 `(user_id, activity_date desc)`；任务 `(user_id,status,scheduled_date)`、`(user_id,due_date)` 与 `(user_id,completed_at)`；项目 `(user_id,status)`；周复盘 `(user_id,week_start desc)`。更新时间和任务完成时间由数据库触发器维护。

删除关联项目默认受外键限制；UI 提供“先解绑关联”流程，避免静默丢失活动或任务。项目进度是读取后从关联任务计算，不冗余写入百分比。外链 JSONB 只用于简单 GitHub/论文/资源 URL；写入时逐项校验 `http(s)` URL。

## 6. RLS 与最小权限

七张业务表均 `ENABLE ROW LEVEL SECURITY`。每张表为 `authenticated` 单独建 SELECT / INSERT / UPDATE / DELETE policy，表达式为 `auth.uid() = user_id`；INSERT 用 `WITH CHECK`，UPDATE 同时用 `USING` 与 `WITH CHECK`。匿名角色不获业务表访问权限；迁移撤销 `anon` 表权限，仅授予 `authenticated` 所需操作权限。复合外键再验证所有关联均属同一用户。

前端从 `auth.getUser()` / auth session 获取当前 ID，并把它写入 INSERT payload；绝不信任客户端 user id 作为授权依据。RLS SQL 验证需由 Supabase Dashboard 或本地 Supabase 环境执行。

## 7. 数据流与统计

页面通过 TanStack Query 调用单一 feature service，再用 Supabase 查询；mutation 成功后按所属用户范围失效相关 query；失败保留表单并显示错误。任何写入不在客户端预先显示为已持久化的成功态。

`activity_date` 表示用户明确选择的本地日历日期，避免只按 UTC 时间戳分组。统计查询使用用户时区获取今日日期，再按 date 边界取样。连续天数只计算正时长活动日期；周复盘周一起算。任务状态从非完成变为完成时，数据库触发器记录 `completed_at`，任务完成不会写入 `activity_logs`。

JSON 导出含版本号、导出时间、账户 ID 和七张表全部可重建字段；CSV 使用 `table_name` 列区分记录，并保留 ID、`user_id`、外键、日期、创建/更新时间及 JSONB 内容。导出范围受 RLS 限制，可通过设置页下载。

## 8. 配置与部署

- `.env.example` 包含 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 两项示例名；本地真实值写入忽略的 `.env.local`。
- Vite `base: '/studyos/'`；HashRouter 让页面子路由无需 Pages 回源配置。
- Actions 运行 `npm ci`、类型检查、Vitest、生产构建后发布 `dist`；变量从 GitHub Actions Variables 注入构建环境。Publishable Key 是有意暴露的浏览器 key；不得注入 Secret/Service Role Key。
- GitHub Pages 从 Settings → Pages 选择 GitHub Actions。主分支名如非 `main`，需同步修改 workflow。
- Supabase URL Configuration 的 Site URL 与允许 Redirect URLs 需按真实用户名添加本地和线上站点根 URL。

## 9. 错误与隐私

应用级 Error Boundary 捕获渲染异常；各数据区分别呈现请求加载/错误/重试；Auth 网络错误不泄漏密码。登出及 token 失效时先清缓存再显示登录页。仓库只留 `.env.example`，忽略 `.env*` 并明确放行 `.env.example`；不得把真实科研活动或论文内容写入公开文件、fixtures、截图、日志或测试快照。
