// Recovery Monitor System — ui/patient.js
// Patient PWA — full recovery dashboard for patients
// All data writes sync to per-patient keys readable by the Clinician Dashboard
// NOT a medical device. Monitoring only.

import {
  initPatients, getPatients, getPatientById,
  getPatientState, getPatientHistory, getPatientTasks,
  getPatientNotes, updatePatientState, updatePatientTasks,
  getActivePatientId, setActivePatientId
} from "../core/patients.js";

import { evaluateState, getActivationTask, getResetSequence, reshapeTask, getNextSmallestAction } from "../engine/cognitive-engine.js";
import { getSmartRoutine, ROUTINE_META, startRoutineSession, cancelRoutineSession, getCurrentRoutineType } from "../engine/routine-engine.js";
import { initTour, startTour } from "./tour.js";

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────

let _root       = null;
let _patientId  = null;
let _view       = "dashboard"; // dashboard | sessions | cycles | reset | notes | settings
let _patients   = [];

document.addEventListener("DOMContentLoaded", () => {
  _root = document.getElementById("rms-patient-root");
  _patients = initPatients();

  // Patient selector: use URL param ?patient=pt-001 or saved selection
  const params = new URLSearchParams(window.location.search);
  const urlPt  = params.get("patient");
  _patientId   = urlPt || getActivePatientId();
  if (urlPt) setActivePatientId(urlPt);

  _render();
  initTour();
});

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_root) return;
  const pt    = getPatientById(_patientId);
  const state = getPatientState(_patientId);

  _root.innerHTML = "";
  _root.className = "rms-pt-app ndos-fade-in";
  _root.appendChild(_buildTopBar(pt, state));

  const layout = document.createElement("div");
  layout.className = "rms-pt-layout";
  layout.appendChild(_buildNav());

  const main = document.createElement("main");
  main.className = "rms-pt-main";

  switch (_view) {
    case "dashboard":  main.appendChild(_buildDashboard(pt, state));   break;
    case "sessions":   main.appendChild(_buildSessions(state));         break;
    case "cycles":     main.appendChild(_buildCycles());                break;
    case "reset":      main.appendChild(_buildReset(state));            break;
    case "notes":      main.appendChild(_buildNotes(pt));               break;
    case "settings":   main.appendChild(_buildSettings(pt));            break;
    default:           main.appendChild(_buildDashboard(pt, state));
  }

  main.appendChild(_buildDisclaimer());
  layout.appendChild(main);
  _root.appendChild(layout);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar(pt, state) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const alertLevel = _alertLevel(state);

  const bar = document.createElement("header");
  bar.className = "ndos-topbar";
  bar.setAttribute("data-tour", "topbar");
  bar.innerHTML = `
    <div class="ndos-topbar__brand">
      <div class="ndos-topbar__brand-dot rms-pt-dot--${alertLevel}"></div>
      <span class="ndos-topbar__brand-name">My Recovery</span>
    </div>
    <div class="ndos-topbar__right">
      <div class="rms-pt-topbar-info">
        <span class="rms-pt-topbar-name">${pt ? pt.name : "Patient"}</span>
        <span class="rms-pt-topbar-time">${dateStr} · ${timeStr}</span>
      </div>
      <button class="ndos-topbar__help-btn" id="rms-pt-tour-btn">
        <span class="ndos-topbar__help-icon">?</span>
        <span class="ndos-topbar__help-label">Guide</span>
      </button>
    </div>
  `;
  bar.querySelector("#rms-pt-tour-btn").addEventListener("click", () => startTour(true));
  return bar;
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────

