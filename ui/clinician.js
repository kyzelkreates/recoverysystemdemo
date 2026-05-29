// Recovery Monitor System — ui/clinician.js
// Clinician Dashboard — full patient monitoring, metrics, notes, trends
// Self-contained: all data helpers inlined to avoid any module import issues
// NOT a medical device. Clinical monitoring tool only.

// ─────────────────────────────────────────────
// INLINE DATA LAYER (no import dependency issues)
// ─────────────────────────────────────────────

const PATIENTS_KEY = "rms_patients_v2";

const SEED_PATIENTS = [
  { id: "pt-001", name: "Alex Johnson",  dob: "1989-03-14", ref: "RMS-2026-001", clinician: "Dr. Sarah Clarke",   programme: "Post-Surgical Recovery",  enrolled: "2026-04-01", notes: "Recovering from ACL reconstruction. Focus on gradual load increase and mobility restoration." },
  { id: "pt-002", name: "Maria Santos",  dob: "1995-07-22", ref: "RMS-2026-002", clinician: "Dr. Sarah Clarke",   programme: "Fatigue Management",       enrolled: "2026-04-10", notes: "Chronic fatigue syndrome management. Monitor rest cycle compliance and pacing adherence." },
  { id: "pt-003", name: "David Chen",    dob: "1978-11-05", ref: "RMS-2026-003", clinician: "Dr. James Okafor",   programme: "Stress & Recovery",        enrolled: "2026-05-01", notes: "Occupational burnout recovery. Prioritise sleep hygiene and energy boundary monitoring." },
  { id: "pt-004", name: "Priya Nair",    dob: "2001-02-18", ref: "RMS-2026-004", clinician: "Dr. Sarah Clarke",   programme: "Post-Surgical Recovery",   enrolled: "2026-05-15", notes: "Post-operative cardiac monitoring. Strict fatigue ceiling — flag if overwhelm > 6." }
];

function _makeHistory(id) {
  const p = {
    "pt-001": { e:[4,5,5,6,6,7,7], f:[5,5,6,6,7,7,8], o:[5,4,4,3,3,2,2], s:["starting","starting","flowing","flowing","flowing","flowing","flowing"] },
    "pt-002": { e:[3,3,4,3,4,4,5], f:[4,4,4,5,4,5,5], o:[6,6,5,6,5,5,4], s:["stuck","stuck","starting","stuck","starting","starting","flowing"] },
    "pt-003": { e:[5,6,6,7,6,7,8], f:[6,6,7,7,7,8,8], o:[4,4,3,3,3,2,2], s:["starting","flowing","flowing","flowing","flowing","flowing","flowing"] },
    "pt-004": { e:[2,2,3,3,3,4,4], f:[3,4,4,4,5,4,5], o:[7,7,6,6,6,5,5], s:["stuck","stuck","stuck","starting","starting","starting","starting"] }
  }[id] || { e:[5,5,5,5,5,5,5], f:[5,5,5,5,5,5,5], o:[3,3,3,3,3,3,3], s:["starting","starting","starting","starting","starting","starting","starting"] };
  return p.e.map((e,i) => ({
    snapshot_id: `snap-${id}-${i}`,
    captured_at: new Date(Date.now()-(6-i)*86400000).toISOString(),
    energy_level: e, focus_level: p.f[i], overwhelm_level: p.o[i], motivation_state: p.s[i]
  }));
}

function _makeTasks(id) {
  const sets = {
    "pt-001": [
      { task_name:"Morning mobility & stretching",  status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:1 },
      { task_name:"Ice & elevation protocol",        status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:2 },
      { task_name:"Physiotherapy exercises",         status:"in_progress", estimated_effort:"medium", cognitive_load:"medium", priority:3 },
      { task_name:"Pain & fatigue daily log",        status:"not_started", estimated_effort:"small",  cognitive_load:"low",    priority:4 },
      { task_name:"Hydrotherapy session",            status:"not_started", estimated_effort:"medium", cognitive_load:"low",    priority:5 }
    ],
    "pt-002": [
      { task_name:"Pacing activity log",             status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:1 },
      { task_name:"Structured rest block (90 min)", status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:2 },
      { task_name:"Gentle walk (10 min)",            status:"in_progress", estimated_effort:"small",  cognitive_load:"low",    priority:3 },
      { task_name:"Evening wind-down routine",       status:"not_started", estimated_effort:"small",  cognitive_load:"low",    priority:4 }
    ],
    "pt-003": [
      { task_name:"Mindfulness session (15 min)",    status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:1 },
      { task_name:"Work boundary & limit review",    status:"in_progress", estimated_effort:"medium", cognitive_load:"high",   priority:2 },
      { task_name:"Sleep hygiene checklist",         status:"in_progress", estimated_effort:"small",  cognitive_load:"low",    priority:3 },
      { task_name:"Digital detox block (1 hr)",      status:"not_started", estimated_effort:"small",  cognitive_load:"low",    priority:4 }
    ],
    "pt-004": [
      { task_name:"Cardiac monitoring log",          status:"completed",   estimated_effort:"small",  cognitive_load:"low",    priority:1 },
      { task_name:"Low-impact movement (5 min)",     status:"in_progress", estimated_effort:"small",  cognitive_load:"low",    priority:2 },
      { task_name:"Medication & symptoms log",       status:"not_started", estimated_effort:"small",  cognitive_load:"low",    priority:3 },
      { task_name:"Breathwork session (10 min)",     status:"not_started", estimated_effort:"small",  cognitive_load:"low",    priority:4 }
    ]
  };
  return (sets[id] || sets["pt-001"]).map((t,i) => ({
    task_id: `task-${id}-${i}`, ...t,
    created_at: new Date(Date.now()-(5-i)*7200000).toISOString(),
    updated_at: new Date(Date.now()-i*1800000).toISOString()
  }));
}

function _makeState(id) {
  return {
    "pt-001": { energy_level:7, focus_level:8, overwhelm_level:2, motivation_state:"flowing",  task_load:"low",    last_updated: new Date(Date.now()-900000).toISOString() },
    "pt-002": { energy_level:5, focus_level:5, overwhelm_level:4, motivation_state:"starting", task_load:"medium", last_updated: new Date(Date.now()-1800000).toISOString() },
    "pt-003": { energy_level:8, focus_level:8, overwhelm_level:2, motivation_state:"flowing",  task_load:"low",    last_updated: new Date(Date.now()-600000).toISOString() },
    "pt-004": { energy_level:4, focus_level:5, overwhelm_level:5, motivation_state:"starting", task_load:"medium", last_updated: new Date(Date.now()-3600000).toISOString() }
  }[id] || { energy_level:5, focus_level:5, overwhelm_level:3, motivation_state:"starting", task_load:"medium", last_updated: new Date().toISOString() };
}

