// Hermes Kanban Dashboard — generic edition.
const STATUS_ORDER = ["running", "ready", "review", "blocked", "todo", "scheduled", "triage", "done", "archived"];

const STATE = {
  boards: [],
  assignees: [],
  tasks: {},
  prevStatus: {},
  open: null,
  sse: null,
  pauseEvents: false,
  token: new URL(location.href).searchParams.get("token") || "",
  lang: localStorage.getItem("hk.lang") || (navigator.language?.startsWith("zh") ? "zh" : "en"),
  theme: localStorage.getItem("hk.theme") || "dark",
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// ── i18n ─────────────────────────────────────────────────────────────────────
function t(key) {
  return (window.I18N?.[STATE.lang]?.[key]) ?? (window.I18N?.en?.[key]) ?? key;
}
function applyI18n() {
  document.documentElement.lang = STATE.lang === "zh" ? "zh-CN" : "en";
  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (/<[a-z]/i.test(val)) el.innerHTML = val;
    else el.textContent = val;
  });
  $$("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
  // 把 datalist / help 内容也刷了
  const h = $("#help-body"); if (h) h.innerHTML = t("help.content");
  const langLabel = $("#lang-label"); if (langLabel) langLabel.textContent = STATE.lang === "zh" ? "中" : "EN";
  // 过滤器下拉首项
  const fs = $("#filter-status");
  if (fs) {
    const cur = fs.value;
    fs.innerHTML = `<option value="">${t("filter.status")} · ${STATE.lang === "zh" ? "全部" : "all"}</option>` +
      STATUS_ORDER.map((s) => `<option value="${s}">${s}</option>`).join("");
    fs.value = cur;
  }
  const fa = $("#filter-assignee");
  if (fa) {
    const cur = fa.value;
    fa.innerHTML = `<option value="">${t("filter.assignee")} · ${STATE.lang === "zh" ? "全部" : "all"}</option>` +
      STATE.assignees.map((a) => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
    fa.value = cur;
  }
}
function toggleLang() { STATE.lang = STATE.lang === "zh" ? "en" : "zh"; localStorage.setItem("hk.lang", STATE.lang); applyI18n(); }

// ── theme ────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.dataset.theme = STATE.theme;
  $("#theme-icon").textContent = STATE.theme === "dark" ? "🌙" : "☀";
}
function toggleTheme() { STATE.theme = STATE.theme === "dark" ? "light" : "dark"; localStorage.setItem("hk.theme", STATE.theme); applyTheme(); }

// ── format helpers ───────────────────────────────────────────────────────────
// Hermes 返回的时间是 Unix 秒(整数)或 ISO 字符串,或已是毫秒 Date 值。统一处理。
function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  let d;
  if (typeof v === "number") {
    // < 1e12 认为是秒,否则是毫秒
    d = new Date(v < 1e12 ? v * 1000 : v);
  } else if (typeof v === "string") {
    // 全数字字符串按数字处理
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else {
      d = new Date(v);
    }
  } else {
    return String(v);
  }
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return STATE.lang === "zh" ? "—" : "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}
function fmtRel(v) {
  if (!v) return "";
  const base = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : new Date(v).getTime();
  if (isNaN(base)) return "";
  const diff = (Date.now() - base) / 1000;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? (STATE.lang === "zh" ? "前" : "ago") : (STATE.lang === "zh" ? "后" : "later");
  const units = STATE.lang === "zh"
    ? [[60, "秒"], [60, "分"], [24, "小时"], [7, "天"], [4.345, "周"], [12, "月"], [Infinity, "年"]]
    : [[60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.345, "w"], [12, "mo"], [Infinity, "y"]];
  let n = abs, label = units[0][1];
  for (let i = 0; i < units.length; i++) {
    if (n < units[i][0]) { label = units[i][1]; break; }
    n = n / units[i][0];
    label = units[i + 1]?.[1] ?? label;
  }
  return `${Math.round(n)}${label}${STATE.lang === "zh" ? sign : " " + sign}`;
}
function nowTick() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => { if (!s) return ""; if (window.marked) return window.marked.parse(String(s)); return `<pre>${esc(s)}</pre>`; };
const withToken = (url) => (STATE.token ? url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(STATE.token) : url);

