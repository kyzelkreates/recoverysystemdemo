// Recovery Monitor System — ui/clinician.js
// Clinician Dashboard — full patient monitoring, metrics, notes, trends
// NOT a medical device. Clinical monitoring tool only.

import {
  initPatients, getPatients, getPatientById,
  getPatientState, getPatientHistory, getPatientTasks,
  getPatientNotes, addClinicianNote
} from "../core/patients.js";

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────

let _root          = null;
let _patients      = [];
let _selectedId    = null;
let _currentTab    = "overview"; // overview | metrics | sessions | notes | events
let _refreshTimer  = null;

document.addEventListener("DOMContentLoaded", () => {
  _root = document.getElementById("rms-clinician-root");
  _patients = initPatients();
  _selectedId = _patients[0]?.id || null;

  // Live refresh every 5s to pick up patient PWA changes
  _refreshTimer = setInterval(() => { if (_root) _render(); }, 5000);

  window.addEventListener("storage", () => _render());
  _render();
});

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_root) return;
  _root.innerHTML = "";
  _root.className = "rms-cli-app";
  _root.appendChild(_buildHeader());

  const body = document.createElement("div");
  body.className = "rms-cli-body";
  body.appendChild(_buildPatientList());
  body.appendChild(_buildMain());
  _root.appendChild(body);
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────

function _buildHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const h = document.createElement("header");
  h.className = "rms-cli-header";
  h.innerHTML = `
    <div class="rms-cli-header__brand">
      <div class="rms-cli-header__dot"></div>
      <div>
        <div class="rms-cli-header__title">Recovery Monitor System</div>
        <div class="rms-cli-header__sub">Clinician Dashboard</div>
      </div>
    </div>
    <div class="rms-cli-header__right">
      <div class="rms-cli-header__live">
        <span class="rms-cli-live-dot"></span> Live monitoring
      </div>
      <div class="rms-cli-header__datetime">${dateStr} &nbsp;·&nbsp; ${timeStr}</div>
      <div class="rms-cli-header__user">Dr. Sarah Clarke</div>
    </div>
  `;
  return h;
}

// ─────────────────────────────────────────────
// PATIENT LIST (LEFT PANEL)
// ─────────────────────────────────────────────

function _buildPatientList() {
  const patients = getPatients();

  const panel = document.createElement("aside");
  panel.className = "rms-cli-sidebar";

  const label = document.createElement("div");
  label.className = "rms-cli-sidebar__label";
  label.innerHTML = `<span>Patients</span><span class="rms-cli-badge">${patients.length}</span>`;
  panel.appendChild(label);

  patients.forEach((pt) => {
    const state = getPatientState(pt.id);
    const tasks = getPatientTasks(pt.id);
    const completedCount = tasks.filter(t => t.status === "completed").length;
    const alertLevel = _getAlertLevel(state);

    const item = document.createElement("div");
    item.className = `rms-cli-patient-item${pt.id === _selectedId ? " active" : ""}`;
    item.innerHTML = `
      <div class="rms-cli-patient-item__avatar" style="background:${_avatarColor(pt.id)}">${pt.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
      <div class="rms-cli-patient-item__info">
        <div class="rms-cli-patient-item__name">${pt.name}</div>
        <div class="rms-cli-patient-item__prog">${pt.programme}</div>
        <div class="rms-cli-patient-item__meta">
          <span class="rms-cli-status-dot rms-cli-status-dot--${alertLevel}"></span>
          E:${state.energy_level} · F:${state.focus_level} · ${completedCount}/${tasks.length} done
        </div>
      </div>
    `;
    item.addEventListener("click", () => {
      _selectedId = pt.id;
      _currentTab = "overview";
      _render();
    });
    panel.appendChild(item);
  });

  // Summary stats at bottom
  const summary = document.createElement("div");
  summary.className = "rms-cli-sidebar__summary";
  const allStates = patients.map(p => getPatientState(p.id));
  const avgEnergy = (allStates.reduce((s,p) => s + p.energy_level, 0) / allStates.length).toFixed(1);
  const avgOverwhelm = (allStates.reduce((s,p) => s + p.overwhelm_level, 0) / allStates.length).toFixed(1);
  const alerts = allStates.filter(p => p.overwhelm_level > 6 || p.energy_level < 3).length;

  summary.innerHTML = `
    <div class="rms-cli-sidebar__summary-row">
      <span>Avg Energy</span><strong>${avgEnergy}/10</strong>
    </div>
    <div class="rms-cli-sidebar__summary-row">
      <span>Avg Fatigue</span><strong>${avgOverwhelm}/10</strong>
    </div>
    <div class="rms-cli-sidebar__summary-row ${alerts > 0 ? 'alert' : ''}">
      <span>Alerts</span><strong>${alerts} patient${alerts !== 1 ? "s" : ""}</strong>
    </div>
  `;
  panel.appendChild(summary);

  return panel;
}