function _makeNotes(id) {
  const sets = {
    "pt-001": [
      { clinician:"Dr. Sarah Clarke",   note:"Good progress this week. Knee flexion improving — target 90° by end of next week. Continue current physio programme.", created_at: new Date(Date.now()-86400000).toISOString() },
      { clinician:"Physiotherapist",    note:"Completed full set of resistance band exercises. Mild discomfort at 70° flexion reported — monitor closely.", created_at: new Date(Date.now()-172800000).toISOString() }
    ],
    "pt-002": [
      { clinician:"Dr. Sarah Clarke",   note:"Rest cycle compliance improved this week. Encourage patient to reduce screen time during scheduled rest blocks.", created_at: new Date(Date.now()-86400000).toISOString() },
      { clinician:"Dr. Sarah Clarke",   note:"Fatigue spike noted Tuesday — likely linked to over-exertion. Reinforced pacing strategy in session.", created_at: new Date(Date.now()-259200000).toISOString() }
    ],
    "pt-003": [
      { clinician:"Dr. James Okafor",   note:"Sleep improving — averaging 7 hrs. Work boundary review ongoing. Next session: discuss delegation and task deferral.", created_at: new Date(Date.now()-43200000).toISOString() },
      { clinician:"Nurse Practitioner", note:"BP and HR within normal ranges. Stress markers reducing per weekly biometric assessment.", created_at: new Date(Date.now()-172800000).toISOString() }
    ],
    "pt-004": [
      { clinician:"Dr. Sarah Clarke",   note:"⚠ IMPORTANT: Fatigue ceiling strictly enforced. Alert if overwhelm > 6 or energy < 3. Patient is aware of safe limits.", created_at: new Date(Date.now()-86400000).toISOString() },
      { clinician:"Dr. Sarah Clarke",   note:"Week 2 post-op. Cardiac function stable. Mobility within prescribed range. Breathwork sessions showing positive effect.", created_at: new Date(Date.now()-259200000).toISOString() }
    ]
  };
  return (sets[id] || []).map((n,i) => ({ id:`note-${id}-${i}`, ...n }));
}

// ── Local storage helpers ───────────────────

function _lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function _lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function initData() {
  if (_lsGet(PATIENTS_KEY, null)) return _lsGet(PATIENTS_KEY, SEED_PATIENTS);
  SEED_PATIENTS.forEach(p => {
    _lsSet(`rms_pt_${p.id}_state`,   _makeState(p.id));
    _lsSet(`rms_pt_${p.id}_history`, _makeHistory(p.id));
    _lsSet(`rms_pt_${p.id}_tasks`,   _makeTasks(p.id));
    _lsSet(`rms_pt_${p.id}_notes`,   _makeNotes(p.id));
  });
  _lsSet(PATIENTS_KEY, SEED_PATIENTS);
  return SEED_PATIENTS;
}

function getPatients()        { return _lsGet(PATIENTS_KEY, SEED_PATIENTS); }
function getPatientById(id)   { return getPatients().find(p => p.id === id) || SEED_PATIENTS[0]; }
function getState(id)         { return _lsGet(`rms_pt_${id}_state`,   _makeState(id)); }
function getHistory(id)       { return _lsGet(`rms_pt_${id}_history`, _makeHistory(id)); }
function getTasks(id)         { return _lsGet(`rms_pt_${id}_tasks`,   _makeTasks(id)); }
function getNotes(id)         { return _lsGet(`rms_pt_${id}_notes`,   _makeNotes(id)); }

function saveNote(id, text, clinician) {
  const notes = getNotes(id);
  notes.unshift({ id: crypto.randomUUID(), note: text, clinician, created_at: new Date().toISOString() });
  _lsSet(`rms_pt_${id}_notes`, notes);
}

// ─────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────

let ROOT       = null;
let PATIENTS   = [];
let SEL_ID     = null;
let ACTIVE_TAB = "overview";
let ACTIVE_NAV = "patients"; // patients | ward | alerts | reports | settings

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  ROOT     = document.getElementById("rms-clinician-root");
  PATIENTS = initData();
  SEL_ID   = PATIENTS[0]?.id || null;

  setInterval(() => render(), 10000); // refresh every 10s
  window.addEventListener("storage", () => render());
  render();
});

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function render() {
  if (!ROOT) return;
  ROOT.innerHTML = "";
  ROOT.className = "rms-cli-app";

  ROOT.appendChild(buildHeader());

  const body = el("div", "rms-cli-body");
  body.appendChild(buildSidebar());
  body.appendChild(buildMain());
  ROOT.appendChild(body);
}

// ─────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────

function buildHeader() {
  const now = new Date();
  const h   = el("header", "rms-cli-header");
  h.innerHTML = `
    <div class="rms-cli-header__brand">
      <div class="rms-cli-header__dot"></div>
      <div>
        <div class="rms-cli-header__title">Recovery Monitor System</div>
        <div class="rms-cli-header__sub">Clinician Dashboard</div>
      </div>
    </div>
    <div class="rms-cli-header__right">
      <div class="rms-cli-header__live"><span class="rms-cli-live-dot"></span> Live</div>
      <div class="rms-cli-header__datetime">
        ${now.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} &nbsp;·&nbsp;
        ${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
      </div>
      <div class="rms-cli-header__user">🩺 Dr. Sarah Clarke</div>
    </div>`;
  return h;
}

// ─────────────────────────────────────────────
// SIDEBAR (LEFT NAV — like patient PWA)
// ─────────────────────────────────────────────

