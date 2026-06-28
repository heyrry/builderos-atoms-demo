# Atoms Demo - he0yan

一个面向 ROOT / AI Native 全栈工程师笔试的 Atoms-like Demo。它模拟 AI Agent 平台的核心流程：用户输入产品需求，多智能体协作生成应用，并把生成出的应用以可交互网页形式展示。

## 已实现

- 类 Atoms 工作台 UI：工作区侧栏、积分入口、模式菜单、附件与连接器入口、Agent 头像组。
- 初始化/注册体验：首次进入可创建本地工作区，保存昵称、邮箱、目标和初始额度。
- 智能体构建流程：根据 prompt 进入构建队列，展示 Agent 时间线和进度。
- 应用生成：根据需求类型生成 SaaS / 电商 / 招聘 / 研究 / 视频等不同原型。
- 可视化预览：生成结果通过 iframe `srcDoc` 渲染为可交互网页。
- 生成源码：展示 HTML / CSS / JS 三类源码，支持复制源码和导出单文件 HTML。
- 数据持久化：工作区、积分、项目、选中项目和发布状态保存到 `localStorage`。
- 延展能力：Race Mode 会生成多方案评分，发布按钮会持久化发布状态。

## 技术栈

- React 18
- TypeScript
- Vite
- lucide-react
- localStorage 持久化

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:5173/`。

## 构建

```bash
npm run build
```

产物输出到 `dist/`。

## 部署

项目已按 Vite 静态应用组织，可直接部署到 Vercel、Netlify、Cloudflare Pages 或任意静态托管服务。

- Build command: `npm run build`
- Output directory: `dist`

## 关键取舍

当前 Demo 重点验证“AI Agent 驱动生成应用并可视化展示”的产品闭环，因此持久化选择浏览器 `localStorage`，避免在 6-8 小时 Demo 里引入后端部署复杂度。后续可把工作区、项目表、生成历史、发布记录迁移到 Postgres/Supabase，并把当前模板生成器替换为真实 LLM + 沙箱执行链路。