function _buildNav() {
  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard"  },
    { id: "sessions",  icon: "📋", label: "Sessions"   },
    { id: "cycles",    icon: "🔄", label: "Cycles"     },
    { id: "reset",     icon: "⚡", label: "Reset"      },
    { id: "notes",     icon: "📝", label: "Notes"      },
    { id: "settings",  icon: "⚙️", label: "Settings"   }
  ];

  const aside = document.createElement("aside");
  aside.className = "ndos-sidebar";
  aside.setAttribute("data-tour", "sidebar");

  const lbl = document.createElement("div");
  lbl.className = "ndos-sidebar__section-label";
  lbl.textContent = "Navigation";
  aside.appendChild(lbl);

  nav.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ndos-nav-item${_view === id ? " active" : ""}`;
    btn.setAttribute("data-nav", id);
    btn.innerHTML = `<span class="ndos-nav-item__icon">${icon}</span> ${label}`;
    btn.addEventListener("click", () => { _view = id; _render(); });
    aside.appendChild(btn);
  });

  // Patient switcher (demo)
  if (_patients.length > 1) {
    const divider = document.createElement("div");
    divider.className = "ndos-sidebar__section-label";
    divider.style.marginTop = "16px";
    divider.textContent = "Switch Patient";
    aside.appendChild(divider);

    _patients.forEach(p => {
      const btn = document.createElement("button");
      btn.className = `ndos-nav-item${p.id === _patientId ? " active" : ""}`;
      btn.style.fontSize = "0.78rem";
      btn.innerHTML = `<span class="ndos-nav-item__icon">👤</span> ${p.name.split(" ")[0]}`;
      btn.addEventListener("click", () => {
        _patientId = p.id;
        setActivePatientId(p.id);
        _view = "dashboard";
        _render();
      });
      aside.appendChild(btn);
    });
  }

  return aside;
}

// ─────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────

function _buildDashboard(pt, state) {
  const suggestion = evaluateState(state);
  const tasks      = getPatientTasks(_patientId);
  const history    = getPatientHistory(_patientId);
  const frag       = document.createDocumentFragment();

  // ── Welcome banner ──────────────────────────
  const welcome = document.createElement("div");
  welcome.className = "rms-pt-welcome";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  welcome.innerHTML = `
    <div class="rms-pt-welcome__text">
      <div class="rms-pt-welcome__greeting">${greeting}, ${pt ? pt.name.split(" ")[0] : ""}.</div>
      <div class="rms-pt-welcome__prog">${pt?.programme || "Recovery Programme"}</div>
    </div>
    <div class="rms-pt-welcome__badge rms-pt-badge--${_alertLevel(state)}">
      ${{ ok: "✓ On track", warn: "⚠ Monitor", alert: "⚡ Check in" }[_alertLevel(state)]}
    </div>
  `;
  frag.appendChild(welcome);

  // ── Status card ────────────────────────────
  const statusCard = _buildSuggestionCard(suggestion);
  statusCard.setAttribute("data-tour", "status-card");
  frag.appendChild(statusCard);

  // ── Metrics ────────────────────────────────
  const metricsEl = _buildMetricsBar(state);
  metricsEl.setAttribute("data-tour", "metrics");
  frag.appendChild(metricsEl);

  // ── Session board ──────────────────────────
  const board = _buildSessionBoard(tasks);
  board.setAttribute("data-tour", "task-board");
  frag.appendChild(board);

  // ── Next action ────────────────────────────
  const activeTasks   = tasks.filter(t => t.status === "in_progress");
  const activeTask    = activeTasks[0] || null;
  const nextAction    = getNextSmallestAction(activeTask?.task_id);
  const nextDiv       = document.createElement("div");
  nextDiv.className   = "ndos-suggestion ndos-suggestion--normal";
  nextDiv.setAttribute("data-tour", "next-action");
  nextDiv.innerHTML   = `
    <div class="ndos-suggestion__mode">⟶ Recommended next step</div>
    <div class="ndos-suggestion__message">${nextAction}</div>
  `;
  frag.appendChild(nextDiv);

  return frag;
}

// ─────────────────────────────────────────────
// METRICS BAR
// ─────────────────────────────────────────────

function _buildMetricsBar(state) {
  const bar = document.createElement("div");
  bar.className = "ndos-state-bar";

  const fields = [
    { key: "energy_level",    label: "Recovery Energy", cls: "energy" },
    { key: "focus_level",     label: "Rest Quality",    cls: "focus" },
    { key: "overwhelm_level", label: "Fatigue Level",   cls: "overwhelm" }
  ];

  fields.forEach(({ key, label, cls }) => {
    const item = document.createElement("div");
    item.className = "ndos-state-item";
    item.innerHTML = `
      <div class="ndos-state-item__label">${label}</div>
      <div class="ndos-state-item__value" id="val-${key}">${state[key]}/10</div>
      <input type="range" min="0" max="10" value="${state[key]}"
             class="ndos-slider ${cls}" data-key="${key}" />
    `;
    bar.appendChild(item);
  });

  // Status selector
  const statuses = [
    { v: "starting", l: "Initialising" },
    { v: "stuck",    l: "Stalled" },
    { v: "flowing",  l: "In Recovery" },
    { v: "fatigued", l: "Fatigued" }
  ];

  const motItem = document.createElement("div");
  motItem.className = "ndos-state-item";
  motItem.innerHTML = `
    <div class="ndos-state-item__label">Status</div>
    <select class="ndos-select" data-key="motivation_state">
      ${statuses.map(({ v, l }) =>
        `<option value="${v}" ${state.motivation_state === v ? "selected" : ""}>${l}</option>`
      ).join("")}
    </select>
  `;
  bar.appendChild(motItem);

  // Bind — writes to per-patient storage AND syncs to history
  bar.querySelectorAll("[data-key]").forEach((el) => {
    const event = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(event, () => {
      const val = el.tagName === "INPUT" ? Number(el.value) : el.value;
      const current = getPatientState(_patientId);
      const updated = { ...current, [el.dataset.key]: val };
      updatePatientState(_patientId, updated);
      // Update display
      const valEl = bar.querySelector(`#val-${el.dataset.key}`);
      if (valEl && el.tagName === "INPUT") valEl.textContent = `${val}/10`;
    });
  });

  return bar;
}

