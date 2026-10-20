# StudyOS

**Personal Learning & Research Workspace** — 私人学习与科研管理空间。

StudyOS 用于管理 Java、AI / Python 学习、科研项目、任务、活动日志与周复盘。前端采用 React + TypeScript + Vite，真实业务数据通过 Supabase Auth 和 PostgreSQL 保存，并在数据库启用 RLS。

## 本地启动

需要 Node.js 24 和 npm 11。首次运行：

```powershell
npm ci
Copy-Item .env.example .env.local
```

编辑 `.env.local`，填入 Supabase Project URL 与 Publishable Key：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

启动开发服务器：

```powershell
npm run dev
```

如果还未配置 Supabase，应用会显示连接提示；不会用本地样例数据代替真实记录。

## 检查命令

```powershell
npm run lint
npm run typecheck
npm run test:run
npx playwright install chromium
npm run test:e2e
npm run build
```

## Supabase 与 GitHub Pages

逐步配置请看 [部署说明](docs/DEPLOYMENT.md)。数据库结构与 RLS 位于 `supabase/migrations/`，安全测试位于 `supabase/tests/`。GitHub Actions 只读取 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY` 两个仓库变量；不要提供 Secret Key 或 Service Role Key。

GitHub Pages 的 `base` 固定为 `/studyos/`，应用使用 `HashRouter`。最终地址格式是 `https://USERNAME.github.io/studyos/`。没有完成 GitHub Actions 实际发布前，不能把站点描述为已部署。

## 项目文档

- [PRD](docs/PRD.md)
- [设计说明](docs/DESIGN.md)
- [架构说明](docs/ARCHITECTURE.md)
- [实施计划](docs/IMPLEMENTATION_PLAN.md)
- [阶段进度](docs/IMPLEMENTATION_PROGRESS.md)
