# Atoms Demo - he0yan

一个面向 ROOT / AI Native 全栈工程师笔试的 Atoms-like Demo。它模拟 AI Agent 平台的核心流程：用户输入产品需求，多智能体协作生成应用，并把生成出的应用以可交互网页形式展示。当前版本在 Atoms-like 体验之上，增加了 BuilderOS RAG 知识库、Agent 执行轨迹、源码产物、服务端持久化和真实 LLM 网关。

线上 Demo：https://builder.poppcic.cn/

<small>OmniAgent 参考平台：https://agent.poppcic.cn/。OmniAgent 是我自己开发的另一套 Agent / RAG 平台，和 BuilderOS 方向相近。本 Demo 借鉴了其中模型路由、知识库 grounding 和 Agent 编排的部分产品思路；它不是本次交付主体，只作为评委感兴趣时的补充参考。</small>

评审演示账号：

- Email: `reviewer@builderos.demo`
- Password: `BuilderOS2026`

该账号是生产 MySQL 中的真实测试用户，已预置多条构建记录；也可以直接注册新工作区体验完整初始化流程。

## 已实现

- 类 Atoms 工作台 UI：工作区侧栏、积分入口、模式菜单、附件与连接器入口、Agent 头像组。
- 初始化/注册体验：首次进入可创建 BuilderOS 工作区，邮箱、密码、昵称、目标和初始额度写入 MySQL。
- 登录会话：已注册用户通过邮箱和密码登录，服务端签发 session token，刷新页面后通过 `/api/auth/me` 恢复用户。
- 退出登录：侧边栏提供退出入口，前端清除本地 token，同时调用 `/api/auth/logout` 让服务端 session 失效。
- 评审演示账号：登录页可一键填入 `reviewer@builderos.demo` / `BuilderOS2026`，该账号真实写入生产 MySQL。
- 积分展示不限制：当前 Demo 保留额度 UI，但不扣减、不阻断构建，避免评审流程被 quota 干扰。
- 智能体构建流程：根据 prompt 进入构建队列，展示 Agent 时间线和进度。
- 真实 LLM 网关：参考 OmniAgent 的模型配置方式，支持通义千问 DashScope 兼容模式和第三方 OpenAI 兼容中转站；未配置或调用异常时自动降级到稳定模板生成器。
- 模型路由选择器：登录后顶部可在 `Auto`、`qwen-plus`、`gpt-5.5` 之间切换；Agent 配置卡片内也可为单个 Agent 选择模型，本次构建和 Agent 编排会按所选 provider 调用，便于现场验证 `token-qiv.cn` 第三方中转站记录。
- 应用生成：根据需求类型生成 SaaS / 电商 / 招聘 / 研究 / 视频等不同原型。
- 可视化预览：生成结果通过 iframe `srcDoc` 渲染为可交互网页。
- 生成项目目录：每次构建生成 React/Vite 项目文件树，包含 `app/frontend/src/App.tsx`、`src/data/generated.ts`、`src/styles.css`、`app/generated/preview.html` 等文件。
- 源码查看：工作台内可点击文件树查看对应文件源码，同时保留 HTML / CSS / JS 快速查看、复制和导出单文件 HTML。
- 源码包下载：`/api/projects/:id/download` 将生成项目打包为 zip，并附带 `builderos-manifest.json`。
- 真实 GitHub 同步：本作品源码已同步到 public GitHub 仓库 `https://github.com/heyrry/builderos-atoms-demo`。
- 版本管理：每个构建默认生成 `版本 1`，工作台支持手动保存新版本并持久化版本快照。
- 真实发布预览：`/api/projects/:id/publish` 写入发布状态和发布检查，`/api/preview/:id` 提供可公开访问的生成应用页面。
- BuilderOS Cloud 资源台：资源页展示 AI、Database、Users、Secrets、App Storage、GitHub、Stripe、Growth 等 Atoms Cloud 对标能力，并支持连接/检查状态持久化。
- 增强型 RAG 知识库：支持手动写入资料，也支持上传 `.txt / .md / .csv / .json`，由服务端解析文本、切块并生成知识条目；构建和 Agent 编排结果展示召回证据和命中分数。
- Agent 自由编排：参考 OmniAgent 的 Agent 编排能力，提供招聘多 Agent 模板，支持复制模板、编辑执行步骤、添加/删除 Agent、保存配置、三栏执行工作台和试运行追踪。
- 真实运行数据：`/api/status` 返回 BuilderOS API、Auth Store、Build Engine、RAG Engine、进程内存、持久化文件和运行记录统计。
- 模型状态接口：`/api/llm/status` 返回当前 provider、model、endpoint host 和配置状态，不返回 API Key。
- 服务端构建：`/api/build` 根据 prompt 创建项目、源码产物、项目目录和 Agent run record，并持久化到服务端。
- 文件产物接口：`/api/projects/:id/files` 返回项目文件 manifest，生产环境同步落盘到 `/opt/builderos/data/generated-projects/project-<id>/`。
- Atoms 差异页：直接说明本平台相对 Atoms 新增的知识 grounding、评审证据、源码交付和部署检查能力。
- 数据持久化：生产环境通过 MySQL 保存用户和会话，通过 Node API 保存项目和知识库；本地或离线时自动降级到 `localStorage`。
- 延展能力：Race Mode 会生成多方案评分，发布按钮会持久化发布状态。

