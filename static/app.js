// Hermes Kanban Dashboard — generic edition.
const STATUS_ORDER = ["running", "ready", "review", "blocked", "todo", "scheduled", "triage", "done", "archived"];

const STATE = {
  boards: [],
  assignees: [],
  tasks: Object.create(null),
  prevStatus: Object.create(null),
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
    fs.innerHTML = `<option value="">${t("workspace.all")}</option>` +
      STATUS_ORDER.map((s) => `<option value="${s}">${statusLabel(s)}</option>`).join("");
    fs.value = cur;
  }
  const fa = $("#filter-assignee");
  if (fa) {
    const cur = fa.value;
    fa.innerHTML = `<option value="">${t("workspace.all")}</option>` +
      STATE.assignees.map((a) => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
    fa.value = cur;
  }
}
function toggleLang() {
  STATE.lang = STATE.lang === "zh" ? "en" : "zh";
  localStorage.setItem("hk.lang", STATE.lang);
  applyI18n(); workspaceLanguageChanged();
  if (STATE.open) openDrawer(STATE.open.board, STATE.open.taskId, { keepTab: true });
}

// ── theme ────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.dataset.theme = STATE.theme;
  $("#theme-icon").innerHTML = icon(STATE.theme === "dark" ? "moon" : "sun");
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

// Navigation, rendering and SSE subscriptions live in workspace.js.

// ── drawer ───────────────────────────────────────────────────────────────────
let drawerRequest = 0;
const actionDrafts = new Map();
async function openDrawer(board, taskId, { keepTab = false } = {}) {
  const request = ++drawerRequest;
  const changed = STATE.open?.board !== board || STATE.open?.taskId !== taskId;
  const actionInputs = $$("#task-drawer input, #task-drawer textarea");
  if (changed) {
    if (STATE.open) actionDrafts.set(`${STATE.open.board}/${STATE.open.taskId}`, actionInputs.map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]));
    const draft = new Map(actionDrafts.get(`${board}/${taskId}`) || []);
    actionInputs.forEach(el => { if (el.type === "checkbox") el.checked = !!draft.get(el.id); else el.value = draft.get(el.id) || ""; });
  }
  const prevTab = keepTab && STATE.open ? STATE.open.tab : "overview";
  STATE.open = { board, taskId, tab: prevTab };
  const dlg = $("#task-drawer");
  if (!dlg.open) dlg.showModal();
  $("#drawer-swarm").hidden = true;
  $("#drawer-title").textContent = t("workspace.loading");
  $("#drawer-update").hidden = true;
  if (changed) {
    $("#drawer-meta").textContent = "";
    $("#drawer-extra").textContent = "";
    $("#drawer-body-md").textContent = t("workspace.loading");
    $("#drawer-output").textContent = "";
    $("#drawer-comments").textContent = "";
    $("#drawer-events").textContent = "";
  }
  if (!keepTab) {
    switchTab("overview");
    $("#action-result").className = "result muted";
    $("#action-result").textContent = "";
  }
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}`);
    if (request !== drawerRequest || !STATE.open || !dlg.open) return;
    const t_ = data.task || {};
    $("#drawer-title").textContent = t_.title || t_.id;
    const kv = (k, v, tip) => `<div data-tip="${esc(tip || "")}"><div class="k">${esc(k)}</div><div>${v}</div></div>`;
    $("#drawer-meta").innerHTML = [
      kv(t("filter.status"), `<span class="status-pill pill-${esc((t_.status || "todo").toLowerCase())}">${esc(statusLabel(t_.status || "todo"))}</span>`),
      kv(t("filter.assignee"), esc(t_.assignee || "—")),
      kv(t("workspace.priority"), t_.priority ?? "—"),
    ].join("");
    $("#drawer-extra").innerHTML = [
      kv("ID", esc(t_.id)),
      kv(t("create.board"), esc(boardInfo(board)?.name || board)),
      kv("created", `<span data-tip="${esc(fmtRel(t_.created_at))}">${esc(fmt(t_.created_at))}</span>`, STATE.lang === "zh" ? "建卡时间" : "created at"),
      kv("started", `<span data-tip="${esc(fmtRel(t_.started_at))}">${esc(fmt(t_.started_at))}</span>`, STATE.lang === "zh" ? "worker 开始跑的时间" : "worker started"),
      kv("completed", `<span data-tip="${esc(fmtRel(t_.completed_at))}">${esc(fmt(t_.completed_at))}</span>`, STATE.lang === "zh" ? "完成或失败的时间" : "finished at"),
      kv("tenant", esc(t_.tenant || "—")),
      kv("workflow", esc(t_.workflow_template_id || "—")),
      kv("workspace", esc(t_.workspace_kind || "—")),
      kv("model", esc(t_.model_override || "—")),
    ].join("");
    const primaryAction = { blocked: "unblock", running: "request-review", review: "comment" }[t_.status];
    $$("button[data-action]").forEach(button => {
      button.classList.toggle("primary", button.dataset.action === primaryAction);
      button.disabled = !!boardInfo(board)?.archived;
    });
    $("#drawer-body-md").innerHTML = md(t_.body || "_(no body)_");
    $("#drawer-output").innerHTML = md(t_.result || data.latest_summary || t("swarm.noOutput"));
    const swarmRoot = swarmRootFor(t_);
    $("#drawer-swarm").hidden = !swarmRoot;
    $("#drawer-swarm").onclick = () => openSwarmProgress(board, swarmRoot);

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
    if (request !== drawerRequest || !STATE.open) return;
    $("#drawer-meta").innerHTML = `<span class="result err">${STATE.lang === "zh" ? "加载失败" : "load failed"}: ${esc(JSON.stringify(e))}</span>`;
  }
}
function switchTab(tab) {
  if (STATE.open) STATE.open.tab = tab;
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab));
  $(".drawer-body").scrollTop = 0;
  if (tab === "log") loadDrawerLog();
}
async function loadDrawerLog() {
  if (!STATE.open) return;
  const { board, taskId } = STATE.open;
  $("#drawer-log").textContent = STATE.lang === "zh" ? "加载中…" : "loading…";
  $("#drawer-log-size").textContent = "—";
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}/log?lines=500`);
    if (STATE.open?.board !== board || STATE.open?.taskId !== taskId) return;
    if (!data.exists) { $("#drawer-log").textContent = STATE.lang === "zh" ? "(该任务暂无日志文件)" : "(no log file yet)"; return; }
    $("#drawer-log-size").textContent = `${data.size} bytes · ${STATE.lang === "zh" ? "末" : "last"} ${data.lines.length} ${STATE.lang === "zh" ? "行" : "lines"}`;
    $("#drawer-log").textContent = data.lines.join("\n");
    $("#drawer-log").scrollTop = $("#drawer-log").scrollHeight;
  } catch (e) { $("#drawer-log").textContent = `${STATE.lang === "zh" ? "加载失败" : "load failed"}: ${JSON.stringify(e)}`; }
}

