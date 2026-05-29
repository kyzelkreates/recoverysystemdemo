// Recovery Monitor System — ui/dashboard.js
// Main dashboard UI composer
// Rule: UI reads state, never mutates. All writes go through core engines.
// NOT a medical device. Monitoring and personal use only.

import { getUserState, setUserState, patchUserState, onStateChange } from "../core/state.js";
import { getFocusTasks, createTask, setTaskStatus, setActiveTask, getActiveTask, onTasksChange, clearCompleted } from "../core/tasks.js";
import { evaluateState, getResetSequence, getActivationTask, reshapeTask, autoBreakTask, getNextSmallestAction } from "../engine/cognitive-engine.js";
import { getSmartRoutine, ROUTINE_META, startRoutineSession, nextRoutineStep, getActiveRoutineSession, cancelRoutineSession, getCurrentRoutineType } from "../engine/routine-engine.js";
import { startTour } from "./tour.js";

// ─────────────────────────────────────────────
// MOUNT POINT
// ─────────────────────────────────────────────

let _mountEl = null;
let _currentView = "focus"; // focus | routines | reset | settings

export function mountDashboard(mountEl) {
  if (!mountEl) throw new Error("[RMS] Mount element not found.");
  _mountEl = mountEl;
  _render();

  onStateChange(() => _render());
  onTasksChange(() => _render());
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────

export function navigate(view) {
  _currentView = view;
  _render();
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_mountEl) return;
  _mountEl.innerHTML = "";
  _mountEl.className = "ndos-app ndos-fade-in";
  _mountEl.appendChild(_buildTopBar());

  const layout = document.createElement("div");
  layout.className = "ndos-layout";
  layout.appendChild(_buildSidebar());

  const main = document.createElement("main");
  main.className = "ndos-main";

  switch (_currentView) {
    case "focus":    main.appendChild(_buildFocusView()); break;
    case "routines": main.appendChild(_buildRoutineView()); break;
    case "reset":    main.appendChild(_buildResetView()); break;
    case "settings": main.appendChild(_buildSettingsView()); break;
    default:         main.appendChild(_buildFocusView());
  }

  main.appendChild(_buildDisclaimer());
  layout.appendChild(main);
  _mountEl.appendChild(layout);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const bar = document.createElement("header");
  bar.className = "ndos-topbar";
  bar.setAttribute("data-tour", "topbar");
  bar.innerHTML = `
    <div class="ndos-topbar__brand">
      <div class="ndos-topbar__brand-dot"></div>
      <span class="ndos-topbar__brand-name">Recovery Monitor</span>
      <span class="ndos-topbar__brand-tag">System</span>
    </div>
    <div class="ndos-topbar__right">
      <div class="ndos-topbar__date">${dateStr}</div>
      <button class="ndos-topbar__help-btn" id="rms-tour-trigger" title="Open guided tour">
        <span class="ndos-topbar__help-icon">?</span>
        <span class="ndos-topbar__help-label">Guide</span>
      </button>
    </div>
  `;

  // Tour trigger
  bar.querySelector("#rms-tour-trigger").addEventListener("click", () => startTour(true));

  return bar;
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

function _buildSidebar() {
  const nav = [
    { id: "focus",    icon: "📊", label: "Recovery Dashboard" },
    { id: "routines", icon: "🔄", label: "Monitoring Panels" },
    { id: "reset",    icon: "⚡", label: "Reset Sessions" },
    { id: "settings", icon: "⚙️", label: "Settings" }
  ];

  const sidebar = document.createElement("aside");
  sidebar.className = "ndos-sidebar";
  sidebar.setAttribute("data-tour", "sidebar");

  const sectionLabel = document.createElement("div");
  sectionLabel.className = "ndos-sidebar__section-label";
  sectionLabel.textContent = "System Navigation";
  sidebar.appendChild(sectionLabel);

  nav.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ndos-nav-item${_currentView === id ? " active" : ""}`;
    btn.setAttribute("data-nav", id);
    btn.innerHTML = `<span class="ndos-nav-item__icon">${icon}</span> ${label}`;
    btn.addEventListener("click", () => navigate(id));
    sidebar.appendChild(btn);
  });

  return sidebar;
}

// ─────────────────────────────────────────────
// FOCUS VIEW — Recovery Dashboard
// ─────────────────────────────────────────────

function _buildFocusView() {
  const state = getUserState();
  const suggestion = evaluateState(state);
  const tasks = getFocusTasks();
  const activeTask = getActiveTask();

  const frag = document.createDocumentFragment();

  // ── Recovery Status Card ───────────────────
  const statusCard = _buildSuggestionCard(suggestion);
  statusCard.setAttribute("data-tour", "status-card");
  frag.appendChild(statusCard);

  // ── Monitoring Metrics ─────────────────────
  const stateBar = _buildStateBar(state);
  stateBar.setAttribute("data-tour", "metrics");
  frag.appendChild(stateBar);

  // ── Recovery Task Board ────────────────────
  const board = document.createElement("section");
  board.className = "ndos-focus-board";
  board.setAttribute("data-tour", "task-board");

  const header = document.createElement("div");
  header.className = "ndos-focus-board__header";
  header.innerHTML = `
    <h2 class="ndos-section-title">📊 Recovery Focus <span class="ndos-section-title__sub ndos-badge ndos-badge--blue">${tasks.length}/3 active</span></h2>
  `;

  const addBtn = document.createElement("button");
  addBtn.className = "ndos-btn ndos-btn--secondary";
  addBtn.textContent = "+ Log session";
  addBtn.addEventListener("click", () => _showAddTaskModal());
  header.appendChild(addBtn);
  board.appendChild(header);

  if (tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ndos-empty";
    empty.innerHTML = `
      <div class="ndos-empty__icon">📋</div>
      <div class="ndos-empty__title">No active sessions</div>
      <div class="ndos-empty__desc">Log up to 3 recovery focus items for today. Small, structured, trackable.</div>
    `;
    board.appendChild(empty);
  } else {
    tasks.forEach((task, i) => {
      board.appendChild(_buildTaskCard(task, i + 1, activeTask?.task_id === task.task_id));
    });

    if (activeTask) {
      const startBtn = document.createElement("button");
      startBtn.className = "ndos-btn ndos-btn--start-now";
      startBtn.innerHTML = `▶ Continue: ${activeTask.task_name}`;
      startBtn.addEventListener("click", () => _showMicroStepView(activeTask));
      board.appendChild(startBtn);
    } else if (tasks.length > 0) {
      const startBtn = document.createElement("button");
      startBtn.className = "ndos-btn ndos-btn--start-now";
      startBtn.innerHTML = `▶ Begin Recovery: ${tasks[0].task_name}`;
      startBtn.addEventListener("click", () => {
        setActiveTask(tasks[0].task_id);
        _showMicroStepView(tasks[0]);
      });
      board.appendChild(startBtn);
    }
  }

  frag.appendChild(board);

  // ── Next Recovery Action ───────────────────
  const nextAction = getNextSmallestAction(activeTask?.task_id);
  const nextDiv = document.createElement("div");
  nextDiv.className = "ndos-suggestion ndos-suggestion--normal";
  nextDiv.setAttribute("data-tour", "next-action");
  nextDiv.innerHTML = `
    <div class="ndos-suggestion__mode">⟶ Recommended next step</div>
    <div class="ndos-suggestion__message">${nextAction}</div>
  `;
  frag.appendChild(nextDiv);

  return frag;
}

// ─────────────────────────────────────────────
// STATE BAR — Monitoring Metrics
// ─────────────────────────────────────────────

function _buildStateBar(state) {
  const bar = document.createElement("div");
  bar.className = "ndos-state-bar";

  const fields = [
    { key: "energy_level",    label: "Recovery Energy",  type: "slider", cls: "energy" },
    { key: "focus_level",     label: "Rest Quality",     type: "slider", cls: "focus" },
    { key: "overwhelm_level", label: "Fatigue Level",    type: "slider", cls: "overwhelm" }
  ];

  fields.forEach(({ key, label, type, cls }) => {
    const item = document.createElement("div");
    item.className = "ndos-state-item";
    item.innerHTML = `
      <div class="ndos-state-item__label">${label}</div>
      <div class="ndos-state-item__value">${state[key]}/10</div>
      <input type="range" min="0" max="10" value="${state[key]}"
             class="ndos-slider ${cls}" data-key="${key}" />
    `;
    bar.appendChild(item);
  });

  // Recovery status selector
  const motItem = document.createElement("div");
  motItem.className = "ndos-state-item";
  motItem.innerHTML = `
    <div class="ndos-state-item__label">Status</div>
    <select class="ndos-select" data-key="motivation_state">
      ${[
        { v: "starting", l: "Initialising" },
        { v: "stuck",    l: "Stalled" },
        { v: "flowing",  l: "In Recovery" },
        { v: "fatigued", l: "Fatigued" }
      ].map(({ v, l }) =>
        `<option value="${v}" ${state.motivation_state === v ? "selected" : ""}>${l}</option>`
      ).join("")}
    </select>
  `;
  bar.appendChild(motItem);

  bar.querySelectorAll("[data-key]").forEach((el) => {
    const event = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(event, () => {
      const val = el.tagName === "INPUT" ? Number(el.value) : el.value;
      patchUserState(el.dataset.key, val);
      if (el.tagName === "INPUT") {
        el.previousElementSibling.textContent = `${val}/10`;
      }
    });
  });

  return bar;
}

// ─────────────────────────────────────────────
// STATUS CARD
// ─────────────────────────────────────────────

function _buildSuggestionCard(suggestion) {
  const severityMap = { high: "high", medium: "medium", low: "normal", none: "normal", flow: "flow" };
  const cls = severityMap[suggestion.severity] || "normal";

  const card = document.createElement("div");
  card.className = `ndos-suggestion ndos-suggestion--${cls} ndos-fade-in`;
  card.innerHTML = `
    <div class="ndos-suggestion__mode">🟢 ${suggestion.mode.replace(/_/g, " ")} — Recovery Status</div>
    <div class="ndos-suggestion__message">${suggestion.message}</div>
    <div class="ndos-suggestion__tip">${suggestion.tip}</div>
    <div class="ndos-suggestion__actions"></div>
  `;

  const actionsEl = card.querySelector(".ndos-suggestion__actions");
  suggestion.actions.forEach(({ label, action }) => {
    const btn = document.createElement("button");
    btn.className = "ndos-btn ndos-btn--secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => _handleSuggestionAction(action));
    actionsEl.appendChild(btn);
  });

  return card;
}

// ─────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────

function _buildTaskCard(task, num, isActive) {
  const statusIcon = { not_started: "○", in_progress: "◐", completed: "●", paused: "⏸" };
  const loadCls    = { low: "green", medium: "amber", high: "red" };

  const card = document.createElement("div");
  card.className = `ndos-task-card${isActive ? " ndos-task-card--active" : ""}${task.status === "completed" ? " ndos-task-card--done" : ""}`;
  card.innerHTML = `
    <div class="ndos-task-card__header">
      <div class="ndos-task-card__num">${num}</div>
      <div class="ndos-task-card__name">${task.task_name}</div>
      <div class="ndos-task-card__status">${statusIcon[task.status] || "○"}</div>
    </div>
    <div class="ndos-task-card__meta">
      <span class="ndos-badge ndos-badge--${loadCls[task.cognitive_load] || "blue"}">${task.estimated_effort} effort</span>
      <span class="ndos-badge">${task.cognitive_load} load</span>
      ${isActive ? '<span class="ndos-badge ndos-badge--blue">▶ Active</span>' : ""}
    </div>
    <div class="ndos-task-card__actions"></div>
  `;

  const actionsEl = card.querySelector(".ndos-task-card__actions");

  if (task.status !== "completed") {
    const startBtn = document.createElement("button");
    startBtn.className = "ndos-btn ndos-btn--primary";
    startBtn.textContent = isActive ? "▶ Continue" : "▶ Begin";
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setActiveTask(task.task_id);
      _showMicroStepView(task);
    });
    actionsEl.appendChild(startBtn);

    const breakBtn = document.createElement("button");
    breakBtn.className = "ndos-btn ndos-btn--secondary";
    breakBtn.textContent = "⚡ Break down";
    breakBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      _showMicroStepView(task);
    });
    actionsEl.appendChild(breakBtn);

    const doneBtn = document.createElement("button");
    doneBtn.className = "ndos-btn ndos-btn--ghost";
    doneBtn.textContent = "✓ Complete";
    doneBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTaskStatus(task.task_id, "completed");
    });
    actionsEl.appendChild(doneBtn);
  }

  return card;
}

// ─────────────────────────────────────────────
// MICRO-STEP MODAL
// ─────────────────────────────────────────────

function _showMicroStepView(task) {
  const steps = reshapeTask(task.task_name);
  const completed = new Set();

  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">⚡ ${task.task_name}</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-modal">✕</button>
    </div>
    <div class="ndos-microstep-view">
      <div class="ndos-microstep-view__title">Recovery steps — broken down</div>
      <ul class="ndos-microstep-list" id="step-list"></ul>
    </div>
    <br>
    <button class="ndos-btn ndos-btn--primary" style="width:100%" id="done-all">✓ Mark session complete</button>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const list = modal.querySelector("#step-list");
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.dataset.index = i;
    li.innerHTML = `
      <div class="ndos-microstep__check" data-check="${i}"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.estimated_time}</div>
    `;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      if (completed.has(i)) { completed.delete(i); li.classList.remove("done"); }
      else { completed.add(i); li.classList.add("done"); }
    });
    list.appendChild(li);
  });

  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  modal.querySelector("#done-all").addEventListener("click", () => {
    setTaskStatus(task.task_id, "completed");
    backdrop.remove();
  });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
}

// ─────────────────────────────────────────────
// ADD SESSION MODAL
// ─────────────────────────────────────────────

function _showAddTaskModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">Log a Recovery Session</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-modal">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="ndos-form-group">
        <label class="ndos-label">Session name</label>
        <input class="ndos-input" id="task-name" placeholder="e.g. Morning recovery block" autofocus />
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Session effort</label>
        <select class="ndos-select" id="task-effort">
          <option value="small">Light (< 30 min)</option>
          <option value="medium" selected>Moderate (30–90 min)</option>
          <option value="large">Deep (> 90 min)</option>
        </select>
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Recovery load</label>
        <select class="ndos-select" id="task-load">
          <option value="low">Low — passive rest</option>
          <option value="medium" selected>Medium — active recovery</option>
          <option value="high">High — intensive reset</option>
        </select>
      </div>
      <button class="ndos-btn ndos-btn--primary" style="width:100%" id="save-task">Add to Recovery Board</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });

  modal.querySelector("#save-task").addEventListener("click", () => {
    const name = modal.querySelector("#task-name").value.trim();
    if (!name) { modal.querySelector("#task-name").focus(); return; }
    createTask({
      task_name:        name,
      estimated_effort: modal.querySelector("#task-effort").value,
      cognitive_load:   modal.querySelector("#task-load").value,
      priority:         getFocusTasks().length + 1
    });
    backdrop.remove();
  });

  modal.querySelector("#task-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") modal.querySelector("#save-task").click();
  });
}

// ─────────────────────────────────────────────
// SUGGESTION ACTIONS
// ─────────────────────────────────────────────

function _handleSuggestionAction(action) {
  switch (action) {
    case "trigger_reset":    navigate("reset"); break;
    case "morning_flow":     navigate("routines"); break;
    case "evening_shutdown": navigate("routines"); break;
    case "breathwork":
      alert("Breathe in 4s → hold 4s → out 6s.\nRepeat 3 times. Then return to monitoring.");
      break;
    case "activation_task":
      alert(`Recovery activation:\n\n${getActivationTask()}\n\nComplete this now — 2–5 minutes.`);
      break;
    case "short_break":
      alert("Take a 5-minute rest break.\nStep away. Move. Return when ready.");
      break;
    case "focus_timer":
      alert("Set a 25-minute recovery timer.\nMinimise distractions.\nBegin your top session.");
      break;
    case "micro_break": {
      const tasks = getFocusTasks();
      if (tasks.length > 0) _showMicroStepView(tasks[0]);
      break;
    }
    case "limit_to_one":
      patchUserState("task_load", "low");
      break;
    case "real_break":
      alert("Take a full rest break — at least 15 minutes.\nStep outside if possible.\nRecovery takes time.");
      break;
    case "start_top_task": {
      const tasks = getFocusTasks();
      if (tasks.length > 0) { setActiveTask(tasks[0].task_id); _showMicroStepView(tasks[0]); }
      break;
    }
    default:
      console.log("[RMS] Action:", action);
  }
}

// ─────────────────────────────────────────────
// MONITORING PANELS VIEW (was: Routines)
// ─────────────────────────────────────────────

function _buildRoutineView() {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "monitoring-title");
  title.innerHTML = "🔄 Monitoring Panels <span class='ndos-section-title__sub'>Structured recovery cycles</span>";
  frag.appendChild(title);

  const blocks = document.createElement("div");
  blocks.className = "ndos-routine-blocks";
  blocks.setAttribute("data-tour", "monitoring-blocks");

  const types = ["morning_flow", "midday_reset", "evening_shutdown"];
  const current = getCurrentRoutineType();

  // Rebrand the routine labels for recovery context
  const recoveryLabels = {
    morning_flow:      { emoji: "🌅", label: "Morning Recovery",  description: "Initialise your recovery cycle and set the day's monitoring baseline." },
    midday_reset:      { emoji: "⚡", label: "Midday Reset",       description: "Mid-cycle check-in and performance reset. Re-calibrate your recovery state." },
    evening_shutdown:  { emoji: "🌙", label: "Evening Wind-Down",  description: "Close the recovery cycle. Log progress, reduce stimulation, prepare for rest." }
  };

  types.forEach((type) => {
    const meta = ROUTINE_META[type];
    const rLabel = recoveryLabels[type];
    const { steps } = getSmartRoutine(type);
    const totalMin = steps.reduce((sum, s) => sum + (s.duration_min || 2), 0);

    const block = document.createElement("div");
    block.className = `ndos-routine-block ndos-routine-block--${type.split("_")[0]}${type === current ? " active" : ""}`;
    block.innerHTML = `
      <div class="ndos-routine-block__emoji">${rLabel.emoji}</div>
      <div class="ndos-routine-block__name">${rLabel.label}</div>
      <div class="ndos-routine-block__desc">${rLabel.description}</div>
      <div class="ndos-routine-block__steps">${steps.length} steps · ~${totalMin} min</div>
    `;
    block.addEventListener("click", () => _showRoutineSession(type, rLabel));
    blocks.appendChild(block);
  });

  frag.appendChild(blocks);

  // Current cycle detail
  const { type, steps } = getSmartRoutine();
  const rLabel = recoveryLabels[type];

  const detail = document.createElement("div");
  detail.className = "ndos-microstep-view";
  detail.setAttribute("data-tour", "cycle-detail");
  detail.innerHTML = `
    <div class="ndos-microstep-view__title">${rLabel.emoji} ${rLabel.label} — active now</div>
    <ul class="ndos-microstep-list" id="routine-steps"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" id="start-routine">Begin ${rLabel.label}</button>
  `;

  const list = detail.querySelector("#routine-steps");
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `
      <div class="ndos-microstep__check"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.duration_min} min</div>
    `;
    list.appendChild(li);
  });

  detail.querySelector("#start-routine").addEventListener("click", () => _showRoutineSession(type, rLabel));
  frag.appendChild(detail);

  return frag;
}

// ─────────────────────────────────────────────
// ROUTINE / CYCLE SESSION MODAL
// ─────────────────────────────────────────────

function _showRoutineSession(type, rLabel) {
  const recoveryLabels = {
    morning_flow:      { emoji: "🌅", label: "Morning Recovery" },
    midday_reset:      { emoji: "⚡", label: "Midday Reset" },
    evening_shutdown:  { emoji: "🌙", label: "Evening Wind-Down" }
  };

  const session = startRoutineSession(type);
  const label = rLabel || recoveryLabels[type] || { emoji: "🔄", label: "Recovery Cycle" };
  const completed = new Set();

  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">${label.emoji} ${label.label}</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-routine">✕</button>
    </div>
    <ul class="ndos-microstep-list" id="routine-session-list"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" style="width:100%" id="complete-routine">✓ Complete cycle</button>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const list = modal.querySelector("#routine-session-list");
  session.steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `
      <div class="ndos-microstep__check"></div>
      <div class="ndos-microstep__label">${step.label}</div>
      <div class="ndos-microstep__time">${step.duration_min} min</div>
    `;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      if (completed.has(i)) { completed.delete(i); li.classList.remove("done"); }
      else { completed.add(i); li.classList.add("done"); }
    });
    list.appendChild(li);
  });

  modal.querySelector("#close-routine").addEventListener("click", () => { cancelRoutineSession(); backdrop.remove(); });
  modal.querySelector("#complete-routine").addEventListener("click", () => { backdrop.remove(); });
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) { cancelRoutineSession(); backdrop.remove(); } });
}

// ─────────────────────────────────────────────
// RESET SESSION VIEW
// ─────────────────────────────────────────────

function _buildResetView() {
  const steps = getResetSequence();
  const state = getUserState();

  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "reset-title");
  title.innerHTML = "⚡ Reset Sessions <span class='ndos-section-title__sub'>Structured recovery and system resets</span>";
  frag.appendChild(title);

  const panel = document.createElement("div");
  panel.className = "ndos-reset-panel";
  panel.setAttribute("data-tour", "reset-sequence");
  panel.innerHTML = `
    <div class="ndos-reset-panel__title">🔄 Recovery Reset Sequence</div>
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px;">
      Work through each step in order. Each stage contributes to your reset cycle.
    </p>
  `;

  steps.forEach((step) => {
    const div = document.createElement("div");
    div.className = "ndos-reset-step";
    div.innerHTML = `
      <div class="ndos-reset-step__num">${step.step}</div>
      <div class="ndos-reset-step__content">
        <div class="ndos-reset-step__label">${step.label}</div>
        <div class="ndos-reset-step__time">${Math.round(step.duration_sec / 60)} min</div>
      </div>
    `;
    panel.appendChild(div);
  });

  frag.appendChild(panel);

  // Recovery activation
  const activationDiv = document.createElement("div");
  activationDiv.className = "ndos-suggestion ndos-suggestion--normal";
  activationDiv.setAttribute("data-tour", "reset-activation");
  activationDiv.innerHTML = `
    <div class="ndos-suggestion__mode">⚡ Reset activation — 2–5 minutes</div>
    <div class="ndos-suggestion__message" id="activation-msg">${getActivationTask()}</div>
    <button class="ndos-btn ndos-btn--secondary" id="new-activation" style="margin-top:12px">Try a different prompt</button>
  `;
  activationDiv.querySelector("#new-activation").addEventListener("click", () => {
    activationDiv.querySelector("#activation-msg").textContent = getActivationTask();
  });
  frag.appendChild(activationDiv);

  // Recovery state update
  const stuckDiv = document.createElement("div");
  stuckDiv.className = "ndos-suggestion ndos-suggestion--medium";
  stuckDiv.innerHTML = `
    <div class="ndos-suggestion__mode">Update recovery status</div>
    <div class="ndos-suggestion__message">What is your current recovery state?</div>
    <div class="ndos-suggestion__actions">
      ${[
        { v: "starting", l: "Initialising" },
        { v: "stuck",    l: "Stalled" },
        { v: "flowing",  l: "In Recovery" },
        { v: "fatigued", l: "Fatigued" }
      ].map(({ v, l }) =>
        `<button class="ndos-btn ndos-btn--secondary${state.motivation_state === v ? " active" : ""}"
         data-mot="${v}">${l}</button>`
      ).join("")}
    </div>
  `;
  stuckDiv.querySelectorAll("[data-mot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      patchUserState("motivation_state", btn.dataset.mot);
      stuckDiv.querySelectorAll("[data-mot]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  frag.appendChild(stuckDiv);

  return frag;
}

// ─────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────

function _buildSettingsView() {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "settings-title");
  title.innerHTML = "⚙️ System Settings";
  frag.appendChild(title);

  const card = document.createElement("div");
  card.className = "ndos-suggestion";
  card.setAttribute("data-tour", "settings-session");
  card.innerHTML = `
    <div class="ndos-suggestion__mode">Session management</div>
    <div class="ndos-suggestion__message">Manage logged recovery sessions</div>
    <div class="ndos-suggestion__actions">
      <button class="ndos-btn ndos-btn--secondary" id="clear-completed">Clear completed sessions</button>
    </div>
  `;
  card.querySelector("#clear-completed").addEventListener("click", () => {
    if (confirm("Clear all completed recovery sessions?")) clearCompleted();
  });
  frag.appendChild(card);

  // Tour access from settings
  const tourCard = document.createElement("div");
  tourCard.className = "ndos-suggestion";
  tourCard.setAttribute("data-tour", "settings-tour");
  tourCard.innerHTML = `
    <div class="ndos-suggestion__mode">Recovery Guide AI</div>
    <div class="ndos-suggestion__message">Guided onboarding tour for the Recovery Monitor System</div>
    <div class="ndos-suggestion__tip">
      The Recovery Guide AI will walk you through each section of this dashboard, explain monitoring tools, and help you understand how to use the system effectively.
    </div>
    <div class="ndos-suggestion__actions">
      <button class="ndos-btn ndos-btn--primary" id="launch-tour">Launch Guided Tour</button>
    </div>
  `;
  tourCard.querySelector("#launch-tour").addEventListener("click", () => startTour(true));
  frag.appendChild(tourCard);

  const aboutCard = document.createElement("div");
  aboutCard.className = "ndos-suggestion";
  aboutCard.innerHTML = `
    <div class="ndos-suggestion__mode">About Recovery Monitor System</div>
    <div class="ndos-suggestion__message">A monitoring and visualisation system for recovery, rest, performance, and reset cycles.</div>
    <div class="ndos-suggestion__tip">
      This is a personal monitoring tool for tracking recovery status, rest cycles, and wellness trends.
      It is not a medical device, does not diagnose or treat any condition, and does not replace professional guidance.
    </div>
  `;
  frag.appendChild(aboutCard);

  return frag;
}

// ─────────────────────────────────────────────
// DISCLAIMER
// ─────────────────────────────────────────────

function _buildDisclaimer() {
  const p = document.createElement("p");
  p.className = "ndos-disclaimer";
  p.textContent = "Recovery Monitor System is a personal monitoring tool for recovery and rest cycle tracking. It is not a medical device, does not diagnose or treat any condition, and does not replace professional medical or clinical support.";
  return p;
}