// ─────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────

function _buildMain() {
  const main = document.createElement("main");
  main.className = "rms-cli-main";

  if (!_selectedId) {
    main.innerHTML = `<div class="rms-cli-empty">Select a patient to view their data</div>`;
    return main;
  }

  const pt      = getPatientById(_selectedId);
  const state   = getPatientState(_selectedId);
  const history = getPatientHistory(_selectedId);
  const tasks   = getPatientTasks(_selectedId);
  const notes   = getPatientNotes(_selectedId);

  // Patient header card
  main.appendChild(_buildPatientHeader(pt, state));

  // Tab nav
  main.appendChild(_buildTabNav());

  // Tab content
  const content = document.createElement("div");
  content.className = "rms-cli-tab-content";

  switch (_currentTab) {
    case "overview":  content.appendChild(_buildOverviewTab(pt, state, history, tasks, notes)); break;
    case "metrics":   content.appendChild(_buildMetricsTab(state, history)); break;
    case "sessions":  content.appendChild(_buildSessionsTab(tasks)); break;
    case "notes":     content.appendChild(_buildNotesTab(pt, notes)); break;
    case "history":   content.appendChild(_buildHistoryTab(history)); break;
  }

  main.appendChild(content);
  return main;
}

// ─────────────────────────────────────────────
// PATIENT HEADER CARD
// ─────────────────────────────────────────────

function _buildPatientHeader(pt, state) {
  const alertLevel = _getAlertLevel(state);
  const lastUpdated = state.last_updated
    ? new Date(state.last_updated).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
    : "No data yet";

  const card = document.createElement("div");
  card.className = "rms-cli-pt-header";
  card.innerHTML = `
    <div class="rms-cli-pt-header__avatar" style="background:${_avatarColor(pt.id)}">${pt.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
    <div class="rms-cli-pt-header__info">
      <div class="rms-cli-pt-header__name">${pt.name}</div>
      <div class="rms-cli-pt-header__meta">
        <span>Ref: <strong>${pt.ref}</strong></span>
        <span>DOB: <strong>${_formatDOB(pt.dob)}</strong></span>
        <span>Programme: <strong>${pt.programme}</strong></span>
        <span>Clinician: <strong>${pt.clinician}</strong></span>
        <span>Enrolled: <strong>${_formatDate(pt.enrolled)}</strong></span>
      </div>
      <div class="rms-cli-pt-header__note">${pt.notes}</div>
    </div>
    <div class="rms-cli-pt-header__status">
      <div class="rms-cli-alert-badge rms-cli-alert-badge--${alertLevel}">
        ${alertLevel === "ok" ? "✓ Stable" : alertLevel === "warn" ? "⚠ Monitor" : "🔴 Alert"}
      </div>
      <div class="rms-cli-pt-header__updated">Last update: ${lastUpdated}</div>
    </div>
  `;
  return card;
}

