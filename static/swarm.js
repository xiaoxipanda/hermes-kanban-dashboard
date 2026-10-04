// Native Swarm: shared brief -> parallel work -> verification -> synthesis.
let swarmAttempt = null;
let swarmProgress = null;
let swarmTimer = null;
let swarmRequest = 0;
function profileOptions() {
  return `<option value="">${esc(t("swarm.choose"))}</option>` +
    STATE.assignees.filter(a => a.on_disk !== false).map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
}
function addSwarmWorker() {
  const rows = $("#swarm-worker-rows");
  if (rows.children.length >= 16) return;
  const row = document.createElement("div");
  row.className = "swarm-worker-row";
  row.innerHTML = `<label><span>${t("swarm.role")}</span><select class="swarm-profile" required>${profileOptions()}</select></label>
    <label><span>${t("swarm.assignment")}</span><input class="swarm-assignment" required maxlength="400" placeholder="${esc(t("swarm.assignment.ph"))}"></label>
    <button type="button" class="swarm-remove" aria-label="${esc(t("swarm.remove"))}">${icon("close")}</button>`;
  rows.append(row);
  row.querySelector("button").addEventListener("click", () => { row.remove(); updateSwarmPreview(); });
  updateSwarmPreview();
}
function prepareSwarmForm() {
  for (const el of $$("#swarm-dialog select:not(#swarm-board)")) {
    const value = el.value;
    el.innerHTML = profileOptions();
    el.value = value;
  }
  if (!$("#swarm-worker-rows").children.length) addSwarmWorker();
  updateSwarmPreview();
}
function swarmWorkers() {
  return $$(".swarm-worker-row").map(row => ({
    profile: $(".swarm-profile", row).value,
    title: $(".swarm-assignment", row).value.trim(),
  }));
}
function updateSwarmPreview() {
  const workers = swarmWorkers();
  const verifier = $("#swarm-verifier").value, synth = $("#swarm-synth").value;
  $("#swarm-preview").innerHTML = `<div class="swarm-parallel">${workers.map((w, i) =>
    `<div><strong>${i + 1}. ${esc(w.profile || t("swarm.choose"))}</strong><span>${esc(w.title || t("swarm.assignment"))}</span></div>`).join("")}</div>
    <div class="swarm-arrow">↓ ${t("swarm.allDone")}</div>
    <div><strong>${t("swarm.verifier")}</strong><span>${esc(verifier || t("swarm.choose"))}</span></div>
    <div class="swarm-arrow">↓ ${t("swarm.gatePass")}</div>
    <div><strong>${t("swarm.synth")}</strong><span>${esc(synth || t("swarm.choose"))}</span></div>`;
  $("#swarm-role-warning").textContent = verifier && (workers.some(w => w.profile === verifier) || verifier === synth) ? t("swarm.independent") : "";
  $("#swarm-add-worker").disabled = workers.length >= 16;
  $$(".swarm-remove").forEach(el => { el.disabled = workers.length <= 1; });
  $$(".swarm-assignment").forEach(el => el.setCustomValidity(el.value.includes(":") ? t("swarm.colon") : ""));
}
async function submitSwarm() {
  if (submitSwarm.busy) return;
  const form = $("#swarm-dialog form");
  updateSwarmPreview();
  if (!form.reportValidity()) return;
  const board = $("#swarm-board").value;
  const value = id => $(id).value.trim();
  const payload = {
    title: value("#swarm-title"), body: value("#swarm-body"),
    deliverable: value("#swarm-deliverable"), acceptance: value("#swarm-acceptance"),
    workers: swarmWorkers(), verifier_assignee: value("#swarm-verifier"),
    synth_assignee: value("#swarm-synth"), tenant: value("#swarm-tenant") || null,
    priority: Number($("#swarm-priority").value),
  };
  const signature = JSON.stringify([board, payload]);
  // Persist across reloads and network errors so a retry recovers the same graph.
  swarmAttempt = readPreference("hk.swarmAttempt", swarmAttempt);
  if (!swarmAttempt || swarmAttempt.signature !== signature) {
    swarmAttempt = { signature, key: `dashboard-${globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2)}` };
    savePreference("hk.swarmAttempt", swarmAttempt);
  }
  payload.idempotency_key = swarmAttempt.key;
  const result = $("#swarm-result");
  result.className = "result muted"; result.textContent = t("swarm.creating");
  submitSwarm.busy = true;
  const controls = $$("input, textarea, select, button", form);
  const disabled = controls.map(el => el.disabled);
  controls.forEach(el => { el.disabled = true; });
  try {
    const data = await api(`/api/boards/${encodeURIComponent(board)}/swarm`, { method: "POST", body: JSON.stringify(payload) });
    // Commit UI success before any optional refresh: refresh failure must not resubmit.
    savePreference("hk.swarmAttempt", null); swarmAttempt = null;
    $("#swarm-dialog").close();
    form.reset(); $("#swarm-worker-rows").innerHTML = ""; result.textContent = "";
    notify(t("workspace.createdSuccess"));
    await selectWorkspace(board);
    await openSwarmProgress(board, data.swarm.root_id);
  } catch (error) {
    result.className = "result err";
    result.textContent = `${t("swarm.retryHint")} ${JSON.stringify(error.data?.detail || error)}`;
  } finally {
    submitSwarm.busy = false;
    controls.forEach((el, i) => { el.disabled = disabled[i]; });
  }
}
function swarmRootFor(task) {
  if ((task.body || "").startsWith("Kanban Swarm v1 planning/root card.")) return task.id;
  return (task.body || "").match(/Swarm root \/ shared blackboard: `([^`]+)`/)?.[1] || null;
}
function renderSwarmEntries(board) {
  const host = document.querySelector(`[data-swarms-for="${CSS.escape(board)}"]`);
  if (!host) return;
  const roots = (STATE.tasks[board] || []).filter(task => swarmRootFor(task) === task.id);
  host.hidden = !roots.length;
  stableHTML(host, roots.map(root => `<button type="button" data-swarm-root="${esc(root.id)}" data-swarm-board="${esc(board)}" data-focus="swarm:${esc(root.id)}">
    ${icon("workflow")}<span>${esc(root.title)}</span><small>${t("swarm.progress")}</small></button>`).join(""));
}
async function openSwarmProgress(board, root) {
  $("#task-drawer").close();
  swarmProgress = { board, root };
  $("#swarm-progress-content").textContent = t("workspace.loading");
  $("#swarm-progress-dialog").showModal();
  await refreshSwarmProgress();
}
async function refreshSwarmProgress() {
  clearTimeout(swarmTimer);
  if (!swarmProgress || !$("#swarm-progress-dialog").open) return;
  const current = swarmProgress, request = ++swarmRequest;
  $("#swarm-progress-refresh").disabled = true;
  try {
    const data = await api(`/api/swarms/${encodeURIComponent(current.board)}/${encodeURIComponent(current.root)}`);
    if (request !== swarmRequest || swarmProgress !== current) return;
    const phase = t(`swarm.phase.${data.phase}`);
    $("#swarm-progress-title").textContent = data.root.title;
    const row = (card, label) => `<button type="button" class="swarm-progress-card" data-swarm-task="${esc(card.id)}" data-focus="progress:${esc(card.id)}">
      <span><small>${esc(label.replace(/\s*\*$/, ""))} · ${esc(card.assignee || "—")}</small><strong>${esc(card.title || card.id)}</strong>
      ${card.status === "blocked" ? `<span class="block-reason">${esc(card.blocked_reason || card.block_reason || t("swarm.blockHint"))}</span>` : ""}</span>
      <span class="status-pill pill-${esc(card.status)}">${esc(statusLabel(card.status))}</span></button>`;
    stableHTML($("#swarm-progress-content"), `<div class="swarm-progress-summary"><strong>${esc(phase)}</strong><span>${data.completed} / ${data.total} ${t("swarm.completedCards")}</span></div>
      <progress max="${data.total}" value="${data.completed}"></progress>
      ${["blocked", "unverified", "incomplete", "archived"].includes(data.phase) ? `<p class="result err">${t(`swarm.hint.${data.phase}`)}</p>` : ""}
      <h3>${t("swarm.workers")}</h3>${data.cards.slice(0, -2).map(c => row(c, t("swarm.role"))).join("")}
      <div class="swarm-arrow">↓ ${t("swarm.allDone")}</div>${row(data.cards.at(-2), t("swarm.verifier"))}
      <div class="swarm-arrow">↓ ${t("swarm.gatePass")}</div>${row(data.cards.at(-1), t("swarm.synth"))}
      <h3>${t("swarm.output")}</h3><div class="md swarm-output">${md(data.result || t("swarm.noOutput"))}</div>
      <button type="button" class="ghost" data-swarm-task="${esc(current.root)}">${t("swarm.blackboard")}</button>`);
    $("#swarm-progress-status").textContent = `${t("workspace.updated")} ${nowTick()}`;
  } catch (error) {
    if (request === swarmRequest) $("#swarm-progress-status").textContent = `${t("workspace.loadFailed")} ${JSON.stringify(error.data?.detail || error)}`;
  } finally {
    if (request === swarmRequest) {
      $("#swarm-progress-refresh").disabled = false;
      if (swarmProgress && $("#swarm-progress-dialog").open) swarmTimer = setTimeout(refreshSwarmProgress, 10000);
    }
  }
}
function wireSwarm() {
  $("#swarm-add-worker").addEventListener("click", addSwarmWorker);
  $("#swarm-dialog").addEventListener("input", updateSwarmPreview);
  $("#swarm-dialog").addEventListener("cancel", event => { if (submitSwarm.busy) event.preventDefault(); });
  $("#swarm-progress-refresh").addEventListener("click", refreshSwarmProgress);
  $("#swarm-progress-dialog").addEventListener("close", () => { swarmProgress = null; swarmRequest++; clearTimeout(swarmTimer); });
  document.addEventListener("click", event => {
    const group = event.target.closest("[data-swarm-root]");
    if (group) openSwarmProgress(group.dataset.swarmBoard, group.dataset.swarmRoot);
    const task = event.target.closest("[data-swarm-task]");
    if (task && swarmProgress) {
      const board = swarmProgress.board;
      $("#swarm-progress-dialog").close();
      openDrawer(board, task.dataset.swarmTask);
    }
  });
}
