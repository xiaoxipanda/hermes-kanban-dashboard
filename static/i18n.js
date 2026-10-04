// Hermes Kanban Dashboard — i18n strings
window.I18N = {
  zh: {
    "brand.sub": "· 实时看板",
    "search.ph": "搜索卡片（id / 标题 / 正文 / assignee）  —  按 /",
    "search.tip": "在已加载的卡片里按 id / 标题 / 正文 / assignee 关键词模糊匹配。快捷键 /",
    "filter.status": "状态",
    "filter.status.tip": "仅显示指定状态的卡（running / ready / review / blocked / todo / scheduled / triage / done / archived）",
    "filter.assignee": "Assignee",
    "filter.assignee.tip": "仅显示该 profile 名下的卡",
    "filter.archived": "含归档",
    "filter.archived.tip": "勾选后重新拉取时带 --archived，把已归档的卡也拉回来",
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
    "filter.status.tip": "Show only cards in this status",
    "filter.assignee": "Assignee",
    "filter.assignee.tip": "Show only cards under this profile",
    "filter.archived": "Include archived",
    "filter.archived.tip": "Refetch with --archived to include archived cards",
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