function buildSidebar() {
  const patients = getPatients();
  const sidebar  = el("aside", "rms-cli-sidebar");

  // ── Section: Navigation ──────────────────
  sideSection(sidebar, "Navigation");

  const navItems = [
    { id:"patients", icon:"👥", label:"Patients" },
    { id:"ward",     icon:"🏥", label:"Ward Overview" },
    { id:"alerts",   icon:"🔴", label:`Alerts ${_alertCount(patients) > 0 ? `<span class="rms-cli-alert-pip">${_alertCount(patients)}</span>` : ""}` },
    { id:"reports",  icon:"📊", label:"Reports" },
    { id:"settings", icon:"⚙️", label:"Settings" }
  ];

  navItems.forEach(({ id, icon, label }) => {
    const btn = el("button", `rms-cli-nav-item${ACTIVE_NAV === id ? " active" : ""}`);
    btn.innerHTML = `<span class="rms-cli-nav-icon">${icon}</span><span>${label}</span>`;
    btn.addEventListener("click", () => { ACTIVE_NAV = id; SEL_ID = ACTIVE_NAV === "patients" ? SEL_ID : null; ACTIVE_TAB = "overview"; render(); });
    sidebar.appendChild(btn);
  });

  // ── Section: Patients ─────────────────────
  sideSection(sidebar, "Patients");

  patients.forEach(pt => {
    const state     = getState(pt.id);
    const tasks     = getTasks(pt.id);
    const done      = tasks.filter(t => t.status === "completed").length;
    const alertLvl  = alertLevel(state);

    const item = el("div", `rms-cli-patient-item${pt.id === SEL_ID ? " active" : ""}`);
    item.innerHTML = `
      <div class="rms-cli-pt-avatar" style="background:${avatarColor(pt.id)}">${initials(pt.name)}</div>
      <div class="rms-cli-pt-info">
        <div class="rms-cli-pt-name">${pt.name}</div>
        <div class="rms-cli-pt-prog">${pt.programme}</div>
        <div class="rms-cli-pt-metrics">
          <span class="rms-cli-status-dot rms-cli-status-dot--${alertLvl}"></span>
          E:${state.energy_level} · F:${state.focus_level} · ${done}/${tasks.length}
        </div>
      </div>`;
    item.addEventListener("click", () => { SEL_ID = pt.id; ACTIVE_NAV = "patients"; ACTIVE_TAB = "overview"; render(); });
    sidebar.appendChild(item);
  });

  // ── Quick Actions ─────────────────────────
  sideSection(sidebar, "Quick Actions");

  const quickActions = [
    { icon:"📝", label:"Add Note",       fn: () => { if (SEL_ID) { ACTIVE_NAV="patients"; ACTIVE_TAB="notes"; render(); } else alert("Select a patient first."); } },
    { icon:"📋", label:"All Sessions",   fn: () => { if (SEL_ID) { ACTIVE_NAV="patients"; ACTIVE_TAB="sessions"; render(); } else alert("Select a patient first."); } },
    { icon:"📈", label:"Live Metrics",   fn: () => { if (SEL_ID) { ACTIVE_NAV="patients"; ACTIVE_TAB="metrics"; render(); } else alert("Select a patient first."); } },
    { icon:"🗂",  label:"Trend History",  fn: () => { if (SEL_ID) { ACTIVE_NAV="patients"; ACTIVE_TAB="history"; render(); } else alert("Select a patient first."); } },
    { icon:"🔄", label:"Refresh Data",   fn: () => render() }
  ];

  quickActions.forEach(({ icon, label, fn }) => {
    const btn = el("button", "rms-cli-nav-item rms-cli-nav-item--action");
    btn.innerHTML = `<span class="rms-cli-nav-icon">${icon}</span><span>${label}</span>`;
    btn.addEventListener("click", fn);
    sidebar.appendChild(btn);
  });

  // ── Summary stats ─────────────────────────
  const allStates   = patients.map(p => getState(p.id));
  const avgEnergy   = (allStates.reduce((s,p) => s + p.energy_level, 0) / allStates.length).toFixed(1);
  const avgFatigue  = (allStates.reduce((s,p) => s + p.overwhelm_level, 0) / allStates.length).toFixed(1);
  const alertCount  = allStates.filter(p => p.overwhelm_level > 6 || p.energy_level < 3).length;

  const sumDiv = el("div", "rms-cli-sidebar-summary");
  sumDiv.innerHTML = `
    <div class="rms-cli-sum-row"><span>Avg Energy</span><b>${avgEnergy}/10</b></div>
    <div class="rms-cli-sum-row"><span>Avg Fatigue</span><b>${avgFatigue}/10</b></div>
    <div class="rms-cli-sum-row ${alertCount > 0 ? "alert" : ""}"><span>Alerts</span><b>${alertCount} patient${alertCount !== 1 ? "s":""}</b></div>
    <div class="rms-cli-sum-row"><span>Active today</span><b>${patients.length}/${patients.length}</b></div>
  `;
  sidebar.appendChild(sumDiv);

  return sidebar;
}

function sideSection(parent, label) {
  const d = el("div", "rms-cli-sidebar-section");
  d.textContent = label;
  parent.appendChild(d);
}

// ─────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────

function buildMain() {
  const main = el("main", "rms-cli-main");

  // Ward overview (no patient selected or ward nav)
  if (ACTIVE_NAV === "ward" || (!SEL_ID && ACTIVE_NAV === "patients")) {
    main.appendChild(buildWardOverview());
    return main;
  }

  if (ACTIVE_NAV === "alerts") {
    main.appendChild(buildAlertsView());
    return main;
  }

  if (ACTIVE_NAV === "reports") {
    main.appendChild(buildReportsView());
    return main;
  }

  if (ACTIVE_NAV === "settings") {
    main.appendChild(buildSettingsView());
    return main;
  }

  // Patient detail
  if (!SEL_ID) { main.innerHTML = `<div class="rms-cli-empty">Select a patient to view their data.</div>`; return main; }

  const pt      = getPatientById(SEL_ID);
  const state   = getState(SEL_ID);
  const history = getHistory(SEL_ID);
  const tasks   = getTasks(SEL_ID);
  const notes   = getNotes(SEL_ID);

  main.appendChild(buildPatientHeader(pt, state));
  main.appendChild(buildTabNav());

  const content = el("div", "rms-cli-tab-content");
  switch (ACTIVE_TAB) {
    case "overview":  content.appendChild(buildOverview(pt, state, history, tasks, notes)); break;
    case "metrics":   content.appendChild(buildMetrics(state, history)); break;
    case "sessions":  content.appendChild(buildSessions(tasks)); break;
    case "notes":     content.appendChild(buildNotes(pt, notes)); break;
    case "history":   content.appendChild(buildHistory(history)); break;
    default:          content.appendChild(buildOverview(pt, state, history, tasks, notes));
  }
  main.appendChild(content);
  return main;
}