// ── write ops ────────────────────────────────────────────────────────────────
function showActionResult(level, msg) { const el = $("#action-result"); el.className = `result ${level}`; el.textContent = msg; }
async function postAction(action) {
  if (!STATE.open || postAction.busy) return;
  const { board, taskId } = STATE.open;
  let body = {};
  if (action === "comment") { const t_ = $("#input-comment").value.trim(); if (!t_) return showActionResult("err", STATE.lang === "zh" ? "评论内容为空" : "comment is empty"); body = { text: t_ }; }
  else if (action === "unblock") body = { reason: $("#input-unblock").value.trim() || null };
  else if (action === "block") body = { reason: $("#input-block").value.trim() || null };
  else if (action === "request-review") body = { summary: $("#input-review-summary").value.trim() || null, reviewer: $("#input-review-reviewer").value.trim() || null };
  else if (action === "archive") { if (!confirm(STATE.lang === "zh" ? "确认归档这张卡？" : "Confirm archive?")) return; body = { reason: $("#input-archive").value.trim() || null }; }
  else if (action === "reassign") { const to = $("#input-reassign-to").value.trim(); if (!to) return showActionResult("err", STATE.lang === "zh" ? "请输入目标 profile" : "please enter target profile"); body = { assignee: to, reclaim: $("#input-reassign-reclaim").checked, reason: $("#input-reassign-reason").value.trim() || null }; }
  showActionResult("muted", `${STATE.lang === "zh" ? "执行" : "running"} ${action}…`);
  postAction.busy = true;
  const button = document.querySelector(`button[data-action="${action}"]`);
  button.disabled = true;
  try {
    const data = await api(`/api/tasks/${encodeURIComponent(board)}/${encodeURIComponent(taskId)}/${action}`, { method: "POST", body: JSON.stringify(body) });
    if (STATE.open?.board === board && STATE.open?.taskId === taskId) {
      showActionResult("ok", `✓ ${action} ${STATE.lang === "zh" ? "成功" : "ok"}\n${(data.stdout || "").trim()}`);
      await openDrawer(board, taskId, { keepTab: true });
    } else notify(`${taskId} · ${action} ✓`);
    await fetchBoard(board);
  } catch (e) {
    if (STATE.open?.board === board && STATE.open?.taskId === taskId) showActionResult("err", `${STATE.lang === "zh" ? "失败" : "failed"}: ${JSON.stringify(e)}`);
    else notify(`${taskId} · ${action}: ${t("workspace.loadFailed")}`);
  }
  finally { postAction.busy = false; button.disabled = !!boardInfo(STATE.open?.board)?.archived; }
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
  if (submitCreate.busy) return;
  const board = $("#create-board").value;
  const payload = collectCreatePayload();
  if (!payload.title) { $("#create-result").className = "result err"; $("#create-result").textContent = STATE.lang === "zh" ? "title 必填" : "title required"; return; }
  $("#create-result").className = "result muted"; $("#create-result").textContent = STATE.lang === "zh" ? "创建中…" : "creating…";
  submitCreate.busy = true; $("#create-submit").disabled = true;
  try {
    const data = await api(`/api/boards/${encodeURIComponent(board)}/create`, { method: "POST", body: JSON.stringify(payload) });
    $("#create-result").className = "result ok"; $("#create-result").textContent = `✓ ${STATE.lang === "zh" ? "已创建" : "created"} ${JSON.stringify(data.task).slice(0, 400)}`;
    await fetchBoard(board);
    const newId = data.task?.id; if (newId) openDrawer(board, newId);
    $("#create-dialog").close();
    $("#create-dialog form").reset();
    $("#create-result").textContent = "";
    notify(t("workspace.createdSuccess"));
  } catch (e) { $("#create-result").className = "result err"; $("#create-result").textContent = `${STATE.lang === "zh" ? "失败" : "failed"}: ${JSON.stringify(e)}`; }
  finally { submitCreate.busy = false; $("#create-submit").disabled = false; }
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
    tip.textContent = text;
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
  document.addEventListener("focusin", e => { const el = e.target.closest?.("[data-tip]"); if (el) show(el); });
  document.addEventListener("focusout", hide);
}

