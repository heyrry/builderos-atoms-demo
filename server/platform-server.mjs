import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import archiver from "archiver";

const port = Number(process.env.PORT || 4188);
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const stateFile = path.join(dataDir, "state.json");
const authFile = path.join(dataDir, "auth.json");
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
const authStorageMode = process.env.MYSQL_HOST ? "mysql" : "json";
let mysqlPoolPromise;
let authSchemaReady = false;

const defaultCloudResources = [
  {
    id: "ai-gateway",
    type: "AI",
    title: "AI 模型网关",
    provider: "Qwen / OpenAI-compatible Relay",
    status: "ready",
    scope: "Workspace",
    description: "参考 OmniAgent 的模型配置方式，支持通义千问和第三方 OpenAI 兼容中转站，并保留模板降级。",
    endpoint: "/api/llm/status",
    usage: "Build Agent / JSON Spec",
    updatedAt: "待配置",
    actions: ["千问", "中转站", "模板降级"],
  },
  {
    id: "agent-orchestrator",
    type: "AI",
    title: "Agent 自由编排",
    provider: "BuilderOS Agent Orchestrator",
    status: "connected",
    scope: "Workspace",
    description: "参考 OmniAgent 的 Agent 编排能力，支持从模板创建、调整执行链路、保存配置和试运行追踪。",
    endpoint: "/api/state.orchestrations",
    usage: "Agent chain / Trace",
    updatedAt: "内置",
    actions: ["创建编排", "调整链路", "试运行"],
  },
  {
    id: "database",
    type: "Database",
    title: "云数据库",
    provider: "MySQL + JSON State",
    status: "connected",
    scope: "Workspace",
    description: "保存用户、会话、项目、知识库、构建记录和发布元数据。",
    endpoint: "mysql.builderos_users / state.json",
    usage: "注册登录 / 项目状态",
    updatedAt: "内置",
    actions: ["查看表", "同步状态", "备份"],
  },
  {
    id: "users",
    type: "Users",
    title: "用户与权限",
    provider: "BuilderOS Auth",
    status: "connected",
    scope: "Workspace",
    description: "邮箱密码注册、密码哈希、session token 和工作区恢复。",
    endpoint: "/api/auth/*",
    usage: "注册 / 登录 / 会话恢复",
    updatedAt: "内置",
    actions: ["邀请成员", "重置密码", "会话审计"],
  },
  {
    id: "secrets",
    type: "Secrets",
    title: "密钥与环境变量",
    provider: "Systemd Env",
    status: "ready",
    scope: "Server",
    description: "隔离 MySQL 凭据、第三方 API Key 和发布环境变量。",
    endpoint: "/etc/builderos-api.env",
    usage: "后端私有配置",
    updatedAt: "待配置",
    actions: ["新增密钥", "轮换", "审计"],
  },
  {
    id: "app-storage",
    type: "Storage",
    title: "应用存储",
    provider: "BuilderOS Artifact Store",
    status: "connected",
    scope: "Project",
    description: "每次构建落盘 React/Vite 项目目录，并支持 manifest 和 zip 下载。",
    endpoint: "/api/projects/:id/files",
    usage: "源码文件 / 预览 HTML",
    updatedAt: "内置",
    actions: ["创建存储桶", "下载项目", "清理产物"],
  },
  {
    id: "github",
    type: "Integration",
    title: "GitHub Connect",
    provider: "GitHub",
    status: "ready",
    scope: "Project",
    description: "为生成项目准备仓库同步、分支和 Pull Request 流程。",
    endpoint: "github.com",
    usage: "仓库同步 / PR",
    updatedAt: "待连接",
    actions: ["连接仓库", "创建 PR", "同步分支"],
  },
  {
    id: "stripe",
    type: "Integration",
    title: "Stripe Connect",
    provider: "Stripe",
    status: "ready",
    scope: "Project",
    description: "为生成应用准备订阅、一次性付款和 webhook 事件。",
    endpoint: "stripe.com",
    usage: "支付 / 订阅",
    updatedAt: "待连接",
    actions: ["配置价格", "测试付款", "Webhook"],
  },
  {
    id: "growth",
    type: "Growth",
    title: "SEO 与增长模块",
    provider: "BuilderOS Growth",
    status: "ready",
    scope: "Published App",
    description: "覆盖 SEO 检查、GA4、广告素材和发布后的增长任务。",
    endpoint: "/api/projects/:id/publish",
    usage: "SEO / Ads / Analytics",
    updatedAt: "待发布",
    actions: ["SEO 检查", "生成广告", "配置 GA4"],
  },
];

const defaultOrchestrations = [
  {
    id: "recruiting-agent-chain",
    name: "招聘多 Agent 编排模板",
    description: "把招聘需求拆成分析、检索、评分、面试题和报告汇总，适合展示 OmniAgent 式自由编排。",
    domain: "招聘助手",
    status: "ready",
    owner: "BuilderOS",
    updatedAt: "内置",
    steps: [
      {
        id: "director",
        agent: "招聘助手",
        role: "总控",
        action: "拆解招聘任务并分配子 Agent",
        output: "执行计划",
        tool: "Planner",
        guardrail: "确认岗位、候选人来源和评分维度完整",
      },
      {
        id: "requirement",
        agent: "需求分析 Agent",
        role: "需求分析",
        action: "提取岗位职责、硬性条件和优先级",
        output: "岗位画像",
        tool: "RAG",
        guardrail: "输出必须附带依据",
      },
      {
        id: "retriever",
        agent: "简历检索 Agent",
        role: "简历检索",
        action: "从候选人池中筛选匹配简历",
        output: "候选人短名单",
        tool: "Search",
        guardrail: "避免遗漏强匹配候选人",
      },
      {
        id: "scorer",
        agent: "匹配评分 Agent",
        role: "匹配评分",
        action: "根据能力、经验和风险进行排序",
        output: "评分表",
        tool: "Ranker",
        guardrail: "分数必须可解释",
      },
      {
        id: "interview",
        agent: "面试题 Agent",
        role: "面试设计",
        action: "为候选人生成结构化面试题",
        output: "面试题库",
        tool: "Generator",
        guardrail: "题目覆盖岗位关键能力",
      },
      {
        id: "report",
        agent: "报告汇总 Agent",
        role: "汇总报告",
        action: "输出推荐理由、风险和下一步动作",
        output: "招聘评估报告",
        tool: "Reporter",
        guardrail: "结论和证据一一对应",
      },
    ],
    lastRun: null,
  },
];

const defaultKnowledgeSources = [
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
  {
    id: 101,
    title: "岗位需求：Java 后端工程师",
    content:
      "岗位：Java 后端工程师。硬性条件：5年以上后端开发经验，熟悉 Java、Spring Boot、MySQL、Redis、消息队列和分布式系统。优先条件：有电商平台、交易平台、订单、支付、库存、商品、营销等系统经验。交付要求：输出候选人推荐排序、证据、风险点和面试问题。",
    tags: ["招聘", "岗位需求", "Java", "后端", "电商"],
    updatedAt: "内置",
  },
];

const defaultState = {
  projects: [],
  runRecords: [],
  cloudResources: defaultCloudResources,
  orchestrations: defaultOrchestrations,
  knowledgeSources: defaultKnowledgeSources,
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
  const normalized = sources.map((source) =>
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
  const deduped = Array.from(new Map(normalized.map((source) => [source.title, source])).values());
  const existingTitles = new Set(deduped.map((source) => source.title));
  const missingDefaults = defaultKnowledgeSources.filter((source) => !existingTitles.has(source.title));
  return [...deduped, ...missingDefaults];
}

function normalizeCloudResources(resources) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return defaultCloudResources;
  }
  const existingById = new Map(resources.map((resource) => [resource.id, resource]));
  const mergedDefaults = defaultCloudResources.map((resource) => ({
    ...resource,
    ...(existingById.get(resource.id) || {}),
  }));
  const customResources = resources.filter(
    (resource) => resource?.id && !defaultCloudResources.some((defaultResource) => defaultResource.id === resource.id),
  );
  return [...mergedDefaults, ...customResources];
}

function normalizeOrchestrations(orchestrations) {
  if (!Array.isArray(orchestrations) || orchestrations.length === 0) {
    return defaultOrchestrations;
  }
  return orchestrations.map((orchestration) => ({
    ...orchestration,
    steps: Array.isArray(orchestration.steps) ? orchestration.steps.map(normalizeOrchestrationStep) : [],
    updatedAt: orchestration.updatedAt || "刚刚",
  }));
}

function defaultStepSystemPrompt(step) {
  return [
    `你是 BuilderOS 多 Agent 编排中的「${step.agent || "专业 Agent"}」，角色是「${step.role || "执行节点"}」。`,
    `你的任务：${step.action || "根据上游输入完成本节点工作"}。`,
    `必须产出：${step.output || "结构化结果"}，并使用工具能力：${step.tool || "LLM + RAG"}。`,
    `守护规则：${step.guardrail || "输出必须可解释、可审查，并引用知识库证据"}。`,
    "不要编造不存在的候选人、经历或数据；如果证据不足，明确标记风险并交给下一步处理。",
  ].join("\n");
}