// ─────────────────────────────────────────────
// WARD OVERVIEW
// ─────────────────────────────────────────────

function buildWardOverview() {
  const patients  = getPatients();
  const frag      = document.createDocumentFragment();

  const titleRow = el("div", "rms-cli-page-title");
  titleRow.innerHTML = `<span>🏥</span> Ward Overview <span class="rms-cli-sub">All patients at a glance</span>`;
  frag.appendChild(titleRow);

  // Summary stat cards
  const allStates  = patients.map(p => getState(p.id));
  const allTasks   = patients.flatMap(p => getTasks(p.id));
  const completed  = allTasks.filter(t => t.status === "completed").length;
  const inProgress = allTasks.filter(t => t.status === "in_progress").length;
  const alerts     = allStates.filter(s => s.overwhelm_level > 6 || s.energy_level < 3).length;
  const avgE       = (allStates.reduce((s,p)=>s+p.energy_level,0)/allStates.length).toFixed(1);

  const statsRow = el("div", "rms-cli-stats-row");
  [
    { icon:"👥", val:patients.length, label:"Patients", cls:"" },
    { icon:"⚡", val:avgE+"/10",      label:"Avg Energy", cls:"" },
    { icon:"✅", val:completed,       label:"Sessions Done", cls:"" },
    { icon:"▶",  val:inProgress,      label:"In Progress", cls:"" },
    { icon:"🔴", val:alerts,          label:"Alerts",      cls: alerts>0?"rms-cli-stat--danger":"" }
  ].forEach(({ icon, val, label, cls }) => {
    const c = el("div", `rms-cli-stat-card ${cls}`);
    c.innerHTML = `<div class="rms-cli-stat-icon">${icon}</div><div class="rms-cli-stat-val">${val}</div><div class="rms-cli-stat-lbl">${label}</div>`;
    statsRow.appendChild(c);
  });
  frag.appendChild(statsRow);

  // Patient cards grid
  const grid = el("div", "rms-cli-ward-grid");
  patients.forEach(pt => {
    const state  = getState(pt.id);
    const tasks  = getTasks(pt.id);
    const done   = tasks.filter(t=>t.status==="completed").length;
    const active = tasks.filter(t=>t.status==="in_progress").length;
    const lvl    = alertLevel(state);
    const pct    = tasks.length ? Math.round(done/tasks.length*100) : 0;

    const card = el("div", `rms-cli-ward-card rms-cli-ward-card--${lvl}`);
    card.innerHTML = `
      <div class="rms-cli-ward-card__top">
        <div class="rms-cli-pt-avatar rms-cli-pt-avatar--sm" style="background:${avatarColor(pt.id)}">${initials(pt.name)}</div>
        <div class="rms-cli-ward-card__info">
          <div class="rms-cli-ward-card__name">${pt.name}</div>
          <div class="rms-cli-ward-card__prog">${pt.programme}</div>
        </div>
        <div class="rms-cli-alert-badge rms-cli-alert-badge--${lvl}">${lvl==="ok"?"✓ Stable":lvl==="warn"?"⚠ Monitor":"🔴 Alert"}</div>
      </div>
      <div class="rms-cli-ward-card__metrics">
        ${metricPill("⚡","Energy",state.energy_level,false)}
        ${metricPill("😴","Rest",state.focus_level,false)}
        ${metricPill("🔋","Fatigue",state.overwhelm_level,true)}
      </div>
      <div class="rms-cli-ward-card__progress">
        <div class="rms-cli-progress-row">
          <span>Sessions: ${done}/${tasks.length}</span>
          <span>${pct}%</span>
        </div>
        <div class="rms-cli-progress-bar"><div class="rms-cli-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="rms-cli-ward-card__status">
        <span class="rms-cli-status-dot rms-cli-status-dot--${lvl}"></span>
        ${statusLabel(state.motivation_state)} · ${active} active session${active!==1?"s":""}
      </div>`;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => { SEL_ID = pt.id; ACTIVE_NAV = "patients"; ACTIVE_TAB = "overview"; render(); });
    grid.appendChild(card);
  });
  frag.appendChild(grid);
  return frag;
}

function metricPill(icon, label, val, invert) {
  const cls = invert
    ? (val>7?"danger":val>5?"warn":"good")
    : (val<3?"danger":val<5?"warn":"good");
  return `<div class="rms-cli-metric-pill rms-cli-metric-pill--${cls}">${icon} <b>${val}</b> <span>${label}</span></div>`;
}

// ─────────────────────────────────────────────
// ALERTS VIEW
// ─────────────────────────────────────────────

function buildAlertsView() {
  const patients = getPatients();
  const frag     = document.createDocumentFragment();

  const titleRow = el("div", "rms-cli-page-title");
  titleRow.innerHTML = `<span>🔴</span> Alerts <span class="rms-cli-sub">Patients needing attention</span>`;
  frag.appendChild(titleRow);

  const alertPts = patients.filter(p => {
    const s = getState(p.id);
    return s.overwhelm_level > 6 || s.energy_level < 3 || s.overwhelm_level > 4 || s.energy_level < 5;
  });

  if (alertPts.length === 0) {
    const d = el("div", "rms-cli-empty");
    d.innerHTML = `<div style="font-size:2.5rem;margin-bottom:12px">✅</div><div>All patients are stable — no alerts.</div>`;
    frag.appendChild(d);
    return frag;
  }

  alertPts.forEach(pt => {
    const state = getState(pt.id);
    const lvl   = alertLevel(state);
    const card  = el("div", `rms-cli-card rms-cli-card--alert-${lvl}`);
    card.innerHTML = `
      <div class="rms-cli-card__top">
        <div class="rms-cli-pt-avatar" style="background:${avatarColor(pt.id)}">${initials(pt.name)}</div>
        <div>
          <div class="rms-cli-card__name">${pt.name} <span class="rms-cli-alert-badge rms-cli-alert-badge--${lvl}">${lvl==="alert"?"🔴 Alert":"⚠ Monitor"}</span></div>
          <div class="rms-cli-card__sub">${pt.programme} · ${pt.clinician}</div>
        </div>
      </div>
      <div class="rms-cli-alert-metrics">
        <div class="rms-cli-alert-row ${state.energy_level<3?"rms-cli-alert-row--red":state.energy_level<5?"rms-cli-alert-row--yellow":""}">
          ⚡ Recovery Energy: <b>${state.energy_level}/10</b>
          ${state.energy_level<3?"← Below safe threshold":state.energy_level<5?"← Low — monitor":""}
        </div>
        <div class="rms-cli-alert-row ${state.overwhelm_level>7?"rms-cli-alert-row--red":state.overwhelm_level>5?"rms-cli-alert-row--yellow":""}">
          🔋 Fatigue Level: <b>${state.overwhelm_level}/10</b>
          ${state.overwhelm_level>7?"← Critical — check in now":state.overwhelm_level>5?"← Elevated — monitor":""}
        </div>
        <div class="rms-cli-alert-row">
          🟢 Status: <b>${statusLabel(state.motivation_state)}</b>
        </div>
      </div>
      <div class="rms-cli-card__actions">
        <button class="rms-cli-btn rms-cli-btn--primary" data-pt="${pt.id}" data-action="view">View Patient</button>
        <button class="rms-cli-btn rms-cli-btn--secondary" data-pt="${pt.id}" data-action="note">Add Note</button>
      </div>`;
    card.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        SEL_ID = btn.dataset.pt; ACTIVE_NAV = "patients";
        ACTIVE_TAB = btn.dataset.action === "note" ? "notes" : "overview";
        render();
      });
    });
    frag.appendChild(card);
  });
  return frag;
}

