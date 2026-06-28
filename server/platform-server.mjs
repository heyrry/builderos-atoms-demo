import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PORT || 4188);
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const stateFile = path.join(dataDir, "state.json");

const defaultState = {
  projects: [],
  runRecords: [],
  knowledgeSources: [
    {
      id: 1,
      title: "BuilderOS 增强型 RAG",
      content:
        "BuilderOS 的知识库链路：资料进入解析、切块、召回、证据聚合和产物生成流程，Agent 输出必须附带来源与可信度。",
      tags: ["RAG", "Knowledge", "BuilderOS"],
      updatedAt: "内置",
    },
    {
      id: 2,
      title: "Agent 执行轨迹",
      content:
        "每次构建都记录 PM、架构、工程、数据和发布 Agent 的阶段状态，保留决策原因、输入证据、产物版本和可回放日志。",
      tags: ["Agent", "Trace", "Review"],
      updatedAt: "内置",
    },
    {
      id: 3,
      title: "Atoms 差异化方向",
      content:
        "保留 Atoms 的自然语言生成应用体验，同时增加知识库 grounding、源码解释、部署检查、团队评审和企业内部资料连接器。",
      tags: ["Atoms", "Positioning", "Platform"],
      updatedAt: "内置",
    },
  ],
};

const agents = [
  { name: "Alex", role: "Team Lead", state: "任务拆解" },
  { name: "Mira", role: "PM", state: "PRD" },
  { name: "Noah", role: "Architect", state: "架构" },
  { name: "Kai", role: "Research", state: "知识召回" },
  { name: "Luna", role: "Engineer", state: "编码" },
  { name: "Rex", role: "Ops", state: "部署检查" },
];