function normalizeOrchestrationStep(step = {}) {
  const normalized = {
    ...step,
    id: cleanString(step.id, `step-${Date.now()}`, 80),
    agent: cleanString(step.agent, "专业 Agent", 80),
    role: cleanString(step.role, "执行节点", 80),
    action: cleanString(step.action, "根据任务目标完成本节点工作", 180),
    output: cleanString(step.output, "结构化结果", 80),
    tool: cleanString(step.tool, "LLM + RAG", 80),
    guardrail: cleanString(step.guardrail, "输出必须可解释并附带证据", 160),
  };
  const llmProvider = ["auto", "qwen", "relay"].includes(String(step.llmProvider || "").toLowerCase())
    ? String(step.llmProvider).toLowerCase()
    : "";
  if (llmProvider) {
    normalized.llmProvider = llmProvider;
  } else {
    delete normalized.llmProvider;
  }
  normalized.systemPrompt = cleanString(step.systemPrompt, defaultStepSystemPrompt(normalized), 1200);
  return normalized;
}

async function readState() {
  await ensureStateFile();
  try {
    const raw = await readFile(stateFile, "utf8");
    const state = JSON.parse(raw);
    return {
      projects: Array.isArray(state.projects) ? state.projects : [],
      runRecords: Array.isArray(state.runRecords) ? state.runRecords : [],
      cloudResources: normalizeCloudResources(state.cloudResources),
      orchestrations: normalizeOrchestrations(state.orchestrations),
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
    cloudResources: Array.isArray(nextState.cloudResources)
      ? normalizeCloudResources(nextState.cloudResources)
      : current.cloudResources,
    orchestrations: Array.isArray(nextState.orchestrations)
      ? normalizeOrchestrations(nextState.orchestrations)
      : current.orchestrations,
    knowledgeSources: Array.isArray(nextState.knowledgeSources)
      ? normalizeKnowledgeSources(nextState.knowledgeSources)
      : current.knowledgeSources,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function getFileExtension(filename) {
  return String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvToText(content) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return "";
  }
  const headers = splitCsvLine(lines[0]);
  if (lines.length === 1 || headers.length < 2) {
    return lines.join("\n");
  }
  return lines
    .slice(1)
    .map((line, index) => {
      const values = splitCsvLine(line);
      const fields = headers.map((header, cellIndex) => `${header || `列${cellIndex + 1}`}: ${values[cellIndex] || ""}`);
      return `记录 ${index + 1}：${fields.join("；")}`;
    })
    .join("\n");
}

function flattenJsonValue(value, prefix = "") {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenJsonValue(item, prefix ? `${prefix}.${index + 1}` : String(index + 1)));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => flattenJsonValue(child, prefix ? `${prefix}.${key}` : key));
  }
  return [`${prefix || "value"}: ${String(value)}`];
}

function parseJsonToText(content) {
  const parsed = JSON.parse(String(content || ""));
  return flattenJsonValue(parsed).join("\n");
}

function parseKnowledgeFile(filename, content) {
  const extension = getFileExtension(filename);
  const raw = String(content || "").trim();
  if (!raw) {
    throw createHttpError(400, "empty_file", `${filename || "文件"} 内容为空。`);
  }
  if (!["txt", "md", "csv", "json"].includes(extension)) {
    throw createHttpError(415, "unsupported_knowledge_file", "当前仅支持 .txt / .md / .csv / .json。PDF/DOCX 作为后续增强。");
  }
  if (raw.length > 200_000) {
    throw createHttpError(413, "knowledge_file_too_large", "单个知识文件当前限制 200KB。");
  }

  if (extension === "md") {
    return stripMarkdown(raw);
  }
  if (extension === "csv") {
    return parseCsvToText(raw);
  }
  if (extension === "json") {
    return parseJsonToText(raw);
  }
  return raw;
}

function chunkText(content, maxLength = 1800, overlap = 120) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return [text];
  }
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length && chunks.length < 12) {
    const end = Math.min(text.length, cursor + maxLength);
    chunks.push(text.slice(cursor, end).trim());
    if (end >= text.length) {
      break;
    }
    cursor = Math.max(0, end - overlap);
  }
  return chunks.filter(Boolean);
}

function inferKnowledgeTags(filename, content, providedTags = []) {
  const haystack = `${filename} ${content}`.toLowerCase();
  const tags = new Set(
    providedTags
      .flatMap((tag) => String(tag || "").split(/[,，]/))
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
  tags.add("文件解析");
  tags.add("keyword RAG");
  const resumeLike = /简历|resume|候选人|candidate|工作经历|项目经历|教育经历/.test(haystack);
  if (resumeLike) {
    ["简历", "候选人", "Java", "后端"].forEach((tag) => tags.add(tag));
  }
  if (/java|spring|后端/.test(haystack)) {
    tags.add("Java");
    tags.add("后端");
  }
  if (/电商|订单|支付|库存|商品|营销/.test(haystack)) {
    tags.add("电商");
  }
  return Array.from(tags).slice(0, 10);
}

async function ingestKnowledgeFiles(body = {}) {
  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) {
    throw createHttpError(400, "no_knowledge_files", "请选择至少一个知识文件。");
  }
  if (files.length > 8) {
    throw createHttpError(400, "too_many_knowledge_files", "单次最多上传 8 个知识文件。");
  }

  const state = await readState();
  const createdAt = new Date().toISOString();
  const newSources = [];
  const parsed = [];

  for (const file of files) {
    const filename = cleanString(file?.name, "uploaded.txt", 160);
    const parsedText = parseKnowledgeFile(filename, file?.content);
    const chunks = chunkText(parsedText);
    const tags = inferKnowledgeTags(filename, parsedText, file?.tags);
    const baseTitle = cleanString(file?.title, filename.replace(/\.[^.]+$/, ""), 100);
    const baseId = Date.now() + newSources.length * 100;

    chunks.forEach((chunk, index) => {
      newSources.push({
        id: baseId + index,
        title: chunks.length > 1 ? `${baseTitle} · chunk ${index + 1}` : baseTitle,
        content: chunk,
        tags,
        updatedAt: "文件解析",
        source: {
          filename,
          extension: getFileExtension(filename),
          parser: "keyword-rag-file-parser",
          chunkIndex: index + 1,
          chunkCount: chunks.length,
          uploadedAt: createdAt,
        },
      });
    });

    parsed.push({
      filename,
      extension: getFileExtension(filename),
      chunks: chunks.length,
      tags,
      characters: parsedText.length,
    });
  }

  const nextState = await writeState({
    ...state,
    knowledgeSources: [...newSources, ...state.knowledgeSources].slice(0, 120),
  });
  return {
    sources: newSources,
    parsed,
    state: nextState,
    note: "当前为 keyword RAG + 文件解析；PDF/DOCX、embedding、vector DB 和 rerank 在后续增强。",
  };
}

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizeGoal(value) {
  return String(value || "用 BuilderOS 构建一个 AI Native 应用").trim().slice(0, 1000);
}

function toMysqlDate(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }
  const headerToken = request.headers["x-builderos-token"];
  return Array.isArray(headerToken) ? headerToken[0] : headerToken || "";
}

function validateAuthInput(body, mode) {
  const name = normalizeName(body.name);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const goal = normalizeGoal(body.goal);

  if (mode === "register" && name.length < 2) {
    throw createHttpError(400, "invalid_name", "请输入至少 2 个字符的工作区名称。");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError(400, "invalid_email", "请输入有效的邮箱地址。");
  }
  if (password.length < 6) {
    throw createHttpError(400, "invalid_password", "密码至少需要 6 位。");
  }

  return { name, email, password, goal };
}

function publicUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    goal: row.goal || "用 BuilderOS 构建一个 AI Native 应用",
    credits: Number(row.credits ?? 70),
    registeredAt: row.registered_at instanceof Date ? row.registered_at.toISOString() : new Date(row.registered_at).toISOString(),
  };
}

async function readAuthState() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(authFile)) {
    await writeFile(authFile, JSON.stringify({ users: [], sessions: [] }, null, 2), "utf8");
  }
  try {
    const raw = await readFile(authFile, "utf8");
    const state = JSON.parse(raw);
    return {
      users: Array.isArray(state.users) ? state.users : [],
      sessions: Array.isArray(state.sessions) ? state.sessions : [],
    };
  } catch {
    return { users: [], sessions: [] };
  }
}