// ─────────────────────────────────────────────
// TAB NAV
// ─────────────────────────────────────────────

function _buildTabNav() {
  const tabs = [
    { id: "overview",  label: "Overview",        icon: "📊" },
    { id: "metrics",   label: "Live Metrics",     icon: "📈" },
    { id: "sessions",  label: "Sessions",         icon: "📋" },
    { id: "notes",     label: "Clinician Notes",  icon: "📝" },
    { id: "history",   label: "Trend History",    icon: "🗂" }
  ];

  const nav = document.createElement("nav");
  nav.className = "rms-cli-tabs";
  tabs.forEach(({ id, label, icon }) => {
    const btn = document.createElement("button");
    btn.className = `rms-cli-tab${_currentTab === id ? " active" : ""}`;
    btn.innerHTML = `${icon} ${label}`;
    btn.addEventListener("click", () => { _currentTab = id; _render(); });
    nav.appendChild(btn);
  });
  return nav;
}

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────

function _buildOverviewTab(pt, state, history, tasks, notes) {
  const frag = document.createDocumentFragment();

  // ── Summary stat cards ────────────────────
  const stats = document.createElement("div");
  stats.className = "rms-cli-stats-row";

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const inProgress     = tasks.filter(t => t.status === "in_progress").length;
  const trend = history.length >= 2
    ? (history[history.length-1].energy_level - history[history.length-2].energy_level)
    : 0;
  const trendArrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";
  const trendCls   = trend > 0 ? "green" : trend < 0 ? "red" : "neutral";

  [
    { label: "Recovery Energy",   value: `${state.energy_level}/10`,    icon: "⚡", cls: _metricCls("energy", state.energy_level) },
    { label: "Rest Quality",      value: `${state.focus_level}/10`,     icon: "😴", cls: _metricCls("focus", state.focus_level) },
    { label: "Fatigue Level",     value: `${state.overwhelm_level}/10`, icon: "🔋", cls: _metricCls("overwhelm", state.overwhelm_level) },
    { label: "Status",            value: state.motivation_state,        icon: "🟢", cls: "" },
    { label: "Sessions Done",     value: `${completedTasks}/${tasks.length}`, icon: "✅", cls: "" },
    { label: "Energy Trend",      value: `${trendArrow} ${Math.abs(trend) || "Stable"}`, icon: "📈", cls: trendCls }
  ].forEach(({ label, value, icon, cls }) => {
    const card = document.createElement("div");
    card.className = `rms-cli-stat-card ${cls}`;
    card.innerHTML = `
      <div class="rms-cli-stat-card__icon">${icon}</div>
      <div class="rms-cli-stat-card__value">${value}</div>
      <div class="rms-cli-stat-card__label">${label}</div>
    `;
    stats.appendChild(card);
  });
  frag.appendChild(stats);

  // ── Metric bars ───────────────────────────
  const metricsCard = document.createElement("div");
  metricsCard.className = "rms-cli-card";
  metricsCard.innerHTML = `<div class="rms-cli-card__title">📊 Current Monitoring Metrics</div>`;

  [
    { key: "energy_level",    label: "Recovery Energy",  max: 10, invert: false },
    { key: "focus_level",     label: "Rest Quality",     max: 10, invert: false },
    { key: "overwhelm_level", label: "Fatigue Level",    max: 10, invert: true  }
  ].forEach(({ key, label, max, invert }) => {
    const val = state[key] || 0;
    const pct = (val / max) * 100;
    const barCls = invert
      ? (val > 7 ? "danger" : val > 5 ? "warn" : "good")
      : (val < 3 ? "danger" : val < 5 ? "warn" : "good");

    const row = document.createElement("div");
    row.className = "rms-cli-metric-row";
    row.innerHTML = `
      <div class="rms-cli-metric-row__label">${label}</div>
      <div class="rms-cli-metric-row__bar">
        <div class="rms-cli-metric-row__fill rms-cli-metric-row__fill--${barCls}" style="width:${pct}%"></div>
      </div>
      <div class="rms-cli-metric-row__val">${val}/${max}</div>
    `;
    metricsCard.appendChild(row);
  });
  frag.appendChild(metricsCard);

  // ── 7-day sparkline ───────────────────────
  frag.appendChild(_buildSparklineCard(history));

  // ── Active sessions preview ───────────────
  const sessCard = document.createElement("div");
  sessCard.className = "rms-cli-card";
  sessCard.innerHTML = `<div class="rms-cli-card__title">📋 Active Recovery Sessions</div>`;

  const activeTasks = tasks.filter(t => t.status !== "completed").slice(0, 4);
  if (activeTasks.length === 0) {
    sessCard.innerHTML += `<div class="rms-cli-empty-sm">No active sessions — all completed.</div>`;
  } else {
    activeTasks.forEach(task => {
      const row = document.createElement("div");
      row.className = "rms-cli-session-row";
      const statusCls = { not_started: "pending", in_progress: "active", paused: "paused" }[task.status] || "pending";
      row.innerHTML = `
        <div class="rms-cli-session-row__status rms-cli-session-status--${statusCls}">
          ${{ not_started: "●", in_progress: "▶", paused: "⏸" }[task.status] || "●"}
        </div>
        <div class="rms-cli-session-row__name">${task.task_name}</div>
        <div class="rms-cli-session-row__meta">${task.estimated_effort} · ${task.cognitive_load} load</div>
      `;
      sessCard.appendChild(row);
    });
  }
  frag.appendChild(sessCard);

  // ── Latest clinician note ─────────────────
  if (notes.length > 0) {
    const noteCard = document.createElement("div");
    noteCard.className = "rms-cli-card";
    const n = notes[0];
    noteCard.innerHTML = `
      <div class="rms-cli-card__title">📝 Latest Clinician Note</div>
      <div class="rms-cli-note-preview">
        <div class="rms-cli-note-preview__text">${n.note}</div>
        <div class="rms-cli-note-preview__meta">${n.clinician} · ${_formatDate(n.created_at)}</div>
      </div>
    `;
    frag.appendChild(noteCard);
  }

  return frag;
}