// ─────────────────────────────────────────────
// SESSION BOARD
// ─────────────────────────────────────────────

function _buildSessionBoard(tasks) {
  const board = document.createElement("section");
  board.className = "ndos-focus-board";

  const header = document.createElement("div");
  header.className = "ndos-focus-board__header";
  header.innerHTML = `
    <h2 class="ndos-section-title">📋 Recovery Sessions
      <span class="ndos-section-title__sub ndos-badge ndos-badge--blue">${tasks.filter(t => t.status !== "completed").length} active</span>
    </h2>
  `;
  const addBtn = document.createElement("button");
  addBtn.className = "ndos-btn ndos-btn--secondary";
  addBtn.textContent = "+ Log session";
  addBtn.addEventListener("click", () => _showAddSessionModal());
  header.appendChild(addBtn);
  board.appendChild(header);

  const focusTasks = tasks.filter(t => t.status !== "completed").slice(0, 3);

  if (tasks.length === 0) {
    board.innerHTML += `
      <div class="ndos-empty">
        <div class="ndos-empty__icon">📋</div>
        <div class="ndos-empty__title">No sessions logged</div>
        <div class="ndos-empty__desc">Log a recovery session to start tracking your progress.</div>
      </div>
    `;
  } else {
    focusTasks.forEach((task, i) => {
      board.appendChild(_buildTaskCard(task, i + 1));
    });

    const activeTask = tasks.find(t => t.status === "in_progress");
    const startTarget = activeTask || focusTasks[0];
    if (startTarget) {
      const startBtn = document.createElement("button");
      startBtn.className = "ndos-btn ndos-btn--start-now";
      startBtn.innerHTML = `▶ ${activeTask ? "Continue: " : "Begin: "}${startTarget.task_name}`;
      startBtn.addEventListener("click", () => _showMicroStepModal(startTarget));
      board.appendChild(startBtn);
    }
  }

  return board;
}