## 技术栈

- React 18
- TypeScript
- Vite
- lucide-react
- Node.js 标准库 API
- MySQL 8 / mysql2
- nginx / systemd 生产部署

## LLM 配置

服务端会按顺序尝试通义千问和第三方中转站，密钥只读取环境变量：

```bash
BUILDEROS_LLM_PROVIDER=auto
BUILDEROS_QWEN_API_KEY=...
BUILDEROS_QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BUILDEROS_QWEN_MODEL=qwen-plus
BUILDEROS_RELAY_API_KEY=...
BUILDEROS_RELAY_BASE_URL=https://token-qiv.cn/v1
BUILDEROS_RELAY_MODEL=gpt-5.5
```

`GET /api/llm/status` 可验证当前是 `real` 还是 `fallback`。前端顶部模型路由默认使用 `Auto`，即优先 `qwen-plus`，失败时降级到 `gpt-5.5` 中转站；手动选择 `gpt-5.5` 时，请求会直接带上 `llmProvider=relay` 并访问 `token-qiv.cn`。模型只生成结构化产品规格，BuilderOS 负责源码目录、预览、版本和发布记录落盘。

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

项目已按 Vite 静态应用 + Node API 组织，可部署到任意静态托管和 Node 运行环境。当前线上版本部署在 `builder.poppcic.cn`，前端由 nginx 提供静态资源，API 由 systemd 管理。

- Build command: `npm run build`
- Output directory: `dist`
- API command: `PORT=4188 DATA_DIR=/opt/builderos/data MYSQL_HOST=127.0.0.1 MYSQL_DATABASE=builderos node server/platform-server.mjs`

## 关键取舍

当前 Demo 重点验证“AI Agent 驱动生成应用并可视化展示”的产品闭环。为了比纯静态原型更接近真实平台，增加了轻量 Node API、MySQL 用户注册登录、服务端 JSON 持久化、真实项目文件夹落盘和 OpenAI 兼容 LLM 网关，同时保留 `localStorage` 与模板生成器降级能力。

在 6-8 小时的笔试时间约束下，当前版本优先保证作品可运行、可注册、可构建、可查看源码、可下载产物、可发布预览和可解释工程取舍。同时选择“Agent 编排运行时”作为延展能力，证明平台不仅能生成应用，也能配置和复用 Agent 执行链路。当前先实现预定义串行 Agent 链、真实 LLM 调用和知识库 grounding；拖拽式 DAG、分支、重试和人工确认作为后续路线拆解。

## Atoms 对标说明

BuilderOS 不是只复刻首页输入框，而是把 Atoms 的后续工作流也显性化：生成应用之后，评审可以继续查看 Cloud 资源、用户系统、数据库、应用存储、源码包、版本、发布链接、发布检查和增长/支付/GitHub 能力。当前作品源码已同步到 public GitHub；平台内 GitHub OAuth、支付和发布流水线作为下一阶段实现。

相对 Atoms，BuilderOS 的扩展点不是“多做几个页面”，而是把生成过程、知识依据、Agent 调度和运行状态显式化：

- 显式自由编排：Atoms 更偏自动生成和自动调度，BuilderOS 把 Agent 的系统提示词、模型、工具、输入输出、Guardrail 和执行 Trace 暴露出来，方便审查、复用和二次配置。
- 知识 grounding：BuilderOS 将知识库做成可上传、可解析、可召回的 RAG 模块，要求构建和编排结果引用知识条目、岗位需求、候选人简历等证据，而不是只凭 prompt 生成。
- 运行审计与可观测性：实时数据页展示 API 健康、Auth Store、Build Engine、RAG Engine、Agent Orchestrator、存储目录、运行记录和进程状态，让评委能确认平台有真实服务端、持久化和运行数据。

