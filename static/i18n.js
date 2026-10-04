// Hermes Kanban Dashboard — i18n strings
window.I18N = {
  zh: {
    "brand.sub": "· 实时看板",
    "search.ph": "搜索卡片（id / 标题 / 正文 / assignee）  —  按 /",
    "search.tip": "在已加载的卡片里按 id / 标题 / 正文 / assignee 关键词模糊匹配。快捷键 /",
    "filter.status": "状态",
    "filter.status.k": "状态",
    "filter.status.tip": "仅显示指定状态的卡（running / ready / review / blocked / todo / scheduled / triage / done / archived）",
    "filter.assignee": "负责人",
    "filter.assignee.k": "负责人",
    "filter.assignee.tip": "仅显示该 profile 名下的卡",
    "filter.archived": "含归档",
    "filter.archived.tip": "勾选后重新拉取时带 --archived，把已归档的卡也拉回来",
    "count.running": "跑",
    "count.running.tip": "running：worker 正在执行",
    "count.blocked": "阻",
    "count.blocked.tip": "blocked：被阻塞中，需要 unblock",
    "count.done": "成",
    "count.done.tip": "done：已完成的卡",
    "count.total.tip": "当前显示 / 看板总卡数（按过滤后 / 全量）",
    "sse.tip": "SSE 实时推送连接状态（绿=live，红=断开）",
    "tick.tip": "最近一次收到看板快照或刷新的时间",
    "btn.new": "新建任务",
    "btn.new.tip": "新建一张普通任务卡。等同 CLI：hermes kanban create",
    "btn.swarm": "Swarm",
    "btn.swarm.tip": "创建 Swarm 工作流：N 个并行 worker → verifier → synthesizer，依赖自动串好。等同 CLI：hermes kanban swarm",
    "btn.refresh.tip": "手动强制重新拉取所有看板的任务列表",
    "btn.lang.tip": "切换语言（中 / EN）",
    "btn.theme.tip": "切换深 / 浅色主题",
    "btn.help.tip": "查看所有按钮和控件的详细说明",

    "events.title": "Gateway 事件流",
    "events.tip": "读取 ~/.hermes/logs/gateway.log 的实时增量，等于网页版 tail -f",
    "events.pause": "暂停",
    "events.pause.tip": "暂停/继续追加新事件行（不会断开 SSE）",
    "events.clear": "清空",
    "events.clear.tip": "清空当前显示的事件行（不影响日志文件）",
    "events.hint": "提示：这是 Hermes Gateway 的实时日志。要看某张卡的 worker 输出，请打开抽屉的「任务日志」 Tab。",

    "drawer.copyid": "复制 id",
    "drawer.copyid.tip": "把这张卡的 t_xxx id 复制到剪贴板",
    "drawer.close.tip": "关闭抽屉",
    "tab.overview": "概览",
    "tab.overview.tip": "任务的 body（Markdown 渲染）",
    "tab.comments": "评论",
    "tab.comments.tip": "所有评论，按时间倒序",
    "tab.events": "事件",
    "tab.events.tip": "Hermes 内核写入的生命周期事件（created/claimed/started/completed/blocked/review_requested 等）",
    "tab.log": "任务日志",
    "tab.log.tip": "该任务 worker 的 stdout/stderr：~/.hermes/kanban/logs/t_xxx.log",
    "tab.actions": "操作",
    "tab.actions.tip": "对这张卡执行写操作：评论/阻塞/解除阻塞/送审/归档/转派",
    "pane.overview.h": "任务说明",
    "pane.comments.h": "评论（最近 30 条）",
    "pane.events.h": "生命周期事件（最近 50 条）",
    "pane.log.h": "Worker 输出",
    "pane.actions.hint": "每项操作等同一次 <code>hermes kanban …</code> CLI 调用，成功后抽屉与看板会自动刷新。",
    "drawer.log.refresh": "刷新日志",
    "drawer.log.refresh.tip": "重新读取日志文件末尾 500 行",

    "act.comment": "追加评论",
    "act.comment.tip": "给卡追加一条评论（支持 Markdown）。相当于留言给 agent 或自己。等同 CLI：hermes kanban comment",
    "act.comment.ph": "评论内容（支持 Markdown）",
    "act.comment.btn": "提交评论",
    "act.unblock": "解除阻塞（Unblock）",
    "act.unblock.tip": "把 blocked 的卡放回 ready / todo。原因会以评论形式记录。等同 CLI：hermes kanban unblock",
    "act.unblock.ph": "解除阻塞的原因（可选）",
    "act.unblock.btn": "Unblock",
    "act.block": "标记阻塞（Block）",
    "act.block.tip": "手动把一张卡标记为 blocked，通常用于暂停正在跑的任务。等同 CLI：hermes kanban block",
    "act.block.ph": "标记阻塞的原因（可选）",
    "act.block.btn": "Block",
    "act.review": "送审（Request Review）",
    "act.review.tip": "把 running 的卡转到 review 状态，移交给 reviewer profile。summary 会写入评审摘要。等同 CLI：hermes kanban request-review",
    "act.review.summary.ph": "实现概要 / 验证说明（可选）",
    "act.review.reviewer.ph": "reviewer profile 名（可选）",
    "act.review.btn": "送审",
    "act.archive": "归档（Archive）",
    "act.archive.tip": "软归档这张卡，可通过「含归档」再翻出来。等同 CLI：hermes kanban archive",
    "act.archive.ph": "归档原因（可选）",
    "act.archive.btn": "归档",
    "act.reassign": "转派（Reassign）",
    "act.reassign.tip": "把卡从一个 profile 转给另一个。若卡正在跑，必须勾「先 reclaim」。等同 CLI：hermes kanban reassign",
    "act.reassign.to.ph": "目标 profile",
    "act.reassign.reason.ph": "转派原因（可选）",
    "act.reassign.reclaim": "先 reclaim",
    "act.reassign.reclaim.tip": "若该卡正在跑，必须勾此项先释放当前 worker 的 claim",
    "act.reassign.btn": "转派",

    "create.title": "新建任务",
    "create.hint": "只有标题是必填，其他字段都是可选的高级参数。等同于 <code>hermes kanban create</code>。",
    "create.sec.required": "必填",
    "create.sec.common": "常用",
    "create.sec.advanced": "高级参数（workspace / 依赖 / 模型覆盖 / 幂等键 等）",
    "create.board": "目标看板",
    "create.board.tip": "任务创建在哪块看板",
    "create.title.l": "标题 *",
    "create.title.ph": "一句话描述任务",
    "create.title.tip": "任务标题（必填）",
    "create.body": "任务说明（Markdown）",
    "create.body.ph": "约束 / 产出要求 / 相关背景",
    "create.body.tip": "任务 body，支持 Markdown",
    "create.assignee": "Assignee",
    "create.assignee.ph": "留空=进 triage",
    "create.assignee.tip": "分派给哪个 profile（例如 research / dev / content）",
    "create.priority": "优先级",
    "create.priority.ph": "默认 0",
    "create.priority.tip": "数字越大越优先，默认 0",
    "create.initial": "初始状态",
    "create.initial.auto": "自动（todo）",
    "create.initial.tip": "任务初始状态：留空=todo；blocked=立即阻塞；running=立即运行",
    "create.tenant.tip": "tenant 命名空间，用于隔离",
    "create.project.tip": "关联到某个项目 id 或 slug",
    "create.workspace.tip": "scratch=临时目录；worktree=git worktree；dir:/path 指定目录",
    "create.branch.tip": "仅 worktree 模式有效：worker 用的 git 分支名",
    "create.maxrun.tip": "超时后 dispatcher 会 SIGTERM 并重排。例如 30m / 2h",
    "create.maxretry.tip": "连续失败多少次后触发熔断",
    "create.model.tip": "强制 worker 用的模型（例如 claude-sonnet-4-5）",
    "create.provider.tip": "强制 provider（例如 anthropic / openai）",
    "create.skills": "Skills（逗号分隔）",
    "create.skills.tip": "强制加载的 skill，逗号分隔",
    "create.parents": "依赖父卡（逗号分隔）",
    "create.parents.tip": "父任务 id，逗号分隔。父任务未完成前本卡不会被调度",
    "create.idem": "Idempotency key",
    "create.idem.tip": "去重键：相同键存在未归档卡则直接返回其 id，不再新建",
    "create.triage": "先进 triage（由 specifier 规范化）",
    "create.triage.tip": "勾选后先进 triage，由 specifier 规范化成 todo 卡",
    "create.submit": "创建任务",

    "swarm.title": "新建 Swarm 工作流",
    "swarm.hint": "Swarm 一次创建 <strong>N 个并行 worker 卡 + 1 个 verifier 卡 + 1 个 synthesizer 卡</strong>，依赖关系自动串好。适合「同一问题跑多路再合并」。等同 <code>hermes kanban swarm</code>。",
    "swarm.board": "目标看板",
    "swarm.title.l": "标题 *",
    "swarm.title.ph": "工作流的总题目",
    "swarm.body": "任务说明（Markdown）",
    "swarm.body.ph": "每个 worker 都会收到这段说明",
    "swarm.workers": "并行 workers",
    "swarm.workers.tip": "同时跑多少路 worker（1-16）",
    "swarm.worker": "Worker profile",
    "swarm.worker.tip": "跑并行子任务的 profile",
    "swarm.verifier": "Verifier profile",
    "swarm.verifier.tip": "负责验证各 worker 结果的 profile",
    "swarm.synth": "Synthesizer profile",
    "swarm.synth.tip": "负责最终合并产出的 profile",
    "swarm.submit": "创建 Swarm",

    "help.title": "页面控件说明",
    "help.ok": "好的",
    "help.content": `
<h4>顶栏</h4>
<ul>
  <li><strong>🔍 搜索</strong>：按 id / 标题 / 正文 / assignee 模糊匹配，纯前端过滤。快捷键 <kbd>/</kbd>。</li>
  <li><strong>状态 / Assignee 下拉</strong>：精筛卡片。</li>
  <li><strong>含归档</strong>：勾选后同时加载已归档卡（--archived）。</li>
  <li><strong>● live 指示灯</strong>：绿=SSE 推送中；红=断开。</li>
  <li><strong>＋ 新建任务</strong>：建普通任务卡。等同 <code>hermes kanban create</code>。</li>
  <li><strong>⚡ Swarm</strong>：建"多 worker → verifier → synthesizer"工作流。</li>
  <li><strong>↻</strong>：强制全量刷新。</li>
  <li><strong>🌐 / 🌙 / ?</strong>：切换语言 / 深浅主题 / 查看说明。</li>
</ul>
<h4>看板主体</h4>
<ul>
  <li>每张卡显示标题 / <code>t_xxx</code> id / assignee / 状态胶囊。点卡=打开抽屉。</li>
  <li>状态变化时卡片会蓝色闪一下。</li>
</ul>
<h4>右侧 Gateway 事件流</h4>
<ul>
  <li>读 <code>~/.hermes/logs/gateway.log</code> 实时增量。</li>
  <li>"暂停/继续"只影响前端追加；"清空"只清前端。</li>
  <li>要看具体某张卡的 worker 输出，打开抽屉的「任务日志」 Tab。</li>
</ul>
<h4>任务抽屉 5 个 Tab</h4>
<ul>
  <li><strong>📄 概览</strong>：任务 body（Markdown 渲染）。</li>
  <li><strong>💬 评论</strong>：所有评论，倒序。</li>
  <li><strong>⚡ 事件</strong>：Hermes 内核生命周期事件。</li>
  <li><strong>📜 任务日志</strong>：读 <code>~/.hermes/kanban/logs/t_xxx.log</code> 末 500 行。</li>
  <li><strong>🛠 操作</strong>：6 个写操作，见下。</li>
</ul>
<h4>操作 Tab 的 6 个按钮</h4>
<ul>
  <li><strong>💬 评论</strong> → <code>kanban comment</code></li>
  <li><strong>▶ Unblock</strong> → <code>kanban unblock</code></li>
  <li><strong>⏸ Block</strong> → <code>kanban block</code></li>
  <li><strong>👀 送审</strong> → <code>kanban request-review</code></li>
  <li><strong>🗄 归档</strong> → <code>kanban archive</code></li>
  <li><strong>🔀 转派</strong> → <code>kanban reassign</code>（正在跑的卡须勾"先 reclaim"）</li>
</ul>
`,
  },

  en: {
    "brand.sub": "· Live Board",
    "search.ph": "Search cards (id / title / body / assignee) — press /",
    "search.tip": "Fuzzy-match loaded cards by id / title / body / assignee. Shortcut: /",
    "filter.status": "Status",
    "filter.status.k": "Status",
    "filter.status.tip": "Show only cards in this status",
    "filter.assignee": "Assignee",
    "filter.assignee.k": "Assignee",
    "filter.assignee.tip": "Show only cards under this profile",
    "filter.archived": "Archived",
    "filter.archived.tip": "Refetch with --archived to include archived cards",
    "count.running": "run",
    "count.running.tip": "running: workers currently executing",
    "count.blocked": "blk",
    "count.blocked.tip": "blocked: needs unblock",
    "count.done": "done",
    "count.done.tip": "done: completed cards",
    "count.total.tip": "Visible / total cards (filtered / all)",
    "sse.tip": "SSE live-push connection (green=live, red=disconnected)",
    "tick.tip": "Last time board snapshot / refresh was received",
    "btn.new": "New Task",
    "btn.new.tip": "Create a plain task card. Maps to: hermes kanban create",
    "btn.swarm": "Swarm",
    "btn.swarm.tip": "Create a Swarm workflow: N parallel workers → verifier → synthesizer. Maps to: hermes kanban swarm",
    "btn.refresh.tip": "Force-refresh all boards",
    "btn.lang.tip": "Switch language (中 / EN)",
    "btn.theme.tip": "Toggle dark / light theme",
    "btn.help.tip": "Show detailed help for every button",

    "events.title": "Gateway Event Stream",
    "events.tip": "Live tail of ~/.hermes/logs/gateway.log",
    "events.pause": "Pause",
    "events.pause.tip": "Pause/resume appending new lines (SSE stays connected)",
    "events.clear": "Clear",
    "events.clear.tip": "Clear displayed lines (log file untouched)",
    "events.hint": "Tip: This is the Gateway log. For per-task worker output, open the drawer's \"Task Log\" tab.",

    "drawer.copyid": "Copy id",
    "drawer.copyid.tip": "Copy this card's t_xxx id to clipboard",
    "drawer.close.tip": "Close drawer",
    "tab.overview": "Overview",
    "tab.overview.tip": "Task body (Markdown rendered)",
    "tab.comments": "Comments",
    "tab.comments.tip": "All comments, newest first",
    "tab.events": "Events",
    "tab.events.tip": "Lifecycle events written by Hermes core",
    "tab.log": "Task Log",
    "tab.log.tip": "Worker stdout/stderr: ~/.hermes/kanban/logs/t_xxx.log",
    "tab.actions": "Actions",
    "tab.actions.tip": "Write ops for this card: comment / block / unblock / request-review / archive / reassign",
    "pane.overview.h": "Task body",
    "pane.comments.h": "Comments (recent 30)",
    "pane.events.h": "Lifecycle events (recent 50)",
    "pane.log.h": "Worker output",
    "pane.actions.hint": "Each action maps to one <code>hermes kanban …</code> CLI call. Drawer & board auto-refresh on success.",
    "drawer.log.refresh": "Refresh log",
    "drawer.log.refresh.tip": "Re-read the last 500 lines",

    "act.comment": "Add comment",
    "act.comment.tip": "Append a comment (Markdown ok). Maps to: hermes kanban comment",
    "act.comment.ph": "Comment body (Markdown)",
    "act.comment.btn": "Submit",
    "act.unblock": "Unblock",
    "act.unblock.tip": "Return a blocked card to ready/todo. Reason stored as comment. Maps to: hermes kanban unblock",
    "act.unblock.ph": "Reason (optional)",
    "act.unblock.btn": "Unblock",
    "act.block": "Block",
    "act.block.tip": "Manually mark a card as blocked. Usually to pause a running task. Maps to: hermes kanban block",
    "act.block.ph": "Reason (optional)",
    "act.block.btn": "Block",
    "act.review": "Request review",
    "act.review.tip": "Move a running card into review and hand off to reviewer. Maps to: hermes kanban request-review",
    "act.review.summary.ph": "Summary / validation notes (optional)",
    "act.review.reviewer.ph": "Reviewer profile (optional)",
    "act.review.btn": "Request review",
    "act.archive": "Archive",
    "act.archive.tip": "Soft-archive the card (can be recovered via \"Include archived\"). Maps to: hermes kanban archive",
    "act.archive.ph": "Reason (optional, saved as comment)",
    "act.archive.btn": "Archive",
    "act.reassign": "Reassign",
    "act.reassign.tip": "Move the card to another profile. If running, must check \"Reclaim first\". Maps to: hermes kanban reassign",
    "act.reassign.to.ph": "Target profile",
    "act.reassign.reason.ph": "Reason (optional)",
    "act.reassign.reclaim": "Reclaim first",
    "act.reassign.reclaim.tip": "Required if the card is currently running — releases the current worker's claim first",
    "act.reassign.btn": "Reassign",

    "create.title": "New Task",
    "create.hint": "Only the title is required. Everything else is optional. Maps to <code>hermes kanban create</code>.",
    "create.sec.required": "Required",
    "create.sec.common": "Common",
    "create.sec.advanced": "Advanced (workspace / deps / model / idempotency)",
    "create.board": "Target board",
    "create.board.tip": "Which board to create on",
    "create.title.l": "Title *",
    "create.title.ph": "One-sentence description",
    "create.title.tip": "Task title (required)",
    "create.body": "Body (Markdown)",
    "create.body.ph": "Constraints / deliverables / context",
    "create.body.tip": "Task body, supports Markdown",
    "create.assignee": "Assignee",
    "create.assignee.ph": "Blank = send to triage",
    "create.assignee.tip": "Profile to assign (e.g. research / dev / content)",
    "create.priority": "Priority",
    "create.priority.ph": "Default 0",
    "create.priority.tip": "Higher number = higher priority",
    "create.initial": "Initial status",
    "create.initial.auto": "Auto (todo)",
    "create.initial.tip": "Blank=todo; blocked=blocked immediately; running=start immediately",
    "create.tenant.tip": "Tenant namespace for isolation",
    "create.project.tip": "Link to a project id or slug",
    "create.workspace.tip": "scratch | worktree | dir:/path",
    "create.branch.tip": "Only for worktree mode",
    "create.maxrun.tip": "e.g. 30m / 2h; dispatcher SIGTERMs on timeout",
    "create.maxretry.tip": "Circuit-break after N consecutive failures",
    "create.model.tip": "Force a model (e.g. claude-sonnet-4-5)",
    "create.provider.tip": "Force a provider",
    "create.skills": "Skills (comma-separated)",
    "create.skills.tip": "Force-load skills, comma-separated",
    "create.parents": "Parents (comma-separated)",
    "create.parents.tip": "Parent task ids; this card won't dispatch until all parents are done",
    "create.idem": "Idempotency key",
    "create.idem.tip": "Dedupe key: same key with an un-archived card returns its id instead of creating a new one",
    "create.triage": "Send to triage first",
    "create.triage.tip": "Specifier will normalize it before it becomes a todo card",
    "create.submit": "Create task",

    "swarm.title": "New Swarm Workflow",
    "swarm.hint": "Swarm creates <strong>N parallel worker cards + 1 verifier card + 1 synthesizer card</strong>, wired as dependencies. Great for \"run the same question multiple ways then merge\". Maps to <code>hermes kanban swarm</code>.",
    "swarm.board": "Target board",
    "swarm.title.l": "Title *",
    "swarm.title.ph": "The question / topic",
    "swarm.body": "Body (Markdown)",
    "swarm.body.ph": "Each worker will receive this body",
    "swarm.workers": "Parallel workers",
    "swarm.workers.tip": "How many parallel workers (1-16)",
    "swarm.worker": "Worker profile",
    "swarm.worker.tip": "Profile for the parallel workers",
    "swarm.verifier": "Verifier profile",
    "swarm.verifier.tip": "Profile that verifies each worker's result",
    "swarm.synth": "Synthesizer profile",
    "swarm.synth.tip": "Profile that merges the final deliverable",
    "swarm.submit": "Create Swarm",

    "help.title": "Help",
    "help.ok": "Got it",
    "help.content": `
<h4>Top bar</h4>
<ul>
  <li><strong>🔍 Search</strong>: fuzzy match by id / title / body / assignee (client-side). Shortcut: <kbd>/</kbd></li>
  <li><strong>Status / Assignee drop-downs</strong>: filter cards.</li>
  <li><strong>Include archived</strong>: refetch with --archived.</li>
  <li><strong>● live dot</strong>: green = SSE live, red = disconnected.</li>
  <li><strong>＋ New Task</strong>: create a plain task card.</li>
  <li><strong>⚡ Swarm</strong>: parallel workers → verifier → synthesizer.</li>
  <li><strong>↻</strong>: force-refresh all boards.</li>
  <li><strong>🌐 / 🌙 / ?</strong>: language / theme / this help.</li>
</ul>
<h4>Board body</h4>
<ul>
  <li>Each card shows title / <code>t_xxx</code> id / assignee / status pill.</li>
  <li>Click to open drawer. Status changes flash the card briefly.</li>
</ul>
<h4>Gateway Event Stream (right)</h4>
<ul>
  <li>Live tail of <code>~/.hermes/logs/gateway.log</code>.</li>
  <li>Pause/Clear only affect the UI; the log file is untouched.</li>
  <li>For per-task output, open the drawer's \"Task Log\" tab.</li>
</ul>
<h4>Drawer tabs</h4>
<ul>
  <li><strong>📄 Overview</strong>: body (Markdown).</li>
  <li><strong>💬 Comments</strong>: newest first.</li>
  <li><strong>⚡ Events</strong>: core lifecycle events.</li>
  <li><strong>📜 Task Log</strong>: last 500 lines of worker stdout/stderr.</li>
  <li><strong>🛠 Actions</strong>: six write ops.</li>
</ul>
<h4>Actions</h4>
<ul>
  <li>💬 Comment → <code>kanban comment</code></li>
  <li>▶ Unblock → <code>kanban unblock</code></li>
  <li>⏸ Block → <code>kanban block</code></li>
  <li>👀 Request review → <code>kanban request-review</code></li>
  <li>🗄 Archive → <code>kanban archive</code></li>
  <li>🔀 Reassign → <code>kanban reassign</code> (check \"Reclaim first\" if the card is running)</li>
</ul>
`,
  },
};
Object.assign(window.I18N.zh, {
  "search.ph": "搜索任务…", "filter.archived": "含归档",
  "workspace.label": "工作空间", "workspace.overview": "全部看板", "workspace.find": "搜索看板…",
  "workspace.scope": "看板范围", "workspace.active": "所有使用中的看板", "workspace.favorites": "收藏的看板",
  "workspace.archived": "已归档看板", "workspace.favorite": "收藏", "workspace.navigation": "打开看板导航",
  "workspace.activity": "活动", "workspace.swarm": "新建工作流", "workspace.eyebrow": "任务中心",
  "workspace.hint": "点击任务查看详情 · / 搜索 · Esc 关闭详情",
  "workspace.overviewHint": "总览各个工作空间，找到下一件值得关注的事。",
  "workspace.boardHint": "关注正在推进的任务，让下一步清晰可见。",
  "workspace.waitEvents": "等待新的活动。任务的执行输出可在详情中查看。",
  "workspace.details": "更多任务信息", "workspace.taskUpdated": "任务有更新，点击加载",
  "workspace.noBoards": "没有符合条件的看板", "workspace.adjustBoardSearch": "试试其他关键词或看板范围。",
  "workspace.openBoard": "打开看板，查看任务与最新进展", "workspace.tasks": "任务", "workspace.items": "项任务",
  "workspace.all": "全部", "workspace.showing": "显示", "workspace.clearFilters": "清除筛选",
  "workspace.loading": "正在加载任务…", "workspace.loadFailed": "暂时无法更新数据，请刷新重试。已加载的内容会保留。",
  "workspace.retry": "重试", "workspace.noMatches": "没有匹配的任务", "workspace.noTasks": "这个看板还没有任务",
  "workspace.tryFilters": "换个关键词，或清除筛选查看全部任务。", "workspace.createFirst": "从右上角的新建任务开始。",
  "workspace.finished": "完成于", "workspace.started": "开始于", "workspace.created": "创建于",
  "workspace.priority": "优先级", "workspace.unassigned": "未分配", "workspace.updated": "更新于",
  "workspace.live": "实时同步", "workspace.connecting": "连接中", "workspace.reconnecting": "重连中",
  "workspace.resume": "继续", "workspace.createdSuccess": "任务已创建", "workspace.copied": "任务 ID 已复制",
  "workspace.copyFailed": "无法复制，请从任务信息中手动复制 ID。",
  "status.running": "运行中", "status.ready": "就绪", "status.review": "待审核", "status.blocked": "阻塞",
  "status.todo": "待办", "status.scheduled": "已排期", "status.triage": "待分派", "status.done": "已完成", "status.archived": "已归档",
  "count.running.tip": "查看运行中的任务；再次点击取消筛选",
  "count.blocked.tip": "查看阻塞的任务；再次点击取消筛选",
  "count.review.tip": "查看待审核的任务；再次点击取消筛选",
  "count.done.tip": "查看已完成的任务；再次点击取消筛选",
  "events.title": "实时活动", "events.hint": "这里显示 Gateway 的新增日志。单个任务的输出请在任务详情中查看。",
  "create.hint": "填写标题即可创建任务，执行设置可在高级参数中调整。",
  "pane.actions.hint": "选择下一步操作，执行结果会显示在下方。",
});
Object.assign(window.I18N.en, {
  "search.ph": "Search tasks…", "filter.archived": "Include archived",
  "workspace.label": "Workspace", "workspace.overview": "All boards", "workspace.find": "Find a board…",
  "workspace.scope": "Board scope", "workspace.active": "All active boards", "workspace.favorites": "Favorites",
  "workspace.archived": "Archived boards", "workspace.favorite": "Favorite", "workspace.navigation": "Open board navigation",
  "workspace.activity": "Activity", "workspace.swarm": "New workflow", "workspace.eyebrow": "Task center",
  "workspace.hint": "Open a task for details · / to search · Esc to close",
  "workspace.overviewHint": "A view across your workspaces. Find what needs your attention.",
  "workspace.boardHint": "Keep work moving, one clear next step at a time.",
  "workspace.waitEvents": "Waiting for new activity. Find worker output in task details.",
  "workspace.details": "More task information", "workspace.taskUpdated": "This task has updates. Click to load.",
  "workspace.noBoards": "No matching boards", "workspace.adjustBoardSearch": "Try a different keyword or board scope.",
  "workspace.openBoard": "Open this board to see tasks and progress", "workspace.tasks": "Tasks", "workspace.items": "tasks",
  "workspace.all": "All", "workspace.showing": "Showing", "workspace.clearFilters": "Clear filters",
  "workspace.loading": "Loading tasks…", "workspace.loadFailed": "Unable to update. Please refresh to retry. Loaded content is preserved.",
  "workspace.retry": "Retry", "workspace.noMatches": "No matching tasks", "workspace.noTasks": "No tasks here yet",
  "workspace.tryFilters": "Try another keyword, or clear your filters.", "workspace.createFirst": "Start with New Task in the top right.",
  "workspace.finished": "Finished", "workspace.started": "Started", "workspace.created": "Created",
  "workspace.priority": "Priority", "workspace.unassigned": "Unassigned", "workspace.updated": "Updated",
  "workspace.live": "Live", "workspace.connecting": "Connecting", "workspace.reconnecting": "Reconnecting",
  "workspace.resume": "Resume", "workspace.createdSuccess": "Task created", "workspace.copied": "Task ID copied",
  "workspace.copyFailed": "Unable to copy. Copy the ID from task information.",
  "status.running": "Running", "status.ready": "Ready", "status.review": "In review", "status.blocked": "Blocked",
  "status.todo": "To do", "status.scheduled": "Scheduled", "status.triage": "Triage", "status.done": "Done", "status.archived": "Archived",
  "count.running.tip": "Filter running tasks. Click again to clear.",
  "count.blocked.tip": "Filter blocked tasks. Click again to clear.",
  "count.review.tip": "Filter tasks in review. Click again to clear.",
  "count.done.tip": "Filter completed tasks. Click again to clear.",
  "events.title": "Live activity", "events.hint": "New Gateway log entries appear here. Open a task for its worker output.",
  "create.hint": "A title is all you need. Adjust execution settings in advanced options.",
  "pane.actions.hint": "Choose the next action. Results appear below.",
});
window.I18N.zh["help.content"] = `<h4>多看板导航</h4><ul><li>左侧搜索看板，星标收藏常用看板；全部看板显示摘要。</li><li>选择看板后，在主区查看和处理该看板的任务。</li><li>状态计数可以点击筛选；筛选标签上的 × 可以清除条件。</li><li>点击分组标题折叠任务；切换看板保留筛选和阅读位置。</li><li>活动面板按需打开。任务收到更新时点击提示加载，不打断阅读。</li></ul>` + window.I18N.zh["help.content"];
window.I18N.en["help.content"] = `<h4>Board navigation</h4><ul><li>Find and favorite boards in the sidebar. All boards shows summaries.</li><li>Select a board to view and manage its tasks in the workspace.</li><li>Click status counts to filter, and remove filter chips to reset.</li><li>Collapse task groups by clicking their heading. Each board remembers filters and scroll position.</li><li>Open Activity when needed. Task updates are offered without interrupting reading.</li></ul>` + window.I18N.en["help.content"];
Object.assign(window.I18N.zh, {
  "workspace.swarm": "新建协作任务", "swarm.title": "新建协作任务",
  "workspace.newBoard": "新建看板", "btn.board.tip": "创建独立的项目看板和任务队列",
  "board.title": "新建看板", "board.name": "显示名称 *", "board.name.ph": "例如：内容增长项目",
  "board.slug": "看板标识 *", "board.slug.ph": "content-growth",
  "board.slug.help": "创建后不可修改，仅使用小写英文、数字、短横线或下划线。",
  "board.slug.invalid": "请使用 1-64 位小写英文、数字、短横线或下划线，且以字母或数字开头。",
  "board.description": "看板说明", "board.description.ph": "这个看板负责哪些项目或业务",
  "board.icon": "图标",
  "board.icon.presets": "预设看板图标", "board.icon.projects": "项目", "board.icon.goals": "目标",
  "board.icon.launch": "启动", "board.icon.ideas": "创意", "board.icon.research": "调研",
  "board.icon.writing": "写作", "board.icon.development": "开发", "board.icon.marketing": "传播",
  "board.icon.operations": "运营", "board.icon.analytics": "分析",
  "board.workdir": "默认工作目录", "board.workdir.ph": "/Volumes/MacDisk/content-growth",
  "board.workdir.invalid": "默认工作目录必须是绝对路径，以 / 开头。",
  "board.submit": "创建并打开", "board.creating": "正在创建看板…",
  "board.created": "看板已创建", "board.duplicate": "该看板标识已存在，请更换标识。",
  "board.failed": "创建失败",
  "btn.refresh": "刷新",
  "btn.swarm.tip": "创建并行分工 → 审核 → 汇总的协作任务",
  "swarm.hint": "将一个明确目标拆成可独立开展的分工，全部完成后交给审核人，再由汇总人产出最终交付物。创建后即可进入调度队列。",
  "swarm.title.l": "本次目标 *", "swarm.title.ph": "例如：制定一人公司首月获客方案",
  "swarm.body": "背景与约束", "swarm.body.ph": "业务背景、预算、资料位置、不能做的事；所有成员共享",
  "swarm.deliverable": "最终交付物 *", "swarm.deliverable.ph": "例如：一份 Markdown 方案，含渠道、预算、排期与指标",
  "swarm.acceptance": "验收标准 *", "swarm.acceptance.ph": "例如：每个建议有依据，总预算不超过 3000 元，排期可执行",
  "swarm.workers": "执行分工（可并行的任务）", "swarm.parallelHint": "每行填写负责人和具体任务。若后一个任务必须等前一个完成，请使用带依赖的普通任务。",
  "swarm.role": "负责人 *", "swarm.assignment": "具体任务 *", "swarm.assignment.ph": "例如：调研三个获客渠道并提供来源",
  "swarm.addWorker": "＋ 添加分工", "swarm.remove": "删除这项分工", "swarm.choose": "选择角色",
  "swarm.verifier": "审核人 *", "swarm.synth": "汇总人 *", "swarm.submit": "创建并进入队列",
  "swarm.preview": "流程预览", "swarm.allDone": "全部执行分工完成后", "swarm.gatePass": "审核通过后",
  "swarm.independent": "建议审核人与执行、汇总角色分开，以便独立检查。",
  "swarm.colon": "任务名称中的英文冒号请改成中文冒号“：”。",
  "swarm.creating": "正在创建协作任务…", "swarm.retryHint": "创建未确认，请保留当前内容重试；相同内容重试会找回同一组任务。",
  "swarm.progress": "查看协作进度", "swarm.progressHint": "进度每 10 秒刷新。主卡用于共享信息；整体进度以执行、审核和汇总子任务为准。排队任务需要该看板的调度器运行且有空闲名额。",
  "swarm.completedCards": "子任务已完成", "swarm.output": "执行结果 / 交接摘要",
  "swarm.noOutput": "暂未产生结果。完成后可在这里查看交接摘要或产物位置。",
  "swarm.blackboard": "打开主卡 / 共享记录", "swarm.blockHint": "打开任务详情，查看原因和日志",
  "swarm.phase.workers": "执行分工中 / 等待调度", "swarm.phase.verifier": "待审核 / 审核中",
  "swarm.phase.synthesis": "待汇总 / 汇总中", "swarm.phase.done": "协作任务已完成",
  "swarm.phase.blocked": "需要处理阻塞", "swarm.phase.unverified": "需要确认审核结论",
  "swarm.phase.incomplete": "任务组不完整", "swarm.phase.archived": "存在已归档的子任务",
  "swarm.hint.blocked": "点击阻塞任务查看原因。补齐资料或权限后，在操作页解除阻塞；有依赖的任务仍会等待前置完成。",
  "swarm.hint.unverified": "审核卡已结束，但未发现 gate=pass 的明确结论。请让审核人确认；不要把汇总输出直接视为验收完成。",
  "swarm.hint.incomplete": "部分子任务未找到，请检查共享记录中的任务 ID。",
  "swarm.hint.archived": "归档不等于交付完成，请核对相关子任务和最终结果。",
});
Object.assign(window.I18N.en, {
  "workspace.swarm": "New collaboration", "swarm.title": "New collaboration",
  "workspace.newBoard": "New board", "btn.board.tip": "Create an independent project board and task queue",
  "board.title": "New board", "board.name": "Display name *", "board.name.ph": "Example: Content Growth",
  "board.slug": "Board slug *", "board.slug.ph": "content-growth",
  "board.slug.help": "Immutable after creation. Use lowercase letters, numbers, hyphens or underscores.",
  "board.slug.invalid": "Use 1-64 lowercase letters, numbers, hyphens or underscores, starting with a letter or number.",
  "board.description": "Description", "board.description.ph": "The project or business scope owned by this board",
  "board.icon": "Icon",
  "board.icon.presets": "Preset board icons", "board.icon.projects": "Projects", "board.icon.goals": "Goals",
  "board.icon.launch": "Launch", "board.icon.ideas": "Ideas", "board.icon.research": "Research",
  "board.icon.writing": "Writing", "board.icon.development": "Development", "board.icon.marketing": "Marketing",
  "board.icon.operations": "Operations", "board.icon.analytics": "Analytics",
  "board.workdir": "Default work directory", "board.workdir.ph": "/Volumes/MacDisk/content-growth",
  "board.workdir.invalid": "The default work directory must be an absolute path starting with /.",
  "board.submit": "Create and open", "board.creating": "Creating board…",
  "board.created": "Board created", "board.duplicate": "That board slug already exists. Choose another slug.",
  "board.failed": "Unable to create board",
  "btn.refresh": "Refresh",
  "btn.swarm.tip": "Create parallel assignments → verification → synthesis",
  "swarm.hint": "Split a concrete goal into independent assignments. Once all finish, verify their outputs and synthesize the final deliverable. Creation makes tasks eligible for dispatch.",
  "swarm.title.l": "Goal *", "swarm.title.ph": "Example: Plan the first month of customer acquisition",
  "swarm.body": "Background and constraints", "swarm.body.ph": "Context, budget, source materials and boundaries shared by every role",
  "swarm.deliverable": "Final deliverable *", "swarm.deliverable.ph": "Example: A Markdown plan with channels, budget, schedule and metrics",
  "swarm.acceptance": "Acceptance criteria *", "swarm.acceptance.ph": "Evidence for every recommendation, within budget, actionable schedule",
  "swarm.workers": "Parallel assignments", "swarm.parallelHint": "Choose a role and a concrete task per row. For sequential work, use regular tasks with dependencies.",
  "swarm.role": "Assignee *", "swarm.assignment": "Assignment *", "swarm.assignment.ph": "Example: Research three acquisition channels with sources",
  "swarm.addWorker": "＋ Add assignment", "swarm.remove": "Remove assignment", "swarm.choose": "Choose a role",
  "swarm.verifier": "Verifier *", "swarm.synth": "Synthesizer *", "swarm.submit": "Create and queue",
  "swarm.preview": "Flow preview", "swarm.allDone": "After all assignments finish", "swarm.gatePass": "After verification passes",
  "swarm.independent": "Use a separate verifier for an independent review.",
  "swarm.colon": "Replace ':' in assignment titles with a full-width colon '：'.",
  "swarm.creating": "Creating collaboration…", "swarm.retryHint": "Creation was not confirmed. Retry without changing the form to recover the same task group.",
  "swarm.progress": "View collaboration", "swarm.progressHint": "Refreshes every 10 seconds. The root is a shared record; progress comes from assignments, verification and synthesis. Queued tasks need an active board dispatcher and available capacity.",
  "swarm.completedCards": "subtasks completed", "swarm.output": "Result / handoff summary",
  "swarm.noOutput": "No output yet. Handoff summaries or artifact locations appear here when available.",
  "swarm.blackboard": "Open root / shared record", "swarm.blockHint": "Open task details for the reason and logs",
  "swarm.phase.workers": "Assignments queued / in progress", "swarm.phase.verifier": "Verification queued / in progress",
  "swarm.phase.synthesis": "Synthesis queued / in progress", "swarm.phase.done": "Collaboration complete",
  "swarm.phase.blocked": "Blocked — action required", "swarm.phase.unverified": "Verification needs confirmation",
  "swarm.phase.incomplete": "Incomplete task group", "swarm.phase.archived": "Some subtasks are archived",
  "swarm.hint.blocked": "Open the blocked task, resolve missing information or access, then unblock it in Actions. Dependencies still apply.",
  "swarm.hint.unverified": "The verifier ended without an explicit gate=pass. Ask the verifier to confirm before accepting the synthesis.",
  "swarm.hint.incomplete": "Some subtasks were not found. Check their IDs in the shared record.",
  "swarm.hint.archived": "Archiving does not establish delivery. Check the relevant subtasks and final output.",
});
