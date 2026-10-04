// Board creation through the native `hermes kanban boards create` command.
let boardSlugTouched = false;
const BOARD_ICON_PRESETS = [
  ["📋", "board.icon.projects"],
  ["🎯", "board.icon.goals"],
  ["🚀", "board.icon.launch"],
  ["💡", "board.icon.ideas"],
  ["🔬", "board.icon.research"],
  ["✍️", "board.icon.writing"],
  ["💻", "board.icon.development"],
  ["📣", "board.icon.marketing"],
  ["⚙️", "board.icon.operations"],
  ["📊", "board.icon.analytics"],
];

function selectBoardIcon(value) {
  $("#board-icon").value = value;
  $$("#board-icon-presets .icon-swatch").forEach(button => {
    const selected = button.dataset.boardIcon === value;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function renderBoardIconPresets() {
  const current = $("#board-icon")?.value || "";
  const presets = $("#board-icon-presets");
  if (!presets) return;
  presets.setAttribute("aria-label", t("board.icon.presets"));
  presets.innerHTML = BOARD_ICON_PRESETS.map(([value, key]) =>
    `<button type="button" class="icon-swatch" data-board-icon="${value}" aria-label="${esc(t(key))}" title="${esc(t(key))}" aria-pressed="${value === current}">${value}</button>`
  ).join("");
}

function suggestedBoardSlug(value) {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .replace(/[-_]{2,}/g, "-")
    .slice(0, 64);
}

function validateBoardForm() {
  const slug = $("#board-slug");
  const workdir = $("#board-workdir");
  slug.setCustomValidity(
    slug.value && !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug.value)
      ? t("board.slug.invalid") : ""
  );
  workdir.setCustomValidity(
    workdir.value.trim() && !workdir.value.trim().startsWith("/")
      ? t("board.workdir.invalid") : ""
  );
}

function prepareBoardForm() {
  $("#board-result").className = "result muted";
  $("#board-result").textContent = "";
  renderBoardIconPresets();
  if (!$("#board-icon").value) selectBoardIcon(BOARD_ICON_PRESETS[0][0]);
  else selectBoardIcon($("#board-icon").value);
  validateBoardForm();
}

async function submitBoard() {
  if (submitBoard.busy) return;
  validateBoardForm();
  const form = $("#board-dialog form");
  if (!form.reportValidity()) return;
  const value = id => $(id).value.trim();
  const payload = {
    slug: value("#board-slug"),
    name: value("#board-name"),
    description: value("#board-description") || null,
    icon: value("#board-icon") || null,
    color: null,
    default_workdir: value("#board-workdir") || null,
  };
  const result = $("#board-result");
  result.className = "result muted";
  result.textContent = t("board.creating");
  submitBoard.busy = true;
  $("#board-submit").disabled = true;
  try {
    const data = await api("/api/boards", { method: "POST", body: JSON.stringify(payload) });
    const catalog = await api("/api/boards");
    updateBoardMetadata(catalog.boards);
    form.reset();
    boardSlugTouched = false;
    result.textContent = "";
    $("#board-dialog").close();
    await selectWorkspace(data.board.slug);
    notify(t("board.created"));
  } catch (error) {
    const detail = error.data?.detail;
    result.className = "result err";
    result.textContent = error.status === 409
      ? t("board.duplicate")
      : `${t("board.failed")}: ${typeof detail === "string" ? detail : JSON.stringify(detail || error)}`;
  } finally {
    submitBoard.busy = false;
    $("#board-submit").disabled = false;
  }
}

function wireBoards() {
  renderBoardIconPresets();
  $("#new-board-btn").addEventListener("click", () => {
    prepareBoardForm();
    $("#board-dialog").showModal();
    $("#board-name").focus();
  });
  $("#board-name").addEventListener("input", event => {
    if (!boardSlugTouched) $("#board-slug").value = suggestedBoardSlug(event.target.value);
    validateBoardForm();
  });
  $("#board-slug").addEventListener("input", event => {
    boardSlugTouched = true;
    event.target.value = event.target.value.toLowerCase();
    validateBoardForm();
  });
  $("#board-workdir").addEventListener("input", validateBoardForm);
  $("#board-icon-presets").addEventListener("click", event => {
    const button = event.target.closest("[data-board-icon]");
    if (button) selectBoardIcon(button.dataset.boardIcon);
  });
  $("#board-dialog form").addEventListener("submit", event => {
    event.preventDefault();
    submitBoard();
  });
}