一句话概括：Atoms 强在自动生成和自动配置，BuilderOS 的增强点是把生成过程、知识依据、Agent 调度和运行状态做成可审查、可复盘、可扩展的 Builder 控制台。

## 延展能力：Agent 自由编排

参考 OmniAgent 的自由编排体验，BuilderOS 新增 `编排` 页面：

- 在线演示：`https://builder.poppcic.cn/?section=orchestration`
- 从“招聘多 Agent 编排模板”快速创建可复用配置。
- 试运行后展示“任务说明 / 任务流程 / 任务结果”三栏执行工作台，直观呈现流程状态。
- 可编辑 Agent 名称、角色职责、动作、输出、工具、系统提示词、守护规则，并可为每个 Agent 单独选择 `继承顶部路由 / Auto / qwen-plus / gpt-5.5`。
- 支持添加/删除步骤，并以执行链路图展示 Agent 之间的转交关系。
- 保存到服务端 `state.json`，刷新页面后仍可恢复。
- 可点击“试运行链路”请求 `/api/orchestrations/:id/run`，由后端串行调度 Agent、调用真实 LLM，并基于服务端知识库中的简历数据生成候选人推荐。
- 知识库支持文件解析：上传的文本、Markdown、CSV、JSON 会转成 keyword RAG 知识条目；简历文件会自动补充 `简历 / 候选人 / Java / 后端` 标签并参与 Agent 召回。

效果图：

![BuilderOS Agent 编排效果图](docs/assets/builderos-orchestration-real.png)

### 流程编排

编排配置由多个步骤组成，每个步骤包含 Agent 名称、角色职责、系统提示词、模型路由、执行动作、输出产物、工具绑定和守护规则。当前提供招聘场景模板：总控 -> 需求分析 -> 简历检索 -> 匹配评分 -> 面试题 -> 报告汇总。执行链路不是静态 mock，后端会读取服务端知识库中的岗位需求和候选人简历，并把每个节点的 LLM 输出写入 trace。

### Agent 调度

总控 Agent 只负责拆解任务和分发，子 Agent 按顺序处理自己的职责范围，并把结构化输出交给下一步。这样可以避免一个 Agent 一次性吞掉所有逻辑，让每个节点都可复用、可替换、可审查。执行时每个 Agent 会优先使用自己的模型配置，没有配置时继承顶部模型路由；线上验证已确认单个 Agent 可以覆盖全局路由。通义千问 `qwen-plus` 完成过多节点 Agent 调用并输出候选人排序，第三方中转站 `gpt-5.5` 可用于构建链路和 Agent 节点模型路由验证。

### 流程可视化

编排页采用三栏执行工作台：

- 左侧：任务说明，展示目标、场景、编排要求和当前链路。
- 中间：任务流程，用垂直节点展示待执行、执行中、已完成状态。
- 右侧：任务结果，展示 Agent 输出摘要、LLM provider、知识库证据数量、候选人排序和最终交付。

### 校验与追踪

- 配置写入服务端 `state.json`，刷新后仍可恢复。
- `/api/status` 返回 `Agent Orchestrator` 健康状态。
- `/api/cloud-resources` 展示 `Agent 自由编排` 资源卡和 flows / steps 统计。
- 试运行生成 Execution Trace，记录每个 Agent 的动作、耗时、LLM provider、证据标题和输出。
- 每个步骤包含 guardrail，例如证据约束、可解释评分、结论和证据对应。
- 当前边界：拖拽式自由编排、DAG 分支、失败重试和人工确认节点作为后续迭代。

## 后续迭代路线

1. 沙箱执行：接入隔离容器，真实运行安装、构建、预览和错误修复循环。
2. GitHub OAuth / PR 流水线：当前作品源码已完成 public GitHub 同步；后续支持平台内创建仓库、提交生成文件、打开 PR 和版本 diff。
3. 真实发布：接入 Vercel 或 Cloudflare Pages API，把预览升级为公网部署。
4. RAG 增强：当前为 keyword RAG + 文件解析；后续升级为 embeddings + 向量数据库 + rerank，并增加 PDF/DOCX 解析、页码引用和段落级来源追踪。
5. 计费与积分：当前积分不限制使用；后续补 usage ledger、充值流水、订阅套餐、余额扣减、退款审计和模型成本归因。
6. 多模型调度：按任务类型选择 Qwen、第三方中转站或其他模型，并记录成本、延迟和质量。
7. 团队协作：增加成员、角色、项目评论、版本审查和操作审计。
