# Atoms Demo - he0yan

一个面向 ROOT / AI Native 全栈工程师笔试的 Atoms-like Demo。它模拟 AI Agent 平台的核心流程：用户输入产品需求，多智能体协作生成应用，并把生成出的应用以可交互网页形式展示。当前版本在 Atoms-like 体验之上，增加了 BuilderOS RAG 知识库、Agent 执行轨迹、源码产物和服务端持久化。

## 已实现

- 类 Atoms 工作台 UI：工作区侧栏、积分入口、模式菜单、附件与连接器入口、Agent 头像组。
- 初始化/注册体验：首次进入可创建本地工作区，保存昵称、邮箱、目标和初始额度。
- 智能体构建流程：根据 prompt 进入构建队列，展示 Agent 时间线和进度。
- 应用生成：根据需求类型生成 SaaS / 电商 / 招聘 / 研究 / 视频等不同原型。
- 可视化预览：生成结果通过 iframe `srcDoc` 渲染为可交互网页。
- 生成源码：展示 HTML / CSS / JS 三类源码，支持复制源码和导出单文件 HTML。
- 增强型 RAG 知识库：可写入资料，构建结果展示召回证据和命中分数。
- 真实运行数据：`/api/status` 返回 BuilderOS API、Build Engine、RAG Engine、进程内存、持久化文件和运行记录统计。
- 服务端构建：`/api/build` 根据 prompt 创建项目、源码产物和 Agent run record，并持久化到服务端。
- Atoms 差异页：直接说明本平台相对 Atoms 新增的知识 grounding、评审证据、源码交付和部署检查能力。
- 数据持久化：生产环境通过 Node API 保存项目和知识库；本地或离线时自动降级到 `localStorage`。
- 延展能力：Race Mode 会生成多方案评分，发布按钮会持久化发布状态。

## 技术栈

- React 18
- TypeScript
- Vite
- lucide-react
- Node.js 标准库 API
- nginx / systemd 生产部署

## 本地运行

```bash
npm install
npm run api
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
- API command: `PORT=4188 DATA_DIR=/opt/builderos/data node server/platform-server.mjs`

## 关键取舍

当前 Demo 重点验证“AI Agent 驱动生成应用并可视化展示”的产品闭环。为了比纯静态原型更接近真实平台，增加了轻量 Node API 做服务端 JSON 持久化，同时保留 `localStorage` 降级能力。后续最重要的升级是把当前模板生成器替换为真实 LLM + RAG 向量检索 + 沙箱执行链路。