// ─────────────────────────────────────────────
// REPORTS VIEW
// ─────────────────────────────────────────────

function buildReportsView() {
  const patients = getPatients();
  const frag     = document.createDocumentFragment();

  const titleRow = el("div", "rms-cli-page-title");
  titleRow.innerHTML = `<span>📊</span> Reports <span class="rms-cli-sub">Programme summary</span>`;
  frag.appendChild(titleRow);

  const card = el("div", "rms-cli-card");
  card.innerHTML = `<div class="rms-cli-card__title">📋 Programme Summary — ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>`;

  const table = el("table", "rms-cli-table");
  table.innerHTML = `
    <thead><tr>
      <th>Patient</th><th>Programme</th><th>Energy</th><th>Rest</th><th>Fatigue</th><th>Status</th><th>Sessions</th><th>Trend</th>
    </tr></thead>`;
  const tbody = el("tbody");
  patients.forEach(pt => {
    const s       = getState(pt.id);
    const tasks   = getTasks(pt.id);
    const history = getHistory(pt.id);
    const done    = tasks.filter(t=>t.status==="completed").length;
    const trend   = history.length>=2 ? history[history.length-1].energy_level - history[history.length-2].energy_level : 0;
    const trendStr = trend>0?`↑ +${trend}`:trend<0?`↓ ${trend}`:"→ Stable";
    const trendCls = trend>0?"rms-cli-trend--up":trend<0?"rms-cli-trend--down":"";
    const lvl     = alertLevel(s);
    const tr      = el("tr");
    tr.innerHTML = `
      <td><span class="rms-cli-pt-mini-avatar" style="background:${avatarColor(pt.id)}">${initials(pt.name)}</span> ${pt.name}</td>
      <td>${pt.programme}</td>
      <td>${s.energy_level}/10</td>
      <td>${s.focus_level}/10</td>
      <td>${s.overwhelm_level}/10</td>
      <td><span class="rms-cli-alert-badge rms-cli-alert-badge--${lvl}">${lvl==="ok"?"✓ Stable":lvl==="warn"?"⚠ Monitor":"🔴 Alert"}</span></td>
      <td>${done}/${tasks.length}</td>
      <td class="${trendCls}">${trendStr}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  frag.appendChild(card);

  // Trend charts for all patients
  patients.forEach(pt => {
    const history = getHistory(pt.id);
    const chartCard = el("div", "rms-cli-card");
    chartCard.innerHTML = `<div class="rms-cli-card__title">📈 ${pt.name} — 7-Day Energy Trend</div>`;
    chartCard.appendChild(buildSparkline(history, "energy_level", "#34d399"));
    frag.appendChild(chartCard);
  });

  return frag;
}

// ─────────────────────────────────────────────
// SETTINGS VIEW
// ─────────────────────────────────────────────

function buildSettingsView() {
  const frag = document.createDocumentFragment();
  const titleRow = el("div", "rms-cli-page-title");
  titleRow.innerHTML = `<span>⚙️</span> Settings`;
  frag.appendChild(titleRow);

  const card = el("div", "rms-cli-card");
  card.innerHTML = `
    <div class="rms-cli-card__title">System</div>
    <div class="rms-cli-info-row"><span>Clinician</span><b>Dr. Sarah Clarke</b></div>
    <div class="rms-cli-info-row"><span>System</span><b>Recovery Monitor System v2</b></div>
    <div class="rms-cli-info-row"><span>Active patients</span><b>${getPatients().length}</b></div>
    <div class="rms-cli-info-row"><span>Data storage</span><b>Browser localStorage (demo mode)</b></div>
    <br>
    <button class="rms-cli-btn rms-cli-btn--secondary" id="reseed-btn">↺ Reset all demo data</button>
  `;
  card.querySelector("#reseed-btn").addEventListener("click", () => {
    if (confirm("Reset all patient data to demo defaults?")) {
      localStorage.removeItem(PATIENTS_KEY);
      render();
    }
  });
  frag.appendChild(card);
  return frag;
}

// ─────────────────────────────────────────────
// PATIENT HEADER CARD
// ─────────────────────────────────────────────

function buildPatientHeader(pt, state) {
  const lvl = alertLevel(state);
  const lu  = state.last_updated
    ? new Date(state.last_updated).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
    : "No data yet";

  const card = el("div", "rms-cli-pt-header");
  card.innerHTML = `
    <div class="rms-cli-pt-avatar rms-cli-pt-avatar--lg" style="background:${avatarColor(pt.id)}">${initials(pt.name)}</div>
    <div class="rms-cli-pt-header__info">
      <div class="rms-cli-pt-header__name">${pt.name}</div>
      <div class="rms-cli-pt-header__meta">
        <span>Ref: <b>${pt.ref}</b></span>
        <span>DOB: <b>${fmtDOB(pt.dob)}</b></span>
        <span>Programme: <b>${pt.programme}</b></span>
        <span>Clinician: <b>${pt.clinician}</b></span>
        <span>Enrolled: <b>${fmtDate(pt.enrolled)}</b></span>
      </div>
      <div class="rms-cli-pt-header__note">${pt.notes}</div>
    </div>
    <div class="rms-cli-pt-header__status">
      <div class="rms-cli-alert-badge rms-cli-alert-badge--${lvl}">${lvl==="ok"?"✓ Stable":lvl==="warn"?"⚠ Monitor":"🔴 Alert"}</div>
      <div class="rms-cli-pt-updated">Last update: ${lu}</div>
    </div>`;
  return card;
}

// ─────────────────────────────────────────────
// TAB NAV
// ─────────────────────────────────────────────

function buildTabNav() {
  const tabs = [
    { id:"overview",  label:"Overview",       icon:"📊" },
    { id:"metrics",   label:"Live Metrics",   icon:"📈" },
    { id:"sessions",  label:"Sessions",       icon:"📋" },
    { id:"notes",     label:"Notes",          icon:"📝" },
    { id:"history",   label:"Trend History",  icon:"🗂" }
  ];
  const nav = el("nav", "rms-cli-tabs");
  tabs.forEach(({ id, label, icon }) => {
    const btn = el("button", `rms-cli-tab${ACTIVE_TAB===id?" active":""}`);
    btn.innerHTML = `${icon} ${label}`;
    btn.addEventListener("click", () => { ACTIVE_TAB = id; render(); });
    nav.appendChild(btn);
  });
  return nav;
}

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────

function buildOverview(pt, state, history, tasks, notes) {
  const frag = document.createDocumentFragment();

  // Stat cards
  const done   = tasks.filter(t=>t.status==="completed").length;
  const active = tasks.filter(t=>t.status==="in_progress").length;
  const trend  = history.length>=2 ? history[history.length-1].energy_level - history[history.length-2].energy_level : 0;
  const lvl    = alertLevel(state);

  const statsRow = el("div", "rms-cli-stats-row");
  [
    { icon:"⚡", val:`${state.energy_level}/10`,    label:"Recovery Energy", cls: state.energy_level<3?"rms-cli-stat--danger":state.energy_level<5?"rms-cli-stat--warn":"" },
    { icon:"😴", val:`${state.focus_level}/10`,     label:"Rest Quality",    cls: state.focus_level<3?"rms-cli-stat--danger":state.focus_level<5?"rms-cli-stat--warn":"" },
    { icon:"🔋", val:`${state.overwhelm_level}/10`, label:"Fatigue Level",   cls: state.overwhelm_level>7?"rms-cli-stat--danger":state.overwhelm_level>5?"rms-cli-stat--warn":"" },
    { icon:"🟢", val:statusLabel(state.motivation_state), label:"Status", cls:"" },
    { icon:"✅", val:`${done}/${tasks.length}`,     label:"Sessions Done",   cls:"" },
    { icon:"📈", val:`${trend>0?"↑ +":trend<0?"↓ ":"→ "}${Math.abs(trend)||"Stable"}`, label:"Energy Trend", cls: trend>0?"rms-cli-stat--green":trend<0?"rms-cli-stat--warn":"" }
  ].forEach(({ icon, val, label, cls }) => {
    const c = el("div", `rms-cli-stat-card ${cls}`);
    c.innerHTML = `<div class="rms-cli-stat-icon">${icon}</div><div class="rms-cli-stat-val">${val}</div><div class="rms-cli-stat-lbl">${label}</div>`;
    statsRow.appendChild(c);
  });
  frag.appendChild(statsRow);

  // Metric bars
  const metricCard = el("div", "rms-cli-card");
  metricCard.innerHTML = `<div class="rms-cli-card__title">📊 Current Monitoring Metrics</div>`;
  [
    { key:"energy_level",    label:"Recovery Energy", invert:false },
    { key:"focus_level",     label:"Rest Quality",    invert:false },
    { key:"overwhelm_level", label:"Fatigue Level",   invert:true }
  ].forEach(({ key, label, invert }) => {
    const val  = state[key]||0;
    const pct  = val * 10;
    const cls  = invert ? (val>7?"danger":val>5?"warn":"good") : (val<3?"danger":val<5?"warn":"good");
    const row  = el("div","rms-cli-metric-row");
    row.innerHTML = `
      <div class="rms-cli-metric-lbl">${label}</div>
      <div class="rms-cli-metric-bar"><div class="rms-cli-metric-fill rms-cli-metric-fill--${cls}" style="width:${pct}%"></div></div>
      <div class="rms-cli-metric-val">${val}/10</div>`;
    metricCard.appendChild(row);
  });
  frag.appendChild(metricCard);

  // Sparkline
  const sparkCard = el("div", "rms-cli-card");
  sparkCard.innerHTML = `<div class="rms-cli-card__title">📈 7-Day Energy Trend</div>`;
  sparkCard.appendChild(buildSparkline(history, "energy_level", "#34d399"));
  frag.appendChild(sparkCard);

  // Active sessions
  const sessCard = el("div", "rms-cli-card");
  sessCard.innerHTML = `<div class="rms-cli-card__title">📋 Active Recovery Sessions <span class="rms-cli-badge">${active} active</span></div>`;
  const activeTasks = tasks.filter(t => t.status !== "completed").slice(0, 4);
  if (activeTasks.length === 0) {
    sessCard.innerHTML += `<div class="rms-cli-empty-sm">✅ All sessions completed.</div>`;
  } else {
    activeTasks.forEach(task => {
      const row = el("div", "rms-cli-sess-row");
      const scls = { not_started:"pending", in_progress:"active", paused:"paused" }[task.status]||"pending";
      row.innerHTML = `
        <div class="rms-cli-sess-status rms-cli-sess-status--${scls}">${{not_started:"●",in_progress:"▶",paused:"⏸"}[task.status]||"●"}</div>
        <div class="rms-cli-sess-name">${task.task_name}</div>
        <div class="rms-cli-sess-meta">${task.estimated_effort} · ${task.cognitive_load} load</div>`;
      sessCard.appendChild(row);
    });
  }
  frag.appendChild(sessCard);

  // Latest note
  if (notes.length > 0) {
    const noteCard = el("div", "rms-cli-card");
    const n = notes[0];
    noteCard.innerHTML = `
      <div class="rms-cli-card__title">📝 Latest Clinician Note</div>
      <div class="rms-cli-note-preview">
        <div class="rms-cli-note-text">${n.note}</div>
        <div class="rms-cli-note-meta">${n.clinician} · ${fmtDate(n.created_at)}</div>
      </div>`;
    frag.appendChild(noteCard);
  }

  return frag;
}

// ─────────────────────────────────────────────
// METRICS TAB
// ─────────────────────────────────────────────

function buildMetrics(state, history) {
  const frag = document.createDocumentFragment();

  // Live grid
  const live = el("div", "rms-cli-card");
  live.innerHTML = `<div class="rms-cli-card__title">⚡ Live Patient Metrics</div>`;
  const grid = el("div", "rms-cli-metrics-grid");
  [
    { key:"energy_level",    label:"Recovery Energy", icon:"⚡", unit:"/10", invert:false },
    { key:"focus_level",     label:"Rest Quality",    icon:"😴", unit:"/10", invert:false },
    { key:"overwhelm_level", label:"Fatigue Level",   icon:"🔋", unit:"/10", invert:true  },
    { key:"motivation_state",label:"Recovery Status", icon:"🟢", unit:"",    invert:false },
    { key:"task_load",       label:"Session Load",    icon:"📦", unit:"",    invert:false }
  ].forEach(({ key, label, icon, unit, invert }) => {
    const val = state[key] ?? "—";
    const num = typeof val === "number" ? val : null;
    let ind = "";
    if (num !== null) ind = invert ? (num>6?"🔴":num>4?"🟡":"🟢") : (num<3?"🔴":num<5?"🟡":"🟢");
    const cell = el("div","rms-cli-metric-cell");
    cell.innerHTML = `<div class="rms-cli-metric-cell__icon">${icon}</div><div class="rms-cli-metric-cell__val">${val}${unit} ${ind}</div><div class="rms-cli-metric-cell__lbl">${label}</div>`;
    grid.appendChild(cell);
  });
  live.appendChild(grid);
  frag.appendChild(live);

  // All 3 trend charts
  const trendsCard = el("div", "rms-cli-card");
  trendsCard.innerHTML = `<div class="rms-cli-card__title">📈 7-Day Metric Trends</div>`;
  [
    { key:"energy_level",    label:"Recovery Energy", color:"#34d399" },
    { key:"focus_level",     label:"Rest Quality",    color:"#5b72e8" },
    { key:"overwhelm_level", label:"Fatigue Level",   color:"#e05c6e" }
  ].forEach(({ key, label, color }) => {
    const wrap = el("div");
    wrap.style.marginBottom = "20px";
    const lbl = el("div","rms-cli-trend-lbl");
    lbl.textContent = label;
    lbl.style.color = color;
    wrap.appendChild(lbl);
    wrap.appendChild(buildSparkline(history, key, color));
    trendsCard.appendChild(wrap);
  });
  frag.appendChild(trendsCard);

  // Data recency
  const recCard = el("div", "rms-cli-card");
  recCard.innerHTML = `
    <div class="rms-cli-card__title">🕐 Data Recency</div>
    <div class="rms-cli-info-row"><span>Last patient update</span><b>${state.last_updated ? new Date(state.last_updated).toLocaleString("en-GB") : "Not recorded"}</b></div>
    <div class="rms-cli-info-row"><span>History snapshots</span><b>${history.length} recorded</b></div>
    <div class="rms-cli-info-row"><span>Monitoring status</span><b>🟢 Active</b></div>`;
  frag.appendChild(recCard);

  return frag;
}

// ─────────────────────────────────────────────
// SESSIONS TAB
// ─────────────────────────────────────────────

function buildSessions(tasks) {
  const frag = document.createDocumentFragment();

  const groups = { in_progress:{label:"In Progress",icon:"▶",cls:"active"}, not_started:{label:"Pending",icon:"○",cls:"pending"}, paused:{label:"Paused",icon:"⏸",cls:"paused"}, completed:{label:"Completed",icon:"●",cls:"done"} };
  const statsRow = el("div","rms-cli-stats-row");
  Object.entries(groups).forEach(([status,{label,icon}]) => {
    const count = tasks.filter(t=>t.status===status).length;
    const c = el("div","rms-cli-stat-card");
    c.innerHTML = `<div class="rms-cli-stat-icon">${icon}</div><div class="rms-cli-stat-val">${count}</div><div class="rms-cli-stat-lbl">${label}</div>`;
    statsRow.appendChild(c);
  });
  frag.appendChild(statsRow);

  const card = el("div","rms-cli-card");
  card.innerHTML = `<div class="rms-cli-card__title">📋 All Recovery Sessions</div>`;
  if (!tasks.length) { card.innerHTML += `<div class="rms-cli-empty-sm">No sessions logged yet.</div>`; }
  else {
    const table = el("table","rms-cli-table");
    table.innerHTML = `<thead><tr><th>Session Name</th><th>Status</th><th>Effort</th><th>Load</th><th>Priority</th><th>Updated</th></tr></thead>`;
    const tbody = el("tbody");
    tasks.forEach(task => {
      const { label, icon, cls } = groups[task.status]||{label:task.status,icon:"○",cls:""};
      const tr = el("tr");
      tr.innerHTML = `
        <td>${task.task_name}</td>
        <td><span class="rms-cli-tag rms-cli-tag--${cls}">${icon} ${label}</span></td>
        <td>${task.estimated_effort}</td>
        <td>${task.cognitive_load}</td>
        <td>${task.priority}</td>
        <td>${task.updated_at ? fmtDate(task.updated_at) : "—"}</td>`;
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

function buildNotes(pt, notes) {
  const frag = document.createDocumentFragment();

  const formCard = el("div","rms-cli-card");
  formCard.innerHTML = `
    <div class="rms-cli-card__title">📝 Add Clinician Note — ${pt.name}</div>
    <textarea class="rms-cli-textarea" id="note-input" rows="3" placeholder="Enter observation, instruction, or note…"></textarea>
    <div class="rms-cli-form-row">
      <select class="rms-cli-select" id="note-cli">
        <option>Dr. Sarah Clarke</option>
        <option>Dr. James Okafor</option>
        <option>Physiotherapist</option>
        <option>Nurse Practitioner</option>
      </select>
      <button class="rms-cli-btn rms-cli-btn--primary" id="note-save">Add Note</button>
    </div>`;
  formCard.querySelector("#note-save").addEventListener("click", () => {
    const text = formCard.querySelector("#note-input").value.trim();
    const cli  = formCard.querySelector("#note-cli").value;
    if (!text) return;
    saveNote(pt.id, text, cli);
    render();
  });
  frag.appendChild(formCard);

  const listCard = el("div","rms-cli-card");
  listCard.innerHTML = `<div class="rms-cli-card__title">📋 All Notes (${notes.length})</div>`;
  if (!notes.length) { listCard.innerHTML += `<div class="rms-cli-empty-sm">No notes recorded yet.</div>`; }
  else {
    notes.forEach(n => {
      const d = el("div","rms-cli-note-item");
      d.innerHTML = `<div class="rms-cli-note-text">${n.note}</div><div class="rms-cli-note-meta">${n.clinician} · ${new Date(n.created_at).toLocaleString("en-GB")}</div>`;
      listCard.appendChild(d);
    });
  }
  frag.appendChild(listCard);
  return frag;
}

// ─────────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────────

function buildHistory(history) {
  const frag = document.createDocumentFragment();
  const card = el("div","rms-cli-card");
  card.innerHTML = `<div class="rms-cli-card__title">🗂 Full State History (${history.length} snapshots)</div>`;
  if (!history.length) { card.innerHTML += `<div class="rms-cli-empty-sm">No history yet.</div>`; }
  else {
    const table = el("table","rms-cli-table");
    table.innerHTML = `<thead><tr><th>Date / Time</th><th>Energy</th><th>Rest Quality</th><th>Fatigue</th><th>Status</th></tr></thead>`;
    const tbody = el("tbody");
    [...history].reverse().forEach(snap => {
      const tr = el("tr");
      if (snap.overwhelm_level > 6) tr.className = "rms-cli-row--alert";
      else if (snap.energy_level < 3) tr.className = "rms-cli-row--warn";
      tr.innerHTML = `
        <td>${new Date(snap.captured_at).toLocaleString("en-GB")}</td>
        <td>${snap.energy_level}/10</td>
        <td>${snap.focus_level}/10</td>
        <td>${snap.overwhelm_level}/10</td>
        <td>${statusLabel(snap.motivation_state)}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);
  }
  frag.appendChild(card);
  return frag;
}