function _buildTaskCard(task, num) {
  const statusIcon = { not_started: "○", in_progress: "◐", completed: "●", paused: "⏸" };
  const loadCls    = { low: "green", medium: "amber", high: "red" };
  const isActive   = task.status === "in_progress";

  const card = document.createElement("div");
  card.className = `ndos-task-card${isActive ? " ndos-task-card--active" : ""}`;
  card.innerHTML = `
    <div class="ndos-task-card__header">
      <div class="ndos-task-card__num">${num}</div>
      <div class="ndos-task-card__name">${task.task_name}</div>
      <div class="ndos-task-card__status">${statusIcon[task.status] || "○"}</div>
    </div>
    <div class="ndos-task-card__meta">
      <span class="ndos-badge ndos-badge--${loadCls[task.cognitive_load] || "blue"}">${task.estimated_effort}</span>
      <span class="ndos-badge">${task.cognitive_load} load</span>
      ${isActive ? '<span class="ndos-badge ndos-badge--blue">▶ Active</span>' : ""}
    </div>
    <div class="ndos-task-card__actions"></div>
  `;

  const actionsEl = card.querySelector(".ndos-task-card__actions");

  const startBtn = document.createElement("button");
  startBtn.className = "ndos-btn ndos-btn--primary";
  startBtn.textContent = isActive ? "▶ Continue" : "▶ Begin";
  startBtn.addEventListener("click", () => {
    _setTaskStatus(task.task_id, "in_progress");
    _showMicroStepModal(task);
  });
  actionsEl.appendChild(startBtn);

  const breakBtn = document.createElement("button");
  breakBtn.className = "ndos-btn ndos-btn--secondary";
  breakBtn.textContent = "⚡ Break down";
  breakBtn.addEventListener("click", () => _showMicroStepModal(task));
  actionsEl.appendChild(breakBtn);

  const doneBtn = document.createElement("button");
  doneBtn.className = "ndos-btn ndos-btn--ghost";
  doneBtn.textContent = "✓ Done";
  doneBtn.addEventListener("click", () => { _setTaskStatus(task.task_id, "completed"); _render(); });
  actionsEl.appendChild(doneBtn);

  return card;
}

// ─────────────────────────────────────────────
// SESSIONS VIEW — full list
// ─────────────────────────────────────────────

function _buildSessions(state) {
  const tasks = getPatientTasks(_patientId);
  const frag  = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "monitoring-title");
  title.innerHTML = "📋 All Recovery Sessions <span class='ndos-section-title__sub'>Track your progress</span>";
  frag.appendChild(title);

  // Stats
  const statsRow = document.createElement("div");
  statsRow.className = "rms-pt-stats-row";
  [
    { label: "Total",     val: tasks.length,                              icon: "📦" },
    { label: "Active",    val: tasks.filter(t=>t.status==="in_progress").length, icon: "▶" },
    { label: "Completed", val: tasks.filter(t=>t.status==="completed").length,   icon: "✅" },
    { label: "Pending",   val: tasks.filter(t=>t.status==="not_started").length, icon: "○" }
  ].forEach(({ label, val, icon }) => {
    const card = document.createElement("div");
    card.className = "rms-pt-stat-card";
    card.innerHTML = `<div class="rms-pt-stat-card__icon">${icon}</div><div class="rms-pt-stat-card__val">${val}</div><div class="rms-pt-stat-card__lbl">${label}</div>`;
    statsRow.appendChild(card);
  });
  frag.appendChild(statsRow);

  const addBtn = document.createElement("button");
  addBtn.className = "ndos-btn ndos-btn--primary";
  addBtn.style.marginBottom = "12px";
  addBtn.textContent = "+ Log new session";
  addBtn.addEventListener("click", () => _showAddSessionModal());
  frag.appendChild(addBtn);

  if (tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ndos-empty";
    empty.innerHTML = `<div class="ndos-empty__icon">📋</div><div class="ndos-empty__title">No sessions yet</div>`;
    frag.appendChild(empty);
  } else {
    tasks.forEach((task, i) => {
      const isDone = task.status === "completed";
      const card = document.createElement("div");
      card.className = `ndos-task-card${task.status === "in_progress" ? " ndos-task-card--active" : ""}${isDone ? " ndos-task-card--done" : ""}`;
      card.innerHTML = `
        <div class="ndos-task-card__header">
          <div class="ndos-task-card__num">${i + 1}</div>
          <div class="ndos-task-card__name">${task.task_name}</div>
          <div class="ndos-task-card__status">${{ not_started:"○", in_progress:"◐", completed:"●", paused:"⏸" }[task.status]||"○"}</div>
        </div>
        <div class="ndos-task-card__meta">
          <span class="ndos-badge">${task.estimated_effort}</span>
          <span class="ndos-badge">${task.cognitive_load} load</span>
          ${!isDone ? `<button class="ndos-btn ndos-btn--ghost" style="font-size:0.8rem;padding:3px 10px">⚡ Steps</button>` : ""}
          ${!isDone ? `<button class="ndos-btn ndos-btn--ghost" style="font-size:0.8rem;padding:3px 10px">✓ Done</button>` : "✅ Completed"}
        </div>
      `;
      const btns = card.querySelectorAll("button");
      if (btns[0]) btns[0].addEventListener("click", () => _showMicroStepModal(task));
      if (btns[1]) btns[1].addEventListener("click", () => { _setTaskStatus(task.task_id, "completed"); _render(); });
      frag.appendChild(card);
    });
  }

  return frag;
}

