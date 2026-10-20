# StudyOS 阶段进度

## 阶段 1：工程初始化、页面设计、响应式 UI — 完成

- 在独立 `studyos/` 目录建立 React + TypeScript + Vite 工程，并先保存 PRD、设计、架构与实施计划；父目录已有文件未改动。
- 配置 Tailwind CSS v4、shadcn/ui Radix、Lucide、React Router、TanStack Query、React Hook Form、Zod、ECharts、Supabase、Vitest、Playwright 和严格 TypeScript。
- 设置 `/studyos/` base path、HashRouter、中文 SaaS Dashboard、桌面固定侧栏和手机五项底栏。
- 加入 Loading、Empty、Error、Success、未配置状态、错误边界、主题和安全区适配。
- Playwright 检查登录页和工作区在 360、390、430px 无横向溢出，并检查桌面布局。

## 阶段 2：Supabase 认证、数据库、RLS — 代码完成，云端待手工配置

- 邮箱密码登录、持久会话、受保护路由、退出清缓存、恢复邮件和设置新密码流程已实现；前端无注册入口。
- 添加 Supabase PKCE 回调与 HashRouter 桥接、Publishable Key 校验和会话用户变化时的 Query 缓存隔离。
- 编写七张业务表的 migration：所有者归属、外键和复合外键、唯一约束、检查约束、查询索引、更新触发器与逐操作 RLS 策略。
- 加入 62 条 pgTAP 断言的 RLS 测试脚本，并手工维护前端数据库类型。
- **未验证**：环境没有 Docker 命令，未启动本地 Supabase、应用迁移或运行 `supabase test db`；没有访问用户的 Supabase 项目，也未配置远端 Auth/RLS。操作步骤见 `docs/DEPLOYMENT.md`。

## 阶段 3：任务、日志、项目核心 CRUD — 完成

- 任务支持创建、查看、编辑、删除、状态、优先级、分类、搜索筛选排序、列表/看板、计划/截止日期、逾期标记及项目和里程碑关联。
- 学习日志支持多条日记录、历史日期、分类、Markdown 内容、独立时长、项目关联、编辑删除和每日复盘。
- 项目支持创建编辑、归档恢复、外部链接、里程碑 CRUD、关联任务/活动及基于关联任务的进度。
- Playwright 对任务 CRUD 与状态更新、项目—里程碑—任务关联、活动项目关联及活动 CRUD 进行浏览器级流程检查。

## 阶段 4：统计、周复盘、数据导出、体验完善 — 完成

- 统计从活动日志和任务完成时间读取真实数据，支持 7/30/90 天趋势、365 天热力图、分类占比、周总时长、任务状态、目标进度和连续记录天数。
- 周复盘和每日复盘使用用户与日期/周一组合唯一键 upsert；浏览器检查覆盖更新后不产生重复记录。
- 设置支持显示名、时区、每周目标、主题、JSON 全表和 CSV 导出；导出限制于当前 RLS 用户。
- 日期测试覆盖用户时区、夏令时切换、周一自然周与跨年日期。

## 阶段 5：测试、部署工作流、说明文档 — 代码完成，发布待外部设置

- 添加 GitHub Actions：`npm ci`、Lint、严格类型检查、Vitest、Vite 构建、Playwright，再通过官方 Pages Actions 发布静态产物。
- 添加 Supabase 和 GitHub Pages 手工配置说明；仓库变量只使用 URL 与 Publishable Key。
- 最终本地检查结果记录在本次交付报告。Playwright 使用测试专用会话和拦截的合成 REST 响应，不访问真实账户。
- `npm ci`：成功，按锁文件安装 517 个包；`npm run lint`：退出码 0，有 React Fast Refresh、Hook Form/React Compiler 非阻断警告。
- `npm run typecheck`：通过；`npm run test:run`：13 个文件、26 项通过；`npm run test:e2e`：12 项通过，覆盖桌面、360/390/430px、登录门禁、图表、任务和活动 CRUD、关联以及复盘更新。
- `npm run build`：Vite `8.3.4` 成功。首页 JS 724 KB（gzip 216 KB），懒加载统计页 593 KB（gzip 199 KB）；仍有超过 500 KB 的分块提醒。
- **未验证**：没有 GitHub 仓库、Actions 变量或 Pages 设置，本地未进行线上部署；远端 Supabase 读写和 RLS 仍需真实项目验收。
- **未验证**：本环境没有 Docker，pgTAP RLS 套件未在本地数据库执行。
- **Git**：工作目录没有 Git 仓库，因此没有创建阶段性提交。
