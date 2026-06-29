import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
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
  Eye,
  EyeOff,
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
  LogOut,
  Megaphone,
  MessageCircle,
  Monitor,
  PackageOpen,
  Paintbrush,
  PanelLeftClose,
  Paperclip,
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

type Section = "home" | "resources" | "knowledge" | "orchestration" | "data" | "compare" | "projects";
type WorkMode = "build" | "research" | "video";
type AuthIntent = "login" | "signup";

type Project = {
  id: number;
  title: string;
  mode: WorkMode;
  status: "构建中" | "可预览" | "已发布";
  version?: number;
  versions?: ProjectVersion[];
  updatedAt: string;
  prompt: string;
  generated: GeneratedApp;
  artifactPath?: string;
  previewUrl?: string;
  publishedUrl?: string;
  publishedAt?: string;
  publishChecks?: PublishCheck[];
};

type ProjectVersion = {
  id: string;
  label: string;
  summary: string;
  status: "ready" | "published";
  createdAt: string;
  fileCount: number;
  sourceBytes: number;
  previewUrl?: string;
};

type PublishCheck = {
  label: string;
  status: "passed" | "warning";
  detail: string;
};

type GeneratedFile = {
  path: string;
  language: string;
  content: string;
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
  files: GeneratedFile[];
  alternatives: Array<{ name: string; score: number; angle: string }>;
  knowledgeHits: Array<{ title: string; excerpt: string; score: number }>;
  extensions: string[];
  infraPlan: Array<{ layer: string; detail: string }>;
  llm?: LlmRunInfo;
};

type WorkspaceProfile = {
  id?: number;
  name: string;
  email: string;
  goal: string;
  credits: number;
  registeredAt?: string;
};

type AuthPayload = {
  name?: string;
  email: string;
  password: string;
  goal?: string;
};

type AuthResponse = {
  user: WorkspaceProfile;
  token: string;
  storage: "mysql" | "json";
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
  output: { pages: number; features: number; sourceBytes: number; llm?: LlmRunInfo };
};

type LlmRunInfo = {
  used: boolean;
  provider: string;
  providerLabel?: string;
  model: string;
  baseUrlHost?: string;
  fallbackReason?: string;
};

type LlmProviderStatus = {
  id: string;
  label: string;
  protocol: string;
  model: string;
  baseUrlHost: string;
  configured: boolean;
};

type LlmStatus = {
  mode: "real" | "fallback";
  strategy: string;
  activeProvider: LlmProviderStatus | null;
  providers: LlmProviderStatus[];
  fallbackReason: string;
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
    cloudResources?: number;
    orchestrations?: number;
    updatedAt: string;
    authStore?: "mysql" | "json";
  };
  services: Array<{
    name: string;
    status: "healthy" | "degraded";
    statusCode: number;
    latencyMs: number;
    endpoint: string;
  }>;
  llm?: LlmStatus;
};

type CloudResource = {
  id: string;
  type: string;
  title: string;
  provider: string;
  status: "connected" | "ready" | "degraded";
  scope: string;
  description: string;
  endpoint: string;
  usage: string;
  updatedAt: string;
  actions: string[];
};

type KnowledgeSource = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  source?: {
    filename: string;
    extension: string;
    parser: string;
    chunkIndex: number;
    chunkCount: number;
    uploadedAt: string;
  };
};

type OrchestrationStep = {
  id: string;
  agent: string;
  role: string;
  action: string;
  output: string;
  tool: string;
  guardrail: string;
  systemPrompt?: string;
  llmProvider?: string;
};

type OrchestrationRun = {
  id: string;
  status: "completed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  task?: string;
  evidence?: Array<{ title: string; excerpt: string; score: number; tags?: string[] }>;
  finalReport?: {
    title: string;
    summary: string;
    recommendations: Array<{
      name: string;
      score: number;
      decision: string;
      reasons: string[];
      risks: string[];
      evidenceTitles: string[];
      excerpt?: string;
    }>;
    evidenceTitles: string[];
    checks: Array<{ label: string; status: string; detail: string }>;
  };
  trace: Array<{
    stepId: string;
    agent: string;
    role?: string;
    action: string;
    result: string;
    output?: string;
    tool?: string;
    guardrail?: string;
    findings?: string[];
    evidenceTitles?: string[];
    validation?: { passed: boolean; detail: string };
    evidence?: Array<{ title: string; excerpt: string; score: number; tags?: string[] }>;
    llm?: LlmRunInfo;
    durationMs: number;
  }>;
};

type AgentOrchestration = {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: "draft" | "ready";
  owner: string;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
  updatedAt: string;
  steps: OrchestrationStep[];
  lastRun?: OrchestrationRun | null;
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
  { title: "模型网关", meta: "通义千问、第三方中转站、模板降级", icon: Brain, accent: "#4867f1" },
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

const quickPromptLabels = ["AI 客服 SaaS", "AI 视频调研", "电商落地页", "招聘管理后台"];

const initialPrompt = "请描述你要构建的产品、页面、数据、连接器或增长任务。";
const candidateName = "BuilderOS";
const storageKey = "atoms-demo-builderos-projects-v2";
const profileKey = "atoms-demo-builderos-profile-v2";
const authTokenKey = "atoms-demo-builderos-auth-token-v1";
const knowledgeKey = "atoms-demo-builderos-knowledge-v2";
const demoAccount = {
  name: "ROOT Reviewer",
  email: "reviewer@builderos.demo",
  password: "BuilderOS2026",
  goal: "评审 BuilderOS 的 Atoms-like 生成、云资源、版本发布和源码交付能力",
};
const defaultProfile: WorkspaceProfile = {
  name: "",
  email: "",
  goal: "用 BuilderOS 构建一个 AI Native 应用",
  credits: 70,
};

function getInitialSection(): Section {
  try {
    const section = new URLSearchParams(window.location.search).get("section");
    if (["home", "resources", "knowledge", "orchestration", "data", "compare", "projects"].includes(section || "")) {
      return section as Section;
    }
  } catch {
    return "home";
  }
  return "home";
}

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
  {
    id: 101,
    title: "岗位需求：Java 后端工程师",
    content:
      "岗位：Java 后端工程师。硬性条件：5年以上后端开发经验，熟悉 Java、Spring Boot、MySQL、Redis、消息队列和分布式系统。优先条件：有电商平台、交易平台、订单、支付、库存、商品、营销等系统经验。交付要求：输出候选人推荐排序、证据、风险点和面试问题。",
    tags: ["招聘", "岗位需求", "Java", "后端", "电商"],
    updatedAt: "内置",
  },
];

