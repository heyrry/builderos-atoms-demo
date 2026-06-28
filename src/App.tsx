import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  AudioLines,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  Compass,
  Copy,
  CreditCard,
  Database,
  Download,
  FileText,
  FlaskConical,
  FolderKanban,
  FolderUp,
  Gem,
  Gift,
  Github,
  Globe2,
  Home,
  Layers,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  Monitor,
  PackageOpen,
  Paintbrush,
  PanelLeftClose,
  Paperclip,
  PlayCircle,
  PlugZap,
  Rocket,
  Search,
  Server,
  Settings2,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Section = "home" | "resources" | "knowledge" | "data" | "compare" | "projects";
type WorkMode = "build" | "research" | "video";

type Project = {
  id: number;
  title: string;
  mode: WorkMode;
  status: "构建中" | "可预览" | "已发布";
  updatedAt: string;
  prompt: string;
  generated: GeneratedApp;
  publishedUrl?: string;
};

type GeneratedApp = {
  title: string;
  category: string;
  brief: string;
  theme: string;
  pages: string[];
  features: string[];
  metrics: Array<{ label: string; value: string; delta: string }>;
  agentNotes: Array<{ agent: string; note: string }>;
  html: string;
  css: string;
  js: string;
  srcDoc: string;
  alternatives: Array<{ name: string; score: number; angle: string }>;
  knowledgeHits: Array<{ title: string; excerpt: string; score: number }>;
  extensions: string[];
  infraPlan: Array<{ layer: string; detail: string }>;
};

type WorkspaceProfile = {
  name: string;
  email: string;
  goal: string;
  credits: number;
  registeredAt?: string;
};

type RunRecord = {
  id: string;
  projectId: number;
  prompt: string;
  mode: WorkMode;
  status: "completed" | "failed" | "running";
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  agentCount: number;
  agents: Array<{ name: string; role: string; state: string }>;
  knowledgeHits: Array<{ title: string; excerpt: string; score: number }>;
  output: { pages: number; features: number; sourceBytes: number };
};

type PlatformStatus = {
  serverTime: string;
  process: {
    pid: number;
    node: string;
    uptimeSeconds: number;
    memoryMb: number;
  };
  storage: {
    dataDir: string;
    stateFile: string;
    stateFileBytes: number;
    projects: number;
    knowledgeSources: number;
    runRecords: number;
    updatedAt: string;
  };
  services: Array<{
    name: string;
    status: "healthy" | "degraded";
    statusCode: number;
    latencyMs: number;
    endpoint: string;
  }>;
};

type KnowledgeSource = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

type Agent = {
  name: string;
  role: string;
  color: string;
  state: string;
  icon: LucideIcon;
};

type ResourceItem = {
  title: string;
  meta: string;
  icon: LucideIcon;
  accent: string;
};

const agents: Agent[] = [
  { name: "Alex", role: "Team Lead", color: "#ff8f43", state: "任务拆解", icon: Bot },
  { name: "Mira", role: "PM", color: "#ffc247", state: "PRD", icon: FileText },
  { name: "Noah", role: "Architect", color: "#a99a83", state: "架构", icon: Layers },
  { name: "Luna", role: "Engineer", color: "#ff7bb6", state: "编码", icon: Code2 },
  { name: "Kai", role: "Research", color: "#7c8ee8", state: "调研", icon: Search },
  { name: "Iris", role: "Growth", color: "#4aa3ff", state: "增长", icon: Megaphone },
  { name: "Vera", role: "Data", color: "#35c57a", state: "分析", icon: BarChart3 },
  { name: "Rex", role: "Ops", color: "#8056df", state: "部署", icon: Cloud },
];

const resourceItems: ResourceItem[] = [
  { title: "模型网关", meta: "GPT, Claude, Gemini, Seedance", icon: Brain, accent: "#4867f1" },
  { title: "云数据库", meta: "Auth, Table, Storage, Edge API", icon: Database, accent: "#21a67a" },
  { title: "支付连接", meta: "订阅, 一次性付款, Webhook", icon: CreditCard, accent: "#d46b2c" },
  { title: "发布托管", meta: "预览域名, 自定义域名, 私有访问", icon: Globe2, accent: "#0f9ca8" },
  { title: "GitHub 同步", meta: "仓库, 分支, Pull Request", icon: Github, accent: "#242424" },
  { title: "增长工具", meta: "SEO, Ads, GA4, 排名跟踪", icon: Megaphone, accent: "#b64bc8" },
];

const modeLabel: Record<WorkMode, string> = {
  build: "构建",
  research: "深度研究",
  video: "视频",
};

const quickPrompts = [
  "构建一个带登录、订阅和仪表盘的 AI 客服 SaaS",
  "调研海外 AI 视频生成工具，并输出竞品报告",
  "创建一个可发布的电商落地页，包含 Stripe 结账",
  "生成一个招聘管理后台，支持候选人看板和数据分析",
];

const initialPrompt = "请描述你要构建的产品、页面、数据、连接器或增长任务。";
const candidateName = "BuilderOS";
const storageKey = "atoms-demo-builderos-projects-v2";
const profileKey = "atoms-demo-builderos-profile-v2";
const knowledgeKey = "atoms-demo-builderos-knowledge-v2";
const defaultProfile: WorkspaceProfile = {
  name: "",
  email: "",
  goal: "用 BuilderOS 构建一个 AI Native 应用",
  credits: 70,
};

const defaultKnowledgeSources: KnowledgeSource[] = [
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
];

type ServerState = {
  projects?: Project[];
  runRecords?: RunRecord[];
  knowledgeSources?: KnowledgeSource[];
};

type BuildResponse = {
  project: Project;
  run: RunRecord;
  state: ServerState;
};

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }
  return (await response.json()) as T;
}