// ─────────────────────────────────────────────
// METRICS TAB
// ─────────────────────────────────────────────

function _buildMetricsTab(state, history) {
  const frag = document.createDocumentFragment();

  // Live metrics panel
  const live = document.createElement("div");
  live.className = "rms-cli-card";
  live.innerHTML = `<div class="rms-cli-card__title">⚡ Live Patient Metrics</div>`;

  const metrics = [
    { key: "energy_level",    label: "Recovery Energy",  icon: "⚡", unit: "/10" },
    { key: "focus_level",     label: "Rest Quality",     icon: "😴", unit: "/10" },
    { key: "overwhelm_level", label: "Fatigue Level",    icon: "🔋", unit: "/10" },
    { key: "motivation_state",label: "Recovery Status",  icon: "🟢", unit: ""    },
    { key: "task_load",       label: "Session Load",     icon: "📦", unit: ""    }
  ];

  const grid = document.createElement("div");
  grid.className = "rms-cli-metrics-grid";

  metrics.forEach(({ key, label, icon, unit }) => {
    const val = state[key] ?? "—";
    const numVal = typeof val === "number" ? val : null;
    let indicator = "";
    if (numVal !== null) {
      if (key === "overwhelm_level") {
        indicator = numVal > 6 ? "🔴" : numVal > 4 ? "🟡" : "🟢";
      } else {
        indicator = numVal < 3 ? "🔴" : numVal < 5 ? "🟡" : "🟢";
      }
    }

    const cell = document.createElement("div");
    cell.className = "rms-cli-metric-cell";
    cell.innerHTML = `
      <div class="rms-cli-metric-cell__icon">${icon}</div>
      <div class="rms-cli-metric-cell__value">${val}${unit} ${indicator}</div>
      <div class="rms-cli-metric-cell__label">${label}</div>
    `;
    grid.appendChild(cell);
  });
  live.appendChild(grid);
  frag.appendChild(live);

  // 7-day trend chart
  frag.appendChild(_buildDetailedTrendCard(history));

  // Last update info
  const updateCard = document.createElement("div");
  updateCard.className = "rms-cli-card rms-cli-card--sm";
  const lu = state.last_updated
    ? new Date(state.last_updated).toLocaleString("en-GB")
    : "Not yet recorded";
  updateCard.innerHTML = `
    <div class="rms-cli-card__title">🕐 Data Recency</div>
    <div class="rms-cli-info-row"><span>Last patient update</span><strong>${lu}</strong></div>
    <div class="rms-cli-info-row"><span>History snapshots</span><strong>${history.length} recorded</strong></div>
    <div class="rms-cli-info-row"><span>Monitoring status</span><strong>🟢 Active</strong></div>
  `;
  frag.appendChild(updateCard);

  return frag;
}

