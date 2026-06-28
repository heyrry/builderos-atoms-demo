import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PORT || 4188);
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const stateFile = path.join(dataDir, "state.json");

const defaultState = {
  projects: [],
  knowledgeSources: [
    {
      id: 1,
      title: "OmniAgent 增强型 RAG",
      content:
        "借鉴 OmniAgent 的知识库思路：文档上传后进入解析、切块、向量召回、证据聚合和回答生成链路，Agent 输出必须附带来源与可信度。",
      tags: ["RAG", "Knowledge", "OmniAgent"],
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

async function ensureStateFile() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(stateFile)) {
    await writeFile(stateFile, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

async function readState() {
  await ensureStateFile();
  try {
    const raw = await readFile(stateFile, "utf8");
    const state = JSON.parse(raw);
    return {
      projects: Array.isArray(state.projects) ? state.projects : [],
      knowledgeSources: Array.isArray(state.knowledgeSources) ? state.knowledgeSources : defaultState.knowledgeSources,
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
    knowledgeSources: Array.isArray(nextState.knowledgeSources)
      ? nextState.knowledgeSources
      : current.knowledgeSources,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
  return state;
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

    if (request.method === "GET" && url.pathname === "/api/state") {
      sendJson(response, 200, await readState());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/state") {
      sendJson(response, 200, await writeState(await readJsonBody(request)));
      return;
    }

    sendJson(response, 404, { ok: false, error: "not_found" });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : "unknown_error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`BuilderOS API listening on http://127.0.0.1:${port}`);
});
