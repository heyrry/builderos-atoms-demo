# Atoms Demo - he0yan

## 1. 笔试文档

本项目实现了一个可运行的 Atoms-like Demo：用户通过自然语言描述需求，平台模拟多智能体协作流程，生成一个可交互网页应用，并在工作台内展示预览、源码、Agent 决策、RAG 证据和项目状态。

标题：Atoms Demo - he0yan

## 2. 已部署的可测试链接

待部署后填写：

- Local: http://localhost:5173/
- Demo: https://builder.poppcic.cn/

## 3. 代码链接

待推送 GitHub 后填写：

- GitHub: TODO

## 4. 实现思路与关键取舍

- 使用 React + TypeScript + Vite 快速构建可体验产品原型。
- 首次进入提供工作区初始化和注册，用户信息、密码哈希和会话写入 MySQL。
- 登录不会自动创建用户；未注册邮箱会返回错误，已注册用户可通过邮箱和密码恢复工作区。
- 使用多 Agent 时间线模拟 Team Mode 的协作过程。
- 根据 prompt 识别 SaaS、电商、招聘、研究、视频等类型，生成不同页面结构、功能列表、指标和源码。
- 使用 iframe `srcDoc` 渲染生成结果，让评审可以直接操作生成出的应用。
- 新增 BuilderOS 增强型 RAG 知识库页面，生成时召回资料并展示证据。
- 生产环境使用 MySQL 保存用户和 session，使用 Node API 保存项目、知识库和构建运行记录，浏览器离线或 API 不可用时降级到 `localStorage`。
- 新增实时数据页，展示 BuilderOS API、Auth Store、Build Engine、RAG Engine、服务端进程、持久化文件和最近构建记录。
- Race Mode 作为延展能力：开启后生成多个方案方向和评分，体现多模型/多方案竞争的产品思路。
- 新增“平台差异与扩展”页面，说明相对 Atoms 增加的 grounding、源码交付、执行轨迹和部署检查能力。

## 5. 当前完成程度

已完成：

- 首页工作台
- 初始化/注册工作区
- MySQL 用户注册、登录和 session 恢复
- 项目创建流程
- Agent 构建进度
- 生成应用预览
- 生成源码展示
- 源码复制与 HTML 导出
- 项目列表
- 发布状态
- 服务端持久化
- 知识库写入和召回
- 服务端构建 API
- 实时数据和运行日志
- Atoms 差异说明
- 响应式布局

暂未完成：

- 真实 LLM 调用
- 真实代码沙箱
- 真实 GitHub 同步
- 真实云发布
- 第三方 OAuth 和团队权限
- 向量数据库级 RAG

## 6. 后续扩展优先级

1. 接入真实 LLM 网关，把模板生成器替换成可控的 Agent 任务编排。
2. 将当前关键词召回升级为 embeddings + 向量数据库 + rerank。
3. 接入沙箱执行环境，支持生成 React/Vite 项目并捕获构建错误。
4. 将项目、版本、文件和运行日志从 JSON 文件升级到关系型表结构。
5. 接入 GitHub OAuth 和仓库同步。
6. 接入 Vercel/Cloudflare Pages API，实现一键发布真实公网链接。