// ─────────────────────────────────────────────
// SESSIONS TAB
// ─────────────────────────────────────────────

function _buildSessionsTab(tasks) {
  const frag = document.createDocumentFragment();

  const statusGroups = {
    in_progress:  { label: "In Progress",  icon: "▶", cls: "active" },
    not_started:  { label: "Pending",      icon: "○", cls: "pending" },
    paused:       { label: "Paused",       icon: "⏸", cls: "paused" },
    completed:    { label: "Completed",    icon: "●", cls: "done" }
  };

  // Summary row
  const summary = document.createElement("div");
  summary.className = "rms-cli-stats-row";
  Object.entries(statusGroups).forEach(([status, { label, icon, cls }]) => {
    const count = tasks.filter(t => t.status === status).length;
    const card = document.createElement("div");
    card.className = `rms-cli-stat-card`;
    card.innerHTML = `<div class="rms-cli-stat-card__icon">${icon}</div><div class="rms-cli-stat-card__value">${count}</div><div class="rms-cli-stat-card__label">${label}</div>`;
    summary.appendChild(card);
  });
  frag.appendChild(summary);

  // Full task list
  const card = document.createElement("div");
  card.className = "rms-cli-card";
  card.innerHTML = `<div class="rms-cli-card__title">📋 All Recovery Sessions</div>`;

  if (tasks.length === 0) {
    card.innerHTML += `<div class="rms-cli-empty-sm">No sessions logged yet.</div>`;
  } else {
    const table = document.createElement("table");
    table.className = "rms-cli-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Session Name</th>
          <th>Status</th>
          <th>Effort</th>
          <th>Load</th>
          <th>Priority</th>
          <th>Last Updated</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");
    tasks.forEach(task => {
      const { label, icon, cls } = statusGroups[task.status] || { label: task.status, icon: "○", cls: "" };
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${task.task_name}</td>
        <td><span class="rms-cli-tag rms-cli-tag--${cls}">${icon} ${label}</span></td>
        <td>${task.estimated_effort}</td>
        <td>${task.cognitive_load}</td>
        <td>${task.priority}</td>
        <td>${task.updated_at ? _formatDate(task.updated_at) : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
  }

  frag.appendChild(card);
  return frag;
}

// ─────────────────────────────────────────────
// NOTES TAB
// ─────────────────────────────────────────────

function _buildNotesTab(pt, notes) {
  const frag = document.createDocumentFragment();

  // Add note form
  const formCard = document.createElement("div");
  formCard.className = "rms-cli-card";
  formCard.innerHTML = `
    <div class="rms-cli-card__title">📝 Add Clinician Note</div>
    <textarea class="rms-cli-textarea" id="cli-note-input" placeholder="Enter observation, instruction, or note for ${pt.name}…" rows="3"></textarea>
    <div style="display:flex;gap:10px;margin-top:12px;align-items:center;">
      <select class="rms-cli-select" id="cli-note-clinician">
        <option>Dr. Sarah Clarke</option>
        <option>Dr. James Okafor</option>
        <option>Physiotherapist</option>
        <option>Nurse Practitioner</option>
      </select>
      <button class="rms-cli-btn rms-cli-btn--primary" id="cli-note-save">Add Note</button>
    </div>
  `;
  formCard.querySelector("#cli-note-save").addEventListener("click", () => {
    const text = formCard.querySelector("#cli-note-input").value.trim();
    const clinician = formCard.querySelector("#cli-note-clinician").value;
    if (!text) return;
    addClinicianNote(pt.id, text, clinician);
    _render();
  });
  frag.appendChild(formCard);

  // Notes list
  const listCard = document.createElement("div");
  listCard.className = "rms-cli-card";
  listCard.innerHTML = `<div class="rms-cli-card__title">📋 All Notes (${notes.length})</div>`;

  if (notes.length === 0) {
    listCard.innerHTML += `<div class="rms-cli-empty-sm">No notes recorded yet.</div>`;
  } else {
    notes.forEach(n => {
      const div = document.createElement("div");
      div.className = "rms-cli-note-item";
      div.innerHTML = `
        <div class="rms-cli-note-item__text">${n.note}</div>
        <div class="rms-cli-note-item__meta">${n.clinician} · ${new Date(n.created_at).toLocaleString("en-GB")}</div>
      `;
      listCard.appendChild(div);
    });
  }
  frag.appendChild(listCard);

  return frag;
}

// ─────────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────────

function _buildHistoryTab(history) {
  const frag = document.createDocumentFragment();

  const card = document.createElement("div");
  card.className = "rms-cli-card";
  card.innerHTML = `<div class="rms-cli-card__title">🗂 Full State History (${history.length} snapshots)</div>`;

  if (history.length === 0) {
    card.innerHTML += `<div class="rms-cli-empty-sm">No history recorded yet.</div>`;
  } else {
    const table = document.createElement("table");
    table.className = "rms-cli-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date / Time</th>
          <th>Energy</th>
          <th>Rest Quality</th>
          <th>Fatigue</th>
          <th>Status</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");
    [...history].reverse().forEach(snap => {
      const tr = document.createElement("tr");
      const alertCls = snap.overwhelm_level > 6 ? "rms-cli-row--alert" : snap.energy_level < 3 ? "rms-cli-row--warn" : "";
      tr.className = alertCls;
      tr.innerHTML = `
        <td>${new Date(snap.captured_at).toLocaleString("en-GB")}</td>
        <td>${snap.energy_level}/10</td>
        <td>${snap.focus_level}/10</td>
        <td>${snap.overwhelm_level}/10</td>
        <td>${snap.motivation_state || "—"}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
  }

  frag.appendChild(card);
  return frag;
}

// ─────────────────────────────────────────────
// SPARKLINE / TREND CHARTS (pure CSS/SVG)
// ─────────────────────────────────────────────

function _buildSparklineCard(history) {
  const card = document.createElement("div");
  card.className = "rms-cli-card";
  card.innerHTML = `<div class="rms-cli-card__title">📈 7-Day Energy Trend</div>`;
  card.appendChild(_renderSparkline(history, "energy_level", "#34d399"));
  return card;
}

function _buildDetailedTrendCard(history) {
  const card = document.createElement("div");
  card.className = "rms-cli-card";
  card.innerHTML = `<div class="rms-cli-card__title">📈 7-Day Metric Trends</div>`;

  const metrics = [
    { key: "energy_level",    label: "Recovery Energy",  color: "#34d399" },
    { key: "focus_level",     label: "Rest Quality",     color: "#5b72e8" },
    { key: "overwhelm_level", label: "Fatigue Level",    color: "#e05c6e" }
  ];

  metrics.forEach(({ key, label, color }) => {
    const row = document.createElement("div");
    row.style.marginBottom = "16px";
    const lbl = document.createElement("div");
    lbl.className = "rms-cli-trend-label";
    lbl.textContent = label;
    lbl.style.color = color;
    row.appendChild(lbl);
    row.appendChild(_renderSparkline(history, key, color));
    card.appendChild(row);
  });

  return card;
}

function _renderSparkline(history, key, color) {
  const recent = history.slice(-7);
  if (recent.length < 2) {
    const p = document.createElement("p");
    p.className = "rms-cli-empty-sm";
    p.textContent = "Not enough data yet.";
    return p;
  }

  const W = 520, H = 80, pad = 16;
  const vals = recent.map(s => s[key] || 0);
  const max = 10, min = 0;
  const xStep = (W - pad * 2) / (vals.length - 1);

  const points = vals.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + ((max - v) / (max - min)) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  // Area fill path
  const first = `${pad},${H - pad}`;
  const last  = `${pad + (vals.length - 1) * xStep},${H - pad}`;
  const area  = `M${first} L${points.split(" ").join(" L")} L${last} Z`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "80");
  svg.className = "rms-cli-sparkline";

  // Grid lines
  [2, 4, 6, 8, 10].forEach(v => {
    const y = pad + ((max - v) / (max - min)) * (H - pad * 2);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", pad); line.setAttribute("y1", y);
    line.setAttribute("x2", W - pad); line.setAttribute("y2", y);
    line.setAttribute("stroke", "#1e2440"); line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  });

  // Area
  const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  areaPath.setAttribute("d", area);
  areaPath.setAttribute("fill", color);
  areaPath.setAttribute("fill-opacity", "0.12");
  svg.appendChild(areaPath);

  // Line
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", points);
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", color);
  polyline.setAttribute("stroke-width", "2");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  svg.appendChild(polyline);

  // Dots + labels
  vals.forEach((v, i) => {
    const x = pad + i * xStep;
    const y = pad + ((max - v) / (max - min)) * (H - pad * 2);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x); circle.setAttribute("cy", y);
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "#0b1120");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);

    // Value label
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", x); txt.setAttribute("y", y - 8);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", "10");
    txt.setAttribute("fill", color);
    txt.setAttribute("font-family", "Inter, sans-serif");
    txt.textContent = v;
    svg.appendChild(txt);

    // Day label
    const daySnap = recent[i];
    const dayLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dayLbl.setAttribute("x", x); dayLbl.setAttribute("y", H - 2);
    dayLbl.setAttribute("text-anchor", "middle");
    dayLbl.setAttribute("font-size", "9");
    dayLbl.setAttribute("fill", "#5a6180");
    dayLbl.setAttribute("font-family", "Inter, sans-serif");
    const d = new Date(daySnap.captured_at);
    dayLbl.textContent = d.toLocaleDateString("en-GB", { weekday: "short" });
    svg.appendChild(dayLbl);
  });

  return svg;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function _getAlertLevel(state) {
  if (state.overwhelm_level > 7 || state.energy_level < 2) return "alert";
  if (state.overwhelm_level > 5 || state.energy_level < 4) return "warn";
  return "ok";
}

function _metricCls(type, val) {
  if (type === "overwhelm") return val > 7 ? "danger" : val > 5 ? "warn" : "";
  return val < 3 ? "danger" : val < 5 ? "warn" : "";
}

function _avatarColor(id) {
  const colors = ["#5b72e8","#3ecfb2","#8b6cf7","#f59e0b","#e05c6e","#34d399"];
  const i = parseInt(id.replace(/\D/g,""), 10) % colors.length;
  return colors[i];
}

function _formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function _formatDOB(dob) {
  if (!dob) return "—";
  const d = new Date(dob);
  const age = Math.floor((Date.now() - d) / (365.25 * 86400000));
  return `${d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })} (${age}y)`;
}