// ─────────────────────────────────────────────
// CYCLES VIEW (Monitoring Panels)
// ─────────────────────────────────────────────

function _buildCycles() {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "monitoring-blocks");
  title.innerHTML = "🔄 Recovery Cycles <span class='ndos-section-title__sub'>Structured daily cycles</span>";
  frag.appendChild(title);

  const blocks = document.createElement("div");
  blocks.className = "ndos-routine-blocks";

  const recoveryMeta = {
    morning_flow:     { emoji: "🌅", label: "Morning Recovery",  desc: "Initialise your recovery cycle and set the day's baseline." },
    midday_reset:     { emoji: "⚡", label: "Midday Reset",       desc: "Mid-cycle check-in and recalibration." },
    evening_shutdown: { emoji: "🌙", label: "Evening Wind-Down",  desc: "Close the cycle, log progress, prepare for rest." }
  };

  const current = getCurrentRoutineType();

  Object.entries(recoveryMeta).forEach(([type, meta]) => {
    const { steps } = getSmartRoutine(type);
    const totalMin = steps.reduce((s, st) => s + (st.duration_min || 2), 0);
    const block = document.createElement("div");
    block.className = `ndos-routine-block ndos-routine-block--${type.split("_")[0]}${type === current ? " active" : ""}`;
    block.innerHTML = `
      <div class="ndos-routine-block__emoji">${meta.emoji}</div>
      <div class="ndos-routine-block__name">${meta.label}</div>
      <div class="ndos-routine-block__desc">${meta.desc}</div>
      <div class="ndos-routine-block__steps">${steps.length} steps · ~${totalMin} min</div>
    `;
    block.addEventListener("click", () => _showCycleModal(type, meta));
    blocks.appendChild(block);
  });

  frag.appendChild(blocks);

  // Current cycle detail
  const { type, steps } = getSmartRoutine();
  const meta = recoveryMeta[type];
  const detail = document.createElement("div");
  detail.className = "ndos-microstep-view";
  detail.innerHTML = `
    <div class="ndos-microstep-view__title">${meta.emoji} ${meta.label} — recommended now</div>
    <ul class="ndos-microstep-list" id="cycle-steps"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" id="start-cycle">Begin ${meta.label}</button>
  `;
  const list = detail.querySelector("#cycle-steps");
  steps.forEach(step => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `<div class="ndos-microstep__check"></div><div class="ndos-microstep__label">${step.label}</div><div class="ndos-microstep__time">${step.duration_min} min</div>`;
    list.appendChild(li);
  });
  detail.querySelector("#start-cycle").addEventListener("click", () => _showCycleModal(type, meta));
  frag.appendChild(detail);

  return frag;
}

// ─────────────────────────────────────────────
// RESET VIEW
// ─────────────────────────────────────────────