async function api(path, opts = {}) {
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  if (STATE.token) headers["Authorization"] = "Bearer " + STATE.token;
  const r = await fetch(path, { ...opts, headers });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) throw { status: r.status, data };
  return data;
}

// ── config + boards ──────────────────────────────────────────────────────────
async function loadConfig() {
  const cfg = await api("/api/config");
  STATE.boards = cfg.boards || [];
  STATE.assignees = cfg.assignees || [];
  renderAssigneeList();
  renderBoardShells();
  populateCreateBoardSelects();
  applyI18n();
}
function renderAssigneeList() {
  $("#assignee-list").innerHTML = STATE.assignees.map((a) => `<option value="${esc(a.name)}"></option>`).join("");
}
function populateCreateBoardSelects() {
  const opts = STATE.boards.map((b) => `<option value="${esc(b.slug)}">${esc(b.slug)} · ${esc(b.name || "")}</option>`).join("");
  $("#create-board").innerHTML = opts;
  $("#swarm-board").innerHTML = opts;
}
function renderBoardShells() {
  $("#boards-wrap").innerHTML = STATE.boards.map((b) => `
    <article class="board" data-board="${esc(b.slug)}">
      <header class="board-header">
        <div class="bh-main">
          <h2><span class="board-dot"></span>${esc(b.slug)} <span class="muted">${esc(b.name || "")}</span></h2>
          <div class="meta" data-count-for="${esc(b.slug)}">—</div>
        </div>
      </header>
      <div class="columns" data-columns-for="${esc(b.slug)}"></div>
    </article>`).join("");
}