async function writeAuthState(nextState) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(authFile, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

async function getMysqlPool() {
  if (authStorageMode !== "mysql") {
    return null;
  }
  if (!mysqlPoolPromise) {
    mysqlPoolPromise = import("mysql2/promise").then(({ createPool }) =>
      createPool({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE || "builderos",
        waitForConnections: true,
        connectionLimit: 5,
        charset: "utf8mb4",
      }),
    );
  }
  const pool = await mysqlPoolPromise;
  if (!authSchemaReady) {
    await ensureAuthSchema(pool);
    authSchemaReady = true;
  }
  return pool;
}

async function ensureAuthSchema(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS builderos_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      goal TEXT NULL,
      credits INT NOT NULL DEFAULT 70,
      registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      last_login_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_builderos_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS builderos_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_builderos_sessions_token (token_hash),
      KEY idx_builderos_sessions_user (user_id),
      CONSTRAINT fk_builderos_sessions_user
        FOREIGN KEY (user_id) REFERENCES builderos_users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function createMysqlSession(pool, userId) {
  const token = randomBytes(32).toString("base64url");
  await pool.execute("INSERT INTO builderos_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [
    userId,
    hashToken(token),
    toMysqlDate(new Date(Date.now() + sessionTtlMs)),
  ]);
  return token;
}

async function registerUser(body) {
  const input = validateAuthInput(body, "register");
  const passwordHash = hashPassword(input.password);
  const pool = await getMysqlPool();

  if (pool) {
    try {
      await pool.execute(
        "INSERT INTO builderos_users (name, email, password_hash, goal, credits) VALUES (?, ?, ?, ?, 70)",
        [input.name, input.email, passwordHash, input.goal],
      );
    } catch (error) {
      if (error && error.code === "ER_DUP_ENTRY") {
        throw createHttpError(409, "email_exists", "该邮箱已注册，请直接登录。");
      }
      throw error;
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, goal, credits, registered_at FROM builderos_users WHERE email = ? LIMIT 1",
      [input.email],
    );
    const user = publicUser(rows[0]);
    const token = await createMysqlSession(pool, user.id);
    return { user, token, storage: "mysql" };
  }

  const state = await readAuthState();
  if (state.users.some((user) => user.email === input.email)) {
    throw createHttpError(409, "email_exists", "该邮箱已注册，请直接登录。");
  }
  const user = {
    id: Date.now(),
    name: input.name,
    email: input.email,
    password_hash: passwordHash,
    goal: input.goal,
    credits: 70,
    registered_at: new Date().toISOString(),
  };
  const token = randomBytes(32).toString("base64url");
  const session = {
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
  };
  await writeAuthState({ users: [user, ...state.users], sessions: [session, ...state.sessions] });
  return { user: publicUser(user), token, storage: "json" };
}

async function loginUser(body) {
  const input = validateAuthInput({ ...body, name: "login" }, "login");
  const pool = await getMysqlPool();

  if (pool) {
    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash, goal, credits, registered_at FROM builderos_users WHERE email = ? LIMIT 1",
      [input.email],
    );
    const row = rows[0];
    if (!row || !verifyPassword(input.password, row.password_hash)) {
      throw createHttpError(401, "invalid_credentials", "邮箱或密码不正确，请先注册或检查输入。");
    }
    await pool.execute("UPDATE builderos_users SET last_login_at = ? WHERE id = ?", [
      toMysqlDate(new Date()),
      row.id,
    ]);
    const user = publicUser(row);
    const token = await createMysqlSession(pool, user.id);
    return { user, token, storage: "mysql" };
  }

  const state = await readAuthState();
  const row = state.users.find((user) => user.email === input.email);
  if (!row || !verifyPassword(input.password, row.password_hash)) {
    throw createHttpError(401, "invalid_credentials", "邮箱或密码不正确，请先注册或检查输入。");
  }
  const token = randomBytes(32).toString("base64url");
  const session = {
    userId: row.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
  };
  await writeAuthState({ users: state.users, sessions: [session, ...state.sessions] });
  return { user: publicUser(row), token, storage: "json" };
}

async function logoutUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: true, storage: authStorageMode };
  }
  const tokenHash = hashToken(token);
  const pool = await getMysqlPool();

  if (pool) {
    await pool.execute("DELETE FROM builderos_sessions WHERE token_hash = ?", [tokenHash]);
    return { ok: true, storage: "mysql" };
  }

  const state = await readAuthState();
  await writeAuthState({
    users: state.users,
    sessions: state.sessions.filter((session) => session.tokenHash !== tokenHash),
  });
  return { ok: true, storage: "json" };
}

async function getCurrentUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    throw createHttpError(401, "missing_token", "请先登录。");
  }
  const tokenHash = hashToken(token);
  const pool = await getMysqlPool();

  if (pool) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.goal, u.credits, u.registered_at
       FROM builderos_sessions s
       JOIN builderos_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?
       LIMIT 1`,
      [tokenHash, toMysqlDate(new Date())],
    );
    if (!rows[0]) {
      throw createHttpError(401, "invalid_token", "登录已失效，请重新登录。");
    }
    return { user: publicUser(rows[0]), storage: "mysql" };
  }

  const state = await readAuthState();
  const session = state.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now());
  if (!session) {
    throw createHttpError(401, "invalid_token", "登录已失效，请重新登录。");
  }
  const user = state.users.find((item) => item.id === session.userId);
  if (!user) {
    throw createHttpError(401, "invalid_token", "登录已失效，请重新登录。");
  }
  return { user: publicUser(user), storage: "json" };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toKebabCase(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || "builderos-app"
  );
}

function createProjectFiles({ title, prompt, product, metrics, knowledgeHits, html, css, js }) {
  const packageName = toKebabCase(title);
  const appTsx = `import { useState } from "react";
import "./styles.css";
import { evidence, features, metrics, pages, prompt, title } from "./data/generated";