const defaultOrchestrations: AgentOrchestration[] = [
  {
    id: "recruiting-agent-chain",
    name: "招聘多 Agent 编排模板",
    description: "从通用模板快速创建可复用的 Agent 编排配置，展示 BuilderOS 对 OmniAgent 自由编排能力的扩展。",
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

function defaultStepSystemPrompt(step: Pick<OrchestrationStep, "agent" | "role" | "action" | "output" | "tool" | "guardrail">) {
  return [
    `你是 BuilderOS 多 Agent 编排中的「${step.agent || "专业 Agent"}」，角色是「${step.role || "执行节点"}」。`,
    `你的任务：${step.action || "根据上游输入完成本节点工作"}。`,
    `必须产出：${step.output || "结构化结果"}，并使用工具能力：${step.tool || "LLM + RAG"}。`,
    `守护规则：${step.guardrail || "输出必须可解释、可审查，并引用知识库证据"}。`,
    "不要编造不存在的候选人、经历或数据；如果证据不足，明确标记风险并交给下一步处理。",
  ].join("\n");
}

type ServerState = {
  projects?: Project[];
  runRecords?: RunRecord[];
  cloudResources?: CloudResource[];
  knowledgeSources?: KnowledgeSource[];
  orchestrations?: AgentOrchestration[];
};

type BuildResponse = {
  project: Project;
  run: RunRecord;
  state: ServerState;
};

type PublishResponse = {
  project: Project;
  state: ServerState;
};

type VersionResponse = {
  project: Project;
  state: ServerState;
};

type OrchestrationRunResponse = {
  orchestration: AgentOrchestration;
  run: OrchestrationRun;
  state: ServerState;
};

type KnowledgeUploadResponse = {
  sources: KnowledgeSource[];
  parsed: Array<{
    filename: string;
    extension: string;
    chunks: number;
    tags: string[];
    characters: number;
  }>;
  state: ServerState;
  note: string;
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
    let message = `API ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      message = payload.message || payload.error || message;
    } catch {
      // Keep the status fallback when the server returns a non-JSON error.
    }
    throw new Error(message);
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

function toKebabCase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || "builderos-app"
  );
}

function createProjectFiles({
  title,
  prompt,
  product,
  metrics,
  knowledgeHits,
  html,
  css,
  js,
}: {
  title: string;
  prompt: string;
  product: ReturnType<typeof inferProduct>;
  metrics: Array<{ label: string; value: string; delta: string }>;
  knowledgeHits: Array<{ title: string; excerpt: string; score: number }>;
  html: string;
  css: string;
  js: string;
}): GeneratedFile[] {
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
        'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
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
    { agent: "Model Router", note: "当前为浏览器本地降级生成，真实 LLM 调用由服务端 /api/build 执行。" },
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
    "生成 React/Vite 项目目录和可浏览文件树",
    "源码复制、单文件导出和服务端目录落盘",
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
    extensions,
    infraPlan,
    llm: {
      used: false,
      provider: "template",
      providerLabel: "BuilderOS 本地模板",
      model: "browser-fallback",
      fallbackReason: "服务端不可用时使用浏览器降级生成。",
    },
  };
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>(() => getInitialSection());
  const [profile, setProfile] = usePersistentState<WorkspaceProfile>(profileKey, defaultProfile);
  const [authToken, setAuthToken] = usePersistentState<string | null>(authTokenKey, null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent | null>(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [startAfterSignup, setStartAfterSignup] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>("build");
  const [teamMode, setTeamMode] = useState(true);
  const [deepResearch, setDeepResearch] = useState(false);
  const [raceMode, setRaceMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
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
  const [orchestrations, setOrchestrations] = usePersistentState<AgentOrchestration[]>(
    "atoms-demo-builderos-orchestrations-v1",
    defaultOrchestrations,
  );
  const [selectedOrchestrationId, setSelectedOrchestrationId] = usePersistentState<string>(
    "atoms-demo-builderos-selected-orchestration-v1",
    defaultOrchestrations[0].id,
  );
  const [cloudResources, setCloudResources] = useState<CloudResource[]>([]);
  const [serverStatus, setServerStatus] = useState<"connecting" | "synced" | "local">("connecting");
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [selectedLlmProvider, setSelectedLlmProvider] = usePersistentState<string>(
    "builderos-selected-llm-provider-v1",
    "auto",
  );
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = usePersistentState<number | null>(
    "atoms-demo-builderos-selected-project-v2",
    null,
  );
  const [sidebarProjectsOpen, setSidebarProjectsOpen] = useState(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const registrationRequired = !(authToken && profile.registeredAt);
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
    if (!authToken && profile.registeredAt) {
      setProfile(defaultProfile);
    }
  }, [authToken, profile.registeredAt, setProfile]);

  useEffect(() => {
    if (authToken && profile.registeredAt) {
      setWorkspaceOpen(true);
    }
  }, [authToken, profile.registeredAt]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    let ignore = false;

    apiRequest<{ user: WorkspaceProfile; storage: "mysql" | "json" }>("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((result) => {
        if (!ignore) {
          setProfile(result.user);
          setServerStatus("synced");
        }
      })
      .catch(() => {
        if (!ignore) {
          setAuthToken(null);
          setProfile(defaultProfile);
          setWorkspaceOpen(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authToken, setAuthToken, setProfile]);

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
        if (state.cloudResources?.length) {
          setCloudResources(state.cloudResources);
        }
        if (state.knowledgeSources?.length) {
          setKnowledgeSources(state.knowledgeSources);
        }
        if (state.orchestrations?.length) {
          setOrchestrations(state.orchestrations);
          setSelectedOrchestrationId(state.orchestrations[0].id);
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
  }, [setKnowledgeSources, setOrchestrations, setProjects, setRunRecords, setSelectedOrchestrationId, setSelectedProjectId]);

  useEffect(() => {
    let ignore = false;

    refreshCloudResources()
      .then(() => {
        if (!ignore) {
          setServerStatus("synced");
        }
      })
      .catch(() => {
        if (!ignore) {
          setServerStatus("local");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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
      body: JSON.stringify({ prompt: currentBuildPrompt, mode: workMode, raceMode, llmProvider: selectedLlmProvider }),
    })
      .then((result) => {
        const nextProjects = result.state.projects?.length ? result.state.projects : [result.project, ...projects];
        const nextRunRecords = result.state.runRecords?.length ? result.state.runRecords : [result.run, ...runRecords];
        setProjects(nextProjects);
        setRunRecords(nextRunRecords);
        if (result.state.knowledgeSources?.length) {
          setKnowledgeSources(result.state.knowledgeSources);
        }
        if (result.state.orchestrations?.length) {
          setOrchestrations(result.state.orchestrations);
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
            llm: generated.llm,
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
    orchestrations,
    projects,
    progress,
    raceMode,
    runRecords,
    setKnowledgeSources,
    setProjects,
    setRunRecords,
    setSelectedProjectId,
    selectedLlmProvider,
    workMode,
  ]);

  function syncServerState(
    nextProjects = projects,
    nextKnowledgeSources = knowledgeSources,
    nextRunRecords = runRecords,
    nextOrchestrations = orchestrations,
  ) {
    return apiRequest<ServerState>("/api/state", {
      method: "POST",
      body: JSON.stringify({
        projects: nextProjects,
        knowledgeSources: nextKnowledgeSources,
        runRecords: nextRunRecords,
        orchestrations: nextOrchestrations,
      }),
    })
      .then(() => setServerStatus("synced"))
      .catch(() => setServerStatus("local"));
  }

  function refreshCloudResources() {
    return apiRequest<{ resources: CloudResource[] }>("/api/cloud-resources").then((result) => {
      setCloudResources(result.resources);
      return result.resources;
    });
  }

  function saveKnowledgeSources(nextSources: KnowledgeSource[]) {
    setKnowledgeSources(nextSources);
    void syncServerState(projects, nextSources);
  }

  async function uploadKnowledgeFiles(files: File[]) {
    const allowed = new Set(["txt", "md", "csv", "json"]);
    const payloadFiles = await Promise.all(
      files.map(async (file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        if (!allowed.has(extension)) {
          throw new Error("当前仅支持 .txt / .md / .csv / .json，PDF/DOCX 作为后续增强。");
        }
        return {
          name: file.name,
          content: await file.text(),
        };
      }),
    );
    const result = await apiRequest<KnowledgeUploadResponse>("/api/knowledge/upload", {
      method: "POST",
      body: JSON.stringify({ files: payloadFiles }),
    });
    if (result.state.knowledgeSources?.length) {
      setKnowledgeSources(result.state.knowledgeSources);
    } else {
      setKnowledgeSources((items) => [...result.sources, ...items]);
    }
    setServerStatus("synced");
    return result;
  }

  function saveOrchestrations(nextOrchestrations: AgentOrchestration[], selectedId = selectedOrchestrationId) {
    setOrchestrations(nextOrchestrations);
    setSelectedOrchestrationId(selectedId);
    void syncServerState(projects, knowledgeSources, runRecords, nextOrchestrations);
  }

  function applyOrchestrationRunResult(result: OrchestrationRunResponse) {
    if (result.state.projects?.length) {
      setProjects(result.state.projects);
    }
    if (result.state.runRecords?.length) {
      setRunRecords(result.state.runRecords);
    }
    if (result.state.knowledgeSources?.length) {
      setKnowledgeSources(result.state.knowledgeSources);
    }
    if (result.state.orchestrations?.length) {
      setOrchestrations(result.state.orchestrations);
    } else {
      setOrchestrations((items) =>
        items.map((item) => (item.id === result.orchestration.id ? result.orchestration : item)),
      );
    }
    setSelectedOrchestrationId(result.orchestration.id);
    setServerStatus("synced");
    void refreshCloudResources();
  }

  function startBuild(nextPrompt = prompt) {
    const normalizedPrompt = nextPrompt.trim() || quickPrompts[0];
    setPrompt(normalizedPrompt);
    setCurrentBuildPrompt(normalizedPrompt);
    setProgress(8);
    setIsBuilding(true);
    setWorkspaceOpen(true);
    setActiveSection("home");
  }

  function replaceProject(nextProject: Project, nextState?: ServerState) {
    const nextProjects = nextState?.projects?.length
      ? nextState.projects
      : projects.map((project) => (project.id === nextProject.id ? nextProject : project));
    setProjects(nextProjects);
    setSelectedProjectId(nextProject.id);
    if (nextState?.runRecords?.length) {
      setRunRecords(nextState.runRecords);
    }
    if (nextState?.knowledgeSources?.length) {
      setKnowledgeSources(nextState.knowledgeSources);
    }
    if (nextState?.orchestrations?.length) {
      setOrchestrations(nextState.orchestrations);
    }
  }

  function publishProject(projectId: number) {
    apiRequest<PublishResponse>(`/api/projects/${projectId}/publish`, {
      method: "POST",
      body: JSON.stringify({}),
    })
      .then((result) => {
        replaceProject(result.project, result.state);
        setServerStatus("synced");
        void refreshCloudResources();
      })
      .catch(() => {
        setProjects((items) => {
          const nextProjects: Project[] = items.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  status: "已发布",
                  publishedUrl: `${window.location.origin}/api/preview/${project.id}`,
                  publishedAt: new Date().toISOString(),
                  updatedAt: "刚刚",
                  publishChecks: [
                    { label: "本地发布状态", status: "warning", detail: "API 暂不可用，已在浏览器侧保留发布状态。" },
                  ],
                }
              : project,
          );
          void syncServerState(nextProjects, knowledgeSources);
          return nextProjects;
        });
      });
  }

  function createProjectVersion(projectId: number) {
    apiRequest<VersionResponse>(`/api/projects/${projectId}/versions`, {
      method: "POST",
      body: JSON.stringify({ instruction: "手动保存当前应用版本" }),
    })
      .then((result) => {
        replaceProject(result.project, result.state);
        setServerStatus("synced");
      })
      .catch(() => {
        setProjects((items) => {
          const nextProjects = items.map((project) => {
            if (project.id !== projectId) {
              return project;
            }
            const files = getGeneratedFiles(project);
            const versions = Array.isArray(project.versions) ? project.versions : [];
            const nextVersion: ProjectVersion = {
              id: `local-${project.id}-v${versions.length + 1}`,
              label: `版本 ${versions.length + 1}`,
              summary: "浏览器侧保存的版本快照。",
              status: "ready",
              createdAt: new Date().toISOString(),
              fileCount: files.length,
              sourceBytes: files.reduce((total, file) => total + file.content.length, 0),
              previewUrl: `/api/preview/${project.id}`,
            };
            return {
              ...project,
              version: versions.length + 1,
              versions: [nextVersion, ...versions],
              updatedAt: "刚刚",
            };
          });
          void syncServerState(nextProjects, knowledgeSources);
          return nextProjects;
        });
      });
  }

  function previewProject(projectId: number) {
    setSelectedProjectId(projectId);
    setActiveSection("home");
  }

  function downloadProject(project: Project) {
    if (project.artifactPath || project.generated.files?.length) {
      const anchor = document.createElement("a");
      anchor.href = `/api/projects/${project.id}/download`;
      anchor.download = `${toKebabCase(project.title)}.zip`;
      anchor.click();
      return;
    }
    const blob = new Blob([project.generated.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.title.replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, "-").slice(0, 42)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function provisionCloudResource(resourceId: string) {
    apiRequest<{ resources: CloudResource[] }>(`/api/cloud-resources/${resourceId}/provision`, {
      method: "POST",
      body: JSON.stringify({}),
    })
      .then((result) => {
        setCloudResources(result.resources);
        setServerStatus("synced");
      })
      .catch(() => {
        setCloudResources((items) =>
          items.map((item) => (item.id === resourceId ? { ...item, status: "connected", updatedAt: "刚刚" } : item)),
        );
      });
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
    setAuthIntent("signup");
    setAuthError("");
  }

  async function authenticate(intent: AuthIntent, payload: AuthPayload) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await apiRequest<AuthResponse>(intent === "signup" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAuthToken(result.token);
      setProfile(result.user);
      setWorkspaceOpen(true);
      setAuthIntent(null);
      setOnboardingOpen(false);

      if (startAfterSignup) {
        setStartAfterSignup(false);
        window.setTimeout(() => startBuild(prompt), 0);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "认证失败，请稍后再试。");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    const token = authToken;
    setAuthToken(null);
    setProfile(defaultProfile);
    setWorkspaceOpen(false);
    setOnboardingOpen(false);
    setAuthIntent(null);
    setAuthError("");
    setStartAfterSignup(false);
    setIsBuilding(false);
    setProgress(0);

    if (token) {
      void apiRequest<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
    }
  }

  function saveProfile(nextProfile: WorkspaceProfile) {
    setProfile({
      ...profile,
      name: nextProfile.name.trim(),
      email: profile.email,
      goal: nextProfile.goal,
      credits: nextProfile.credits,
      registeredAt: profile.registeredAt,
    });
    setWorkspaceOpen(true);
    setAuthIntent(null);
    setOnboardingOpen(false);
  }

  if (!workspaceOpen) {
    if (authIntent) {
      return (
        <AuthPage
          intent={authIntent}
          profile={profile}
          onBack={() => {
            setStartAfterSignup(false);
            setAuthIntent(null);
            setAuthError("");
          }}
          onCreate={() => {
            setStartAfterSignup(false);
            setAuthError("");
            setAuthIntent("signup");
          }}
          onLogin={() => {
            setStartAfterSignup(false);
            setAuthError("");
            setAuthIntent("login");
          }}
          onSubmit={authenticate}
          error={authError}
          loading={authLoading}
        />
      );
    }

    return (
      <PublicLanding
        activeAgents={agents}
        prompt={prompt}
        onLogin={() => {
          if (!registrationRequired) {
            setWorkspaceOpen(true);
            return;
          }
          setStartAfterSignup(false);
          setAuthError("");
          setAuthIntent("login");
        }}
        onPromptChange={setPrompt}
        onSignup={() => requestSignup(false)}
        onStart={() => requestSignup(true)}
      />
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

        <button className="workspace-logout" onClick={logout}>
          <LogOut size={16} />
          <span>退出登录</span>
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
            icon={Settings2}
            label="编排"
            active={activeSection === "orchestration"}
            onClick={() => setActiveSection("orchestration")}
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
          <button className="sidebar-project-toggle" onClick={() => setSidebarProjectsOpen((value) => !value)}>
            <FolderKanban size={17} />
            <span>最近项目</span>
            <em>{projects.length}</em>
            <ChevronDown size={15} className={sidebarProjectsOpen ? "rotated" : ""} />
          </button>
          {sidebarProjectsOpen && (
            projects.length === 0 ? (
              <div className="empty-projects compact">
                <PackageOpen size={21} />
                <span>还没有项目</span>
                <small>从首页开始构建。</small>
              </div>
            ) : (
              <div className="mini-projects">
                {projects.slice(0, 3).map((project) => (
                  <button key={project.id} className="mini-project" onClick={() => setActiveSection("projects")}>
                    <span>{project.title}</span>
                    <small>{modeLabel[project.mode]} · {project.updatedAt}</small>
                  </button>
                ))}
                <button className="mini-project all-projects" onClick={() => setActiveSection("projects")}>
                  <span>查看全部项目</span>
                  <small>{projects.length} 个项目</small>
                </button>
              </div>
            )
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
          <ModelRouteSelector
            llmStatus={platformStatus?.llm}
            selectedProvider={selectedLlmProvider}
            onSelect={setSelectedLlmProvider}
          />
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
            onCreateProjectVersion={createProjectVersion}
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

        {activeSection === "resources" && (
          <ResourcesView
            cloudResources={cloudResources}
            platformStatus={platformStatus}
            projects={projects}
            onProvisionResource={provisionCloudResource}
          />
        )}
        {activeSection === "knowledge" && (
          <KnowledgeView
            knowledgeSources={knowledgeSources}
            onSaveKnowledgeSources={saveKnowledgeSources}
            onUploadKnowledgeFiles={uploadKnowledgeFiles}
          />
        )}
        {activeSection === "orchestration" && (
          <OrchestrationView
            orchestrations={orchestrations.length ? orchestrations : defaultOrchestrations}
            selectedId={selectedOrchestrationId}
            llmStatus={platformStatus?.llm}
            selectedLlmProvider={selectedLlmProvider}
            onSelect={setSelectedOrchestrationId}
            onSaveOrchestrations={saveOrchestrations}
            onRunResult={applyOrchestrationRunResult}
          />
        )}
        {activeSection === "data" && (
          <DataView
            knowledgeSources={knowledgeSources}
            orchestrations={orchestrations}
            platformStatus={platformStatus}
            projects={projects}
            runRecords={runRecords}
          />
        )}
        {activeSection === "compare" && <CompareView />}
        {activeSection === "projects" && (
          <ProjectsView
            projects={projects}
            onCreateProjectVersion={createProjectVersion}
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
  prompt: string;
  onLogin: () => void;
  onPromptChange: (value: string) => void;
  onSignup: () => void;
  onStart: () => void;
};

function PublicLanding({
  activeAgents,
  prompt,
  onLogin,
  onPromptChange,
  onSignup,
  onStart,
}: PublicLandingProps) {
  const [resourceOpen, setResourceOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const resourceItems = [
    { icon: FileText, label: "产品文档", meta: "平台能力、API 与部署流程" },
    { icon: PackageOpen, label: "模板案例", meta: "SaaS、后台、增长页与内部工具" },
    { icon: Activity, label: "Agent 运行示例", meta: "查看任务拆解和执行轨迹" },
    { icon: PlugZap, label: "连接器", meta: "GitHub、数据库、支付与分析" },
    { icon: MessageCircle, label: "帮助中心", meta: "常见问题和构建建议" },
    { icon: Users, label: "社区", meta: "和 Builder 一起交流工作流" },
  ];

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
          <div className="landing-resource-wrap">
            <button
              className={resourceOpen ? "resource-trigger active" : "resource-trigger"}
              aria-expanded={resourceOpen}
              onClick={() => {
                setUnlockOpen(false);
                setResourceOpen((value) => !value);
              }}
            >
              资源
              <ChevronDown size={18} />
            </button>
            {resourceOpen && (
              <div className="resource-mega" role="menu">
                <div className="resource-menu-list">
                  {resourceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        role="menuitem"
                        onClick={() => {
                          setResourceOpen(false);
                          setUnlockOpen(true);
                        }}
                      >
                        <Icon size={18} />
                        <span>
                          {item.label}
                          <small>{item.meta}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <article className="resource-feature">
                  <span className="eyebrow">Featured Run</span>
                  <h2>用 RAG 知识库生成一个可审查后台</h2>
                  <p>示例展示 Agent 如何从资料召回证据、拆解需求、生成页面，并保留部署检查记录。</p>
                  <button
                    onClick={() => {
                      setResourceOpen(false);
                      setUnlockOpen(true);
                    }}
                  >
                    查看示例
                    <ArrowRight size={16} />
                  </button>
                </article>
              </div>
            )}
          </div>
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
            <button
              className={unlockOpen ? "landing-dot active" : "landing-dot"}
              aria-label="添加上下文"
              onClick={() => {
                setResourceOpen(false);
                setUnlockOpen((value) => !value);
              }}
            >
              <Sparkles size={18} />
            </button>
            <button className="landing-start" onClick={onStart}>
              开始构建
              <ArrowRight size={19} />
            </button>
          </div>
          {unlockOpen && (
            <div className="unlock-popover" role="dialog" aria-label="登录解锁 BuilderOS 能力">
              <button className="unlock-close" aria-label="关闭" onClick={() => setUnlockOpen(false)}>
                <X size={16} />
              </button>
              <LockKeyhole size={20} />
              <h2>登录解锁更多构建能力</h2>
              <p>上传资料、接入知识库、配置连接器，并保留每次 Agent 执行轨迹和部署记录。</p>
              <div>
                <span>文件与资料</span>
                <span>RAG 知识库</span>
                <span>第三方连接器</span>
              </div>
              <button className="unlock-action" onClick={onLogin}>
                登录继续
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type AuthPageProps = {
  intent: AuthIntent;
  profile: WorkspaceProfile;
  onBack: () => void;
  onCreate: () => void;
  onLogin: () => void;
  onSubmit: (intent: AuthIntent, payload: AuthPayload) => Promise<void>;
  error: string;
  loading: boolean;
};

function AuthPage({ intent, profile, onBack, onCreate, onLogin, onSubmit, error, loading }: AuthPageProps) {
  const [draft, setDraft] = useState<AuthPayload>({
    name: intent === "signup" ? profile.name || "" : "",
    email: profile.email || "",
    password: "",
    goal: profile.goal || defaultProfile.goal,
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const emailPattern = /\S+@\S+\.\S+/;
  const normalizedEmail = draft.email.trim().toLowerCase();
  const canCreate =
    (draft.name || "").trim().length >= 2 && emailPattern.test(normalizedEmail) && draft.password.length >= 6;
  const canLogin = emailPattern.test(normalizedEmail) && draft.password.length >= 6;
  const canSubmit = intent === "signup" ? canCreate : canLogin;
  const title = intent === "login" ? "登录 BuilderOS" : "创建 BuilderOS 工作区";

  function submit() {
    if (!canSubmit || loading) {
      return;
    }

    void onSubmit(intent, {
      ...draft,
      name: draft.name?.trim(),
      email: normalizedEmail,
      goal: draft.goal || defaultProfile.goal,
    });
  }

  return (
    <main className="auth-page">
      <button className="auth-back" aria-label="返回首页" onClick={onBack}>
        <ArrowLeft size={22} />
      </button>

      <section className="auth-form-panel" aria-label={title}>
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>BuilderOS</span>
        </div>
        <h1>{title}</h1>
        <p>开始使用 Agent 团队构建可运行、可审查、可部署的 AI Native 应用。</p>

        <button
          className="demo-auth"
          type="button"
          onClick={() =>
            setDraft((value) => ({
              ...value,
              name: value.name || demoAccount.name,
              email: demoAccount.email,
              password: demoAccount.password,
              goal: value.goal || demoAccount.goal,
            }))
          }
        >
          <Globe2 size={18} />
          使用评审演示账号
        </button>

        <div className="auth-separator">
          <span />
          或
          <span />
        </div>

        {intent === "signup" && (
          <label>
            工作区名称
            <input
              value={draft.name || ""}
              placeholder="输入你的名字或团队名"
              onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))}
            />
          </label>
        )}
        <label>
          电子邮箱
          <input
            value={draft.email}
            placeholder={intent === "login" ? "输入已注册工作区邮箱" : "用于登录和归属工作区"}
            onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))}
          />
        </label>
        <label>
          密码
          <div className="password-field">
            <input
              type={passwordVisible ? "text" : "password"}
              value={draft.password}
              placeholder="至少 6 位，用于再次登录"
              onChange={(event) => setDraft((value) => ({ ...value, password: event.target.value }))}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "隐藏密码" : "显示密码"}
              onClick={() => setPasswordVisible((value) => !value)}
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && (
          <div className="auth-notice error" role="status">
            {error}
          </div>
        )}
        <div className="auth-switch">
          {intent === "login" ? "还没有工作区？" : "已经有工作区？"}
          <button type="button" onClick={intent === "login" ? onCreate : onLogin}>
            {intent === "login" ? "创建工作区" : "去登录"}
          </button>
        </div>

        <p className="auth-terms">继续即表示同意 BuilderOS 的服务条款与隐私政策。</p>
        <button className="auth-submit" disabled={!canSubmit || loading} onClick={submit}>
          {loading ? "处理中..." : intent === "login" ? "登录并进入" : "创建并进入"}
        </button>
      </section>

      <section className="auth-value-panel" aria-label="BuilderOS 价值说明">
        <div className="auth-value-card">
          <div className="auth-value-brand">
            <div className="brand-mark light" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span>BuilderOS</span>
          </div>
          <h2>把需求变成可运行的 AI 应用</h2>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              几分钟生成可预览应用，而不是停留在静态概念
            </li>
            <li>
              <CheckCircle2 size={18} />
              RAG 知识库取证，输出带来源和可信度
            </li>
            <li>
              <CheckCircle2 size={18} />
              Agent 执行轨迹可回放，方便复盘和评审
            </li>
            <li>
              <CheckCircle2 size={18} />
              源码可审查，可下载，可继续二次开发
            </li>
            <li>
              <CheckCircle2 size={18} />
              部署检查和服务状态一起纳入交付闭环
            </li>
          </ul>
        </div>
      </section>
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
  onCreateProjectVersion: (projectId: number) => void;
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
  onCreateProjectVersion,
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
        <Sparkles size={15} />
        <span>Agent Team</span>
        <span>·</span>
        <span>RAG grounded</span>
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

        {(attachmentOpen || connectorOpen) && (
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
        )}
      </div>

      <div className="quick-prompt-row">
        {quickPrompts.map((item, index) => (
          <button key={item} title={item} onClick={() => onQuickPrompt(item)}>
            <Sparkles size={16} />
            <span>{quickPromptLabels[index] || item}</span>
          </button>
        ))}
      </div>

      {isBuilding && (
        <div className="build-console">
          <div className="console-header">
            <div>
              <span className="eyebrow">Agent Run</span>
              <h2>正在构建</h2>
            </div>
            <div className="console-header-actions">
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
                <GeneratedSummary
                  project={selectedProject}
                  onCreateProjectVersion={onCreateProjectVersion}
                  onDownloadProject={onDownloadProject}
                  onPublishProject={onPublishProject}
                />
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

function getGeneratedFiles(project: Project): GeneratedFile[] {
  if (project.generated.files?.length) {
    return project.generated.files;
  }
  return [
    { path: "app/generated/preview.html", language: "html", content: project.generated.html },
    { path: "app/generated/styles.css", language: "css", content: project.generated.css },
    { path: "app/generated/runtime.js", language: "js", content: project.generated.js },
  ];
}

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
  onCreateProjectVersion,
  onDownloadProject,
  onPublishProject,
}: {
  project: Project;
  onCreateProjectVersion: (projectId: number) => void;
  onDownloadProject: (project: Project) => void;
  onPublishProject: (projectId: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<SourceTab>("html");
  const files = getGeneratedFiles(project);
  const [activeFilePath, setActiveFilePath] = useState(files[0]?.path || "");
  const [copied, setCopied] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const source = project.generated[activeTab];
  const activeFile = files.find((file) => file.path === activeFilePath) ?? files[0];
  const versions = project.versions?.length
    ? project.versions
    : [
        {
          id: `project-${project.id}-v1`,
          label: "版本 1",
          summary: "初始构建版本。",
          status: project.status === "已发布" ? "published" : "ready",
          createdAt: new Date().toISOString(),
          fileCount: files.length,
          sourceBytes: files.reduce((total, file) => total + file.content.length, 0),
          previewUrl: project.previewUrl,
        } satisfies ProjectVersion,
      ];
  const publicPreviewUrl = project.publishedUrl || `${window.location.origin}${project.previewUrl || `/api/preview/${project.id}`}`;
  const llmInfo = project.generated.llm;

  async function copySource() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function copyActiveFile() {
    if (!activeFile) {
      return;
    }
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    window.setTimeout(() => setCopiedFile(false), 1200);
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

      <div className="summary-column llm-summary">
        <span className="eyebrow">Model Gateway</span>
        <h3>{llmInfo?.used ? "真实模型生成" : "模板降级生成"}</h3>
        <dl>
          <div>
            <dt>Provider</dt>
            <dd>{llmInfo?.providerLabel || llmInfo?.provider || "BuilderOS"}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{llmInfo?.model || "deterministic-template"}</dd>
          </div>
          <div>
            <dt>Endpoint</dt>
            <dd>{llmInfo?.baseUrlHost || "local fallback"}</dd>
          </div>
        </dl>
        {!llmInfo?.used && <p>{llmInfo?.fallbackReason || "未配置真实 LLM，使用稳定模板生成。"}</p>}
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

      <div className="summary-column lifecycle-panel">
        <div className="panel-title-row compact">
          <div>
            <span className="eyebrow">Version & Publish</span>
            <h3>版本与发布</h3>
          </div>
          <span className="status-pill">{project.status}</span>
        </div>
        <div className="lifecycle-actions">
          <button onClick={() => onCreateProjectVersion(project.id)}>
            <Layers size={14} />
            保存版本
          </button>
          <button onClick={() => onPublishProject(project.id)}>
            <Rocket size={14} />
            {project.status === "已发布" ? "重新发布" : "发布预览"}
          </button>
          <a href={publicPreviewUrl} target="_blank" rel="noreferrer">
            <Globe2 size={14} />
            打开链接
          </a>
        </div>
        <div className="version-list">
          {versions.slice(0, 4).map((version) => (
            <div key={version.id}>
              <strong>{version.label}</strong>
              <span>{version.status === "published" ? "已发布" : "可发布"}</span>
              <small>{version.summary}</small>
              <em>
                {version.fileCount} files · {formatBytes(version.sourceBytes)}
              </em>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-column publish-check-panel">
        <span className="eyebrow">Publish Checks</span>
        <div className="publish-check-list">
          {(project.publishChecks?.length
            ? project.publishChecks
            : [
                { label: "预览 HTML", status: "passed", detail: "iframe 内已可操作，发布后生成独立 URL。" },
                { label: "源码目录", status: "passed", detail: `${files.length} 个文件可浏览、复制和下载。` },
                { label: "增长模块", status: "warning", detail: "SEO、Ads、GA4 为预留集成，当前为 Demo 级能力。" },
              ] as PublishCheck[]
          ).map((check) => (
            <div key={check.label}>
              <span className={check.status === "passed" ? "health-dot healthy" : "health-dot degraded"} />
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="artifact-panel">
        <div className="artifact-header">
          <div>
            <span className="eyebrow">Project Files</span>
            <h3>生成项目目录</h3>
          </div>
          <div className="artifact-actions">
            <small>{project.artifactPath || "browser-local/generated-project"}</small>
            <button onClick={() => onDownloadProject(project)}>
              <Download size={14} />
              下载源码包
            </button>
          </div>
        </div>
        <div className="artifact-layout">
          <div className="file-tree" aria-label="生成文件列表">
            {files.map((file) => (
              <button
                key={file.path}
                className={activeFile?.path === file.path ? "active" : ""}
                onClick={() => setActiveFilePath(file.path)}
              >
                <FileText size={15} />
                <span>{file.path}</span>
              </button>
            ))}
          </div>
          <div className="file-viewer">
            <div className="file-viewer-bar">
              <span>{activeFile?.path}</span>
              <button onClick={copyActiveFile} disabled={!activeFile}>
                <Copy size={14} />
                {copiedFile ? "已复制" : "复制文件"}
              </button>
            </div>
            <pre>{activeFile?.content}</pre>
          </div>
        </div>
      </div>

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

type ResourcesViewProps = {
  cloudResources: CloudResource[];
  platformStatus: PlatformStatus | null;
  projects: Project[];
  onProvisionResource: (resourceId: string) => void;
};

function ResourcesView({ cloudResources, platformStatus, projects, onProvisionResource }: ResourcesViewProps) {
  const [activeType, setActiveType] = useState("All");
  const fallbackResources: CloudResource[] = resourceItems.map((item) => ({
    id: item.title,
    type: "Resource",
    title: item.title,
    provider: "BuilderOS",
    status: "ready",
    scope: "Workspace",
    description: item.meta,
    endpoint: "-",
    usage: "待连接",
    updatedAt: "本地",
    actions: ["配置"],
  }));
  const resources = cloudResources.length ? cloudResources : fallbackResources;
  const resourceTypes = ["All", ...Array.from(new Set(resources.map((resource) => resource.type)))];
  const visibleResources =
    activeType === "All" ? resources : resources.filter((resource) => resource.type === activeType);
  const connectedCount = resources.filter((resource) => resource.status === "connected").length;
  const latestProject = projects[0];
  const llmStatus = platformStatus?.llm;
  const llmLabel = llmStatus?.activeProvider?.label || "模板降级";

  return (
    <section className="section-view">
      <div className="section-heading with-action">
        <div>
          <span className="eyebrow">BuilderOS Cloud</span>
          <h1>资源与云能力</h1>
        </div>
        <div className="resource-tabs" aria-label="资源类型">
          {resourceTypes.map((type) => (
            <button key={type} className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="compact-summary-strip">
        <Stat label="已连接资源" value={`${connectedCount}/${resources.length}`} icon={PlugZap} />
        <Stat label="模型网关" value={llmLabel} icon={Brain} />
        <Stat label="服务存储" value={platformStatus?.storage.authStore === "mysql" ? "MySQL" : "JSON"} icon={Database} />
        <Stat label="发布应用" value={String(projects.filter((project) => project.status === "已发布").length)} icon={Rocket} />
      </div>

      <div className="cloud-console">
        {visibleResources.map((resource) => {
          const Icon = resourceIconForType(resource.type);
          return (
            <article className="cloud-resource-card" key={resource.id}>
              <div className="cloud-card-head">
                <span className="resource-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <strong>{resource.title}</strong>
                  <small>
                    {resource.provider} · {resource.scope}
                  </small>
                </div>
                <span className={`cloud-status ${resource.status}`}>{resourceStatusLabel(resource.status)}</span>
              </div>
              <p>{resource.description}</p>
              <dl>
                <div>
                  <dt>Endpoint</dt>
                  <dd>{resource.endpoint}</dd>
                </div>
                <div>
                  <dt>Usage</dt>
                  <dd>{resource.usage}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{resource.updatedAt}</dd>
                </div>
              </dl>
              <div className="cloud-action-row">
                {resource.actions.slice(0, 3).map((action) => (
                  <span key={action}>{action}</span>
                ))}
                <button onClick={() => onProvisionResource(resource.id)}>
                  <PlugZap size={14} />
                  {resource.status === "connected" ? "重新检查" : "连接"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <details className="collapsible-panel cloud-workflow-panel">
        <summary>
          <span>
            <strong>当前项目资源绑定</strong>
            <small>{latestProject ? `${latestProject.title} · ${latestProject.status}` : "生成项目后可查看资源流"}</small>
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="resource-binding">
          <div>
            <strong>{latestProject?.title || "还没有项目"}</strong>
            <small>{latestProject ? `${latestProject.status} · ${latestProject.artifactPath || "browser-local"}` : "先在首页生成一个应用"}</small>
          </div>
          <div className="binding-flow" aria-label="应用资源流">
            {["Prompt", "Agent Run", "Files", "Cloud", "Publish", "Growth"].map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function resourceIconForType(type: string): LucideIcon {
  const normalized = type.toLowerCase();
  if (normalized.includes("ai")) return Brain;
  if (normalized.includes("database")) return Database;
  if (normalized.includes("users")) return Users;
  if (normalized.includes("storage")) return Cloud;
  if (normalized.includes("integration")) return PlugZap;
  if (normalized.includes("growth")) return Megaphone;
  return Compass;
}

function resourceStatusLabel(status: CloudResource["status"]) {
  if (status === "connected") return "已连接";
  if (status === "degraded") return "异常";
  return "待配置";
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

function cleanAgentResultText(value: string) {
  const text = String(value || "").trim();
  if (!text.startsWith("{")) {
    return text;
  }
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.summary === "string") {
      return parsed.summary;
    }
  } catch {
    const match = text.match(/["']summary["']\s*:\s*["']([^"']+)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return text.replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
}

type OrchestrationViewProps = {
  orchestrations: AgentOrchestration[];
  selectedId: string;
  llmStatus?: LlmStatus;
  selectedLlmProvider: string;
  onSelect: (id: string) => void;
  onSaveOrchestrations: (items: AgentOrchestration[], selectedId?: string) => void;
  onRunResult: (result: OrchestrationRunResponse) => void;
};

const emptyStepDraft: OrchestrationStep = {
  id: "draft",
  agent: "合规审查 Agent",
  role: "质量审查",
  action: "检查输出是否符合业务目标、证据约束和发布标准",
  output: "审查结论",
  tool: "Evaluator",
  guardrail: "发现风险时阻断发布",
};

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function OrchestrationView({
  orchestrations,
  selectedId,
  llmStatus,
  selectedLlmProvider,
  onSelect,
  onSaveOrchestrations,
  onRunResult,
}: OrchestrationViewProps) {
  const active = orchestrations.find((item) => item.id === selectedId) || orchestrations[0] || defaultOrchestrations[0];
  const [draftStep, setDraftStep] = useState<OrchestrationStep>(emptyStepDraft);
  const [running, setRunning] = useState(false);
  const [executionIndex, setExecutionIndex] = useState(-1);
  const [runError, setRunError] = useState("");
  const [activeFlowTab, setActiveFlowTab] = useState<"templates" | "configs">("templates");
  const totalTransitions = Math.max(0, active.steps.length - 1);
  const lastRun = active.lastRun;
  const activeExecutionStep = running ? active.steps[Math.max(0, executionIndex)] : null;
  const resultTrace = lastRun?.trace ?? [];
  const finalReport = lastRun?.finalReport;
  const isTemplateFlow = (item: AgentOrchestration) => item.owner === "BuilderOS" || item.updatedAt === "内置";
  const templateFlows = orchestrations.filter(isTemplateFlow);
  const customFlows = orchestrations.filter((item) => !isTemplateFlow(item));
  const visibleFlows = activeFlowTab === "templates" ? templateFlows : customFlows;
  const activeIsTemplate = isTemplateFlow(active);
  const activeSourceTemplate = resolveSourceTemplate(active);
  const activeSourceName = activeSourceTemplate?.name || active.sourceTemplateName || (activeIsTemplate ? active.name : "历史自定义配置");
  const configuredProviders = llmStatus?.providers?.filter((provider) => provider.configured) ?? [];
  const selectedRouteLabel =
    selectedLlmProvider === "auto"
      ? `Auto: ${llmStatus?.activeProvider?.model || "qwen-plus"}`
      : configuredProviders.find((provider) => provider.id === selectedLlmProvider)?.model || selectedLlmProvider;

  useEffect(() => {
    setActiveFlowTab(activeIsTemplate ? "templates" : "configs");
  }, [active.id, activeIsTemplate]);

  function stepModelLabel(step: OrchestrationStep) {
    const route = step.llmProvider || selectedLlmProvider;
    if (!route || route === "inherit") {
      return selectedRouteLabel;
    }
    if (route === "auto") {
      return `Auto: ${llmStatus?.activeProvider?.model || "qwen-plus"}`;
    }
    return configuredProviders.find((provider) => provider.id === route)?.model || route;
  }

  function resolveSourceTemplate(item: AgentOrchestration) {
    if (isTemplateFlow(item)) {
      return item;
    }
    if (item.sourceTemplateId) {
      const sourceById = templateFlows.find((template) => template.id === item.sourceTemplateId);
      if (sourceById) {
        return sourceById;
      }
    }
    if (item.sourceTemplateName) {
      const sourceByName = templateFlows.find((template) => template.name === item.sourceTemplateName);
      if (sourceByName) {
        return sourceByName;
      }
    }
    return (
      templateFlows.find((template) => template.domain === item.domain) ||
      templateFlows.find((template) => template.steps[0]?.agent === item.steps[0]?.agent)
    );
  }

  function saveActive(patch: Partial<AgentOrchestration>) {
    const nextItems = orchestrations.map((item) =>
      item.id === active.id
        ? {
            ...item,
            ...patch,
            updatedAt: "刚刚",
          }
        : item,
    );
    onSaveOrchestrations(nextItems, active.id);
  }

  function selectFlowTab(tab: "templates" | "configs") {
    setActiveFlowTab(tab);
    const nextFlow = tab === "templates" ? templateFlows[0] : customFlows[0];
    if (nextFlow) {
      onSelect(nextFlow.id);
    }
  }

  function updateStep(stepId: string, patch: Partial<OrchestrationStep>) {
    saveActive({
      status: "draft",
      steps: active.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    });
  }

  function addStep() {
    if (!draftStep.agent.trim() || !draftStep.action.trim()) {
      return;
    }
    const nextStep = { ...draftStep, id: createLocalId("step") };
    saveActive({
      status: "draft",
      steps: [...active.steps, nextStep],
    });
    setDraftStep({ ...emptyStepDraft, id: "draft" });
  }

  function removeStep(stepId: string) {
    if (active.steps.length <= 2) {
      return;
    }
    saveActive({
      status: "draft",
      steps: active.steps.filter((step) => step.id !== stepId),
    });
  }

  function stepExecutionState(index: number) {
    if (running) {
      if (index < executionIndex) return "done";
      if (index === executionIndex) return "running";
      return "pending";
    }
    return lastRun ? "done" : "pending";
  }

  function createOrchestration() {
    const source = active || defaultOrchestrations[0];
    const sourceTemplate = resolveSourceTemplate(source);
    const sourceTemplateId = sourceTemplate?.id || source.sourceTemplateId || source.id;
    const sourceTemplateName = sourceTemplate?.name || source.sourceTemplateName || source.name;
    const nextItem: AgentOrchestration = {
      ...source,
      id: createLocalId("flow"),
      name: `自定义 Agent 编排 ${customFlows.length + 1}`,
      description: `基于「${sourceTemplateName}」复制后自由调整 Agent、模型、系统提示词、动作、工具和交付物。`,
      status: "draft",
      owner: "Reviewer Workspace",
      sourceTemplateId,
      sourceTemplateName,
      updatedAt: "刚刚",
      steps: source.steps.slice(0, 4).map((step) => ({ ...step, id: createLocalId("step") })),
      lastRun: null,
    };
    setActiveFlowTab("configs");
    onSaveOrchestrations([nextItem, ...orchestrations], nextItem.id);
  }

  function deleteOrchestration(flowId: string) {
    const target = orchestrations.find((item) => item.id === flowId);
    if (!target || isTemplateFlow(target)) {
      return;
    }
    const nextItems = orchestrations.filter((item) => item.id !== flowId);
    const nextCustomFlows = nextItems.filter((item) => !isTemplateFlow(item));
    const nextTemplateFlows = nextItems.filter(isTemplateFlow);
    const nextSelectedId =
      active.id === flowId
        ? nextCustomFlows[0]?.id || nextTemplateFlows[0]?.id || defaultOrchestrations[0].id
        : active.id;
    if (!nextCustomFlows.length) {
      setActiveFlowTab("templates");
    }
    onSaveOrchestrations(nextItems.length ? nextItems : defaultOrchestrations, nextSelectedId);
  }

  function runOrchestration() {
    if (running) {
      return;
    }
    setRunError("");
    setRunning(true);
    setExecutionIndex(0);
    const timer = window.setInterval(() => {
      setExecutionIndex((value) => Math.min(value + 1, Math.max(0, active.steps.length - 1)));
    }, 900);

    apiRequest<OrchestrationRunResponse>(`/api/orchestrations/${encodeURIComponent(active.id)}/run`, {
      method: "POST",
      body: JSON.stringify({
        orchestration: active,
        task: "请基于知识库中的岗位需求和候选人简历，筛选适合 Java 后端工程师岗位的人选，输出排序、依据、风险和面试问题。",
        llmProvider: selectedLlmProvider,
      }),
    })
      .then((result) => {
        onRunResult(result);
        setExecutionIndex(active.steps.length);
      })
      .catch((error: Error) => {
        setRunError(error.message || "真实 Agent 链执行失败，请检查 LLM 网关和知识库配置。");
      })
      .finally(() => {
        window.clearInterval(timer);
        setRunning(false);
      });
  }

  return (
    <section className="section-view">
      <div className="section-heading with-action">
        <div>
          <span className="eyebrow">Agent Orchestration</span>
          <h1>Agent 自由编排</h1>
          <p className="active-flow-context">
            当前配置：{active.name} · {activeIsTemplate ? "内置模板" : `基于「${activeSourceName}」创建`}
          </p>
        </div>
        <div className="orchestration-actions">
          <button onClick={createOrchestration}>
            <Sparkles size={16} />
            新建编排
          </button>
          {!activeIsTemplate && (
            <button className="danger-action" onClick={() => deleteOrchestration(active.id)} disabled={running}>
              <Trash2 size={16} />
              删除配置
            </button>
          )}
          <button onClick={() => onSaveOrchestrations(orchestrations, active.id)}>
            <CheckCircle2 size={16} />
            保存配置
          </button>
          <button className="primary-action" onClick={runOrchestration} disabled={running}>
            <Zap size={16} />
            {running ? "试运行中" : "试运行链路"}
          </button>
        </div>
      </div>

      <div className="execution-workbench">
        <article className="task-brief-panel">
          <div className="panel-bar">
            <span className="eyebrow">任务说明</span>
            <div>
              <button onClick={createOrchestration}>编辑</button>
              <button className="primary-action" onClick={runOrchestration} disabled={running}>
                预览
              </button>
            </div>
          </div>
          <div className="task-brief-body">
            <h2>{active.domain.includes("招聘") ? "后端工程师候选人筛选指导手册" : `${active.domain} 执行指导手册`}</h2>
            <section>
              <h3>目标和适用场景</h3>
              <p>
                用户希望基于知识库、Agent 工具和结构化流程，把复杂任务拆成可复用的多 Agent
                协作链路，并在执行后得到可审查的结果。
              </p>
            </section>
            <section>
              <h3>编排要求</h3>
              <ul>
                <li>总控 Agent 只负责拆解任务和转交，不直接生成最终结论。</li>
                <li>每个子 Agent 必须输出明确交付物，并把结果交给下一步。</li>
                <li>评分、推荐或发布类结论必须保留证据、风险和下一步动作。</li>
              </ul>
            </section>
            <section>
              <h3>当前链路</h3>
              <p>
                该配置包含 {active.steps.length} 个 Agent，按串行链路完成
                {active.steps.map((step) => step.role).join("、")}。
              </p>
            </section>
          </div>
          <div className="brief-actions">
            <button onClick={createOrchestration}>
              <Activity size={16} />
              重新生成
            </button>
            <button className="primary-action" onClick={runOrchestration} disabled={running}>
              <Rocket size={16} />
              开始执行
            </button>
          </div>
        </article>

        <article className="task-flow-panel">
          <div className="panel-bar">
            <span>
              <Activity size={18} />
              任务流程
            </span>
            <em className={running ? "running" : lastRun ? "done" : ""}>
              {running ? "执行中" : lastRun ? "已完成" : "待执行"}
            </em>
          </div>
          <div className="flow-legend">
            <span><i className="pending" />待执行</span>
            <span><i className="running" />执行中</span>
            <span><i className="done" />已完成</span>
          </div>
          <div className="vertical-flow">
            {active.steps.map((step, index) => {
              const state = stepExecutionState(index);
              return (
                <div className={`vertical-step ${state}`} key={step.id}>
                  <div className="vertical-node">
                    <span>{state === "done" ? "✓" : ""}</span>
                    <div>
                      <strong>{step.role}</strong>
                      <small>{step.agent}</small>
                    </div>
                  </div>
                  {index < active.steps.length - 1 && <div className="vertical-edge" />}
                </div>
              );
            })}
          </div>
        </article>

        <article className="task-result-panel">
          <div className="panel-bar">
            <span>
              <FileText size={18} />
              任务结果
            </span>
          </div>
          {running ? (
            <div className="result-waiting">
              <Activity size={34} />
              <strong>{activeExecutionStep?.role || "正在执行"}</strong>
              <span>{activeExecutionStep?.agent || "Agent 正在调用 LLM 并读取知识库..."}</span>
            </div>
          ) : runError ? (
            <div className="result-waiting error">
              <FileText size={34} />
              <strong>真实执行失败</strong>
              <span>{runError}</span>
            </div>
          ) : resultTrace.length ? (
            <div className="result-summary-list">
              <div className="result-highlight">
                <strong>真实 Agent 执行完成</strong>
                <span>
                  {formatDuration(lastRun?.durationMs ?? 0)} · {resultTrace.length} 个 Agent ·{" "}
                  {lastRun?.evidence?.length ?? 0} 条知识库证据
                </span>
                {resultTrace[0]?.llm && (
                  <small>
                    LLM: {resultTrace[0].llm.providerLabel} / {resultTrace[0].llm.model}
                  </small>
                )}
              </div>
              {finalReport?.recommendations?.slice(0, 3).map((candidate) => (
                <div className="result-card candidate-result" key={candidate.name}>
                  <strong>
                    {candidate.name}
                    <em>{candidate.score}</em>
                  </strong>
                  <p>{candidate.decision}</p>
                  <small>{candidate.reasons.slice(0, 2).join("；")}</small>
                </div>
              ))}
              {resultTrace.slice(-2).map((item) => (
                <div className="result-card" key={item.stepId}>
                  <strong>{item.agent}</strong>
                  <p>{cleanAgentResultText(item.result)}</p>
                  <small>
                    {item.llm ? `${item.llm.providerLabel} · ${item.evidenceTitles?.slice(0, 2).join(" / ")}` : item.evidenceTitles?.slice(0, 2).join(" / ")}
                  </small>
                </div>
              ))}
              <div className="result-report">
                <span>最终交付</span>
                <p>{finalReport?.summary || "已生成候选人推荐、评分依据、面试问题和风险说明。"}</p>
              </div>
            </div>
          ) : (
            <div className="result-waiting empty">
              <FileText size={34} />
              <span>等待任务结果...</span>
            </div>
          )}
        </article>
      </div>

      <div className="config-section-title">
        <span className="eyebrow">Workflow Builder</span>
        <h2>编排配置</h2>
      </div>

      <div className="orchestration-layout">
        <aside className="orchestration-library">
          <div className="library-tabs">
            <button className={activeFlowTab === "templates" ? "active" : ""} onClick={() => selectFlowTab("templates")}>
              模板库 <strong>{templateFlows.length}</strong>
            </button>
            <button className={activeFlowTab === "configs" ? "active" : ""} onClick={() => selectFlowTab("configs")}>
              我的配置 <strong>{customFlows.length}</strong>
            </button>
          </div>
          <button className="new-flow-button" onClick={createOrchestration}>
            <Sparkles size={17} />
            从当前配置新建
          </button>
          <div className="flow-list">
            {visibleFlows.map((item) => (
              <article
                key={item.id}
                className={item.id === active.id ? "flow-card active" : "flow-card"}
              >
                <button className="flow-card-main" onClick={() => onSelect(item.id)}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {isTemplateFlow(item)
                        ? `${item.domain} · 内置模板`
                        : `${item.domain} · 基于 ${resolveSourceTemplate(item)?.name || item.sourceTemplateName || "历史自定义配置"}`}
                    </small>
                  </span>
                  <em>{item.status === "ready" ? "配置完整" : "草稿"}</em>
                </button>
                {!isTemplateFlow(item) && (
                  <button className="flow-delete-button" aria-label={`删除 ${item.name}`} onClick={() => deleteOrchestration(item.id)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </article>
            ))}
            {!visibleFlows.length && (
              <div className="flow-empty-state">
                <strong>{activeFlowTab === "configs" ? "还没有自定义配置" : "暂无模板"}</strong>
                <span>{activeFlowTab === "configs" ? "从模板库选择一个模板后点击“从当前配置新建”。" : "稍后可在这里扩展更多场景模板。"}</span>
              </div>
            )}
          </div>
        </aside>

        <div className="orchestration-main">
          <div className="flow-header-panel">
            <div>
              <span className="eyebrow">执行链路 · {activeIsTemplate ? "模板预览" : `基于 ${activeSourceName}`}</span>
              <input
                value={active.name}
                aria-label="编排名称"
                onChange={(event) => saveActive({ name: event.target.value, status: "draft" })}
              />
              <p>{active.description}</p>
            </div>
            <div className="flow-stats">
              <Stat label="Agent" value={String(active.steps.length)} icon={Bot} />
              <Stat label="转交" value={String(totalTransitions)} icon={ArrowRight} />
              <Stat label="状态" value={active.status === "ready" ? "Ready" : "Draft"} icon={CheckCircle2} />
            </div>
          </div>

          <div className="flow-canvas" aria-label="Agent 执行链路">
            {active.steps.map((step, index) => (
              <div className="flow-node-group" key={step.id}>
                <article className={index === 0 ? "flow-node lead" : "flow-node"}>
                  <span>{index === 0 ? "总控" : index}</span>
                  <small>{step.role}</small>
                  <strong>{step.agent}</strong>
                  <em>{stepModelLabel(step)}</em>
                </article>
                {index < active.steps.length - 1 && (
                  <div className="flow-edge">
                    <ArrowRight size={20} />
                    <small>{step.output}</small>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="orchestration-step-list">
            {active.steps.map((step, index) => (
              <article className="agent-config-card" key={step.id}>
                <div className="agent-config-head">
                  <span className="step-index">{index + 1}</span>
                  <div>
                    <strong>{step.agent}</strong>
                    <small>{step.role} · {stepModelLabel(step)}</small>
                  </div>
                  <button aria-label="删除步骤" onClick={() => removeStep(step.id)} disabled={active.steps.length <= 2}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="agent-config-grid">
                  <label>
                    Agent 名称
                    <input value={step.agent} onChange={(event) => updateStep(step.id, { agent: event.target.value })} />
                  </label>
                  <label>
                    角色职责
                    <input value={step.role} onChange={(event) => updateStep(step.id, { role: event.target.value })} />
                  </label>
                  <label>
                    AI 模型
                    <select
                      value={step.llmProvider || "inherit"}
                      onChange={(event) =>
                        updateStep(step.id, { llmProvider: event.target.value === "inherit" ? undefined : event.target.value })
                      }
                    >
                      <option value="inherit">继承顶部路由（{selectedRouteLabel}）</option>
                      <option value="auto">Auto：优先 qwen-plus</option>
                      {configuredProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.model} · {provider.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    工具
                    <input value={step.tool} onChange={(event) => updateStep(step.id, { tool: event.target.value })} />
                  </label>
                  <label className="wide">
                    执行动作
                    <input value={step.action} onChange={(event) => updateStep(step.id, { action: event.target.value })} />
                  </label>
                  <label>
                    输出产物
                    <input value={step.output} onChange={(event) => updateStep(step.id, { output: event.target.value })} />
                  </label>
                  <label className="wide prompt-field">
                    系统提示词
                    <textarea
                      value={step.systemPrompt || defaultStepSystemPrompt(step)}
                      onChange={(event) => updateStep(step.id, { systemPrompt: event.target.value })}
                    />
                  </label>
                  <label className="wide">
                    Guardrail 校验
                    <input
                      value={step.guardrail}
                      onChange={(event) => updateStep(step.id, { guardrail: event.target.value })}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          <div className="step-add-panel">
            <label>
              新 Agent
              <input
                value={draftStep.agent}
                onChange={(event) => setDraftStep((value) => ({ ...value, agent: event.target.value }))}
              />
            </label>
            <label>
              动作
              <input
                value={draftStep.action}
                onChange={(event) => setDraftStep((value) => ({ ...value, action: event.target.value }))}
              />
            </label>
            <label>
              输出
              <input
                value={draftStep.output}
                onChange={(event) => setDraftStep((value) => ({ ...value, output: event.target.value }))}
              />
            </label>
            <button className="primary-action" onClick={addStep}>
              <Sparkles size={16} />
              加入链路
            </button>
          </div>

          <div className="run-trace-panel">
            <div>
              <span className="eyebrow">Execution Trace</span>
              <h2>试运行追踪</h2>
            </div>
            {lastRun ? (
              <div className="trace-list">
                <div className="trace-summary">
                  <strong>{lastRun.status === "completed" ? "运行完成" : "运行中"}</strong>
                  <span>
                    {formatDateTime(lastRun.startedAt)} · {formatDuration(lastRun.durationMs)}
                  </span>
                </div>
	                {lastRun.trace.map((item, index) => (
	                  <article key={`${lastRun.id}-${item.stepId}`}>
	                    <span>{index + 1}</span>
	                    <div>
	                      <strong>{item.agent}</strong>
	                      <p>{item.action}</p>
	                    </div>
	                    <em>{formatDuration(item.durationMs)}</em>
	                    <small>
                        {cleanAgentResultText(item.result)}
                        {item.llm ? ` · ${item.llm.providerLabel}/${item.llm.model}` : ""}
                        {item.validation?.detail ? ` · ${item.validation.detail}` : ""}
                      </small>
	                  </article>
	                ))}
	              </div>
            ) : (
              <div className="empty-trace">
                <Bot size={28} />
                <span>点击“试运行链路”生成一条可回放的 Agent 执行轨迹。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type DataViewProps = {
  knowledgeSources: KnowledgeSource[];
  orchestrations: AgentOrchestration[];
  platformStatus: PlatformStatus | null;
  projects: Project[];
  runRecords: RunRecord[];
};

function DataView({ knowledgeSources, orchestrations, platformStatus, projects, runRecords }: DataViewProps) {
  const latestRun = runRecords[0];
  const llmLabel = platformStatus?.llm?.activeProvider?.label || "模板降级";

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
        <Stat
          label="编排链路"
          value={String(platformStatus?.storage.orchestrations ?? orchestrations.length)}
          icon={Settings2}
        />
        <Stat label="模型网关" value={llmLabel} icon={Brain} />
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

      <details className="run-console collapsible-panel">
        <summary>
          <span>
            <strong>最近构建记录</strong>
            <small>
              {latestRun
                ? `${runRecords.length} 条 · Latest ${formatDateTime(latestRun.finishedAt || latestRun.startedAt)}`
                : "暂无服务端运行记录"}
            </small>
          </span>
          <ChevronDown size={17} />
        </summary>

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
                  <span>{run.output.llm?.providerLabel || run.output.llm?.provider || "template"}</span>
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
      </details>
    </section>
  );
}

type KnowledgeViewProps = {
  knowledgeSources: KnowledgeSource[];
  onSaveKnowledgeSources: (sources: KnowledgeSource[]) => void;
  onUploadKnowledgeFiles: (files: File[]) => Promise<KnowledgeUploadResponse>;
};

function KnowledgeView({ knowledgeSources, onSaveKnowledgeSources, onUploadKnowledgeFiles }: KnowledgeViewProps) {
  const [draftTitle, setDraftTitle] = useState("ROOT/AI Native 评审关注点");
  const [draftContent, setDraftContent] = useState(
    "评审会关注完成度、工程思维、用户体验、创新性和可交付性。Demo 应展示真实交互、持久化、核心主流程和至少一个延展能力。",
  );
  const [draftTags, setDraftTags] = useState("ROOT,Review,Delivery");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

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

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length || uploading) {
      return;
    }
    setUploading(true);
    setUploadMessage("");
    try {
      const result = await onUploadKnowledgeFiles(files);
      const chunkCount = result.parsed.reduce((total, file) => total + file.chunks, 0);
      setUploadMessage(`已解析 ${result.parsed.length} 个文件，生成 ${chunkCount} 条知识。`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "文件解析失败，请检查格式。");
    } finally {
      setUploading(false);
    }
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
          <div className="knowledge-scope-note">
            <strong>当前交付：单工作区知识池</strong>
            <span>上传和手写内容会进入同一个 RAG 召回池，供构建与 Agent 编排使用。</span>
            <small>下一阶段升级为“多个知识库 / 每库多资料 / 选择召回范围”。</small>
          </div>
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
            <span>文件解析</span>
            <span>文本切块</span>
            <span>关键词召回</span>
            <span>证据聚合</span>
            <span>生成</span>
          </div>
          <label className={uploading ? "knowledge-upload uploading" : "knowledge-upload"}>
            <input
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
              disabled={uploading}
              onChange={(event) => {
                void uploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <Upload size={20} />
            <strong>{uploading ? "正在解析文件..." : "上传知识文件"}</strong>
            <span>.txt / .md / .csv / .json</span>
          </label>
          <p className="rag-note">
            当前实现为 keyword RAG + 文件解析；PDF/DOCX、embedding、vector DB 和 rerank 作为后续增强。
          </p>
          {uploadMessage && <div className="upload-message">{uploadMessage}</div>}
        </div>
      </div>

      <div className="knowledge-list-header">
        <div>
          <span className="eyebrow">Knowledge Entries</span>
          <h2>知识条目</h2>
        </div>
        <span>{knowledgeSources.length} 条</span>
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
            {source.source && (
              <small className="source-meta">
                {source.source.filename} · {source.source.parser} · chunk {source.source.chunkIndex}/{source.source.chunkCount}
              </small>
            )}
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
          <span>1. 沙箱构建、依赖安装、自动修错和发布流水线</span>
          <span>2. 拖拽式 DAG、失败重试、人工确认和执行审计</span>
          <span>3. 向量 RAG、PDF/DOCX 解析、rerank 和来源引用</span>
          <span>4. 积分、账单、充值、订阅和模型成本归因</span>
        </div>
      </div>
    </section>
  );
}

type ProjectsViewProps = {
  projects: Project[];
  onCreateProjectVersion: (projectId: number) => void;
  onDownloadProject: (project: Project) => void;
  onPreviewProject: (projectId: number) => void;
  onPublishProject: (projectId: number) => void;
  onStartBuild: (value: string) => void;
};

function ProjectsView({
  projects,
  onCreateProjectVersion,
  onDownloadProject,
  onPreviewProject,
  onPublishProject,
  onStartBuild,
}: ProjectsViewProps) {
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
                <small>
                  {modeLabel[project.mode]} · {project.updatedAt} · 版本 {project.version || project.versions?.length || 1}
                </small>
              </div>
              <span className="status-pill">{project.status}</span>
              <div className="project-actions">
                <button onClick={() => onPreviewProject(project.id)}>
                  <Monitor size={16} />
                  预览
                </button>
                <button onClick={() => onCreateProjectVersion(project.id)}>
                  <Layers size={16} />
                  保存版本
                </button>
                <button onClick={() => onDownloadProject(project)}>
                  <Download size={16} />
                  源码包
                </button>
                <button onClick={() => onPublishProject(project.id)}>
                  <Rocket size={16} />
                  {project.status === "已发布" ? "已发布" : "发布"}
                </button>
                <a href={project.publishedUrl || `${window.location.origin}${project.previewUrl || `/api/preview/${project.id}`}`} target="_blank" rel="noreferrer">
                  <Globe2 size={16} />
                  链接
                </a>
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

type ModelRouteSelectorProps = {
  llmStatus?: LlmStatus;
  selectedProvider: string;
  onSelect: (provider: string) => void;
};

function ModelRouteSelector({ llmStatus, selectedProvider, onSelect }: ModelRouteSelectorProps) {
  const providers = llmStatus?.providers ?? [];
  const labelFor = (provider: LlmProviderStatus) => (provider.id === "relay" ? provider.model || "gpt-5.5" : provider.model);

  return (
    <div className="model-route-selector" aria-label="模型路由选择器">
      <span title={llmStatus?.activeProvider ? `当前实际路由：${llmStatus.activeProvider.label} / ${llmStatus.activeProvider.model}` : "模型状态读取中"}>
        <Brain size={15} />
        模型
      </span>
      <button
        className={selectedProvider === "auto" ? "active" : ""}
        title="自动路由：优先通义千问，失败时切换到中转站"
        onClick={() => onSelect("auto")}
      >
        Auto
      </button>
      {providers.map((provider) => (
        <button
          key={provider.id}
          className={selectedProvider === provider.id ? "active" : ""}
          disabled={!provider.configured}
          title={`${provider.label} · ${provider.baseUrlHost || "未配置 endpoint"}`}
          onClick={() => onSelect(provider.id)}
        >
          {labelFor(provider)}
        </button>
      ))}
    </div>
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