// ── render ────────────────────────────────────────────────────────────────────
function matchFilter(t_) {
  const q = $("#search").value.trim().toLowerCase();
  const st = $("#filter-status").value;
  const asg = $("#filter-assignee").value;
  if (st && (t_.status || "").toLowerCase() !== st) return false;
  if (asg && (t_.assignee || "") !== asg) return false;
  if (q) {
    const hay = `${t_.id} ${t_.title || ""} ${t_.body || ""} ${t_.assignee || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function renderBoard(board) {
  const tasks = (STATE.tasks[board] || []).filter(matchFilter);
  const columnsEl = document.querySelector(`[data-columns-for="${CSS.escape(board)}"]`);
  const countEl = document.querySelector(`[data-count-for="${CSS.escape(board)}"]`);
  if (!columnsEl) return;
  countEl.textContent = `${tasks.length} / ${(STATE.tasks[board] || []).length} ${STATE.lang === "zh" ? "卡" : "cards"}`;

  const grouped = {};
  for (const s of STATUS_ORDER) grouped[s] = [];
  for (const t_ of tasks) (grouped[(t_.status || "todo").toLowerCase()] ||= []).push(t_);

  const prev = STATE.prevStatus[board] || {};
  const now = {};
  for (const t_ of STATE.tasks[board] || []) now[t_.id] = t_.status;
  const flashIds = new Set();
  for (const id of Object.keys(now)) if (prev[id] !== undefined && prev[id] !== now[id]) flashIds.add(id);
  STATE.prevStatus[board] = now;

  columnsEl.innerHTML = "";
  for (const s of STATUS_ORDER) {
    const list = grouped[s];
    if (!list?.length) continue;
    const col = document.createElement("div");
    col.className = `column col-${s}`;
    col.innerHTML = `<h3><span>${s}</span><span class="n">${list.length}</span></h3>`;
    for (const t_ of list) {
      const card = document.createElement("div");
      card.className = "card" + (flashIds.has(t_.id) ? " flash" : "");
      const timeField = t_.completed_at || t_.started_at || t_.created_at;
      const timeLabel = t_.completed_at ? (STATE.lang === "zh" ? "完成" : "done")
        : t_.started_at ? (STATE.lang === "zh" ? "开始" : "started")
        : (STATE.lang === "zh" ? "建卡" : "created");
      card.innerHTML = `
        <div class="title">${esc(t_.title || t_.id)}</div>
        <div class="foot">
          <span class="id" data-tip="${esc(t_.id)}">${esc(t_.id)}</span>
          <span class="asg">${esc(t_.assignee || "—")}</span>
          <span class="status-pill pill-${esc((t_.status || "todo").toLowerCase())}">${esc(t_.status || "?")}</span>
        </div>
        <div class="meta-row muted"><span>${timeLabel}</span><span data-tip="${esc(fmt(timeField))}">${esc(fmtRel(timeField) || "—")}</span></div>`;
      card.addEventListener("click", () => openDrawer(board, t_.id));
      col.appendChild(card);
      if (flashIds.has(t_.id)) setTimeout(() => card.classList.remove("flash"), 1500);
    }
    columnsEl.appendChild(col);
  }
}
function renderAllBoards() { for (const b of STATE.boards) renderBoard(b.slug); }
async function fetchBoard(slug) {
  const archived = $("#toggle-archived").checked;
  const data = await api(`/api/boards/${encodeURIComponent(slug)}/tasks?include_archived=${archived ? 1 : 0}`);
  STATE.tasks[slug] = data.tasks || [];
  renderBoard(slug);
}
async function refreshAll() {
  for (const b of STATE.boards) { try { await fetchBoard(b.slug); } catch (e) { console.error("fetch", b.slug, e); } }
  $("#last-tick").textContent = (STATE.lang === "zh" ? "刷新 " : "refreshed ") + nowTick();
}

// ── SSE ──────────────────────────────────────────────────────────────────────
function connectSSE() {
  if (STATE.sse) STATE.sse.close();
  const es = new EventSource(withToken("/api/events"));
  STATE.sse = es;
  const indicator = $("#sse-indicator");
  const text = $("#sse-text");
  es.onopen = () => { indicator.className = "dot on"; text.textContent = "live"; };
  es.onerror = () => { indicator.className = "dot off"; text.textContent = "offline"; };
  es.addEventListener("tasks", (ev) => {
    try {
      const p = JSON.parse(ev.data);
      STATE.tasks[p.board] = p.tasks || [];
      renderBoard(p.board);
      $("#last-tick").textContent = (STATE.lang === "zh" ? "事件 " : "event ") + nowTick();
      if (STATE.open && STATE.open.board === p.board) {
        const still = STATE.tasks[p.board].find((t) => t.id === STATE.open.taskId);
        if (still) openDrawer(STATE.open.board, STATE.open.taskId, { keepTab: true });
      }
    } catch (e) { console.error(e); }
  });
  es.addEventListener("gateway", (ev) => {
    if (STATE.pauseEvents) return;
    try { appendEvent(JSON.parse(ev.data).line); } catch {}
  });
}
function appendEvent(line) {
  const list = $("#event-list");
  const li = document.createElement("li");
  li.innerHTML = `<span class="kind">${nowTick()}</span>${esc(line)}`;
  list.insertBefore(li, list.firstChild);
  while (list.children.length > 400) list.removeChild(list.lastChild);
}

// ── drawer ───────────────────────────────────────────────────────────────────
async function openDrawer(board, taskId, { keepTab = false } = {}) {
  const prevTab = keepTab && STATE.open ? STATE.open.tab : "overview";
  STATE.open = { board, taskId, tab: prevTab };
  const dlg = $("#task-drawer");
  if (!dlg.open) dlg.showModal();
  $("#drawer-title").textContent = `${board} · ${taskId}`;
  if (!keepTab) {
    switchTab("overview");
    $("#action-result").className = "result muted";
    $("#action-result").textContent = "";
  }
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}`);
    const t_ = data.task || {};
    $("#drawer-title").textContent = `${board} · ${t_.id} · ${t_.title || ""}`;
    const kv = (k, v, tip) => `<div data-tip="${esc(tip || "")}"><div class="k">${esc(k)}</div><div>${v}</div></div>`;
    $("#drawer-meta").innerHTML = [
      kv("status", `<span class="status-pill pill-${esc((t_.status || "todo").toLowerCase())}">${esc(t_.status || "?")}</span>`, STATE.lang === "zh" ? "当前状态" : "current status"),
      kv("assignee", esc(t_.assignee || "—"), STATE.lang === "zh" ? "分派给的 profile" : "assigned profile"),
      kv("priority", t_.priority ?? "—", STATE.lang === "zh" ? "数字越大越优先" : "higher = higher priority"),
      kv("created", `<span data-tip="${esc(fmtRel(t_.created_at))}">${esc(fmt(t_.created_at))}</span>`, STATE.lang === "zh" ? "建卡时间" : "created at"),
      kv("started", `<span data-tip="${esc(fmtRel(t_.started_at))}">${esc(fmt(t_.started_at))}</span>`, STATE.lang === "zh" ? "worker 开始跑的时间" : "worker started"),
      kv("completed", `<span data-tip="${esc(fmtRel(t_.completed_at))}">${esc(fmt(t_.completed_at))}</span>`, STATE.lang === "zh" ? "完成或失败的时间" : "finished at"),
      kv("tenant", esc(t_.tenant || "—")),
      kv("workflow", esc(t_.workflow_template_id || "—")),
      kv("workspace", esc(t_.workspace_kind || "—")),
      kv("model", esc(t_.model_override || "—")),
    ].join("");
    $("#drawer-body-md").innerHTML = md(t_.body || "_(no body)_");

    const comments = data.comments || [];
    $("#drawer-comments").innerHTML = comments.slice(-30).reverse().map((c) =>
      `<li><span class="who">${esc(c.author || "?")}</span><span class="muted" data-tip="${esc(fmtRel(c.created_at))}">${esc(fmt(c.created_at))}</span>
        <div class="md-inline md">${md(c.body || "")}</div></li>`
    ).join("") || `<li class="muted">${STATE.lang === "zh" ? "（无评论）" : "(no comments)"}</li>`;

    const events = data.events || [];
    $("#drawer-events").innerHTML = events.slice(-50).reverse().map((e) =>
      `<li><span class="k">${esc(e.kind || "?")}</span><span class="muted" data-tip="${esc(fmtRel(e.created_at))}">${esc(fmt(e.created_at))}</span>
        <div class="data">${esc(JSON.stringify(e.data || e.payload || {}))}</div></li>`
    ).join("") || `<li class="muted">${STATE.lang === "zh" ? "（无事件）" : "(no events)"}</li>`;

    if (STATE.open?.tab === "log") loadDrawerLog();
  } catch (e) {
    $("#drawer-meta").innerHTML = `<span class="result err">${STATE.lang === "zh" ? "加载失败" : "load failed"}: ${esc(JSON.stringify(e))}</span>`;
  }
}
function switchTab(tab) {
  if (STATE.open) STATE.open.tab = tab;
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab));
  if (tab === "log") loadDrawerLog();
}
async function loadDrawerLog() {
  if (!STATE.open) return;
  const { board, taskId } = STATE.open;
  $("#drawer-log").textContent = STATE.lang === "zh" ? "加载中…" : "loading…";
  $("#drawer-log-size").textContent = "—";
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}/log?lines=500`);
    if (!data.exists) { $("#drawer-log").textContent = STATE.lang === "zh" ? "(该任务暂无日志文件)" : "(no log file yet)"; return; }
    $("#drawer-log-size").textContent = `${data.size} bytes · ${STATE.lang === "zh" ? "末" : "last"} ${data.lines.length} ${STATE.lang === "zh" ? "行" : "lines"}`;
    $("#drawer-log").textContent = data.lines.join("\n");
    $("#drawer-log").scrollTop = $("#drawer-log").scrollHeight;
  } catch (e) { $("#drawer-log").textContent = `${STATE.lang === "zh" ? "加载失败" : "load failed"}: ${JSON.stringify(e)}`; }
}

// ── write ops ────────────────────────────────────────────────────────────────
function showActionResult(level, msg) { const el = $("#action-result"); el.className = `result ${level}`; el.textContent = msg; }
async function postAction(action) {
  if (!STATE.open) return;
  const { board, taskId } = STATE.open;
  let body = {};
  if (action === "comment") { const t_ = $("#input-comment").value.trim(); if (!t_) return showActionResult("err", STATE.lang === "zh" ? "评论内容为空" : "comment is empty"); body = { text: t_ }; }
  else if (action === "unblock") body = { reason: $("#input-unblock").value.trim() || null };
  else if (action === "block") body = { reason: $("#input-block").value.trim() || null };
  else if (action === "request-review") body = { summary: $("#input-review-summary").value.trim() || null, reviewer: $("#input-review-reviewer").value.trim() || null };
  else if (action === "archive") { if (!confirm(STATE.lang === "zh" ? "确认归档这张卡？" : "Confirm archive?")) return; body = { reason: $("#input-archive").value.trim() || null }; }
  else if (action === "reassign") { const to = $("#input-reassign-to").value.trim(); if (!to) return showActionResult("err", STATE.lang === "zh" ? "请输入目标 profile" : "please enter target profile"); body = { assignee: to, reclaim: $("#input-reassign-reclaim").checked, reason: $("#input-reassign-reason").value.trim() || null }; }
  showActionResult("muted", `${STATE.lang === "zh" ? "执行" : "running"} ${action}…`);
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}/${action}`, { method: "POST", body: JSON.stringify(body) });
    showActionResult("ok", `✓ ${action} ${STATE.lang === "zh" ? "成功" : "ok"}\n${(data.stdout || "").trim()}`);
    await openDrawer(board, taskId, { keepTab: true });
    await fetchBoard(board);
  } catch (e) { showActionResult("err", `${STATE.lang === "zh" ? "失败" : "failed"}: ${JSON.stringify(e)}`); }
}