async function ensureStateFile() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(stateFile)) {
    await writeFile(stateFile, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

function normalizeKnowledgeSources(sources) {
  return sources.map((source) =>
    source.title === "OmniAgent 增强型 RAG"
      ? {
          ...source,
          title: "BuilderOS 增强型 RAG",
          content:
            "BuilderOS 的知识库链路：资料进入解析、切块、召回、证据聚合和产物生成流程，Agent 输出必须附带来源与可信度。",
          tags: ["RAG", "Knowledge", "BuilderOS"],
        }
      : source,
  );
}

async function readState() {
  await ensureStateFile();
  try {
    const raw = await readFile(stateFile, "utf8");
    const state = JSON.parse(raw);
    return {
      projects: Array.isArray(state.projects) ? state.projects : [],
      runRecords: Array.isArray(state.runRecords) ? state.runRecords : [],
      knowledgeSources: Array.isArray(state.knowledgeSources)
        ? normalizeKnowledgeSources(state.knowledgeSources)
        : defaultState.knowledgeSources,
      updatedAt: state.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { ...defaultState, updatedAt: new Date().toISOString() };
  }
}

async function writeState(nextState) {
  const current = await readState();
  const state = {
    projects: Array.isArray(nextState.projects) ? nextState.projects : current.projects,
    runRecords: Array.isArray(nextState.runRecords) ? nextState.runRecords : current.runRecords,
    knowledgeSources: Array.isArray(nextState.knowledgeSources)
      ? normalizeKnowledgeSources(nextState.knowledgeSources)
      : current.knowledgeSources,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inferProduct(prompt, mode) {
  const normalized = String(prompt).toLowerCase();
  if (mode === "research" || /调研|研究|竞品|report|research/.test(normalized)) {
    return {
      category: "Research Workspace",
      title: "AI 研究报告工作台",
      theme: "evidence",
      pages: ["Brief", "Signals", "Competitors", "Insights"],
      features: ["资料源追踪", "竞品矩阵", "结论置信度", "一键生成报告"],
    };
  }
  if (/电商|stripe|支付|shop|commerce|结账/.test(normalized)) {
    return {
      category: "Commerce Launchpad",
      title: "AI 电商增长页",
      theme: "commerce",
      pages: ["Landing", "Pricing", "Checkout", "Orders"],
      features: ["Stripe 结账", "转化漏斗", "商品模块", "订单看板"],
    };
  }
  if (/招聘|候选人|candidate|ats|面试/.test(normalized)) {
    return {
      category: "Recruiting OS",
      title: "AI 招聘管理后台",
      theme: "hiring",
      pages: ["Pipeline", "Candidates", "Interview", "Analytics"],
      features: ["候选人看板", "面试评分", "简历摘要", "招聘数据分析"],
    };
  }
  if (/视频|seedance|video|剪辑/.test(normalized)) {
    return {
      category: "Video Studio",
      title: "AI 视频创作台",
      theme: "video",
      pages: ["Storyboard", "Assets", "Render", "Publish"],
      features: ["分镜生成", "素材管理", "视频渲染队列", "发布检查"],
    };
  }
  return {
    category: "SaaS Dashboard",
    title: "AI SaaS 控制台",
    theme: "saas",
    pages: ["Overview", "Customers", "Billing", "Support"],
    features: ["用户登录", "订阅计费", "运营指标", "客服工作流"],
  };
}

function matchKnowledge(prompt, sources) {
  const terms = String(prompt)
    .toLowerCase()
    .split(/[\s,，。.!?？、/]+/)
    .filter((term) => term.length >= 2);

  return sources
    .map((source) => {
      const haystack = `${source.title} ${source.content} ${(source.tags || []).join(" ")}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 18 : 0), 0);
      const tagScore = (source.tags || []).some((tag) => String(prompt).toLowerCase().includes(String(tag).toLowerCase()))
        ? 14
        : 0;
      return {
        title: source.title,
        excerpt: String(source.content).slice(0, 118),
        score: Math.min(96, score + tagScore + 42),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function createGeneratedApp(prompt, mode = "build", raceMode = false, knowledgeSources = defaultState.knowledgeSources) {
  const product = inferProduct(prompt, mode);
  const title = prompt.length > 7 ? `${product.title} · ${prompt.slice(0, 18)}` : product.title;
  const safeTitle = escapeHtml(title);
  const safePrompt = escapeHtml(prompt);
  const knowledgeHits = matchKnowledge(prompt, knowledgeSources);
  const metrics = [
    { label: "生成页面", value: String(product.pages.length), delta: "+2" },
    { label: "核心功能", value: String(product.features.length), delta: "+4" },
    { label: "知识命中", value: String(knowledgeHits.length), delta: "+RAG" },
  ];
  const agentNotes = [
    { agent: "Alex", note: `将需求拆成 ${product.pages.length} 个页面和 ${product.features.length} 个核心能力。` },
    { agent: "Mira", note: `优先保证 ${product.category} 的主流程可点击、可理解。` },
    { agent: "Noah", note: "采用单页应用结构，方便后续接入真实后端和部署流水线。" },
    { agent: "Kai", note: `从知识库召回 ${knowledgeHits.length} 条资料，用于约束页面结构、评审说明和扩展路线。` },
    { agent: "Luna", note: "由服务端生成 HTML / CSS / JS 产物并写入项目记录。" },
  ];
  const alternatives = raceMode
    ? [
        { name: "Product-first", score: 91, angle: "优先覆盖核心使用路径和信息架构。" },
        { name: "Growth-first", score: 87, angle: "更强调转化、SEO 和营销埋点。" },
        { name: "Ops-first", score: 84, angle: "更强调权限、数据表和发布运维。" },
      ]
    : [];
  const css = `
:root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; background: #eef1f3; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #eef1f3; }
.generated-app { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.generated-sidebar { background: #20272b; color: #fff; padding: 22px; }
.generated-logo { font-weight: 800; margin-bottom: 28px; }
.generated-nav { display: grid; gap: 9px; }
.generated-nav button { border: 0; border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; padding: 11px 12px; text-align: left; font: inherit; cursor: pointer; }
.generated-nav button.active { background: #ffffff; color: #20272b; }
.generated-main { padding: 28px; }
.hero { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
.hero h1 { margin: 0; font-size: 32px; letter-spacing: 0; }
.hero p { margin: 10px 0 0; color: #64706b; max-width: 660px; line-height: 1.55; }
.evidence { color: #24735a !important; font-size: 13px; }
.primary { border: 0; border-radius: 999px; background: #20272b; color: #fff; padding: 12px 16px; font-weight: 800; cursor: pointer; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; margin-top: 24px; }
.metric, .panel, .feature { border: 1px solid #dfe3e1; border-radius: 8px; background: #fff; }
.metric { padding: 16px; }
.metric span { color: #68736f; font-size: 13px; }
.metric strong { display: block; margin-top: 8px; font-size: 28px; }
.metric em { color: #198a61; font-style: normal; font-size: 13px; }
.grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 14px; margin-top: 14px; }
.panel { padding: 18px; min-height: 250px; }
.panel h2 { margin: 0 0 14px; font-size: 18px; }
.feature-list { display: grid; gap: 10px; }
.feature { display: flex; justify-content: space-between; gap: 12px; padding: 12px; }
.feature button { border: 1px solid #d9ddda; background: #f6f7f6; border-radius: 999px; padding: 6px 10px; cursor: pointer; }
.activity { display: grid; gap: 10px; }
.activity div { border-radius: 8px; background: #f5f7f6; padding: 12px; color: #4e5a55; }
.toast { position: fixed; right: 20px; bottom: 20px; display: none; border-radius: 8px; background: #20272b; color: #fff; padding: 12px 14px; box-shadow: 0 12px 30px rgba(0,0,0,.18); }
.toast.show { display: block; }
@media (max-width: 760px) { .generated-app { grid-template-columns: 1fr; } .generated-sidebar { position: sticky; top: 0; z-index: 2; } .metrics, .grid { grid-template-columns: 1fr; } .hero { flex-direction: column; } }
`.trim();
  const js = `
const navButtons = document.querySelectorAll(".generated-nav button");
const featureButtons = document.querySelectorAll(".feature button");
const toast = document.querySelector(".toast");
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    toast.textContent = "切换到 " + button.textContent + " 页面";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1200);
  });
});
featureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.textContent = button.textContent === "已加入" ? "加入迭代" : "已加入";
  });
});
document.querySelector(".primary").addEventListener("click", () => {
  const list = document.querySelector(".activity");
  const item = document.createElement("div");
  item.textContent = "新任务已进入 Agent 队列：" + new Date().toLocaleTimeString();
  list.prepend(item);
});
`.trim();
  const featureItems = product.features
    .map((feature) => `<div class="feature"><span>${escapeHtml(feature)}</span><button>加入迭代</button></div>`)
    .join("");
  const pageButtons = product.pages
    .map((page, index) => `<button class="${index === 0 ? "active" : ""}">${escapeHtml(page)}</button>`)
    .join("");
  const metricItems = metrics
    .map((metric) => `<section class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><em>${escapeHtml(metric.delta)}</em></section>`)
    .join("");
  const body = `
<div class="generated-app">
  <aside class="generated-sidebar">
    <div class="generated-logo">${safeTitle}</div>
    <nav class="generated-nav">${pageButtons}</nav>
  </aside>
  <main class="generated-main">
    <section class="hero">
      <div>
        <h1>${safeTitle}</h1>
        <p>根据需求「${safePrompt}」生成的可交互产品原型。当前版本覆盖信息架构、主路径、关键指标和功能迭代入口。</p>
        <p class="evidence">RAG evidence: ${knowledgeHits.map((hit) => escapeHtml(hit.title)).join(" · ") || "使用默认产品策略"}</p>
      </div>
      <button class="primary">派发 Agent 任务</button>
    </section>
    <section class="metrics">${metricItems}</section>
    <section class="grid">
      <div class="panel">
        <h2>功能 Backlog</h2>
        <div class="feature-list">${featureItems}</div>
      </div>
      <div class="panel">
        <h2>实时活动</h2>
        <div class="activity">
          <div>Product Agent 已完成需求拆解</div>
          <div>Research Agent 已完成知识召回</div>
          <div>Engineer Agent 已生成首版页面</div>
        </div>
      </div>
    </section>
  </main>
  <div class="toast"></div>
</div>
`.trim();
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>${css}</style>
  </head>
  <body>
    ${body}
    <script>${js}</script>
  </body>
</html>`;

  return {
    title,
    category: product.category,
    brief: `一个围绕“${prompt}”生成的 ${product.category} 原型。`,
    theme: product.theme,
    pages: product.pages,
    features: product.features,
    metrics,
    agentNotes,
    html,
    css,
    js,
    srcDoc: html,
    alternatives,
    knowledgeHits,
    extensions: [
      "BuilderOS RAG 知识库 grounding",
      "服务端真实构建记录与运行日志",
      "源码解释、复制和单文件导出",
      "nginx + systemd 生产部署状态监控",
    ],
    infraPlan: [
      { layer: "Frontend", detail: "React + Vite 负责 Atoms-like 构建工作台和 iframe 预览。" },
      { layer: "API", detail: "Node 标准库 API 保存项目、知识库和构建记录。" },
      { layer: "Proxy", detail: "nginx 独立二级域名接入，BuilderOS API 只监听本机端口。" },
    ],
  };
}

async function createBuild(body) {
  const state = await readState();
  const prompt = String(body.prompt || "").trim() || "构建一个带登录、订阅和仪表盘的 AI 客服 SaaS";
  const mode = ["build", "research", "video"].includes(body.mode) ? body.mode : "build";
  const raceMode = Boolean(body.raceMode);
  const startedAt = new Date();
  const generated = createGeneratedApp(prompt, mode, raceMode, state.knowledgeSources);
  const id = Date.now();
  const durationMs = 840 + Math.min(1600, prompt.length * 18);
  const project = {
    id,
    title: generated.title,
    mode,
    status: "可预览",
    updatedAt: "刚刚",
    prompt,
    generated,
  };
  const run = {
    id: `run-${id}`,
    projectId: id,
    prompt,
    mode,
    status: "completed",
    startedAt: startedAt.toISOString(),
    finishedAt: new Date(startedAt.getTime() + durationMs).toISOString(),
    durationMs,
    agentCount: agents.length,
    agents,
    knowledgeHits: generated.knowledgeHits,
    output: {
      pages: generated.pages.length,
      features: generated.features.length,
      sourceBytes: Buffer.byteLength(generated.html, "utf8"),
    },
  };
  const nextState = await writeState({
    ...state,
    projects: [project, ...state.projects].slice(0, 50),
    runRecords: [run, ...state.runRecords].slice(0, 80),
  });
  return { project, run, state: nextState };
}

async function readPlatformStatus() {
  const state = await readState();
  let fileSize = 0;
  try {
    fileSize = (await stat(stateFile)).size;
  } catch {
    fileSize = 0;
  }
  return {
    serverTime: new Date().toISOString(),
    process: {
      pid: process.pid,
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    storage: {
      dataDir,
      stateFile,
      stateFileBytes: fileSize,
      projects: state.projects.length,
      knowledgeSources: state.knowledgeSources.length,
      runRecords: state.runRecords.length,
      updatedAt: state.updatedAt,
    },
    services: [
      { name: "BuilderOS API", status: "healthy", statusCode: 200, latencyMs: 0, endpoint: "/api/health" },
      {
        name: "Build Engine",
        status: "healthy",
        statusCode: 200,
        latencyMs: Math.max(1, Math.round(process.uptime() % 12)),
        endpoint: "/api/build",
      },
      {
        name: "RAG Engine",
        status: state.knowledgeSources.length > 0 ? "healthy" : "degraded",
        statusCode: state.knowledgeSources.length > 0 ? 200 : 204,
        latencyMs: Math.max(1, state.knowledgeSources.length * 2),
        endpoint: "/api/state.knowledgeSources",
      },
      {
        name: "JSON Storage",
        status: fileSize > 0 ? "healthy" : "degraded",
        statusCode: fileSize > 0 ? 200 : 500,
        latencyMs: Math.max(1, Math.round(fileSize / 4096)),
        endpoint: stateFile,
      },
    ],
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "builderos-api", dataDir });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      sendJson(response, 200, await readPlatformStatus());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      sendJson(response, 200, await readState());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/state") {
      sendJson(response, 200, await writeState(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/build") {
      sendJson(response, 200, await createBuild(await readJsonBody(request)));
      return;
    }

    sendJson(response, 404, { ok: false, error: "not_found" });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : "unknown_error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`BuilderOS API listening on http://127.0.0.1:${port}`);
});
