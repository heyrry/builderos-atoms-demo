import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const port = Number(process.env.PORT || 4188);
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const stateFile = path.join(dataDir, "state.json");
const authFile = path.join(dataDir, "auth.json");
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
const authStorageMode = process.env.MYSQL_HOST ? "mysql" : "json";
let mysqlPoolPromise;
let authSchemaReady = false;

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
    extensions: [
      "BuilderOS RAG 知识库 grounding",
      "服务端真实构建记录与运行日志",
      "生成 React/Vite 项目目录和可浏览文件树",
      "源码复制、单文件导出和服务端目录落盘",
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
  const artifactPath = await writeProjectFiles(id, generated.files || []);
  const durationMs = 840 + Math.min(1600, prompt.length * 18);
  const project = {
    id,
    title: generated.title,
    mode,
    status: "可预览",
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
      sourceBytes: (generated.files || []).reduce(
        (total, file) => total + Buffer.byteLength(String(file.content || ""), "utf8"),
        0,
      ),
    },
  };
  const nextState = await writeState({
    ...state,
    projects: [project, ...state.projects].slice(0, 50),
    runRecords: [run, ...state.runRecords].slice(0, 80),
  });
  return { project, run, state: nextState };
}

async function readProjectFileManifest(projectId) {
  const state = await readState();
  const project = state.projects.find((item) => String(item.id) === String(projectId));
  if (!project) {
    throw createHttpError(404, "project_not_found", "项目不存在。");
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

async function readPlatformStatus() {
  const state = await readState();
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

    const projectFilesMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/files$/);
    if (request.method === "GET" && projectFilesMatch) {
      sendJson(response, 200, await readProjectFileManifest(projectFilesMatch[1]));
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