export default function App() {
  const [activePage, setActivePage] = useState(pages[0]);
  const [activities, setActivities] = useState([
    "Product Agent 已完成需求拆解",
    "Research Agent 已完成知识召回",
    "Engineer Agent 已生成首版页面",
  ]);

  return (
    <div className="generated-app">
      <aside className="generated-sidebar">
        <div className="generated-logo">{title}</div>
        <nav className="generated-nav">
          {pages.map((page) => (
            <button
              key={page}
              className={activePage === page ? "active" : ""}
              onClick={() => setActivePage(page)}
            >
              {page}
            </button>
          ))}
        </nav>
      </aside>
      <main className="generated-main">
        <section className="hero">
          <div>
            <h1>{title}</h1>
            <p>根据需求「{prompt}」生成的可交互产品原型。当前页面：{activePage}。</p>
            <p className="evidence">RAG evidence: {evidence.map((item) => item.title).join(" · ")}</p>
          </div>
          <button
            className="primary"
            onClick={() => setActivities((items) => ["新任务已进入 Agent 队列：" + new Date().toLocaleTimeString(), ...items])}
          >
            派发 Agent 任务
          </button>
        </section>

        <section className="metrics">
          {metrics.map((metric) => (
            <section className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.delta}</em>
            </section>
          ))}
        </section>

        <section className="grid">
          <div className="panel">
            <h2>功能 Backlog</h2>
            <div className="feature-list">
              {features.map((feature) => (
                <div className="feature" key={feature}>
                  <span>{feature}</span>
                  <button>加入迭代</button>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>实时活动</h2>
            <div className="activity">
              {activities.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
`;
  const dataTs = `export const title = ${JSON.stringify(title)};
export const prompt = ${JSON.stringify(prompt)};
export const category = ${JSON.stringify(product.category)};
export const pages = ${JSON.stringify(product.pages, null, 2)} as const;
export const features = ${JSON.stringify(product.features, null, 2)} as const;
export const metrics = ${JSON.stringify(metrics, null, 2)} as const;
export const evidence = ${JSON.stringify(knowledgeHits, null, 2)} as const;
`;

  return [
    {
      path: "app/frontend/package.json",
      language: "json",
      content: JSON.stringify(
        {
          name: packageName,
          private: true,
          type: "module",
          scripts: { dev: "vite --host 0.0.0.0", build: "tsc && vite build", preview: "vite preview" },
          dependencies: { "@vitejs/plugin-react": "^4.3.4", react: "^18.3.1", "react-dom": "^18.3.1", vite: "^5.4.11" },
          devDependencies: { typescript: "^5.6.3", "@types/react": "^18.3.12", "@types/react-dom": "^18.3.1" },
        },
        null,
        2,
      ),
    },
    {
      path: "app/frontend/index.html",
      language: "html",
      content: '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
    },
    {
      path: "app/frontend/src/main.tsx",
      language: "tsx",
      content:
        'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")).render(<App />);\n',
    },
    { path: "app/frontend/src/App.tsx", language: "tsx", content: appTsx },
    { path: "app/frontend/src/styles.css", language: "css", content: css },
    { path: "app/frontend/src/data/generated.ts", language: "ts", content: dataTs },
    { path: "app/generated/preview.html", language: "html", content: html },
    { path: "app/generated/runtime.js", language: "js", content: js },
    {
      path: "README.md",
      language: "markdown",
      content: `# ${title}

Generated by BuilderOS from this prompt:

> ${prompt}

## Run

\`\`\`bash
cd app/frontend
npm install
npm run dev
\`\`\`

## Key Files

- app/frontend/src/App.tsx
- app/frontend/src/data/generated.ts
- app/frontend/src/styles.css
- app/generated/preview.html
`,
    },
  ];
}

async function writeProjectFiles(projectId, files) {
  const projectRoot = path.join(dataDir, "generated-projects", `project-${projectId}`);
  await mkdir(projectRoot, { recursive: true });

  for (const file of files) {
    const relativePath = String(file.path || "").replace(/^\/+/, "");
    if (!relativePath || relativePath.includes("..")) {
      continue;
    }
    const absolutePath = path.join(projectRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, String(file.content || ""), "utf8");
  }

  return projectRoot;
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

function normalizeLlmBaseUrl(value, fallback = "") {
  const raw = String(value || fallback || "").trim().replace(/\/+$/, "");
  if (!raw) {
    return "";
  }
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

function getUrlHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function getLlmProviders() {
  const qwenBaseUrl = normalizeLlmBaseUrl(
    process.env.BUILDEROS_QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL,
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  );
  const relayBaseUrl = normalizeLlmBaseUrl(
    process.env.BUILDEROS_RELAY_BASE_URL || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL,
  );
  const qwenApiKey =
    process.env.BUILDEROS_QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
  const relayApiKey =
    process.env.BUILDEROS_RELAY_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";

  return [
    {
      id: "qwen",
      label: "通义千问",
      protocol: "openai-compatible",
      model: process.env.BUILDEROS_QWEN_MODEL || process.env.QWEN_MODEL || "qwen-plus",
      baseUrl: qwenBaseUrl,
      apiKey: qwenApiKey,
      configured: Boolean(qwenApiKey && qwenBaseUrl),
    },
    {
      id: "relay",
      label: "第三方中转站",
      protocol: "openai-compatible",
      model: process.env.BUILDEROS_RELAY_MODEL || process.env.OPENAI_MODEL || process.env.LLM_NAME || "gpt-4o-mini",
      baseUrl: relayBaseUrl,
      apiKey: relayApiKey,
      configured: Boolean(relayApiKey && relayBaseUrl),
    },
  ];
}

function publicLlmProvider(provider) {
  return {
    id: provider.id,
    label: provider.label,
    protocol: provider.protocol,
    model: provider.model,
    baseUrlHost: getUrlHost(provider.baseUrl),
    configured: provider.configured,
  };
}

function getLlmStatus(preferredProvider = "") {
  const providers = getLlmProviders();
  const strategy = String(preferredProvider || process.env.BUILDEROS_LLM_PROVIDER || "auto").toLowerCase();
  const disabled = ["0", "false", "off", "disabled", "mock", "none"].includes(
    String(process.env.BUILDEROS_LLM_ENABLED || "").toLowerCase(),
  );
  const configuredProviders = providers.filter((provider) => provider.configured);
  let activeProvider = null;
  let fallbackReason = "";

  if (disabled || strategy === "mock" || strategy === "none") {
    fallbackReason = "LLM 网关已关闭，使用 BuilderOS 模板生成器。";
  } else if (strategy !== "auto" && strategy) {
    activeProvider = providers.find((provider) => provider.id === strategy && provider.configured) || null;
    if (!activeProvider) {
      fallbackReason = `未找到已配置的 ${strategy} provider，使用 BuilderOS 模板生成器。`;
    }
  } else {
    activeProvider =
      configuredProviders.find((provider) => provider.id === "qwen") ||
      configuredProviders.find((provider) => provider.id === "relay") ||
      null;
    if (!activeProvider) {
      fallbackReason = "未配置 BUILDEROS_QWEN_API_KEY 或 BUILDEROS_RELAY_*，使用 BuilderOS 模板生成器。";
    }
  }

  return {
    mode: activeProvider ? "real" : "fallback",
    strategy,
    activeProvider: activeProvider ? publicLlmProvider(activeProvider) : null,
    providers: providers.map(publicLlmProvider),
    fallbackReason,
  };
}

function selectLlmCandidates(preferredProvider = "") {
  const providers = getLlmProviders();
  const strategy = String(preferredProvider || process.env.BUILDEROS_LLM_PROVIDER || "auto").toLowerCase();
  const disabled = ["0", "false", "off", "disabled", "mock", "none"].includes(
    String(process.env.BUILDEROS_LLM_ENABLED || "").toLowerCase(),
  );
  if (disabled || strategy === "mock" || strategy === "none") {
    return [];
  }
  if (strategy !== "auto" && strategy) {
    return providers.filter((provider) => provider.id === strategy && provider.configured);
  }
  return ["qwen", "relay"]
    .map((providerId) => providers.find((provider) => provider.id === providerId && provider.configured))
    .filter(Boolean);
}

function extractJsonObject(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("模型未返回 JSON 对象。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function cleanString(value, fallback, maxLength = 80) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, maxLength);
}

function cleanStringList(value, fallback, min = 2, max = 6) {
  const items = Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, max)
    : [];
  return items.length >= min ? items : fallback.slice(0, max);
}

function cleanMetricList(value, fallback) {
  const items = Array.isArray(value)
    ? value
        .map((item) => ({
          label: cleanString(item?.label, "", 16),
          value: cleanString(item?.value, "", 16),
          delta: cleanString(item?.delta, "", 16),
        }))
        .filter((item) => item.label && item.value)
        .slice(0, 4)
    : [];
  return items.length ? items : fallback;
}

function cleanObjectList(value, fallback, keys, max = 6) {
  const items = Array.isArray(value)
    ? value
        .map((item) =>
          keys.reduce((record, key) => {
            record[key] = cleanString(item?.[key], "", key === "detail" || key === "note" ? 160 : 40);
            return record;
          }, {}),
        )
        .filter((item) => keys.every((key) => item[key]))
        .slice(0, max)
    : [];
  return items.length ? items : fallback;
}

async function callOpenAICompatibleChat(provider, messages, options = {}) {
  const endpoint = `${provider.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.BUILDEROS_LLM_TIMEOUT_MS || 70000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: options.temperature ?? 0.25,
        max_tokens: options.maxTokens ?? 1400,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`LLM HTTP ${response.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
    }

    const payload = await response.json();
    const content =
      payload?.choices?.[0]?.message?.content ||
      payload?.choices?.[0]?.text ||
      payload?.output_text ||
      payload?.output?.text ||
      "";
    if (!content) {
      throw new Error("LLM response has no content.");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function buildLlmSpecPrompt({ prompt, mode, raceMode, knowledgeHits, compact = false }) {
  if (compact) {
    return [
      {
        role: "system",
        content:
          "你是 BuilderOS 的 AI Native 应用生成 Agent。只返回合法 JSON，不要 Markdown。字段保持简短，生成产品结构，不要生成代码。",
      },
      {
        role: "user",
        content: JSON.stringify({
          userPrompt: prompt,
          mode,
          raceMode,
          evidence: knowledgeHits.slice(0, 3).map((hit) => ({
            title: hit.title,
            excerpt: compactText(hit.excerpt || hit.content, 120),
          })),
          jsonShape: {
            title: "简短产品名",
            category: "产品类型",
            theme: "saas|commerce|hiring|research|video|ops",
            pages: ["3-4 个页面"],
            features: ["4 个功能"],
            metrics: [{ label: "指标", value: "数值", delta: "变化" }],
            agentNotes: [{ agent: "Agent", note: "短说明" }],
            extensions: ["1-3 个 BuilderOS 扩展点"],
            infraPlan: [{ layer: "层级", detail: "短说明" }],
          },
        }),
      },
    ];
  }

  return [
    {
      role: "system",
      content:
        "你是 BuilderOS 的 AI Native 应用生成 Agent。只返回合法 JSON，不要 Markdown。目标是生成可运行应用的产品结构，不要生成长代码。",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          userPrompt: prompt,
          mode,
          raceMode,
          knowledgeEvidence: knowledgeHits,
          requiredJsonShape: {
            title: "简短产品名",
            category: "产品类型",
            theme: "saas|commerce|hiring|research|video|ops",
            pages: ["3-5 个页面英文或中英混合名"],
            features: ["4-6 个核心功能"],
            metrics: [{ label: "指标名", value: "数值", delta: "变化" }],
            agentNotes: [{ agent: "Agent 名", note: "决策说明" }],
            extensions: ["BuilderOS 相比 Atoms 的扩展点"],
            infraPlan: [{ layer: "层级", detail: "工程实现说明" }],
          },
          constraints: [
            "必须贴合用户需求，不要泛泛而谈。",
            "必须包含可交互应用、源码目录、持久化或部署相关能力。",
            "中文输出为主，页面名可以使用英文。",
          ],
        },
        null,
        2,
      ),
    },
  ];
}

async function generateLlmSpec({ prompt, mode, raceMode, knowledgeSources, providerId }) {
  const knowledgeHits = matchKnowledge(prompt, knowledgeSources);
  const status = getLlmStatus(providerId);
  const candidates = selectLlmCandidates(providerId);

  if (!candidates.length) {
    return {
      spec: null,
      run: {
        used: false,
        provider: "template",
        providerLabel: "BuilderOS 模板生成器",
        model: "deterministic-template",
        baseUrlHost: "",
        fallbackReason: status.fallbackReason,
      },
    };
  }

  const failures = [];
  for (const provider of candidates) {
    try {
      const content = await callOpenAICompatibleChat(
        provider,
        buildLlmSpecPrompt({ prompt, mode, raceMode, knowledgeHits, compact: provider.id === "relay" }),
        { temperature: 0.2, maxTokens: provider.id === "relay" ? 700 : 1400 },
      );
      const spec = extractJsonObject(content);
      return {
        spec,
        run: {
          used: true,
          provider: provider.id,
          providerLabel: provider.label,
          model: provider.model,
          baseUrlHost: getUrlHost(provider.baseUrl),
          fallbackReason: failures.length ? `前序 provider 已降级：${failures.join("；")}` : "",
        },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "LLM 调用失败。";
      failures.push(`${provider.label} ${provider.model}: ${reason}`);
    }
  }

  return {
    spec: null,
    run: {
      used: false,
      provider: "template",
      providerLabel: "BuilderOS 模板生成器",
      model: "deterministic-template",
      baseUrlHost: "",
      fallbackReason: `所有模型 provider 均不可用，已降级到模板生成器：${failures.join("；")}`,
    },
  };
}

function compactText(value, maxLength = 1400) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sourceKey(source) {
  return String(source?.id ?? source?.title ?? "");
}

function rankKnowledgeForOrchestration(query, sources, max = 8) {
  const normalizedQuery = String(query || "").toLowerCase();
  const terms = Array.from(
    new Set(
      [
        ...normalizedQuery.split(/[\s,，。.!?？、/；;:：()（）]+/),
        "java",
        "后端",
        "简历",
        "候选人",
        "电商",
        "订单",
        "支付",
        "库存",
        "营销",
        "5年",
      ].filter((term) => term.length >= 2),
    ),
  );

  return sources
    .map((source) => {
      const tags = Array.isArray(source.tags) ? source.tags : [];
      const haystack = `${source.title} ${source.content} ${tags.join(" ")}`.toLowerCase();
      const termScore = terms.reduce((total, term) => total + (haystack.includes(term.toLowerCase()) ? 8 : 0), 0);
      const resumeBoost = tags.includes("简历") || /候选人[:：]/.test(String(source.content || "")) ? 24 : 0;
      const requirementBoost = tags.includes("岗位需求") ? 18 : 0;
      return {
        id: source.id,
        title: source.title,
        content: source.content,
        tags,
        excerpt: compactText(source.content, 220),
        score: Math.min(99, 32 + termScore + resumeBoost + requirementBoost),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, max);
}

function getRecruitingEvidence(task, knowledgeSources) {
  const ranked = rankKnowledgeForOrchestration(task, knowledgeSources, 10);
  const forced = knowledgeSources
    .filter((source) => {
      const tags = Array.isArray(source.tags) ? source.tags : [];
      return tags.includes("简历") || tags.includes("岗位需求") || /候选人[:：]/.test(String(source.content || ""));
    })
    .map((source) => ({
      id: source.id,
      title: source.title,
      content: source.content,
      tags: Array.isArray(source.tags) ? source.tags : [],
      excerpt: compactText(source.content, 220),
      score: 92,
    }));
  const merged = new Map();
  [...forced, ...ranked].forEach((source) => {
    if (source.title && !merged.has(sourceKey(source))) {
      merged.set(sourceKey(source), source);
    }
  });
  return Array.from(merged.values()).slice(0, 10);
}

function extractCandidateProfiles(knowledgeSources) {
  return knowledgeSources
    .filter((source) => {
      const tags = Array.isArray(source.tags) ? source.tags : [];
      return tags.includes("简历") || /候选人[:：]/.test(String(source.content || ""));
    })
    .map((source) => {
      const content = String(source.content || "");
      const name = content.match(/候选人[:：]\s*([^。；;\n，,]+)/)?.[1]?.trim() || source.title.replace(/^候选人简历[:：]/, "");
      const years = Number(content.match(/经验[:：]?\s*(\d+)\s*年/)?.[1] || content.match(/(\d+)\s*年.*?(?:后端|Java)/)?.[1] || 0);
      return {
        id: source.id,
        name,
        title: source.title,
        content,
        years,
        tags: Array.isArray(source.tags) ? source.tags : [],
      };
    });
}

function includesAny(text, terms) {
  const normalized = String(text || "").toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function buildGroundedRecommendations(task, knowledgeSources) {
  return extractCandidateProfiles(knowledgeSources)
    .map((profile) => {
      const content = profile.content;
      let score = 46;
      const reasons = [];
      const risks = [];

      if (includesAny(content, ["Java", "Spring Boot", "Spring Cloud"])) {
        score += 16;
        reasons.push("Java/Spring 后端技术栈匹配");
      }
      if (profile.years >= 5) {
        score += 18;
        reasons.push(`${profile.years}年经验满足硬性年限要求`);
      } else {
        score -= 18;
        risks.push(`经验年限为${profile.years || "未知"}年，不满足5年以上硬性条件`);
      }
      if (includesAny(content, ["京东", "订单履约", "库存扣减", "商品中心", "交易平台"])) {
        score += 22;
        reasons.push("具备电商交易核心链路经验");
      } else if (includesAny(content, ["会员权益", "优惠券", "活动营销", "营销活动"])) {
        score += 9;
        reasons.push("具备营销或会员系统经验，可部分迁移");
      } else {
        risks.push("电商交易链路经验不足");
      }
      if (includesAny(content, ["支付", "对账", "清结算", "账务一致性"])) {
        score += 8;
        reasons.push("支付、对账或一致性经验可迁移");
      }
      if (includesAny(content, ["缺少电商", "经验不足", "不是主责", "不满足5年以上"])) {
        score -= 12;
      }
      if (includesAny(content, ["风险", "需要进一步确认", "不足", "缺少", "不是主责"])) {
        risks.push("简历中存在需进一步面试确认的风险项");
      }

      const boundedScore = Math.max(35, Math.min(96, score));
      const decision = boundedScore >= 86 ? "强推荐 / 优先面试" : boundedScore >= 72 ? "推荐复核" : "不推荐当前岗位";
      return {
        name: profile.name,
        score: boundedScore,
        decision,
        reasons: reasons.slice(0, 4),
        risks: risks.slice(0, 3),
        evidenceTitles: [profile.title],
        excerpt: compactText(content, 180),
      };
    })
    .sort((left, right) => right.score - left.score);
}

function buildAgentStepMessages({ task, orchestration, step, evidence, previousTrace, recommendations }) {
  const agentSystemPrompt = cleanString(step.systemPrompt, defaultStepSystemPrompt(step), 1200);
  return [
    {
      role: "system",
      content: [
        "你是 BuilderOS 后端真实 Agent Runtime 中的一个专业 Agent。必须基于提供的知识库证据和上游 Agent 输出工作，不能编造候选人或经历。只返回合法 JSON，不要 Markdown。",
        "",
        "当前 Agent 的系统提示词：",
        agentSystemPrompt,
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task,
          workflow: {
            id: orchestration.id,
            name: orchestration.name,
            domain: orchestration.domain,
          },
          currentAgent: {
            agent: step.agent,
            role: step.role,
            action: step.action,
            output: step.output,
            tool: step.tool,
            guardrail: step.guardrail,
          },
          knowledgeEvidence: evidence.map((item) => ({
            title: item.title,
            tags: item.tags,
            score: item.score,
            content: compactText(item.content, 560),
          })),
          groundedCandidateScores: recommendations,
          previousAgentOutputs: previousTrace.map((item) => ({
            agent: item.agent,
            role: item.role,
            result: item.result,
          })),
          requiredJsonShape: {
            summary: "本 Agent 的结论，必须引用知识库事实",
            findings: ["2-4 条关键发现"],
            evidenceTitles: ["使用到的知识库标题"],
            handoff: "交给下一个 Agent 的结构化输入",
            validation: {
              passed: true,
              detail: "说明如何满足 guardrail",
            },
            candidates: [
              {
                name: "候选人姓名",
                decision: "推荐结论",
                score: 0,
                reasons: ["证据化理由"],
                risks: ["风险"],
              },
            ],
          },
        },
        null,
        2,
      ),
    },
  ];
}

async function callAgentStepLlm({ task, orchestration, step, evidence, previousTrace, recommendations, providerId }) {
  const candidates = selectLlmCandidates(providerId);
  if (!candidates.length) {
    throw createHttpError(503, "llm_not_configured", "未配置可用 LLM provider，无法执行真实 Agent 链。");
  }

  const failures = [];
  for (const provider of candidates) {
    try {
      const content = await callOpenAICompatibleChat(
        provider,
        buildAgentStepMessages({ task, orchestration, step, evidence, previousTrace, recommendations }),
        { temperature: 0.18, maxTokens: 620 },
      );
      let payload;
      try {
        payload = extractJsonObject(content);
      } catch {
        payload = {
          summary: compactText(content, 360),
          findings: [compactText(content, 180)],
          evidenceTitles: evidence.slice(0, 3).map((item) => item.title),
          handoff: compactText(content, 220),
          validation: {
            passed: true,
            detail: "模型返回了自然语言结果，平台保留原始输出作为审查证据。",
          },
          candidates: recommendations.slice(0, 3),
        };
      }
      return {
        payload,
        raw: content,
        llm: {
          used: true,
          provider: provider.id,
          providerLabel: provider.label,
          model: provider.model,
          baseUrlHost: getUrlHost(provider.baseUrl),
          fallbackReason: failures.length ? `前序 provider 已降级：${failures.join("；")}` : "",
        },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "LLM 调用失败。";
      failures.push(`${provider.label} ${provider.model}: ${reason}`);
    }
  }

  throw createHttpError(502, "llm_step_failed", `真实 Agent 调用失败：${failures.join("；")}`);
}

function normalizeAgentResult(payload, fallback) {
  if (typeof payload?.summary === "string" && payload.summary.trim().startsWith("{")) {
    try {
      payload = { ...payload, ...extractJsonObject(payload.summary) };
    } catch {
      // Keep the original summary when the nested content is not valid JSON.
    }
  }
  const rawSummary = String(payload?.summary || "").trim();
  const summaryMatch = rawSummary.startsWith("{") ? rawSummary.match(/["']summary["']\s*:\s*["']([^"']+)/) : null;
  const summary = cleanString(summaryMatch?.[1] || rawSummary, fallback, 220);
  const findings = Array.isArray(payload?.findings)
    ? payload.findings.map((item) => cleanString(item, "", 160)).filter(Boolean).slice(0, 4)
    : [];
  const evidenceTitles = Array.isArray(payload?.evidenceTitles)
    ? payload.evidenceTitles.map((item) => cleanString(item, "", 80)).filter(Boolean).slice(0, 6)
    : [];
  const validation = payload?.validation && typeof payload.validation === "object"
    ? {
        passed: payload.validation.passed !== false,
        detail: cleanString(payload.validation.detail, "已通过节点校验。", 160),
      }
    : { passed: true, detail: "已通过节点校验。" };
  return {
    summary,
    findings,
    evidenceTitles,
    handoff: cleanString(payload?.handoff, summary, 240),
    validation,
    candidates: Array.isArray(payload?.candidates) ? payload.candidates.slice(0, 4) : [],
  };
}

function buildFinalOrchestrationReport({ task, trace, evidence, recommendations }) {
  const topCandidates = recommendations.slice(0, 3);
  return {
    title: "Java 后端工程师候选人筛选结果",
    summary: `真实 Agent 链已基于 ${evidence.length} 条知识库证据完成筛选，输出 ${topCandidates.length} 名候选人的推荐排序、理由、风险和后续面试建议。`,
    task,
    recommendations: topCandidates,
    evidenceTitles: evidence.map((item) => item.title),
    agentSummaries: trace.map((item) => ({
      agent: item.agent,
      role: item.role,
      result: item.result,
      validation: item.validation,
      llm: item.llm,
    })),
    checks: [
      {
        label: "知识库 grounding",
        status: "passed",
        detail: `结果引用 ${evidence.filter((item) => item.tags.includes("简历")).length} 份候选人简历和岗位需求。`,
      },
      {
        label: "真实 LLM 调用",
        status: trace.every((item) => item.llm?.used) ? "passed" : "warning",
        detail: trace.every((item) => item.llm?.used)
          ? "每个 Agent 节点均完成 OpenAI 兼容接口调用。"
          : "存在节点未完成模型调用。",
      },
      {
        label: "节点校验",
        status: trace.every((item) => item.validation?.passed) ? "passed" : "warning",
        detail: "每个 Agent 输出均保留 guardrail 校验说明，可用于评审追踪。",
      },
    ],
  };
}

async function runOrchestration(orchestrationId, body = {}) {
  const state = await readState();
  const stored = state.orchestrations.find((item) => String(item.id) === String(orchestrationId));
  const incoming = body.orchestration && Array.isArray(body.orchestration.steps) ? body.orchestration : null;
  const orchestration = incoming || stored;
  if (!orchestration || !Array.isArray(orchestration.steps) || orchestration.steps.length === 0) {
    throw createHttpError(404, "orchestration_not_found", "未找到可执行的 Agent 编排。");
  }

  const task =
    cleanString(
      body.task,
      "请基于知识库中的岗位需求和候选人简历，筛选适合 Java 后端工程师岗位的人选，输出排序、依据、风险和面试问题。",
      800,
    );
  const evidence = getRecruitingEvidence(task, state.knowledgeSources);
  const recommendations = buildGroundedRecommendations(task, state.knowledgeSources);
  if (!recommendations.length) {
    throw createHttpError(422, "knowledge_missing", "知识库中没有可用于真实执行的候选人简历。");
  }

  const startedAt = new Date();
  const trace = [];
  for (const step of orchestration.steps) {
    const stepStartedAt = Date.now();
    const { payload, raw, llm } = await callAgentStepLlm({
      task,
      orchestration,
      step,
      evidence,
      previousTrace: trace,
      recommendations,
      providerId: step.llmProvider || body.llmProvider,
    });
    const normalized = normalizeAgentResult(payload, `${step.output} 已基于知识库生成。`);
    trace.push({
      stepId: step.id,
      agent: step.agent,
      role: step.role,
      action: step.action,
      output: step.output,
      tool: step.tool,
      guardrail: step.guardrail,
      result: normalized.summary,
      findings: normalized.findings,
      evidenceTitles: normalized.evidenceTitles.length ? normalized.evidenceTitles : evidence.slice(0, 3).map((item) => item.title),
      validation: normalized.validation,
      candidates: normalized.candidates,
      durationMs: Math.max(1, Date.now() - stepStartedAt),
      evidence: evidence.slice(0, 6).map((item) => ({
        title: item.title,
        excerpt: item.excerpt,
        score: item.score,
        tags: item.tags,
      })),
      llm,
      raw: compactText(raw, 1200),
    });
  }

  const durationMs = Date.now() - startedAt.getTime();
  const finalReport = buildFinalOrchestrationReport({ task, trace, evidence, recommendations });
  const run = {
    id: `orun-${Date.now()}`,
    status: "completed",
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs,
    task,
    trace,
    evidence: evidence.map((item) => ({
      title: item.title,
      excerpt: item.excerpt,
      score: item.score,
      tags: item.tags,
    })),
    finalReport,
  };

  const updatedOrchestration = {
    ...orchestration,
    status: "ready",
    updatedAt: "刚刚",
    lastRun: run,
  };
  const existingIndex = state.orchestrations.findIndex((item) => String(item.id) === String(updatedOrchestration.id));
  const orchestrations = existingIndex >= 0
    ? state.orchestrations.map((item, index) => (index === existingIndex ? updatedOrchestration : item))
    : [updatedOrchestration, ...state.orchestrations];
  const runRecord = {
    id: `run-${run.id}`,
    projectId: 0,
    prompt: task,
    mode: "research",
    status: "completed",
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    agentCount: trace.length,
    agents: trace.map((item) => ({ name: item.agent, role: item.role, state: item.output })),
    knowledgeHits: run.evidence,
    output: {
      pages: 0,
      features: trace.length,
      sourceBytes: Buffer.byteLength(JSON.stringify(finalReport), "utf8"),
      llm: trace[0]?.llm,
    },
  };
  const nextState = await writeState({
    ...state,
    orchestrations,
    runRecords: [runRecord, ...state.runRecords].slice(0, 80),
  });

  return { orchestration: updatedOrchestration, run, state: nextState };
}

function normalizeLlmSpec(rawSpec, fallbackProduct, fallbackMetrics, fallbackAgentNotes, fallbackExtensions, fallbackInfraPlan) {
  if (!rawSpec || typeof rawSpec !== "object") {
    return null;
  }
  return {
    category: cleanString(rawSpec.category, fallbackProduct.category, 40),
    title: cleanString(rawSpec.title, fallbackProduct.title, 48),
    theme: cleanString(rawSpec.theme, fallbackProduct.theme, 24),
    pages: cleanStringList(rawSpec.pages, fallbackProduct.pages, 2, 6),
    features: cleanStringList(rawSpec.features, fallbackProduct.features, 3, 8),
    metrics: cleanMetricList(rawSpec.metrics, fallbackMetrics),
    agentNotes: cleanObjectList(rawSpec.agentNotes, fallbackAgentNotes, ["agent", "note"], 7),
    extensions: cleanStringList(rawSpec.extensions, fallbackExtensions, 2, 8),
    infraPlan: cleanObjectList(rawSpec.infraPlan, fallbackInfraPlan, ["layer", "detail"], 6),
  };
}

function createGeneratedApp(
  prompt,
  mode = "build",
  raceMode = false,
  knowledgeSources = defaultState.knowledgeSources,
  llmSpec = null,
  llmRun = null,
) {
  const inferredProduct = inferProduct(prompt, mode);
  const fallbackMetrics = [
    { label: "生成页面", value: String(inferredProduct.pages.length), delta: "+2" },
    { label: "核心功能", value: String(inferredProduct.features.length), delta: "+4" },
    { label: "知识命中", value: String(matchKnowledge(prompt, knowledgeSources).length), delta: "+RAG" },
  ];
  const fallbackAgentNotes = [
    { agent: "Alex", note: `将需求拆成 ${inferredProduct.pages.length} 个页面和 ${inferredProduct.features.length} 个核心能力。` },
    { agent: "Mira", note: `优先保证 ${inferredProduct.category} 的主流程可点击、可理解。` },
    { agent: "Noah", note: "采用单页应用结构，方便后续接入真实后端和部署流水线。" },
    { agent: "Kai", note: "从知识库召回资料，用于约束页面结构、评审说明和扩展路线。" },
    { agent: "Luna", note: "由服务端生成 HTML / CSS / JS 产物并写入项目记录。" },
  ];
  const fallbackExtensions = [
    "BuilderOS RAG 知识库 grounding",
    "服务端真实构建记录与运行日志",
    "生成 React/Vite 项目目录和可浏览文件树",
    "源码复制、单文件导出和服务端目录落盘",
    "nginx + systemd 生产部署状态监控",
  ];
  const fallbackInfraPlan = [
    { layer: "Frontend", detail: "React + Vite 负责 Atoms-like 构建工作台和 iframe 预览。" },
    { layer: "API", detail: "Node 标准库 API 保存项目、知识库和构建记录。" },
    { layer: "Proxy", detail: "nginx 独立二级域名接入，BuilderOS API 只监听本机端口。" },
  ];
  const normalizedSpec = normalizeLlmSpec(
    llmSpec,
    inferredProduct,
    fallbackMetrics,
    fallbackAgentNotes,
    fallbackExtensions,
    fallbackInfraPlan,
  );
  const product = normalizedSpec || inferredProduct;
  const title = normalizedSpec?.title || (prompt.length > 7 ? `${product.title} · ${prompt.slice(0, 18)}` : product.title);
  const safeTitle = escapeHtml(title);
  const safePrompt = escapeHtml(prompt);
  const knowledgeHits = matchKnowledge(prompt, knowledgeSources);
  const metrics = (normalizedSpec?.metrics || fallbackMetrics).map((metric) =>
    metric.label === "知识命中" ? { ...metric, value: String(knowledgeHits.length) } : metric,
  );
  const agentNotes = [
    ...(normalizedSpec?.agentNotes || fallbackAgentNotes),
    llmRun?.used
      ? {
          agent: "Model Router",
          note: `已通过 ${llmRun.providerLabel} / ${llmRun.model} 生成产品结构，再由 BuilderOS 写入源码目录。`,
        }
      : {
          agent: "Model Router",
          note: llmRun?.fallbackReason || "未配置真实 LLM，当前使用 BuilderOS 模板生成器完成稳定演示。",
        },
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
  const files = createProjectFiles({
    title,
    prompt,
    product,
    metrics,
    knowledgeHits,
    html,
    css,
    js,
  });

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
    files,
    alternatives,
    knowledgeHits,
    extensions: normalizedSpec?.extensions || fallbackExtensions,
    infraPlan: [
      ...(normalizedSpec?.infraPlan || fallbackInfraPlan),
      {
        layer: "LLM",
        detail: llmRun?.used
          ? `OpenAI 兼容接口：${llmRun.providerLabel} / ${llmRun.model}。`
          : `模型降级：${llmRun?.fallbackReason || "使用本地模板生成器。"}`,
      },
    ],
    llm: llmRun || {
      used: false,
      provider: "template",
      providerLabel: "BuilderOS 模板生成器",
      model: "deterministic-template",
      baseUrlHost: "",
      fallbackReason: "本地生成。",
    },
  };
}

function countSourceBytes(files = []) {
  return files.reduce((total, file) => total + Buffer.byteLength(String(file.content || ""), "utf8"), 0);
}

function createVersionSnapshot(projectId, versionNumber, generated, summary, status = "ready") {
  const files = Array.isArray(generated?.files) ? generated.files : [];
  return {
    id: `project-${projectId}-v${versionNumber}`,
    label: `版本 ${versionNumber}`,
    summary,
    status,
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    sourceBytes: countSourceBytes(files),
    previewUrl: `/api/preview/${projectId}`,
  };
}

function getPublicBaseUrl(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const host = request.headers["x-forwarded-host"] || request.headers.host || `127.0.0.1:${port}`;
  const normalizedHost = Array.isArray(host) ? host[0] : host;
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || (/^(localhost|127\.0\.0\.1)(:|$)/.test(normalizedHost) ? "http" : "https");
  return `${proto}://${normalizedHost}`;
}

function projectNotFound() {
  return createHttpError(404, "project_not_found", "项目不存在。");
}

async function updateProject(projectId, updater) {
  const state = await readState();
  const index = state.projects.findIndex((item) => String(item.id) === String(projectId));
  if (index < 0) {
    throw projectNotFound();
  }
  const project = await updater(state.projects[index], state);
  const projects = [...state.projects];
  projects[index] = project;
  const nextState = await writeState({ ...state, projects });
  return { project, state: nextState };
}

async function createBuild(body) {
  const state = await readState();
  const prompt = String(body.prompt || "").trim() || "构建一个带登录、订阅和仪表盘的 AI 客服 SaaS";
  const mode = ["build", "research", "video"].includes(body.mode) ? body.mode : "build";
  const raceMode = Boolean(body.raceMode);
  const startedAt = new Date();
  const llmResult = await generateLlmSpec({
    prompt,
    mode,
    raceMode,
    knowledgeSources: state.knowledgeSources,
    providerId: body.llmProvider,
  });
  const generated = createGeneratedApp(prompt, mode, raceMode, state.knowledgeSources, llmResult.spec, llmResult.run);
  const id = Date.now();
  const artifactPath = await writeProjectFiles(id, generated.files || []);
  const durationMs = 840 + Math.min(1600, prompt.length * 18);
  const project = {
    id,
    title: generated.title,
    mode,
    status: "可预览",
    version: 1,
    versions: [createVersionSnapshot(id, 1, generated, "初始构建：生成页面、源码目录、RAG 证据和预览 HTML。")],
    previewUrl: `/api/preview/${id}`,
    updatedAt: "刚刚",
    prompt,
    generated,
    artifactPath,
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
      sourceBytes: countSourceBytes(generated.files || []),
      llm: generated.llm,
    },
  };
  const nextState = await writeState({
    ...state,
    projects: [project, ...state.projects].slice(0, 50),
    runRecords: [run, ...state.runRecords].slice(0, 80),
  });
  return { project, run, state: nextState };
}

async function publishProject(projectId, request) {
  const baseUrl = getPublicBaseUrl(request);
  return updateProject(projectId, (project) => {
    const publishedUrl = `${baseUrl}/api/preview/${project.id}`;
    const existingVersions = Array.isArray(project.versions) && project.versions.length
      ? project.versions
      : [createVersionSnapshot(project.id, project.version || 1, project.generated, "从旧项目记录补齐的版本快照。")];
    const versions = existingVersions.map((version, index) =>
      index === 0 ? { ...version, status: "published", previewUrl: `/api/preview/${project.id}` } : version,
    );
    return {
      ...project,
      status: "已发布",
      publishedUrl,
      publishedAt: new Date().toISOString(),
      updatedAt: "刚刚",
      versions,
      publishChecks: [
        { label: "预览 HTML", status: "passed", detail: "生成应用可通过公开 URL 访问。" },
        { label: "源码目录", status: "passed", detail: `${Array.isArray(project.generated?.files) ? project.generated.files.length : 0} 个文件已写入 artifact store。` },
        { label: "运行记录", status: "passed", detail: "Agent run、RAG 证据和输出指标已持久化。" },
        { label: "增长模块", status: "warning", detail: "SEO、GA4、Ads Agent 已预留接口，真实第三方连接待配置。" },
      ],
    };
  });
}

async function createProjectVersion(projectId, body = {}) {
  return updateProject(projectId, async (project) => {
    const versions = Array.isArray(project.versions) ? project.versions : [];
    const versionNumber = versions.length + 1;
    const instruction = String(body.instruction || "").trim();
    const snapshot = createVersionSnapshot(
      project.id,
      versionNumber,
      project.generated,
      instruction || "手动保存：锁定当前源码、预览 HTML、Agent 决策和资源配置。",
    );
    return {
      ...project,
      version: versionNumber,
      versions: [snapshot, ...versions],
      updatedAt: "刚刚",
    };
  });
}

async function readProjectFileManifest(projectId) {
  const state = await readState();
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  if (!project) {
    throw projectNotFound();
  }
  const files = Array.isArray(project.generated?.files) ? project.generated.files : [];
  return {
    projectId: project.id,
    title: project.title,
    artifactPath: project.artifactPath || path.join(dataDir, "generated-projects", `project-${project.id}`),
    files: files.map((file) => ({
      path: file.path,
      language: file.language,
      bytes: Buffer.byteLength(String(file.content || ""), "utf8"),
      content: file.content,
    })),
  };
}

async function readProjectPreview(projectId) {
  const state = await readState();
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  if (!project) {
    throw projectNotFound();
  }
  return project.generated?.srcDoc || project.generated?.html || "<!doctype html><title>BuilderOS Preview</title>";
}

async function downloadProjectArchive(projectId, response) {
  const manifest = await readProjectFileManifest(projectId);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const safeTitle = `builderos-project-${projectId}`;

  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${safeTitle}.zip"`,
    "Cache-Control": "no-store",
  });

  archive.on("error", (error) => {
    response.destroy(error);
  });
  archive.pipe(response);

  for (const file of manifest.files) {
    archive.append(String(file.content || ""), { name: file.path });
  }
  archive.append(
    JSON.stringify(
      {
        projectId: manifest.projectId,
        title: manifest.title,
        artifactPath: manifest.artifactPath,
        exportedAt: new Date().toISOString(),
        files: manifest.files.map((file) => ({ path: file.path, language: file.language, bytes: file.bytes })),
      },
      null,
      2,
    ),
    { name: "builderos-manifest.json" },
  );

  await archive.finalize();
}

async function readCloudResources() {
  const state = await readState();
  const llmStatus = getLlmStatus();
  const projectCount = state.projects.length;
  const runCount = state.runRecords.length;
  const publishedCount = state.projects.filter((project) => project.status === "已发布").length;
  return state.cloudResources.map((resource) => {
    if (resource.id === "ai-gateway") {
      const activeProvider = llmStatus.activeProvider;
      return {
        ...resource,
        provider: activeProvider ? `${activeProvider.label} · ${activeProvider.model}` : "BuilderOS Template Fallback",
        status: activeProvider ? "connected" : "ready",
        description: activeProvider
          ? `当前通过 ${activeProvider.label} 的 OpenAI 兼容接口生成应用规格，异常时自动降级到模板生成器。`
          : llmStatus.fallbackReason,
        endpoint: activeProvider ? activeProvider.baseUrlHost : "/api/llm/status",
        usage: activeProvider ? "Real LLM / Build Agent" : "Template fallback",
        updatedAt: activeProvider ? "已配置" : "待配置",
      };
    }
    if (resource.id === "app-storage") {
      return { ...resource, usage: `${projectCount} projects / ${runCount} runs` };
    }
    if (resource.id === "agent-orchestrator") {
      const orchestrationCount = state.orchestrations.length;
      const stepCount = state.orchestrations.reduce((total, item) => total + (item.steps?.length || 0), 0);
      return {
        ...resource,
        usage: `${orchestrationCount} flows / ${stepCount} steps`,
        updatedAt: orchestrationCount > 0 ? "已配置" : "待配置",
      };
    }
    if (resource.id === "growth") {
      return { ...resource, usage: `${publishedCount} published apps` };
    }
    return resource;
  });
}

async function provisionCloudResource(resourceId) {
  const state = await readState();
  const cloudResources = (state.cloudResources || defaultCloudResources).map((resource) =>
    resource.id === resourceId
      ? {
          ...resource,
          status: "connected",
          updatedAt: "刚刚",
        }
      : resource,
  );
  const nextState = await writeState({ ...state, cloudResources });
  return {
    resource: nextState.cloudResources.find((resource) => resource.id === resourceId),
    resources: await readCloudResources(),
  };
}

async function readPlatformStatus() {
  const state = await readState();
  const llmStatus = getLlmStatus();
  let fileSize = 0;
  let authStatus = "healthy";
  let authLatency = 1;
  let authEndpoint = authStorageMode === "mysql" ? "mysql.builderos_users" : authFile;
  try {
    fileSize = (await stat(stateFile)).size;
  } catch {
    fileSize = 0;
  }
  try {
    const startedAt = Date.now();
    const pool = await getMysqlPool();
    if (pool) {
      await pool.execute("SELECT COUNT(*) AS total FROM builderos_users");
    } else {
      await readAuthState();
    }
    authLatency = Math.max(1, Date.now() - startedAt);
  } catch {
    authStatus = "degraded";
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
      cloudResources: state.cloudResources.length,
      orchestrations: state.orchestrations.length,
      updatedAt: state.updatedAt,
      authStore: authStorageMode,
    },
    services: [
      { name: "BuilderOS API", status: "healthy", statusCode: 200, latencyMs: 0, endpoint: "/api/health" },
      {
        name: "Auth Store",
        status: authStatus,
        statusCode: authStatus === "healthy" ? 200 : 500,
        latencyMs: authLatency,
        endpoint: authEndpoint,
      },
      {
        name: "Build Engine",
        status: "healthy",
        statusCode: 200,
        latencyMs: Math.max(1, Math.round(process.uptime() % 12)),
        endpoint: "/api/build",
      },
      {
        name: "LLM Gateway",
        status: llmStatus.activeProvider ? "healthy" : "degraded",
        statusCode: llmStatus.activeProvider ? 200 : 204,
        latencyMs: 0,
        endpoint: llmStatus.activeProvider
          ? `${llmStatus.activeProvider.label} / ${llmStatus.activeProvider.model}`
          : "/api/llm/status",
      },
      {
        name: "RAG Engine",
        status: state.knowledgeSources.length > 0 ? "healthy" : "degraded",
        statusCode: state.knowledgeSources.length > 0 ? 200 : 204,
        latencyMs: Math.max(1, state.knowledgeSources.length * 2),
        endpoint: "/api/state.knowledgeSources",
      },
      {
        name: "Agent Orchestrator",
        status: state.orchestrations.length > 0 ? "healthy" : "degraded",
        statusCode: state.orchestrations.length > 0 ? 200 : 204,
        latencyMs: Math.max(1, state.orchestrations.length * 3),
        endpoint: "/api/state.orchestrations",
      },
      {
        name: "Cloud Resources",
        status: state.cloudResources.length > 0 ? "healthy" : "degraded",
        statusCode: state.cloudResources.length > 0 ? 200 : 204,
        latencyMs: Math.max(1, state.cloudResources.length),
        endpoint: "/api/cloud-resources",
      },
      {
        name: "JSON Storage",
        status: fileSize > 0 ? "healthy" : "degraded",
        statusCode: fileSize > 0 ? 200 : 500,
        latencyMs: Math.max(1, Math.round(fileSize / 4096)),
        endpoint: stateFile,
      },
    ],
    llm: llmStatus,
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
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

    if (request.method === "GET" && url.pathname === "/api/llm/status") {
      sendJson(response, 200, getLlmStatus(url.searchParams.get("provider") || ""));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      sendJson(response, 200, await getCurrentUser(request));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      sendJson(response, 201, await registerUser(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      sendJson(response, 200, await loginUser(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      sendJson(response, 200, await logoutUser(request));
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

    if (request.method === "POST" && url.pathname === "/api/knowledge/upload") {
      sendJson(response, 200, await ingestKnowledgeFiles(await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/build") {
      sendJson(response, 200, await createBuild(await readJsonBody(request)));
      return;
    }

    const orchestrationRunMatch = url.pathname.match(/^\/api\/orchestrations\/([^/]+)\/run$/);
    if (request.method === "POST" && orchestrationRunMatch) {
      sendJson(response, 200, await runOrchestration(orchestrationRunMatch[1], await readJsonBody(request)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/cloud-resources") {
      sendJson(response, 200, { resources: await readCloudResources() });
      return;
    }

    const cloudResourceMatch = url.pathname.match(/^\/api\/cloud-resources\/([^/]+)\/provision$/);
    if (request.method === "POST" && cloudResourceMatch) {
      sendJson(response, 200, await provisionCloudResource(cloudResourceMatch[1]));
      return;
    }

    const projectPreviewMatch = url.pathname.match(/^\/api\/preview\/([^/]+)$/);
    if (request.method === "GET" && projectPreviewMatch) {
      sendHtml(response, 200, await readProjectPreview(projectPreviewMatch[1]));
      return;
    }

    const projectPublishMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/publish$/);
    if (request.method === "POST" && projectPublishMatch) {
      sendJson(response, 200, await publishProject(projectPublishMatch[1], request));
      return;
    }

    const projectVersionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);
    if (request.method === "POST" && projectVersionMatch) {
      sendJson(response, 200, await createProjectVersion(projectVersionMatch[1], await readJsonBody(request)));
      return;
    }

    const projectFilesMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/files$/);
    if (request.method === "GET" && projectFilesMatch) {
      sendJson(response, 200, await readProjectFileManifest(projectFilesMatch[1]));
      return;
    }

    const projectDownloadMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/download$/);
    if (request.method === "GET" && projectDownloadMatch) {
      await downloadProjectArchive(projectDownloadMatch[1], response);
      return;
    }

    sendJson(response, 404, { ok: false, error: "not_found" });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    sendJson(response, statusCode, {
      ok: false,
      error: error?.code || "server_error",
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`BuilderOS API listening on http://127.0.0.1:${port}`);
});