function _buildReset(state) {
  const steps = getResetSequence();
  const frag  = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "reset-title");
  title.innerHTML = "⚡ Reset Sessions <span class='ndos-section-title__sub'>Use when you need a reset</span>";
  frag.appendChild(title);

  const panel = document.createElement("div");
  panel.className = "ndos-reset-panel";
  panel.setAttribute("data-tour", "reset-sequence");
  panel.innerHTML = `
    <div class="ndos-reset-panel__title">🔄 Recovery Reset Sequence</div>
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px;">
      Work through each step in order. Take your time.
    </p>
  `;
  steps.forEach(step => {
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

  const activationDiv = document.createElement("div");
  activationDiv.className = "ndos-suggestion ndos-suggestion--normal";
  activationDiv.innerHTML = `
    <div class="ndos-suggestion__mode">⚡ Activation prompt — 2–5 minutes</div>
    <div class="ndos-suggestion__message" id="activation-msg">${getActivationTask()}</div>
    <button class="ndos-btn ndos-btn--secondary" id="new-activation" style="margin-top:12px">Try another</button>
  `;
  activationDiv.querySelector("#new-activation").addEventListener("click", () => {
    activationDiv.querySelector("#activation-msg").textContent = getActivationTask();
  });
  frag.appendChild(activationDiv);

  // Status update
  const statusDiv = document.createElement("div");
  statusDiv.className = "ndos-suggestion ndos-suggestion--medium";
  statusDiv.innerHTML = `
    <div class="ndos-suggestion__mode">Update your recovery status</div>
    <div class="ndos-suggestion__message">How are you feeling right now?</div>
    <div class="ndos-suggestion__actions">
      ${[{v:"starting",l:"Initialising"},{v:"stuck",l:"Stalled"},{v:"flowing",l:"In Recovery"},{v:"fatigued",l:"Fatigued"}]
        .map(({v,l})=>`<button class="ndos-btn ndos-btn--secondary${state.motivation_state===v?" active":""}" data-mot="${v}">${l}</button>`).join("")}
    </div>
  `;
  statusDiv.querySelectorAll("[data-mot]").forEach(btn => {
    btn.addEventListener("click", () => {
      const current = getPatientState(_patientId);
      updatePatientState(_patientId, { ...current, motivation_state: btn.dataset.mot });
      statusDiv.querySelectorAll("[data-mot]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  frag.appendChild(statusDiv);

  return frag;
}

// ─────────────────────────────────────────────
// NOTES VIEW
// ─────────────────────────────────────────────

function _buildNotes(pt) {
  const notes = getPatientNotes(_patientId);
  const frag  = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.innerHTML = "📝 Clinician Notes <span class='ndos-section-title__sub'>Messages from your care team</span>";
  frag.appendChild(title);

  if (notes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ndos-empty";
    empty.innerHTML = `<div class="ndos-empty__icon">📝</div><div class="ndos-empty__title">No notes yet</div><div class="ndos-empty__desc">Your clinician's notes will appear here.</div>`;
    frag.appendChild(empty);
  } else {
    notes.forEach(n => {
      const card = document.createElement("div");
      card.className = "ndos-suggestion ndos-suggestion--normal";
      card.innerHTML = `
        <div class="ndos-suggestion__mode">📝 ${n.clinician}</div>
        <div class="ndos-suggestion__message">${n.note}</div>
        <div class="ndos-suggestion__tip">${new Date(n.created_at).toLocaleString("en-GB")}</div>
      `;
      frag.appendChild(card);
    });
  }

  return frag;
}

// ─────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────

function _buildSettings(pt) {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ndos-section-title";
  title.setAttribute("data-tour", "settings-title");
  title.innerHTML = "⚙️ Settings";
  frag.appendChild(title);

  // Patient info card
  const infoCard = document.createElement("div");
  infoCard.className = "ndos-suggestion";
  infoCard.innerHTML = `
    <div class="ndos-suggestion__mode">My Recovery Profile</div>
    <div class="ndos-suggestion__message">${pt?.name || "Patient"}</div>
    <div class="ndos-suggestion__tip">
      Programme: ${pt?.programme || "—"}<br>
      Reference: ${pt?.ref || "—"}<br>
      Clinician: ${pt?.clinician || "—"}
    </div>
  `;
  frag.appendChild(infoCard);

  // Tour
  const tourCard = document.createElement("div");
  tourCard.className = "ndos-suggestion";
  tourCard.setAttribute("data-tour", "settings-tour");
  tourCard.innerHTML = `
    <div class="ndos-suggestion__mode">Recovery Guide AI</div>
    <div class="ndos-suggestion__message">Guided tour of this dashboard</div>
    <div class="ndos-suggestion__actions">
      <button class="ndos-btn ndos-btn--primary" id="pt-launch-tour">Launch Tour</button>
    </div>
  `;
  tourCard.querySelector("#pt-launch-tour").addEventListener("click", () => startTour(true));
  frag.appendChild(tourCard);

  // Clear sessions
  const clearCard = document.createElement("div");
  clearCard.className = "ndos-suggestion";
  clearCard.innerHTML = `
    <div class="ndos-suggestion__mode">Session management</div>
    <div class="ndos-suggestion__message">Manage your recovery sessions</div>
    <div class="ndos-suggestion__actions">
      <button class="ndos-btn ndos-btn--secondary" id="pt-clear-done">Clear completed sessions</button>
    </div>
  `;
  clearCard.querySelector("#pt-clear-done").addEventListener("click", () => {
    if (confirm("Clear all completed sessions?")) {
      const tasks = getPatientTasks(_patientId).filter(t => t.status !== "completed");
      updatePatientTasks(_patientId, tasks);
      _render();
    }
  });
  frag.appendChild(clearCard);

  return frag;
}

// ─────────────────────────────────────────────
// SUGGESTION CARD
// ─────────────────────────────────────────────

function _buildSuggestionCard(suggestion) {
  const severityMap = { high: "high", medium: "medium", low: "normal", none: "normal", flow: "flow" };
  const cls = severityMap[suggestion.severity] || "normal";
  const card = document.createElement("div");
  card.className = `ndos-suggestion ndos-suggestion--${cls} ndos-fade-in`;
  card.innerHTML = `
    <div class="ndos-suggestion__mode">🟢 ${suggestion.mode.replace(/_/g," ")} — Recovery Status</div>
    <div class="ndos-suggestion__message">${suggestion.message}</div>
    <div class="ndos-suggestion__tip">${suggestion.tip}</div>
    <div class="ndos-suggestion__actions"></div>
  `;
  const actionsEl = card.querySelector(".ndos-suggestion__actions");
  suggestion.actions.slice(0,3).forEach(({ label, action }) => {
    const btn = document.createElement("button");
    btn.className = "ndos-btn ndos-btn--secondary";
    btn.textContent = label;
    btn.addEventListener("click", () => _handleAction(action));
    actionsEl.appendChild(btn);
  });
  return card;
}

function _handleAction(action) {
  const actions = {
    trigger_reset:    () => { _view = "reset"; _render(); },
    morning_flow:     () => { _view = "cycles"; _render(); },
    evening_shutdown: () => { _view = "cycles"; _render(); },
    breathwork:       () => alert("Breathe in 4s → hold 4s → out 6s. Repeat 3 times."),
    activation_task:  () => alert(`Recovery activation:\n\n${getActivationTask()}\n\nTake 2–5 minutes.`),
    short_break:      () => alert("Take a 5-minute rest break. Step away, move, return when ready."),
    focus_timer:      () => alert("Set a 25-minute recovery timer. Begin your top session."),
    real_break:       () => alert("Take a full rest break — at least 15 minutes."),
    start_top_task:   () => { _view = "sessions"; _render(); },
    continue:         () => { _view = "sessions"; _render(); }
  };
  (actions[action] || (() => {}))();
}

// ─────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────

function _showMicroStepModal(task) {
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
      <div class="ndos-microstep-view__title">Broken into recovery steps</div>
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
    li.innerHTML = `<div class="ndos-microstep__check"></div><div class="ndos-microstep__label">${step.label}</div><div class="ndos-microstep__time">${step.estimated_time}</div>`;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      completed.has(i) ? (completed.delete(i), li.classList.remove("done")) : (completed.add(i), li.classList.add("done"));
    });
    list.appendChild(li);
  });
  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  modal.querySelector("#done-all").addEventListener("click", () => { _setTaskStatus(task.task_id, "completed"); backdrop.remove(); _render(); });
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });
}

