// Navigation and task views. Board identities always come from the CLI API.
function readPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function savePreference(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
}
const savedView = readPreference("hk.workspace", {});
const VIEW = {
  mode: savedView.mode === "overview" ? "overview" : "board",
  board: typeof savedView.board === "string" ? savedView.board : null,
  favorites: new Set(Array.isArray(savedView.favorites) ? savedView.favorites : []),
  filters: new Map(Object.entries(savedView.filters || {})),
  scroll: new Map(Object.entries(savedView.scroll || {})),
  collapsed: new Map(),
  loaded: new Map(),
  requests: new Map(),
  errors: new Map(),
  activity: false,
  streamState: "connecting",
  refreshBusy: false,
};
const ICONS = {
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  moon: '<path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3h.01"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v9h9M9 6h9v9"/>',
  "folder-plus": '<path d="M3 6h6l2 2h10v11H3Z"/><path d="M12 11v5m-2.5-2.5h5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.grid}</svg>`; }
function installIcons() { $$("[data-icon]").forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function boardInfo(slug) { return STATE.boards.find(b => b.slug === slug); }
function statusLabel(status) { return window.I18N?.[STATE.lang]?.[`status.${status}`] || status; }
function viewBoards() {
  if (VIEW.mode === "overview") return [];
  return VIEW.board && boardInfo(VIEW.board) ? [VIEW.board] : [];
}
function filterKey() { return VIEW.board || ""; }
function captureFilters() {
  return { q: $("#search").value, status: $("#filter-status").value, assignee: $("#filter-assignee").value, archived: $("#toggle-archived").checked };
}
function persistView() {
  if (VIEW.mode !== "overview") VIEW.filters.set(filterKey(), captureFilters());
  $$("[data-columns-for]").forEach(el => VIEW.scroll.set(el.dataset.columnsFor, { top: el.scrollTop, left: el.scrollLeft }));
  savePreference("hk.workspace", { mode: VIEW.mode, board: VIEW.board, favorites: [...VIEW.favorites], filters: Object.fromEntries(VIEW.filters), scroll: Object.fromEntries(VIEW.scroll) });
}
function restoreFilters() {
  const f = VIEW.filters.get(filterKey()) || {};
  $("#search").value = typeof f.q === "string" ? f.q : "";
  $("#filter-status").value = f.status || "";
  $("#filter-assignee").value = f.assignee || "";
  $("#toggle-archived").checked = !!f.archived;
}
function stableHTML(el, html) {
  if (el.innerHTML === html) return;
  const focus = el.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
  el.innerHTML = html;
  if (focus) el.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
}
function boardCounts(b) {
  const counts = b.counts || {};
  return { running: counts.running || 0, blocked: counts.blocked || 0, review: counts.review || 0, done: counts.done || 0,
    total: Math.max(0, Number(b.total || 0) - Number(counts.archived || 0)) };
}
function boardMark(b) {
  let hash = 0;
  for (const ch of b.slug) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  return `<span class="board-avatar avatar-${hash % 4}" aria-hidden="true">${esc(Array.from((b.name || b.slug).trim())[0]?.toUpperCase() || "?")}</span>`;
}
function visibleNavigationBoards() {
  const query = $("#board-search").value.trim().toLowerCase();
  const scope = $("#board-scope").value;
  return STATE.boards.filter(b => (scope === "archived" ? b.archived : !b.archived))
    .filter(b => scope !== "favorites" || VIEW.favorites.has(b.slug))
    .filter(b => `${b.name} ${b.slug}`.toLowerCase().includes(query))
    .sort((a, b) => Number(VIEW.favorites.has(b.slug)) - Number(VIEW.favorites.has(a.slug)));
}
function renderNavigation() {
  const boards = visibleNavigationBoards();
  $("#board-number").textContent = STATE.boards.filter(b => !b.archived).length;
  $("#overview-btn").classList.toggle("selected", VIEW.mode === "overview");
  $("#overview-btn").setAttribute("aria-current", VIEW.mode === "overview" ? "page" : "false");
  stableHTML($("#board-list"), boards.map(b => {
    const c = boardCounts(b), selected = VIEW.mode !== "overview" && VIEW.board === b.slug;
    return `<div class="nav-board ${selected ? "selected" : ""}">
      <button class="board-link" data-open-board="${esc(b.slug)}" data-focus="nav:${esc(b.slug)}" aria-current="${selected ? "page" : "false"}" title="${esc(b.name || b.slug)}">
        ${boardMark(b)}<span class="nav-board-name">${esc(b.name || b.slug)}</span>
        ${c.blocked ? `<span class="attention-number" aria-label="${esc(statusLabel("blocked"))} ${c.blocked}">${c.blocked}</span>` : c.running ? `<span class="running-dot" aria-label="${esc(statusLabel("running"))}"></span>` : ""}
      </button>
      <button class="favorite-button ${VIEW.favorites.has(b.slug) ? "is-favorite" : ""}" data-favorite="${esc(b.slug)}" data-focus="fav:${esc(b.slug)}" aria-pressed="${VIEW.favorites.has(b.slug)}" aria-label="${esc(t("workspace.favorite"))} ${esc(b.name || b.slug)}">${icon("star")}</button>
    </div>`;
  }).join("") || `<p class="nav-empty">${t("workspace.noBoards")}</p>`);
}
function renderOverview() {
  const boards = visibleNavigationBoards();
  const totals = boards.reduce((a, b) => { const c = boardCounts(b); for (const k of Object.keys(a)) a[k] += c[k]; return a; }, { running: 0, blocked: 0, review: 0, total: 0 });
  const metrics = ["total", "running", "review", "blocked"].map(s => `<div class="overview-metric"><span>${s === "total" ? t("workspace.tasks") : statusLabel(s)}</span><strong>${totals[s]}</strong></div>`).join("");
  stableHTML($("#overview"), `<div class="overview-metrics">${metrics}</div><div class="overview-grid">${boards.map(b => {
    const c = boardCounts(b);
    return `<button class="overview-card" data-open-board="${esc(b.slug)}" data-focus="overview:${esc(b.slug)}">
      <span class="overview-card-heading">${boardMark(b)}<span><strong>${esc(b.name || b.slug)}</strong><small>${esc(b.archived ? t("workspace.archived") : b.slug)}</small></span>${icon("arrow")}</span>
      <span class="overview-description">${esc(b.description || t("workspace.openBoard"))}</span>
      <span class="overview-counts"><span>${statusLabel("running")} <b>${c.running}</b></span><span>${statusLabel("blocked")} <b>${c.blocked}</b></span><span>${t("workspace.tasks")} <b>${c.total}</b></span></span>
    </button>`;
  }).join("") || `<div class="empty-state"><strong>${t("workspace.noBoards")}</strong><p>${t("workspace.adjustBoardSearch")}</p></div>`}</div>`);
}
function renderWorkspace() {
  const overview = VIEW.mode === "overview", b = boardInfo(VIEW.board);
  $("#workspace-title").textContent = overview ? t("workspace.overview") : (b?.name || b?.slug || t("workspace.overview"));
  $("#workspace-description").textContent = overview ? t("workspace.overviewHint") : (b?.description || t("workspace.boardHint"));
  $("#overview").hidden = !overview;
  $("#boards-wrap").hidden = overview;
  $("#task-toolbar").hidden = overview;
  $("#new-task-btn").disabled = !STATE.boards.some(x => !x.archived) || (!overview && !!b?.archived);
  $("#new-swarm-btn").disabled = $("#new-task-btn").disabled;
  renderNavigation();
  if (overview) renderOverview();
  renderBoardShells();
  renderAllBoards();
}
function setNavigation(open) {
  $("#board-nav").classList.toggle("is-open", open);
  $("#nav-backdrop").hidden = !open;
  $("#nav-toggle").setAttribute("aria-expanded", open);
}
async function selectWorkspace(slug, mode = "board") {
  persistView();
  VIEW.board = slug || VIEW.board;
  VIEW.mode = mode;
  restoreFilters();
  renderWorkspace();
  setNavigation(false);
  persistView();
  connectSSE();
  await refreshTasks();
}
function updateBoardMetadata(boards) {
  STATE.boards = boards || [];
  if (!boardInfo(VIEW.board)) {
    VIEW.board = STATE.boards.find(b => !b.archived)?.slug || STATE.boards[0]?.slug || null;
    if (!VIEW.board) VIEW.mode = "overview";
    restoreFilters();
  }
  populateCreateBoardSelects();
  renderWorkspace();
}
async function loadConfig() {
  const cfg = await api("/api/config");
  STATE.assignees = cfg.assignees || [];
  renderAssigneeList();
  updateBoardMetadata(cfg.boards);
  applyI18n();
  restoreFilters();
  renderWorkspace();
}
function renderAssigneeList() {
  $("#assignee-list").innerHTML = STATE.assignees.map(a => `<option value="${esc(a.name)}"></option>`).join("");
}
function populateCreateBoardSelects() {
  const opts = STATE.boards.filter(b => !b.archived).map(b => `<option value="${esc(b.slug)}">${esc(b.name || b.slug)}</option>`).join("");
  for (const id of ["#create-board", "#swarm-board"]) {
    const previous = $(id).value;
    stableHTML($(id), opts);
    if (STATE.boards.some(b => b.slug === previous && !b.archived)) $(id).value = previous;
  }
}
function renderBoardShells() {
  const slugs = viewBoards();
  const wrap = $("#boards-wrap");
  if (wrap.dataset.boards === JSON.stringify(slugs)) return;
  wrap.dataset.boards = JSON.stringify(slugs);
  wrap.innerHTML = slugs.map(slug => `<article class="board" data-board="${esc(slug)}">
    <header class="board-header"><div class="board-counts" data-count-for="${esc(slug)}"></div></header>
    <div class="swarm-entries" data-swarms-for="${esc(slug)}" hidden></div>
    <div class="columns" data-columns-for="${esc(slug)}"></div></article>`).join("");
}
function matchFilter(task) {
  const f = captureFilters(), status = (task.status || "todo").toLowerCase();
  if (f.status && status !== f.status) return false;
  if (f.assignee && task.assignee !== f.assignee) return false;
  return !f.q.trim() || `${task.id} ${task.title || ""} ${task.body || ""} ${task.assignee || ""}`.toLowerCase().includes(f.q.trim().toLowerCase());
}
function renderFilterFeedback() {
  const f = captureFilters();
  const chips = [["q", f.q.trim()], ["status", f.status && statusLabel(f.status)], ["assignee", f.assignee], ["archived", f.archived && t("filter.archived")]].filter(([, value]) => value);
  $("#active-filters").hidden = VIEW.mode === "overview" || !chips.length;
  stableHTML($("#active-filters"), chips.map(([key, value]) => `<button data-clear-filter="${key}" data-focus="clear:${key}" class="filter-chip">${esc(value)}${icon("close")}</button>`).join("") + `<button class="clear-filters ghost" data-clear-filter="all">${t("workspace.clearFilters")}</button>`);
}
function renderBoard(board) {
  const columnsEl = document.querySelector(`[data-columns-for="${CSS.escape(board)}"]`);
  if (!columnsEl) return;
  const countEl = document.querySelector(`[data-count-for="${CSS.escape(board)}"]`);
  const tasksLoaded = VIEW.loaded.get(board) === $("#toggle-archived").checked;
  if (!tasksLoaded) {
    countEl.textContent = "";
    columnsEl.innerHTML = `<div class="empty-state"><span class="${VIEW.errors.has(board) ? "" : "loading-ring"}" aria-hidden="true"></span><strong>${VIEW.errors.has(board) ? t("workspace.loadFailed") : t("workspace.loading")}</strong>${VIEW.errors.has(board) ? `<button data-retry="${esc(board)}">${t("workspace.retry")}</button>` : ""}</div>`;
    return;
  }
  const all = STATE.tasks[board] || [], tasks = all.filter(matchFilter);
  renderSwarmEntries(board);
  const counts = {};
  for (const task of all) { const s = (task.status || "todo").toLowerCase(); counts[s] = (counts[s] || 0) + 1; }
  const currentStatus = $("#filter-status").value;
  stableHTML(countEl, ["running", "blocked", "review", "done"].map(s =>
    `<button class="count-chip count-chip-${s} ${counts[s] ? "has-count" : "is-zero"}" data-status-filter="${s}" data-focus="count:${esc(board)}:${s}" aria-pressed="${currentStatus === s}" data-tip="count.${s}.tip"><span class="count-dot"></span><span>${statusLabel(s)}</span><strong>${counts[s] || 0}</strong></button>`
  ).join("") + `<span class="count-total">${tasks.length === all.length ? `${all.length} ${t("workspace.items")}` : `${t("workspace.showing")} ${tasks.length} / ${all.length}`}</span>`);
  const scroll = { top: columnsEl.scrollTop, left: columnsEl.scrollLeft };
  const prev = STATE.prevStatus[board] || {}, next = Object.create(null);
  all.forEach(task => { next[task.id] = task.status; });
  const grouped = new Map();
  tasks.forEach(task => { const s = (task.status || "todo").toLowerCase(); if (!grouped.has(s)) grouped.set(s, []); grouped.get(s).push(task); });
  if (!tasks.length) {
    stableHTML(columnsEl, `<div class="empty-state">${icon("search")}<strong>${t(all.length ? "workspace.noMatches" : "workspace.noTasks")}</strong><p>${t(all.length ? "workspace.tryFilters" : "workspace.createFirst")}</p>${all.length ? `<button data-clear-filter="all">${t("workspace.clearFilters")}</button>` : ""}</div>`);
  } else {
    columnsEl.querySelector(".empty-state")?.remove();
    const order = [...STATUS_ORDER, ...[...grouped.keys()].filter(s => !STATUS_ORDER.includes(s))];
    [...columnsEl.children].forEach(el => { if (!grouped.has(el.dataset.status)) el.remove(); });
    for (const status of order) {
      if (!grouped.has(status)) continue;
      const list = grouped.get(status);
      let column = [...columnsEl.children].find(el => el.dataset.status === status);
      if (!column) {
        column = document.createElement("details");
        column.className = `column col-${STATUS_ORDER.includes(status) ? status : "todo"}`;
        column.dataset.status = status;
        column.open = VIEW.collapsed.get(`${board}:${status}`) !== true;
        column.innerHTML = '<summary></summary><div class="column-cards"></div>';
        column.addEventListener("toggle", () => VIEW.collapsed.set(`${board}:${status}`, !column.open));
      }
      if (currentStatus === status) column.open = true;
      stableHTML(column.querySelector("summary"), `<span><span class="column-dot"></span>${esc(statusLabel(status))}</span><span class="n">${list.length}</span>`);
      const container = column.querySelector(".column-cards");
      const existing = new Map([...container.children].map(el => [el.dataset.taskId, el]));
      const liveIds = new Set(list.map(task => task.id));
      existing.forEach((el, id) => { if (!liveIds.has(id)) el.remove(); });
      list.forEach((task, index) => {
        let card = existing.get(task.id);
        if (!card) {
          card = document.createElement("button");
          card.type = "button";
          card.className = "card";
          card.dataset.taskId = task.id;
          card.addEventListener("click", () => openDrawer(board, task.id));
        }
        const time = task.completed_at || task.started_at || task.created_at;
        const timeLabel = t(task.completed_at ? "workspace.finished" : task.started_at ? "workspace.started" : "workspace.created");
        const reason = task.blocked_reason || task.block_reason;
        stableHTML(card, `<span class="card-heading"><span class="task-id">${esc(task.id)}</span>${task.priority > 0 ? `<span class="priority-mark" title="${esc(t("workspace.priority"))}">↑ ${esc(task.priority)}</span>` : ""}</span>
          <span class="title">${esc(task.title || task.id)}</span>
          ${status === "blocked" && reason ? `<span class="block-reason">${esc(reason)}</span>` : ""}
          <span class="foot"><span class="asg"><span class="person-dot" aria-hidden="true"></span>${esc(task.assignee || t("workspace.unassigned"))}</span><span class="meta-time" data-time="${esc(time || "")}" data-time-label="${esc(timeLabel)}" title="${esc(fmt(time))}">${timeLabel} ${esc(fmtRel(time) || "—")}</span></span>`);
        if (prev[task.id] !== undefined && prev[task.id] !== task.status) {
          card.classList.add("flash");
          setTimeout(() => card.classList.remove("flash"), 1200);
        }
        if (container.children[index] !== card) container.insertBefore(card, container.children[index] || null);
      });
      const index = [...grouped.keys()].filter(s => order.indexOf(s) < order.indexOf(status)).length;
      if (columnsEl.children[index] !== column) columnsEl.insertBefore(column, columnsEl.children[index] || null);
    }
  }
  STATE.prevStatus[board] = next;
  const saved = columnsEl.dataset.restored ? scroll : (VIEW.scroll.get(board) || scroll);
  columnsEl.scrollTop = saved.top || 0; columnsEl.scrollLeft = saved.left || 0;
  columnsEl.dataset.restored = "true";
}
function renderAllBoards() {
  viewBoards().forEach(renderBoard);
  renderFilterFeedback();
}
function receiveTasks(slug, tasks, archived) {
  STATE.tasks[slug] = tasks || [];
  VIEW.loaded.set(slug, archived);
  VIEW.errors.delete(slug);
  if (!viewBoards().some(board => VIEW.errors.has(board))) showWorkspaceNotice("");
  renderBoard(slug);
}
async function fetchBoard(slug) {
  const archived = $("#toggle-archived").checked;
  const generation = (VIEW.requests.get(slug) || 0) + 1;
  VIEW.requests.set(slug, generation);
  try {
    const data = await api(`/api/boards/${encodeURIComponent(slug)}/tasks?include_archived=${archived ? 1 : 0}`);
    if (VIEW.requests.get(slug) !== generation || $("#toggle-archived").checked !== archived) return;
    receiveTasks(slug, data.tasks, archived);
  } catch (error) {
    if (VIEW.requests.get(slug) !== generation) return;
    VIEW.errors.set(slug, error);
    renderBoard(slug);
    showWorkspaceNotice(t("workspace.loadFailed"));
  }
}
async function refreshTasks() { for (const slug of viewBoards()) await fetchBoard(slug); }
async function refreshAll() {
  if (VIEW.refreshBusy) return;
  VIEW.refreshBusy = true; $("#refresh-btn").disabled = true;
  try {
    const data = await api("/api/boards");
    updateBoardMetadata(data.boards);
    await refreshTasks();
    if (!viewBoards().some(slug => VIEW.errors.has(slug))) showWorkspaceNotice("");
    $("#last-tick").textContent = `${t("workspace.updated")} ${nowTick()}`;
  } catch { showWorkspaceNotice(t("workspace.loadFailed")); }
  finally { VIEW.refreshBusy = false; $("#refresh-btn").disabled = false; }
}
function showWorkspaceNotice(text) { $("#workspace-notice").textContent = text; $("#workspace-notice").hidden = !text; }
function updateConnection(state) {
  VIEW.streamState = state;
  $("#sse-indicator").className = `dot ${state === "live" ? "on" : "off"}`;
  $("#sse-text").textContent = t(`workspace.${state}`);
}
function connectSSE() {
  STATE.sse?.close();
  const archived = $("#toggle-archived").checked;
  const params = new URLSearchParams({ boards: viewBoards().join(","), include_archived: archived ? "1" : "0", gateway: VIEW.activity ? "1" : "0" });
  const es = new EventSource(withToken(`/api/events?${params}`));
  STATE.sse = es;
  updateConnection("connecting");
  es.onopen = () => { if (STATE.sse === es) updateConnection("live"); };
  es.onerror = event => {
    if (STATE.sse !== es) return;
    if (event.data) { showWorkspaceNotice(t("workspace.loadFailed")); return; }
    updateConnection("reconnecting");
  };
  es.addEventListener("boards", event => {
    if (STATE.sse !== es) return;
    try {
      const before = viewBoards().join(",");
      updateBoardMetadata(JSON.parse(event.data).boards);
      if (before !== viewBoards().join(",")) { connectSSE(); refreshTasks(); }
      $("#last-tick").textContent = `${t("workspace.updated")} ${nowTick()}`;
    } catch (error) { console.error(error); }
  });
  es.addEventListener("tasks", event => {
    if (STATE.sse !== es) return;
    try {
      const data = JSON.parse(event.data);
      if (!viewBoards().includes(data.board)) return;
      const oldTask = STATE.open?.board === data.board ? STATE.tasks[data.board]?.find(x => x.id === STATE.open.taskId) : null;
      VIEW.requests.set(data.board, (VIEW.requests.get(data.board) || 0) + 1);
      receiveTasks(data.board, data.tasks, archived);
      if (STATE.open?.board === data.board) {
        const updated = data.tasks.find(x => x.id === STATE.open.taskId);
        if (JSON.stringify(oldTask) !== JSON.stringify(updated)) $("#drawer-update").hidden = false;
      }
      $("#last-tick").textContent = `${t("workspace.updated")} ${nowTick()}`;
    } catch (error) { console.error(error); }
  });
  es.addEventListener("gateway", event => {
    if (STATE.sse !== es || STATE.pauseEvents || !VIEW.activity) return;
    try { appendEvent(JSON.parse(event.data).line); } catch { /* Malformed log event. */ }
  });
}
function appendEvent(line) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="kind">${nowTick()}</span>${esc(line)}`;
  const list = $("#event-list"), atTop = list.scrollTop < 8, oldHeight = list.scrollHeight;
  list.prepend(li);
  while (list.children.length > 400) list.lastChild.remove();
  if (!atTop) list.scrollTop += list.scrollHeight - oldHeight;
  $("#event-empty").hidden = true;
}
function filtersChanged(refetch = false) {
  persistView(); renderAllBoards();
  if (refetch) { connectSSE(); refreshTasks(); }
}
function toggleActivity(open) {
  VIEW.activity = open;
  $("#activity-panel").hidden = !open;
  $("#activity-toggle").setAttribute("aria-expanded", open);
  connectSSE();
}
function workspaceLanguageChanged() {
  renderWorkspace();
  updateConnection(VIEW.streamState);
  $("#pause-events").textContent = STATE.pauseEvents ? t("workspace.resume") : t("events.pause");
  $("#search").setAttribute("aria-label", t("search.ph"));
  $("#board-search").setAttribute("aria-label", t("workspace.find"));
  $("#theme-btn").setAttribute("aria-label", t("btn.theme.tip"));
  $("#nav-toggle").setAttribute("aria-label", t("workspace.navigation"));
  $("#activity-toggle").setAttribute("aria-label", t("workspace.activity"));
}
function notify(message) {
  const toast = $("#toast");
  toast.textContent = message; toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.hidden = true; }, 3500);
}
function wireWorkspace() {
  installIcons();
  $("#nav-toggle").addEventListener("click", () => setNavigation(!$("#board-nav").classList.contains("is-open")));
  $("#nav-backdrop").addEventListener("click", () => setNavigation(false));
  $("#overview-btn").addEventListener("click", () => selectWorkspace(null, "overview"));
  const navigationSearch = () => { renderNavigation(); if (VIEW.mode === "overview") renderOverview(); };
  $("#board-search").addEventListener("input", navigationSearch);
  $("#board-scope").addEventListener("change", navigationSearch);
  document.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.openBoard) selectWorkspace(target.dataset.openBoard);
    if (target.dataset.favorite) {
      const slug = target.dataset.favorite;
      VIEW.favorites.has(slug) ? VIEW.favorites.delete(slug) : VIEW.favorites.add(slug);
      persistView(); renderNavigation();
      if (VIEW.mode === "overview") renderOverview();
    }
    if (target.dataset.statusFilter) {
      $("#filter-status").value = $("#filter-status").value === target.dataset.statusFilter ? "" : target.dataset.statusFilter;
      filtersChanged();
    }
    if (target.dataset.clearFilter) {
      const f = target.dataset.clearFilter, hadArchived = $("#toggle-archived").checked;
      if (f === "all" || f === "q") $("#search").value = "";
      if (f === "all" || f === "status") $("#filter-status").value = "";
      if (f === "all" || f === "assignee") $("#filter-assignee").value = "";
      if (f === "all" || f === "archived") $("#toggle-archived").checked = false;
      filtersChanged(hadArchived !== $("#toggle-archived").checked);
    }
    if (target.dataset.retry) fetchBoard(target.dataset.retry);
  });
  $("#activity-toggle").addEventListener("click", () => toggleActivity(!VIEW.activity));
  $("#activity-close").addEventListener("click", () => { toggleActivity(false); $("#activity-toggle").focus(); });
  $("#drawer-update").addEventListener("click", () => { if (STATE.open) openDrawer(STATE.open.board, STATE.open.taskId, { keepTab: true }); });
  window.addEventListener("pagehide", persistView);
  setInterval(() => {
    $$("[data-time]").forEach(el => { const value = /^\d+(\.\d+)?$/.test(el.dataset.time) ? Number(el.dataset.time) : el.dataset.time; el.textContent = `${el.dataset.timeLabel} ${fmtRel(value) || "—"}`; });
  }, 30000);
}