// ─────────────────────────────────────────────
// SPARKLINE (SVG)
// ─────────────────────────────────────────────

function buildSparkline(history, key, color) {
  const recent = history.slice(-7);
  if (recent.length < 2) {
    const p = el("p","rms-cli-empty-sm");
    p.textContent = "Not enough data yet.";
    return p;
  }
  const W=520, H=80, pad=18;
  const vals   = recent.map(s => s[key]||0);
  const xStep  = (W-pad*2)/(vals.length-1);
  const points = vals.map((v,i)=>`${pad+i*xStep},${pad+((10-v)/10)*(H-pad*2)}`).join(" ");
  const first  = `${pad},${H-pad}`;
  const last   = `${pad+(vals.length-1)*xStep},${H-pad}`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  svg.setAttribute("width","100%");
  svg.setAttribute("height","80");

  // Grid
  [2,4,6,8,10].forEach(v=>{
    const y = pad+((10-v)/10)*(H-pad*2);
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1",pad); line.setAttribute("y1",y);
    line.setAttribute("x2",W-pad); line.setAttribute("y2",y);
    line.setAttribute("stroke","#1e2440"); line.setAttribute("stroke-width","1");
    svg.appendChild(line);
  });

  // Area fill
  const area = document.createElementNS("http://www.w3.org/2000/svg","path");
  area.setAttribute("d",`M${first} L${points.split(" ").join(" L")} L${last} Z`);
  area.setAttribute("fill",color); area.setAttribute("fill-opacity","0.1");
  svg.appendChild(area);

  // Line
  const poly = document.createElementNS("http://www.w3.org/2000/svg","polyline");
  poly.setAttribute("points",points); poly.setAttribute("fill","none");
  poly.setAttribute("stroke",color); poly.setAttribute("stroke-width","2");
  poly.setAttribute("stroke-linecap","round"); poly.setAttribute("stroke-linejoin","round");
  svg.appendChild(poly);

  // Dots + labels
  vals.forEach((v,i)=>{
    const x = pad+i*xStep;
    const y = pad+((10-v)/10)*(H-pad*2);
    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx",x); c.setAttribute("cy",y); c.setAttribute("r","4");
    c.setAttribute("fill",color); c.setAttribute("stroke","#0b1120"); c.setAttribute("stroke-width","2");
    svg.appendChild(c);
    const t = document.createElementNS("http://www.w3.org/2000/svg","text");
    t.setAttribute("x",x); t.setAttribute("y",y-8); t.setAttribute("text-anchor","middle");
    t.setAttribute("font-size","10"); t.setAttribute("fill",color); t.setAttribute("font-family","Inter,sans-serif");
    t.textContent = v;
    svg.appendChild(t);
    const d = document.createElementNS("http://www.w3.org/2000/svg","text");
    d.setAttribute("x",x); d.setAttribute("y",H-2); d.setAttribute("text-anchor","middle");
    d.setAttribute("font-size","9"); d.setAttribute("fill","#5a6180"); d.setAttribute("font-family","Inter,sans-serif");
    d.textContent = new Date(recent[i].captured_at).toLocaleDateString("en-GB",{weekday:"short"});
    svg.appendChild(d);
  });
  return svg;
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function alertLevel(s) { if (!s) return "ok"; if (s.overwhelm_level>7||s.energy_level<2) return "alert"; if (s.overwhelm_level>5||s.energy_level<4) return "warn"; return "ok"; }
function _alertCount(pts) { return pts.filter(p=>{ const s=getState(p.id); return s.overwhelm_level>5||s.energy_level<4; }).length; }
function statusLabel(v) { return { starting:"Initialising", stuck:"Stalled", flowing:"In Recovery", fatigued:"Fatigued" }[v] || (v||"—"); }
function initials(name) { return (name||"").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(); }
function avatarColor(id) { const c=["#5b72e8","#3ecfb2","#8b6cf7","#f59e0b","#e05c6e","#34d399"]; return c[parseInt((id||"0").replace(/\D/g,""),10)%c.length]; }
function fmtDate(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); } catch { return iso; } }
function fmtDOB(dob) { if (!dob) return "—"; const d=new Date(dob); const age=Math.floor((Date.now()-d)/(365.25*86400000)); return `${d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} (${age}y)`; }