function _showAddSessionModal() {
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
        <input class="ndos-input" id="sess-name" placeholder="e.g. Morning mobility session" autofocus />
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Effort level</label>
        <select class="ndos-select" id="sess-effort">
          <option value="small">Light (&lt; 30 min)</option>
          <option value="medium" selected>Moderate (30–90 min)</option>
          <option value="large">Deep (&gt; 90 min)</option>
        </select>
      </div>
      <div class="ndos-form-group">
        <label class="ndos-label">Recovery load</label>
        <select class="ndos-select" id="sess-load">
          <option value="low">Low — passive rest</option>
          <option value="medium" selected>Medium — active recovery</option>
          <option value="high">High — intensive reset</option>
        </select>
      </div>
      <button class="ndos-btn ndos-btn--primary" style="width:100%" id="save-sess">Log Session</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  modal.querySelector("#close-modal").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });
  modal.querySelector("#save-sess").addEventListener("click", () => {
    const name = modal.querySelector("#sess-name").value.trim();
    if (!name) { modal.querySelector("#sess-name").focus(); return; }
    const tasks = getPatientTasks(_patientId);
    tasks.push({
      task_id:          crypto.randomUUID(),
      task_name:        name,
      status:           "not_started",
      estimated_effort: modal.querySelector("#sess-effort").value,
      cognitive_load:   modal.querySelector("#sess-load").value,
      priority:         tasks.length + 1,
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString()
    });
    updatePatientTasks(_patientId, tasks);
    backdrop.remove();
    _render();
  });
  modal.querySelector("#sess-name").addEventListener("keydown", e => { if (e.key === "Enter") modal.querySelector("#save-sess").click(); });
}