// ── create / swarm ───────────────────────────────────────────────────────────
function collectCreatePayload() {
  const num = (id) => { const v = $(id).value.trim(); return v === "" ? null : Number(v); };
  const list = (id) => { const v = $(id).value.trim(); return v ? v.split(",").map(s => s.trim()).filter(Boolean) : null; };
  const str = (id) => { const v = $(id).value.trim(); return v || null; };
  return {
    title: $("#create-title").value.trim(), body: str("#create-body"), assignee: str("#create-assignee"),
    priority: num("#create-priority"), tenant: str("#create-tenant"), project: str("#create-project"),
    workspace: str("#create-workspace"), branch: str("#create-branch"),
    max_runtime: str("#create-max-runtime"), max_retries: num("#create-max-retries"),
    model: str("#create-model"), provider: str("#create-provider"),
    skills: list("#create-skills"), parents: list("#create-parents"),
    triage: $("#create-triage").checked, initial_status: str("#create-initial-status"),
    idempotency_key: str("#create-idempotency"),
  };
}
async function submitCreate() {
  const board = $("#create-board").value;
  const payload = collectCreatePayload();
  if (!payload.title) { $("#create-result").className = "result err"; $("#create-result").textContent = STATE.lang === "zh" ? "title 必填" : "title required"; return; }
  $("#create-result").className = "result muted"; $("#create-result").textContent = STATE.lang === "zh" ? "创建中…" : "creating…";
  try {
    const data = await api(`/api/boards/${encodeURIComponent(board)}/create`, { method: "POST", body: JSON.stringify(payload) });
    $("#create-result").className = "result ok"; $("#create-result").textContent = `✓ ${STATE.lang === "zh" ? "已创建" : "created"} ${JSON.stringify(data.task).slice(0, 400)}`;
    await fetchBoard(board);
    const newId = data.task?.id; if (newId) openDrawer(board, newId);
    $("#create-dialog").close();
  } catch (e) { $("#create-result").className = "result err"; $("#create-result").textContent = `${STATE.lang === "zh" ? "失败" : "failed"}: ${JSON.stringify(e)}`; }
}
async function submitSwarm() {
  const board = $("#swarm-board").value;
  const str = (id) => { const v = $(id).value.trim(); return v || null; };
  const payload = {
    title: $("#swarm-title").value.trim(), body: str("#swarm-body"),
    workers: Number($("#swarm-workers").value) || 3,
    worker_assignee: str("#swarm-worker"), verifier_assignee: str("#swarm-verifier"), synth_assignee: str("#swarm-synth"),
    tenant: str("#swarm-tenant"), project: str("#swarm-project"),
  };
  if (!payload.title) { $("#swarm-result").className = "result err"; $("#swarm-result").textContent = STATE.lang === "zh" ? "title 必填" : "title required"; return; }
  $("#swarm-result").className = "result muted"; $("#swarm-result").textContent = STATE.lang === "zh" ? "创建 swarm 中…" : "creating swarm…";
  try {
    const data = await api(`/api/boards/${encodeURIComponent(board)}/swarm`, { method: "POST", body: JSON.stringify(payload) });
    $("#swarm-result").className = "result ok"; $("#swarm-result").textContent = `✓ swarm ${STATE.lang === "zh" ? "创建成功" : "ok"}\n${(data.stdout || "").trim()}`;
    await fetchBoard(board);
  } catch (e) { $("#swarm-result").className = "result err"; $("#swarm-result").textContent = `${STATE.lang === "zh" ? "失败" : "failed"}: ${JSON.stringify(e)}`; }
}