function matchKnowledge(prompt: string, sources: KnowledgeSource[]) {
  const terms = prompt
    .toLowerCase()
    .split(/[\s,，。.!?？、/]+/)
    .filter((term) => term.length >= 2);

  return sources
    .map((source) => {
      const haystack = `${source.title} ${source.content} ${source.tags.join(" ")}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 18 : 0), 0);
      const tagScore = source.tags.some((tag) => prompt.toLowerCase().includes(tag.toLowerCase())) ? 14 : 0;
      return {
        title: source.title,
        excerpt: source.content.slice(0, 118),
        score: Math.min(96, score + tagScore + 42),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function inferProduct(prompt: string, mode: WorkMode) {
  const normalized = prompt.toLowerCase();

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createGeneratedApp(
  prompt: string,
  mode: WorkMode,
  raceMode: boolean,
  knowledgeSources: KnowledgeSource[] = defaultKnowledgeSources,
): GeneratedApp {
  const product = inferProduct(prompt, mode);
  const title = prompt.length > 7 ? `${product.title} · ${prompt.slice(0, 18)}` : product.title;
  const safeTitle = escapeHtml(title);
  const safePrompt = escapeHtml(prompt);
  const knowledgeHits = matchKnowledge(prompt, knowledgeSources);
  const metrics = [
    { label: "生成页面", value: String(product.pages.length), delta: "+2" },
    { label: "核心功能", value: String(product.features.length), delta: "+4" },
    { label: "完成度", value: "82%", delta: "+18%" },
  ];
  const agentNotes = [
    { agent: "Alex", note: `将需求拆成 ${product.pages.length} 个页面和 ${product.features.length} 个核心能力。` },
    { agent: "Mira", note: `优先保证 ${product.category} 的主流程可点击、可理解。` },
    { agent: "Noah", note: "采用单页应用结构，方便后续接入真实后端和部署流水线。" },
    {
      agent: "Kai",
      note: `从知识库召回 ${knowledgeHits.length} 条资料，用于约束页面结构、评审说明和扩展路线。`,
    },
    { agent: "Luna", note: "生成可直接预览的 HTML / CSS / JS，并挂载演示级交互。" },
  ];
  const alternatives = raceMode
    ? [
        { name: "Product-first", score: 91, angle: "优先覆盖核心使用路径和信息架构。" },
        { name: "Growth-first", score: 87, angle: "更强调转化、SEO 和营销埋点。" },
        { name: "Ops-first", score: 84, angle: "更强调权限、数据表和发布运维。" },
      ]
    : [];
  const extensions = [
    "BuilderOS RAG 知识库 grounding",
    "Agent 执行轨迹与评审证据",
    "源码解释、复制和单文件导出",
    "服务端 JSON 持久化，浏览器离线时自动降级",
  ];
  const infraPlan = [
    { layer: "Frontend", detail: "React + Vite 负责 Atoms-like 构建工作台和 iframe 预览。" },
    { layer: "API", detail: "Node 标准库 API 保存项目、知识库和构建记录。" },
    { layer: "Proxy", detail: "nginx 独立二级域名接入，BuilderOS API 只监听本机端口。" },
  ];

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
    .map(
      (metric) =>
        `<section class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><em>${escapeHtml(metric.delta)}</em></section>`,
    )
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
          <div>Engineer Agent 已生成首版页面</div>
          <div>Ops Agent 等待发布配置</div>
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
    extensions,
    infraPlan,
  };
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [profile, setProfile] = usePersistentState<WorkspaceProfile>(profileKey, defaultProfile);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [startAfterSignup, setStartAfterSignup] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>("build");
  const [teamMode, setTeamMode] = useState(true);
  const [deepResearch, setDeepResearch] = useState(false);
  const [raceMode, setRaceMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [attachmentOpen, setAttachmentOpen] = useState(true);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBuildPrompt, setCurrentBuildPrompt] = useState("");
  const [projects, setProjects] = usePersistentState<Project[]>(storageKey, []);
  const [runRecords, setRunRecords] = usePersistentState<RunRecord[]>("atoms-demo-builderos-runs-v2", []);
  const [knowledgeSources, setKnowledgeSources] = usePersistentState<KnowledgeSource[]>(
    knowledgeKey,
    defaultKnowledgeSources,
  );
  const [serverStatus, setServerStatus] = useState<"connecting" | "synced" | "local">("connecting");
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = usePersistentState<number | null>(
    "atoms-demo-builderos-selected-project-v2",
    null,
  );

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const registrationRequired = !profile.registeredAt;
  const displayName = profile.name.trim() || "Builder";

  const activeAgents = useMemo(() => {
    if (!teamMode) {
      return agents.filter((agent) => agent.role === "Engineer");
    }
    if (deepResearch || workMode === "research") {
      return agents.filter((agent) => ["Team Lead", "PM", "Research", "Data"].includes(agent.role));
    }
    return agents;
  }, [deepResearch, teamMode, workMode]);

  useEffect(() => {
    document.title = candidateName;
  }, []);

  useEffect(() => {
    let ignore = false;

    apiRequest<ServerState>("/api/state")
      .then((state) => {
        if (ignore) {
          return;
        }
        if (state.projects?.length) {
          setProjects(state.projects);
          setSelectedProjectId(state.projects[0].id);
        }
        if (state.runRecords?.length) {
          setRunRecords(state.runRecords);
        }
        if (state.knowledgeSources?.length) {
          setKnowledgeSources(state.knowledgeSources);
        }
        setServerStatus("synced");
      })
      .catch(() => {
        if (!ignore) {
          setServerStatus("local");
        }
      });

    return () => {
      ignore = true;
    };
  }, [setKnowledgeSources, setProjects, setRunRecords, setSelectedProjectId]);

  useEffect(() => {
    let ignore = false;

    function refreshStatus() {
      apiRequest<PlatformStatus>("/api/status")
        .then((status) => {
          if (!ignore) {
            setPlatformStatus(status);
            setServerStatus("synced");
          }
        })
        .catch(() => {
          if (!ignore) {
            setServerStatus("local");
          }
        });
    }

    refreshStatus();
    const timer = window.setInterval(refreshStatus, 10000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isBuilding) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(value + 13, 100));
    }, 520);

    return () => window.clearInterval(timer);
  }, [isBuilding]);

  useEffect(() => {
    if (!isBuilding || isFinalizing || progress < 100) {
      return;
    }

    setIsFinalizing(true);
    apiRequest<BuildResponse>("/api/build", {
      method: "POST",
      body: JSON.stringify({ prompt: currentBuildPrompt, mode: workMode, raceMode }),
    })
      .then((result) => {
        const nextProjects = result.state.projects?.length ? result.state.projects : [result.project, ...projects];
        const nextRunRecords = result.state.runRecords?.length ? result.state.runRecords : [result.run, ...runRecords];
        setProjects(nextProjects);
        setRunRecords(nextRunRecords);
        if (result.state.knowledgeSources?.length) {
          setKnowledgeSources(result.state.knowledgeSources);
        }
        setSelectedProjectId(result.project.id);
        setServerStatus("synced");
      })
      .catch(() => {
        const generated = createGeneratedApp(currentBuildPrompt, workMode, raceMode, knowledgeSources);
        const fallbackId = Date.now();
        const newProject: Project = {
          id: fallbackId,
          title: generated.title,
          mode: workMode,
          status: "可预览",
          updatedAt: "刚刚",
          prompt: currentBuildPrompt,
          generated,
        };
        const fallbackRun: RunRecord = {
          id: `local-${fallbackId}`,
          projectId: fallbackId,
          prompt: currentBuildPrompt,
          mode: workMode,
          status: "completed",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          agentCount: activeAgents.length,
          agents: activeAgents.map((agent) => ({ name: agent.name, role: agent.role, state: agent.state })),
          knowledgeHits: generated.knowledgeHits,
          output: {
            pages: generated.pages.length,
            features: generated.features.length,
            sourceBytes: generated.html.length,
          },
        };
        const nextProjects = [newProject, ...projects];
        const nextRunRecords = [fallbackRun, ...runRecords];
        setProjects(nextProjects);
        setRunRecords(nextRunRecords);
        setSelectedProjectId(newProject.id);
        void syncServerState(nextProjects, knowledgeSources, nextRunRecords);
      })
      .finally(() => {
        setIsBuilding(false);
        setIsFinalizing(false);
      });
  }, [
    activeAgents,
    currentBuildPrompt,
    isFinalizing,
    isBuilding,
    knowledgeSources,
    projects,
    progress,
    raceMode,
    runRecords,
    setKnowledgeSources,
    setProjects,
    setRunRecords,
    setSelectedProjectId,
    workMode,
  ]);

  function syncServerState(
    nextProjects = projects,
    nextKnowledgeSources = knowledgeSources,
    nextRunRecords = runRecords,
  ) {
    return apiRequest<ServerState>("/api/state", {
      method: "POST",
      body: JSON.stringify({
        projects: nextProjects,
        knowledgeSources: nextKnowledgeSources,
        runRecords: nextRunRecords,
      }),
    })
      .then(() => setServerStatus("synced"))
      .catch(() => setServerStatus("local"));
  }

  function saveKnowledgeSources(nextSources: KnowledgeSource[]) {
    setKnowledgeSources(nextSources);
    void syncServerState(projects, nextSources);
  }

  function startBuild(nextPrompt = prompt) {
    const normalizedPrompt = nextPrompt.trim() || quickPrompts[0];
    setPrompt(normalizedPrompt);
    setCurrentBuildPrompt(normalizedPrompt);
    setProgress(8);
    setIsBuilding(true);
    setWorkspaceOpen(true);
    setActiveSection("home");
    setProfile((current) => ({ ...current, credits: Math.max(0, current.credits - (raceMode ? 8 : 3)) }));
  }

  function publishProject(projectId: number) {
    setProjects((items) => {
      const nextProjects: Project[] = items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status: "已发布",
              publishedUrl: `https://preview.builderos.local/${project.id}`,
              updatedAt: "刚刚",
            }
          : project,
      );
      void syncServerState(nextProjects, knowledgeSources);
      return nextProjects;
    });
  }

  function previewProject(projectId: number) {
    setSelectedProjectId(projectId);
    setActiveSection("home");
  }

  function downloadProject(project: Project) {
    const blob = new Blob([project.generated.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.title.replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, "-").slice(0, 42)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function selectMode(mode: WorkMode) {
    setWorkMode(mode);
    if (mode === "research") {
      setDeepResearch(true);
    }
    if (mode === "video") {
      setDeepResearch(false);
    }
  }

  function requestSignup(shouldStartAfterSignup = false) {
    if (!registrationRequired) {
      setWorkspaceOpen(true);
      if (shouldStartAfterSignup) {
        window.setTimeout(() => startBuild(prompt), 0);
      }
      return;
    }

    setStartAfterSignup(shouldStartAfterSignup);
    setOnboardingOpen(true);
  }

  function saveProfile(nextProfile: WorkspaceProfile) {
    setProfile({ ...nextProfile, registeredAt: nextProfile.registeredAt || new Date().toISOString() });
    setWorkspaceOpen(true);
    setOnboardingOpen(false);

    if (startAfterSignup) {
      setStartAfterSignup(false);
      window.setTimeout(() => startBuild(prompt), 0);
    }
  }

  if (!workspaceOpen) {
    return (
      <PublicLanding
        activeAgents={agents}
        prompt={prompt}
        onLogin={() => requestSignup(false)}
        onPromptChange={setPrompt}
        onSignup={() => requestSignup(false)}
        onStart={() => requestSignup(true)}
      >
        {onboardingOpen && (
          <OnboardingModal
            canClose
            registrationRequired={registrationRequired}
            profile={profile}
            onClose={() => {
              setStartAfterSignup(false);
              setOnboardingOpen(false);
            }}
            onSave={saveProfile}
          />
        )}
      </PublicLanding>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="brand-name">BuilderOS</span>
          <button className="icon-button ghost" aria-label="折叠侧栏">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="workspace-switch" onClick={() => setOnboardingOpen(true)}>
          <span className="workspace-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span>{displayName}'s BuilderOS</span>
          <ChevronDown size={16} />
        </button>

        <nav className="nav-list" aria-label="主导航">
          <NavItem icon={Home} label="首页" active={activeSection === "home"} onClick={() => setActiveSection("home")} />
          <NavItem
            icon={Compass}
            label="资源"
            active={activeSection === "resources"}
            onClick={() => setActiveSection("resources")}
          />
          <NavItem
            icon={Brain}
            label="知识库"
            active={activeSection === "knowledge"}
            onClick={() => setActiveSection("knowledge")}
          />
          <NavItem
            icon={Server}
            label="实时数据"
            active={activeSection === "data"}
            onClick={() => setActiveSection("data")}
          />
          <NavItem
            icon={FlaskConical}
            label="差异"
            active={activeSection === "compare"}
            onClick={() => setActiveSection("compare")}
          />
          <NavItem
            icon={FolderKanban}
            label="我的项目"
            active={activeSection === "projects"}
            onClick={() => setActiveSection("projects")}
          />
        </nav>

        <div className="project-slot">
          {projects.length === 0 ? (
            <div className="empty-projects">
              <PackageOpen size={24} />
              <span>还没有项目</span>
              <small>点击“首页”开始。</small>
            </div>
          ) : (
            <div className="mini-projects">
              {projects.slice(0, 3).map((project) => (
                <button key={project.id} className="mini-project" onClick={() => setActiveSection("projects")}>
                  <span>{project.title}</span>
                  <small>{modeLabel[project.mode]} · {project.updatedAt}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-card">
            <Users size={19} />
            <span>
              加入我们的社区
              <small>最多可赚取 25 积分</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="sidebar-card">
            <Gift size={19} />
            <span>
              获取免费积分
              <small>每人获得 10 积分</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </aside>

      <main className="workspace">
        <div className="promo-banner">
          <Tag size={15} />
          <span>今日可领取价值 $26 的构建额度，年度方案享额外折扣。</span>
          <button>解锁优惠</button>
          <button className="banner-close" aria-label="关闭优惠">
            <X size={16} />
          </button>
        </div>

        <div className="top-tools">
          <span className={`sync-pill ${serverStatus}`}>
            {serverStatus === "synced" ? "服务端同步" : serverStatus === "connecting" ? "连接中" : "本地模式"}
          </span>
          <button className="credit-pill">
            <Gem size={17} />
            <strong>{profile.credits}</strong>
          </button>
        </div>

        {activeSection === "home" && (
          <HomeView
            activeAgents={activeAgents}
            attachmentOpen={attachmentOpen}
            connectorOpen={connectorOpen}
            currentBuildPrompt={currentBuildPrompt}
            deepResearch={deepResearch}
            isBuilding={isBuilding}
            menuOpen={menuOpen}
            progress={progress}
            prompt={prompt}
            projects={projects}
            raceMode={raceMode}
            selectedProject={selectedProject}
            teamMode={teamMode}
            ownerName={displayName}
            workMode={workMode}
            onDownloadProject={downloadProject}
            onPromptChange={setPrompt}
            onPublishProject={publishProject}
            onQuickPrompt={startBuild}
            onSelectMode={selectMode}
            onStartBuild={() => startBuild()}
            onToggleAttachment={() => setAttachmentOpen((value) => !value)}
            onToggleConnector={() => setConnectorOpen((value) => !value)}
            onToggleDeepResearch={() => setDeepResearch((value) => !value)}
            onToggleMenu={() => setMenuOpen((value) => !value)}
            onToggleRaceMode={() => setRaceMode((value) => !value)}
            onToggleTeamMode={() => setTeamMode((value) => !value)}
          />
        )}

        {activeSection === "resources" && <ResourcesView />}
        {activeSection === "knowledge" && (
          <KnowledgeView knowledgeSources={knowledgeSources} onSaveKnowledgeSources={saveKnowledgeSources} />
        )}
        {activeSection === "data" && (
          <DataView
            knowledgeSources={knowledgeSources}
            platformStatus={platformStatus}
            projects={projects}
            runRecords={runRecords}
          />
        )}
        {activeSection === "compare" && <CompareView />}
        {activeSection === "projects" && (
          <ProjectsView
            projects={projects}
            onPreviewProject={previewProject}
            onDownloadProject={downloadProject}
            onPublishProject={publishProject}
            onStartBuild={startBuild}
          />
        )}

        <button className="floating-assistant" aria-label="打开助理">
          <MessageCircle size={24} />
        </button>

        {(registrationRequired || onboardingOpen) && (
          <OnboardingModal
            canClose
            registrationRequired={registrationRequired}
            profile={profile}
            onClose={() => {
              if (!registrationRequired) {
                setOnboardingOpen(false);
              }
            }}
            onSave={saveProfile}
          />
        )}
      </main>
    </div>
  );
}

type PublicLandingProps = {
  activeAgents: Agent[];
  children?: ReactNode;
  prompt: string;
  onLogin: () => void;
  onPromptChange: (value: string) => void;
  onSignup: () => void;
  onStart: () => void;
};

function PublicLanding({
  activeAgents,
  children,
  prompt,
  onLogin,
  onPromptChange,
  onSignup,
  onStart,
}: PublicLandingProps) {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="公开导航">
        <div className="landing-brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="brand-name">BuilderOS</span>
        </div>
        <div className="landing-links">
          <button>方案</button>
          <button>
            资源
            <ChevronDown size={18} />
          </button>
        </div>
        <div className="landing-actions">
          <button className="landing-login" onClick={onLogin}>
            登录
          </button>
          <button className="landing-signup" onClick={onSignup} aria-label="进入工作区">
            <span>进入工作区</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </nav>

      <section className="landing-hero" aria-label="BuilderOS 首页">
        <div className="landing-agent-stack" aria-label="BuilderOS 智能体团队">
          {activeAgents.map((agent) => {
            const Icon = agent.icon;
            return (
              <span key={agent.name} className="landing-agent" style={{ backgroundColor: agent.color }}>
                <Icon size={20} />
              </span>
            );
          })}
        </div>

        <span className="landing-eyebrow">AI Native Builder Platform</span>
        <h1>把需求变成可运行的 AI 应用</h1>
        <p>BuilderOS 让 Agent 团队完成需求拆解、知识库取证、代码生成、预览与部署。每次构建都有执行轨迹和可审查源码。</p>

        <div className="landing-capabilities" aria-label="核心能力">
          <span>RAG 取证</span>
          <span>执行轨迹</span>
          <span>源码预览</span>
          <span>部署检查</span>
        </div>

        <div className="landing-composer">
          <textarea
            aria-label="描述你要构建的 AI 应用"
            value={prompt}
            placeholder="描述应用目标、业务规则、数据来源或内部知识库。"
            onChange={(event) => onPromptChange(event.target.value)}
          />
          <div className="landing-composer-footer">
            <button className="landing-dot" aria-label="添加上下文">
              <Sparkles size={18} />
            </button>
            <button className="landing-start" onClick={onStart}>
              开始构建
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
      </section>

      {children}
    </main>
  );
}

type HomeViewProps = {
  activeAgents: Agent[];
  attachmentOpen: boolean;
  connectorOpen: boolean;
  currentBuildPrompt: string;
  deepResearch: boolean;
  isBuilding: boolean;
  menuOpen: boolean;
  progress: number;
  prompt: string;
  projects: Project[];
  raceMode: boolean;
  selectedProject?: Project;
  teamMode: boolean;
  ownerName: string;
  workMode: WorkMode;
  onDownloadProject: (project: Project) => void;
  onPromptChange: (value: string) => void;
  onPublishProject: (projectId: number) => void;
  onQuickPrompt: (value: string) => void;
  onSelectMode: (mode: WorkMode) => void;
  onStartBuild: () => void;
  onToggleAttachment: () => void;
  onToggleConnector: () => void;
  onToggleDeepResearch: () => void;
  onToggleMenu: () => void;
  onToggleRaceMode: () => void;
  onToggleTeamMode: () => void;
};

function HomeView({
  activeAgents,
  attachmentOpen,
  connectorOpen,
  currentBuildPrompt,
  deepResearch,
  isBuilding,
  menuOpen,
  progress,
  prompt,
  projects,
  raceMode,
  selectedProject,
  teamMode,
  ownerName,
  workMode,
  onDownloadProject,
  onPromptChange,
  onPublishProject,
  onQuickPrompt,
  onSelectMode,
  onStartBuild,
  onToggleAttachment,
  onToggleConnector,
  onToggleDeepResearch,
  onToggleMenu,
  onToggleRaceMode,
  onToggleTeamMode,
}: HomeViewProps) {
  return (
    <section className="home-view">
      <div className="mode-pill">
        <PlayCircle size={15} />
        <span>Introduce Video</span>
        <span>·</span>
        <span>Create videos with Seedance 2.0</span>
        <X size={15} />
      </div>

      <div className="agent-stack" aria-label="智能体团队">
        {activeAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <span key={agent.name} className="agent-avatar" style={{ backgroundColor: agent.color }}>
              <Icon size={18} />
            </span>
          );
        })}
      </div>

      <h1>你想创造什么，{ownerName}?</h1>

      <div className="composer-panel">
        <textarea
          value={prompt}
          placeholder={initialPrompt}
          onChange={(event) => onPromptChange(event.target.value)}
        />

        <div className="composer-bottom">
          <div className="composer-left">
            <button className="circle-button" aria-label="清空输入" onClick={() => onPromptChange("")}>
              <X size={18} />
            </button>
            <button className="theme-button" onClick={onToggleMenu}>
              <Paintbrush size={18} />
              <span>主题</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="composer-right">
            <ModeSelector activeMode={workMode} onSelect={onSelectMode} />
            <button className="circle-button" aria-label="语音输入">
              <AudioLines size={18} />
            </button>
            <button className="send-button" onClick={onStartBuild} aria-label="开始构建">
              <ArrowUp size={21} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mode-menu">
            <MenuRow icon={Users} label="团队模式" trailing={<Toggle checked={teamMode} onClick={onToggleTeamMode} />} />
            <MenuRow
              icon={Paperclip}
              label="附件"
              onClick={onToggleAttachment}
              trailing={<ChevronRight size={17} className={attachmentOpen ? "rotated" : ""} />}
            />
            {attachmentOpen && (
              <div className="sub-menu attachment-menu">
                <button>
                  <Upload size={17} />
                  上传文件
                </button>
                <button>
                  <FolderUp size={17} />
                  上传文件夹
                </button>
              </div>
            )}
            <MenuRow
              icon={PlugZap}
              label="连接器"
              onClick={onToggleConnector}
              trailing={<ChevronRight size={17} className={connectorOpen ? "rotated" : ""} />}
            />
            {connectorOpen && (
              <div className="connector-grid">
                {["Supabase", "GitHub", "Stripe", "GA4"].map((name) => (
                  <button key={name}>{name}</button>
                ))}
              </div>
            )}
            <MenuRow
              icon={Video}
              label="视频"
              badge="Seedance 2.0"
              trailing={<span className="red-dot" />}
              onClick={() => onSelectMode("video")}
            />
            <MenuRow
              icon={Search}
              label="深度研究"
              trailing={<Toggle checked={deepResearch || workMode === "research"} onClick={onToggleDeepResearch} />}
              onClick={() => onSelectMode("research")}
            />
            <MenuRow
              icon={FlaskConical}
              label="竞赛模式"
              muted
              trailing={<Toggle checked={raceMode} onClick={onToggleRaceMode} />}
            />
          </div>
        )}

        <div className="attachment-strip">
          <span className="file-thumb image" />
          <span className="file-thumb file" />
          <span className="file-thumb github" />
          <span className="file-thumb image" />
          <span className="file-thumb file" />
          <button aria-label="移除附件">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="quick-prompt-row">
        {quickPrompts.map((item) => (
          <button key={item} onClick={() => onQuickPrompt(item)}>
            <Sparkles size={16} />
            <span>{item}</span>
          </button>
        ))}
      </div>

      {(isBuilding || projects.length > 0) && (
        <div className="build-console">
          <div className="console-header">
            <div>
              <span className="eyebrow">Agent Run</span>
              <h2>{isBuilding ? "正在构建" : "最近项目"}</h2>
            </div>
            <div className="device-switch">
              <button className="active">
                <Monitor size={16} />
                桌面
              </button>
              <button>
                <Smartphone size={16} />
                移动端
              </button>
            </div>
          </div>

          <div className="console-layout">
            <div className="agent-timeline">
              {activeAgents.slice(0, 5).map((agent, index) => (
                <div className="timeline-row" key={agent.name}>
                  <span className="timeline-dot" style={{ backgroundColor: agent.color }} />
                  <div>
                    <strong>{agent.name}</strong>
                    <small>{isBuilding && index === Math.floor(progress / 24) ? "处理中" : agent.state}</small>
                  </div>
                  {progress > index * 22 ? <CheckCircle2 size={17} /> : <Activity size={17} />}
                </div>
              ))}
            </div>

            <div className="preview-stack">
              <div className="preview-frame">
                <div className="preview-toolbar">
                  <span>{currentBuildPrompt || selectedProject?.title || "AI 应用预览"}</span>
                  <button
                    disabled={!selectedProject}
                    onClick={() => selectedProject && onPublishProject(selectedProject.id)}
                  >
                    <Rocket size={15} />
                    {selectedProject?.status === "已发布" ? "已发布" : "发布"}
                  </button>
                </div>
                {selectedProject && !isBuilding ? <GeneratedPreview project={selectedProject} /> : <MockApp />}
                {isBuilding && (
                  <div className="progress-overlay">
                    <div className="progress-ring">
                      <span>{progress}%</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedProject && !isBuilding && (
                <GeneratedSummary project={selectedProject} onDownloadProject={onDownloadProject} />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MockApp() {
  return (
    <div className="mock-app">
      <div className="mock-sidebar" />
      <div className="mock-content">
        <div className="mock-heading" />
        <div className="mock-metrics">
          <span />
          <span />
          <span />
        </div>
        <div className="mock-table">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

type SourceTab = "html" | "css" | "js";

function GeneratedPreview({ project }: { project: Project }) {
  return (
    <iframe
      className="generated-iframe"
      sandbox="allow-scripts"
      srcDoc={project.generated.srcDoc}
      title={`${project.title} 预览`}
    />
  );
}

function GeneratedSummary({
  project,
  onDownloadProject,
}: {
  project: Project;
  onDownloadProject: (project: Project) => void;
}) {
  const [activeTab, setActiveTab] = useState<SourceTab>("html");
  const [copied, setCopied] = useState(false);
  const source = project.generated[activeTab];

  async function copySource() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="generated-summary">
      <div className="summary-column">
        <span className="eyebrow">Generated App</span>
        <h3>{project.generated.category}</h3>
        <p>{project.generated.brief}</p>
        <div className="feature-chips">
          {project.generated.features.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
      </div>

      <div className="summary-column">
        <span className="eyebrow">Agent Decisions</span>
        <div className="agent-notes">
          {project.generated.agentNotes.map((note) => (
            <div key={`${note.agent}-${note.note}`}>
              <strong>{note.agent}</strong>
              <span>{note.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-column">
        <span className="eyebrow">RAG Evidence</span>
        <div className="knowledge-hit-list">
          {project.generated.knowledgeHits.map((hit) => (
            <div key={hit.title}>
              <strong>{hit.title}</strong>
              <span>{hit.score}%</span>
              <small>{hit.excerpt}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-column">
        <span className="eyebrow">Platform Extensions</span>
        <div className="extension-list">
          {project.generated.extensions.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      {project.generated.alternatives.length > 0 && (
        <div className="summary-column">
          <span className="eyebrow">Race Mode</span>
          <div className="variant-list">
            {project.generated.alternatives.map((variant) => (
              <div key={variant.name}>
                <strong>{variant.name}</strong>
                <span>{variant.score}</span>
                <small>{variant.angle}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="source-panel">
        <div className="source-tabs">
          <div>
            {(["html", "css", "js"] as SourceTab[]).map((tab) => (
              <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          <div>
            <button onClick={copySource}>
              <Copy size={14} />
              {copied ? "已复制" : "复制"}
            </button>
            <button onClick={() => onDownloadProject(project)}>
              <Download size={14} />
              导出 HTML
            </button>
          </div>
        </div>
        <pre>{source}</pre>
      </div>
    </div>
  );
}

function ResourcesView() {
  return (
    <section className="section-view">
      <div className="section-heading">
        <span className="eyebrow">Resources</span>
        <h1>资源</h1>
      </div>

      <div className="resource-grid">
        {resourceItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className="resource-card" key={item.title}>
              <span className="resource-icon" style={{ color: item.accent }}>
                <Icon size={23} />
              </span>
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </button>
          );
        })}
      </div>

      <div className="wallet-panel">
        <div>
          <span className="eyebrow">Cloud & AI Wallet</span>
          <h2>额度与云资源</h2>
        </div>
        <div className="wallet-stats">
          <Stat label="积分" value="15" icon={Gem} />
          <Stat label="云额度" value="$26" icon={Cloud} />
          <Stat label="私有项目" value="3" icon={LockKeyhole} />
          <Stat label="自动化任务" value="8" icon={Zap} />
        </div>
      </div>
    </section>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(value: number) {
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(2)} s`;
}

type DataViewProps = {
  knowledgeSources: KnowledgeSource[];
  platformStatus: PlatformStatus | null;
  projects: Project[];
  runRecords: RunRecord[];
};

function DataView({ knowledgeSources, platformStatus, projects, runRecords }: DataViewProps) {
  const latestRun = runRecords[0];

  return (
    <section className="section-view">
      <div className="section-heading">
        <span className="eyebrow">Live Platform Data</span>
        <h1>真实运行数据</h1>
      </div>

      <div className="live-metric-grid">
        <Stat label="服务端项目" value={String(platformStatus?.storage.projects ?? projects.length)} icon={FolderKanban} />
        <Stat
          label="知识条目"
          value={String(platformStatus?.storage.knowledgeSources ?? knowledgeSources.length)}
          icon={Brain}
        />
        <Stat label="运行记录" value={String(platformStatus?.storage.runRecords ?? runRecords.length)} icon={Activity} />
        <Stat label="API 内存" value={`${platformStatus?.process.memoryMb ?? 0} MB`} icon={Server} />
      </div>

      <div className="ops-layout">
        <div className="ops-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Service Health</span>
              <h2>服务健康</h2>
            </div>
            <small>{formatDateTime(platformStatus?.serverTime)}</small>
          </div>
          <div className="service-list">
            {(platformStatus?.services ?? []).map((service) => (
              <div key={service.name}>
                <span className={service.status === "healthy" ? "health-dot healthy" : "health-dot degraded"} />
                <strong>{service.name}</strong>
                <small>{service.endpoint}</small>
                <em>
                  {service.statusCode} · {service.latencyMs}ms
                </em>
              </div>
            ))}
            {!platformStatus && <p className="muted-copy">正在读取服务状态...</p>}
          </div>
        </div>

        <div className="ops-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Storage</span>
              <h2>持久化文件</h2>
            </div>
            <small>{formatBytes(platformStatus?.storage.stateFileBytes ?? 0)}</small>
          </div>
          <dl className="storage-list">
            <div>
              <dt>Data Dir</dt>
              <dd>{platformStatus?.storage.dataDir ?? "localStorage fallback"}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(platformStatus?.storage.updatedAt)}</dd>
            </div>
            <div>
              <dt>Node</dt>
              <dd>{platformStatus?.process.node ?? "-"}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{formatDuration((platformStatus?.process.uptimeSeconds ?? 0) * 1000)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="run-console">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Build Runs</span>
            <h2>最近构建记录</h2>
          </div>
          {latestRun && <small>Latest: {formatDateTime(latestRun.finishedAt || latestRun.startedAt)}</small>}
        </div>

        {runRecords.length === 0 ? (
          <div className="empty-state compact">
            <Activity size={30} />
            <h2>还没有服务端运行记录</h2>
          </div>
        ) : (
          <div className="run-list">
            {runRecords.slice(0, 8).map((run) => (
              <article key={run.id}>
                <div>
                  <strong>{run.prompt}</strong>
                  <small>
                    {modeLabel[run.mode]} · {formatDuration(run.durationMs)} · {run.agentCount} Agents
                  </small>
                </div>
                <span className="status-pill">{run.status === "completed" ? "完成" : run.status}</span>
                <div className="run-output">
                  <span>{run.output.pages} pages</span>
                  <span>{run.output.features} features</span>
                  <span>{formatBytes(run.output.sourceBytes)}</span>
                </div>
                <div className="run-knowledge">
                  {run.knowledgeHits.map((hit) => (
                    <span key={`${run.id}-${hit.title}`}>{hit.title}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type KnowledgeViewProps = {
  knowledgeSources: KnowledgeSource[];
  onSaveKnowledgeSources: (sources: KnowledgeSource[]) => void;
};

function KnowledgeView({ knowledgeSources, onSaveKnowledgeSources }: KnowledgeViewProps) {
  const [draftTitle, setDraftTitle] = useState("ROOT/AI Native 评审关注点");
  const [draftContent, setDraftContent] = useState(
    "评审会关注完成度、工程思维、用户体验、创新性和可交付性。Demo 应展示真实交互、持久化、核心主流程和至少一个延展能力。",
  );
  const [draftTags, setDraftTags] = useState("ROOT,Review,Delivery");

  function addSource() {
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!title || !content) {
      return;
    }

    const nextSource: KnowledgeSource = {
      id: Date.now(),
      title,
      content,
      tags: draftTags
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      updatedAt: "刚刚",
    };
    onSaveKnowledgeSources([nextSource, ...knowledgeSources]);
    setDraftTitle("");
    setDraftContent("");
    setDraftTags("");
  }

  function removeSource(sourceId: number) {
    onSaveKnowledgeSources(knowledgeSources.filter((source) => source.id !== sourceId));
  }

  return (
    <section className="section-view">
      <div className="section-heading with-action">
        <div>
          <span className="eyebrow">Knowledge Base</span>
          <h1>增强型 RAG 知识库</h1>
        </div>
        <button className="primary-action" onClick={addSource}>
          <Upload size={17} />
          写入知识库
        </button>
      </div>

      <div className="knowledge-layout">
        <div className="knowledge-editor">
          <label>
            标题
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          </label>
          <label>
            内容
            <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
          </label>
          <label>
            标签
            <input value={draftTags} onChange={(event) => setDraftTags(event.target.value)} />
          </label>
        </div>

        <div className="knowledge-explainer">
          <span className="eyebrow">BuilderOS RAG Engine</span>
          <h2>为什么加知识库</h2>
          <p>
            Atoms 更强调从自然语言快速生成应用；这里增加 RAG grounding，让 Agent 在生成前先检索内部资料、作业要求和产品规则，再把命中证据带到生成结果里。
          </p>
          <div className="infra-list">
            <span>解析</span>
            <span>切块</span>
            <span>召回</span>
            <span>证据聚合</span>
            <span>生成</span>
          </div>
        </div>
      </div>

      <div className="knowledge-list">
        {knowledgeSources.map((source) => (
          <article key={source.id} className="knowledge-card">
            <div>
              <strong>{source.title}</strong>
              <small>{source.updatedAt}</small>
            </div>
            <p>{source.content}</p>
            <div className="tag-row">
              {source.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <button aria-label="删除知识" onClick={() => removeSource(source.id)}>
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompareView() {
  const rows = [
    {
      area: "核心体验",
      atoms: "自然语言输入后由 Agent 生成应用，并提供视觉化预览。",
      builder: "保留同类构建体验，同时把知识证据、执行轨迹和源码产物放在同一个工作台。",
    },
    {
      area: "知识能力",
      atoms: "偏通用生成与资源连接。",
      builder: "新增 BuilderOS RAG：资料可写入知识库，构建结果展示召回证据。",
    },
    {
      area: "工程交付",
      atoms: "强调快速原型和发布。",
      builder: "新增源码复制、HTML 导出、部署检查、服务端 JSON 持久化和 nginx 独立站点部署。",
    },
    {
      area: "团队协作",
      atoms: "多 Agent 形象化协作。",
      builder: "增加 PM/架构/研究/工程/运维的决策日志，便于评审和复盘。",
    },
  ];

  return (
    <section className="section-view">
      <div className="section-heading">
        <span className="eyebrow">Atoms vs BuilderOS</span>
        <h1>平台差异与扩展</h1>
      </div>

      <div className="compare-table">
        {rows.map((row) => (
          <article key={row.area}>
            <strong>{row.area}</strong>
            <div>
              <span>Atoms</span>
              <p>{row.atoms}</p>
            </div>
            <div>
              <span>BuilderOS Demo</span>
              <p>{row.builder}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="roadmap-panel">
        <span className="eyebrow">Next Expansion</span>
        <h2>继续投入时的优先级</h2>
        <div className="roadmap-grid">
          <span>1. 接入真实 LLM 代码生成 API</span>
          <span>2. 将 RAG 从关键词召回升级为向量检索</span>
          <span>3. 增加沙箱构建与在线预览容器</span>
          <span>4. 接入 GitHub PR、Vercel/自托管发布流水线</span>
        </div>
      </div>
    </section>
  );
}

type ProjectsViewProps = {
  projects: Project[];
  onDownloadProject: (project: Project) => void;
  onPreviewProject: (projectId: number) => void;
  onPublishProject: (projectId: number) => void;
  onStartBuild: (value: string) => void;
};

function ProjectsView({ projects, onDownloadProject, onPreviewProject, onPublishProject, onStartBuild }: ProjectsViewProps) {
  return (
    <section className="section-view">
      <div className="section-heading with-action">
        <div>
          <span className="eyebrow">Projects</span>
          <h1>我的项目</h1>
        </div>
        <button className="primary-action" onClick={() => onStartBuild(quickPrompts[0])}>
          <Sparkles size={17} />
          新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={36} />
          <h2>还没有项目</h2>
          <button className="primary-action" onClick={() => onStartBuild(quickPrompts[0])}>
            <ArrowUp size={17} />
            立即构建
          </button>
        </div>
      ) : (
        <div className="project-table">
          {projects.map((project) => (
            <div className="project-row" key={project.id}>
              <div>
                <strong>{project.title}</strong>
                <small>{modeLabel[project.mode]} · {project.updatedAt}</small>
              </div>
              <span className="status-pill">{project.status}</span>
              <div className="project-actions">
                <button onClick={() => onPreviewProject(project.id)}>
                  <Monitor size={16} />
                  预览
                </button>
                <button>
                  <Github size={16} />
                  同步
                </button>
                <button onClick={() => onDownloadProject(project)}>
                  <Download size={16} />
                  导出
                </button>
                <button onClick={() => onPublishProject(project.id)}>
                  <Rocket size={16} />
                  {project.status === "已发布" ? "已发布" : "发布"}
                </button>
              </div>
              {project.publishedUrl && <small className="published-url">{project.publishedUrl}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type OnboardingModalProps = {
  canClose?: boolean;
  profile: WorkspaceProfile;
  registrationRequired: boolean;
  onClose: () => void;
  onSave: (profile: WorkspaceProfile) => void;
};

function OnboardingModal({ canClose = false, profile, registrationRequired, onClose, onSave }: OnboardingModalProps) {
  const [draft, setDraft] = useState<WorkspaceProfile>({
    ...defaultProfile,
    ...profile,
    name: profile.name || "",
    goal: profile.goal || defaultProfile.goal,
  });
  const canSubmit = draft.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(draft.email.trim());

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="初始化工作区">
      <div className="onboarding-modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">BuilderOS Signup</span>
            <h2>{registrationRequired ? "创建你的 BuilderOS 工作区" : "工作区设置"}</h2>
          </div>
          {canClose && (
            <button className="circle-button" aria-label="关闭" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="setup-grid">
          <label>
            昵称
            <input
              value={draft.name}
              placeholder="输入你的名字或团队名"
              onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
            />
          </label>
          <label>
            邮箱
            <input
              value={draft.email}
              placeholder="用于注册和工作区归属"
              onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))}
            />
          </label>
          <label className="wide">
            本次目标
            <textarea
              value={draft.goal}
              onChange={(event) => setDraft((value) => ({ ...value, goal: event.target.value }))}
            />
          </label>
        </div>

        <div className="setup-summary">
          <Stat label="初始额度" value={`${draft.credits}`} icon={Gem} />
          <Stat label="团队成员" value="8" icon={Users} />
          <Stat label="默认模式" value="Team" icon={Bot} />
        </div>

        <div className="modal-actions">
          <button onClick={() => setDraft(defaultProfile)}>重置</button>
          <button
            className="primary-action"
            disabled={!canSubmit}
            onClick={() =>
              onSave({
                ...draft,
                name: draft.name.trim(),
                email: draft.email.trim(),
                credits: draft.credits || 70,
              })
            }
          >
            <Sparkles size={17} />
            {registrationRequired ? "创建并进入" : "保存设置"}
          </button>
        </div>
      </div>
    </div>
  );
}

type NavItemProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function NavItem({ active, icon: Icon, label, onClick }: NavItemProps) {
  return (
    <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

type MenuRowProps = {
  badge?: string;
  icon: LucideIcon;
  label: string;
  muted?: boolean;
  onClick?: () => void;
  trailing?: JSX.Element;
};

function MenuRow({ badge, icon: Icon, label, muted, onClick, trailing }: MenuRowProps) {
  return (
    <button className={muted ? "menu-row muted" : "menu-row"} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
      {badge && <em>{badge}</em>}
      <span className="row-spacer" />
      {trailing}
    </button>
  );
}

type ToggleProps = {
  checked: boolean;
  onClick: () => void;
};

function Toggle({ checked, onClick }: ToggleProps) {
  return (
    <span
      className={checked ? "toggle checked" : "toggle"}
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span />
    </span>
  );
}

type ModeSelectorProps = {
  activeMode: WorkMode;
  onSelect: (mode: WorkMode) => void;
};

function ModeSelector({ activeMode, onSelect }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      {(["build", "research", "video"] as WorkMode[]).map((mode) => (
        <button key={mode} className={activeMode === mode ? "active" : ""} onClick={() => onSelect(mode)}>
          {modeLabel[mode]}
        </button>
      ))}
    </div>
  );
}

type StatProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function Stat({ icon: Icon, label, value }: StatProps) {
  return (
    <div className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