function _showCycleModal(type, meta) {
  const session = startRoutineSession(type);
  const completed = new Set();
  const backdrop = document.createElement("div");
  backdrop.className = "ndos-modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "ndos-modal ndos-fade-in";
  modal.innerHTML = `
    <div class="ndos-modal__header">
      <div class="ndos-modal__title">${meta.emoji} ${meta.label}</div>
      <button class="ndos-btn ndos-btn--ghost" id="close-cycle">✕</button>
    </div>
    <ul class="ndos-microstep-list" id="cycle-session-list"></ul>
    <br>
    <button class="ndos-btn ndos-btn--primary" style="width:100%" id="complete-cycle">✓ Complete cycle</button>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  const list = modal.querySelector("#cycle-session-list");
  session.steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "ndos-microstep";
    li.innerHTML = `<div class="ndos-microstep__check"></div><div class="ndos-microstep__label">${step.label}</div><div class="ndos-microstep__time">${step.duration_min} min</div>`;
    li.querySelector(".ndos-microstep__check").addEventListener("click", () => {
      completed.has(i) ? (completed.delete(i), li.classList.remove("done")) : (completed.add(i), li.classList.add("done"));
    });
    list.appendChild(li);
  });
  modal.querySelector("#close-cycle").addEventListener("click", () => { cancelRoutineSession(); backdrop.remove(); });
  modal.querySelector("#complete-cycle").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", e => { if (e.target === backdrop) { cancelRoutineSession(); backdrop.remove(); } });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function _setTaskStatus(task_id, status) {
  const tasks = getPatientTasks(_patientId).map(t =>
    t.task_id === task_id ? { ...t, status, updated_at: new Date().toISOString() } : t
  );
  updatePatientTasks(_patientId, tasks);
}

function _alertLevel(state) {
  if (!state) return "ok";
  if (state.overwhelm_level > 7 || state.energy_level < 2) return "alert";
  if (state.overwhelm_level > 5 || state.energy_level < 4) return "warn";
  return "ok";
}

function _buildDisclaimer() {
  const p = document.createElement("p");
  p.className = "ndos-disclaimer";
  p.textContent = "Recovery Monitor System is a personal monitoring tool. It is not a medical device, does not diagnose or treat any condition, and does not replace professional medical support.";
  return p;
}