// ── tooltip ──────────────────────────────────────────────────────────────────
function initTooltip() {
  const tip = $("#tooltip");
  let hovered = null;
  const show = (el) => {
    hovered = el;
    const key = el.dataset.tip;
    if (!key) return;
    const text = window.I18N?.[STATE.lang]?.[key] ?? key;  // 若 key 本身是文本就直接显示
    if (!text) return;
    tip.innerHTML = text;
    tip.classList.remove("hidden");
    requestAnimationFrame(() => positionTip(el));
  };
  const positionTip = (el) => {
    const r = el.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let left = r.left + r.width / 2 - tr.width / 2;
    let top = r.bottom + 8;
    if (left < 6) left = 6;
    if (left + tr.width > window.innerWidth - 6) left = window.innerWidth - 6 - tr.width;
    if (top + tr.height > window.innerHeight - 6) top = r.top - tr.height - 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  };
  const hide = () => { hovered = null; tip.classList.add("hidden"); };
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest?.("[data-tip]");
    if (!el) { if (hovered && !e.target.closest("[data-tip]")) hide(); return; }
    if (el !== hovered) show(el);
  });
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest?.("[data-tip]")) hide();
  });
  document.addEventListener("scroll", hide, true);
}

// ── wiring ───────────────────────────────────────────────────────────────────
function wire() {
  $("#refresh-btn").addEventListener("click", refreshAll);
  $("#clear-events").addEventListener("click", () => { $("#event-list").innerHTML = ""; });
  $("#pause-events").addEventListener("click", (e) => {
    STATE.pauseEvents = !STATE.pauseEvents;
    e.target.textContent = STATE.pauseEvents ? (STATE.lang === "zh" ? "继续" : "Resume") : t("events.pause");
  });
  $("#search").addEventListener("input", renderAllBoards);
  $("#filter-status").addEventListener("change", renderAllBoards);
  $("#filter-assignee").addEventListener("change", renderAllBoards);
  $("#toggle-archived").addEventListener("change", refreshAll);
  $("#new-task-btn").addEventListener("click", () => $("#create-dialog").showModal());
  $("#new-swarm-btn").addEventListener("click", () => $("#swarm-dialog").showModal());
  $("#help-btn").addEventListener("click", () => $("#help-dialog").showModal());
  $("#lang-btn").addEventListener("click", toggleLang);
  $("#theme-btn").addEventListener("click", toggleTheme);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
    if (e.key === "Escape") { $("#tooltip").classList.add("hidden"); }
  });
  $("#create-submit").addEventListener("click", submitCreate);
  $("#swarm-submit").addEventListener("click", submitSwarm);
  $$(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  $$("button[data-action]").forEach((b) => b.addEventListener("click", () => postAction(b.dataset.action)));
  $("#drawer-log-refresh").addEventListener("click", loadDrawerLog);
  $("#drawer-copy-id").addEventListener("click", () => { if (STATE.open) navigator.clipboard.writeText(STATE.open.taskId); });
  $("#task-drawer").addEventListener("close", () => { STATE.open = null; });
}

(async () => {
  applyTheme();
  wire();
  initTooltip();
  try {
    await loadConfig();
    applyI18n();
    await refreshAll();
    connectSSE();
    setInterval(() => { renderAllBoards(); }, 30000);  // 相对时间定期自更新
  } catch (e) {
    document.body.insertAdjacentHTML("afterbegin",
      `<div class="result err" style="margin:12px">init failed: ${esc(JSON.stringify(e))}。若启用了 token,请把 <code>?token=XXX</code> 加到 URL。</div>`);
  }
})();