// ── wiring ───────────────────────────────────────────────────────────────────
function wire() {
  wireWorkspace();
  wireBoards();
  wireSwarm();
  $$('button[value="close"]').forEach(button => {
    button.type = "button";
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  $("#create-submit").type = "submit";
  $("#swarm-submit").type = "submit";
  $("#create-dialog form").addEventListener("submit", event => { event.preventDefault(); submitCreate(); });
  $("#swarm-dialog form").addEventListener("submit", event => { event.preventDefault(); submitSwarm(); });
  $("#task-drawer form").addEventListener("submit", event => event.preventDefault());
  $("#refresh-btn").addEventListener("click", refreshAll);
  $("#clear-events").addEventListener("click", () => { $("#event-list").innerHTML = ""; $("#event-empty").hidden = false; });
  $("#pause-events").addEventListener("click", (e) => {
    STATE.pauseEvents = !STATE.pauseEvents;
    e.target.textContent = STATE.pauseEvents ? (STATE.lang === "zh" ? "继续" : "Resume") : t("events.pause");
  });
  $("#search").addEventListener("input", () => filtersChanged());
  $("#filter-status").addEventListener("change", () => filtersChanged());
  $("#filter-assignee").addEventListener("change", () => filtersChanged());
  $("#toggle-archived").addEventListener("change", () => filtersChanged(true));
  $("#new-task-btn").addEventListener("click", () => { if (boardInfo(VIEW.board) && !boardInfo(VIEW.board).archived) $("#create-board").value = VIEW.board; $("#create-dialog").showModal(); $("#create-title").focus(); });
  $("#new-swarm-btn").addEventListener("click", () => { prepareSwarmForm(); if (boardInfo(VIEW.board) && !boardInfo(VIEW.board).archived) $("#swarm-board").value = VIEW.board; $("#swarm-dialog").showModal(); $("#swarm-title").focus(); });
  $("#help-btn").addEventListener("click", () => $("#help-dialog").showModal());
  $("#lang-btn").addEventListener("click", toggleLang);
  $("#theme-btn").addEventListener("click", toggleTheme);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !document.querySelector("dialog[open]") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      e.preventDefault();
      if (VIEW.mode === "overview" && matchMedia("(max-width: 820px)").matches) setNavigation(true);
      (VIEW.mode === "overview" ? $("#board-search") : $("#search")).focus();
    }
    if (e.key === "Escape") {
      $("#tooltip").classList.add("hidden");
      if ($("#board-nav").classList.contains("is-open")) { setNavigation(false); $("#nav-toggle").focus(); }
      else if (VIEW.activity && !document.querySelector("dialog[open]")) { toggleActivity(false); $("#activity-toggle").focus(); }
    }
  });
  $$(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  $$("button[data-action]").forEach((b) => b.addEventListener("click", () => postAction(b.dataset.action)));
  $("#drawer-log-refresh").addEventListener("click", loadDrawerLog);
  $("#drawer-copy-id").addEventListener("click", async () => { if (STATE.open) { try { await navigator.clipboard.writeText(STATE.open.taskId); notify(t("workspace.copied")); } catch { notify(t("workspace.copyFailed")); } } });
  $("#task-drawer").addEventListener("close", () => {
    if (STATE.open) actionDrafts.set(`${STATE.open.board}/${STATE.open.taskId}`, $$("#task-drawer input, #task-drawer textarea").map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]));
    STATE.open = null; drawerRequest++;
  });
  $$(".tabs button").forEach(button => { const name = { overview: "panel", comments: "help", events: "activity", log: "workflow", actions: "grid" }[button.dataset.tab]; button.firstElementChild.innerHTML = icon(name); });
}

(async () => {
  applyTheme();
  wire();
  initTooltip();
  try {
    await loadConfig();
    applyI18n();
    workspaceLanguageChanged();
    await refreshTasks();
    connectSSE();
  } catch (e) {
    document.body.insertAdjacentHTML("afterbegin",
      `<div class="result err" style="margin:12px">init failed: ${esc(JSON.stringify(e))}。若启用了 token,请把 <code>?token=XXX</code> 加到 URL。</div>`);
  }
})();
