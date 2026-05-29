// Recovery Monitor System — core/patients.js
// Multi-patient data layer for Clinician Dashboard + Patient PWA
// All state stored in localStorage under per-patient keys
// NOT a medical device. Monitoring only.

// ─────────────────────────────────────────────
// KEYS
// ─────────────────────────────────────────────

const PATIENTS_KEY  = "rms_patients_v2";
const ACTIVE_PT_KEY = "rms_active_patient";

// ─────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────

const SEED_PATIENTS = [
  {
    id: "pt-001",
    name: "Alex Johnson",
    dob: "1989-03-14",
    ref: "RMS-2026-001",
    clinician: "Dr. Sarah Clarke",
    programme: "Post-Surgical Recovery",
    enrolled: "2026-04-01",
    notes: "Recovering from ACL reconstruction. Focus on gradual load increase and mobility restoration."
  },
  {
    id: "pt-002",
    name: "Maria Santos",
    dob: "1995-07-22",
    ref: "RMS-2026-002",
    clinician: "Dr. Sarah Clarke",
    programme: "Fatigue Management",
    enrolled: "2026-04-10",
    notes: "Chronic fatigue syndrome management. Monitor rest cycle compliance and pacing adherence."
  },
  {
    id: "pt-003",
    name: "David Chen",
    dob: "1978-11-05",
    ref: "RMS-2026-003",
    clinician: "Dr. James Okafor",
    programme: "Stress & Recovery",
    enrolled: "2026-05-01",
    notes: "Occupational burnout recovery. Prioritise sleep hygiene and energy boundary monitoring."
  },
  {
    id: "pt-004",
    name: "Priya Nair",
    dob: "2001-02-18",
    ref: "RMS-2026-004",
    clinician: "Dr. Sarah Clarke",
    programme: "Post-Surgical Recovery",
    enrolled: "2026-05-15",
    notes: "Post-operative cardiac monitoring. Strict fatigue ceiling in place — flag if overwhelm > 6."
  }
];

function _makeHistory(patientId) {
  const profiles = {
    "pt-001": { energy: [4,5,5,6,6,7,7], focus: [5,5,6,6,7,7,8], overwhelm: [5,4,4,3,3,2,2], status: ["starting","starting","flowing","flowing","flowing","flowing","flowing"] },
    "pt-002": { energy: [3,3,4,3,4,4,5], focus: [4,4,4,5,4,5,5], overwhelm: [6,6,5,6,5,5,4], status: ["stuck","stuck","starting","stuck","starting","starting","flowing"] },
    "pt-003": { energy: [5,6,6,7,6,7,8], focus: [6,6,7,7,7,8,8], overwhelm: [4,4,3,3,3,2,2], status: ["starting","flowing","flowing","flowing","flowing","flowing","flowing"] },
    "pt-004": { energy: [2,2,3,3,3,4,4], focus: [3,4,4,4,5,4,5], overwhelm: [7,7,6,6,6,5,5], status: ["stuck","stuck","stuck","starting","starting","starting","starting"] }
  };
  const p = profiles[patientId] || profiles["pt-001"];
  const now = Date.now();
  return p.energy.map((e, i) => ({
    snapshot_id:      `snap-${patientId}-${i}`,
    captured_at:      new Date(now - (6 - i) * 86400000).toISOString(),
    energy_level:     e,
    focus_level:      p.focus[i],
    overwhelm_level:  p.overwhelm[i],
    motivation_state: p.status[i],
    task_load:        i < 3 ? "medium" : "low"
  }));
}

function _makeTasks(patientId) {
  const sets = {
    "pt-001": [
      { task_name: "Morning mobility & stretching", status: "completed", estimated_effort: "small", cognitive_load: "low",    priority: 1 },
      { task_name: "Ice & elevation protocol",       status: "completed", estimated_effort: "small", cognitive_load: "low",    priority: 2 },
      { task_name: "Physiotherapy exercises",        status: "in_progress", estimated_effort: "medium", cognitive_load: "medium", priority: 3 },
      { task_name: "Pain & fatigue daily log",       status: "not_started", estimated_effort: "small", cognitive_load: "low",    priority: 4 },
      { task_name: "Hydrotherapy session",           status: "not_started", estimated_effort: "medium", cognitive_load: "low",    priority: 5 }
    ],
    "pt-002": [
      { task_name: "Pacing activity log",            status: "completed",   estimated_effort: "small", cognitive_load: "low",    priority: 1 },
      { task_name: "Structured rest block (90 min)", status: "completed",   estimated_effort: "small", cognitive_load: "low",    priority: 2 },
      { task_name: "Gentle walk (10 min)",           status: "in_progress", estimated_effort: "small", cognitive_load: "low",    priority: 3 },
      { task_name: "Evening wind-down routine",      status: "not_started", estimated_effort: "small", cognitive_load: "low",    priority: 4 }
    ],
    "pt-003": [
      { task_name: "Mindfulness session (15 min)",   status: "completed",   estimated_effort: "small",  cognitive_load: "low",  priority: 1 },
      { task_name: "Work boundary & limit review",   status: "in_progress", estimated_effort: "medium", cognitive_load: "high", priority: 2 },
      { task_name: "Sleep hygiene checklist",        status: "in_progress", estimated_effort: "small",  cognitive_load: "low",  priority: 3 },
      { task_name: "Digital detox block (1 hr)",     status: "not_started", estimated_effort: "small",  cognitive_load: "low",  priority: 4 }
    ],
    "pt-004": [
      { task_name: "Cardiac monitoring log",         status: "completed",   estimated_effort: "small", cognitive_load: "low",    priority: 1 },
      { task_name: "Low-impact movement (5 min)",    status: "in_progress", estimated_effort: "small", cognitive_load: "low",    priority: 2 },
      { task_name: "Medication & symptoms log",      status: "not_started", estimated_effort: "small", cognitive_load: "low",    priority: 3 },
      { task_name: "Breathwork session (10 min)",    status: "not_started", estimated_effort: "small", cognitive_load: "low",    priority: 4 }
    ]
  };
  const base = sets[patientId] || sets["pt-001"];
  return base.map((t, i) => ({
    task_id:          `task-${patientId}-${i}`,
    ...t,
    created_at:       new Date(Date.now() - (base.length - i) * 7200000).toISOString(),
    updated_at:       new Date(Date.now() - i * 1800000).toISOString()
  }));
}

function _makeCurrentState(patientId) {
  const defaults = {
    "pt-001": { energy_level: 7, focus_level: 8, overwhelm_level: 2, motivation_state: "flowing",  task_load: "low" },
    "pt-002": { energy_level: 5, focus_level: 5, overwhelm_level: 4, motivation_state: "starting", task_load: "medium" },
    "pt-003": { energy_level: 8, focus_level: 8, overwhelm_level: 2, motivation_state: "flowing",  task_load: "low" },
    "pt-004": { energy_level: 4, focus_level: 5, overwhelm_level: 5, motivation_state: "starting", task_load: "medium" }
  };
  return { ...(defaults[patientId] || defaults["pt-001"]), last_updated: new Date(Date.now() - 900000).toISOString() };
}

function _makeNotes(patientId) {
  const sets = {
    "pt-001": [
      { clinician: "Dr. Sarah Clarke",   note: "Good progress this week. Knee flexion improving — target 90° by end of next week. Continue current physio programme." },
      { clinician: "Physiotherapist",    note: "Completed full set of resistance band exercises today. Reported mild discomfort at 70° flexion — monitor." }
    ],
    "pt-002": [
      { clinician: "Dr. Sarah Clarke",   note: "Rest cycle compliance improved this week. Encourage patient to reduce screen time during rest blocks." },
      { clinician: "Dr. Sarah Clarke",   note: "Fatigue spike noted Tuesday — likely linked to over-exertion. Reinforced pacing strategy." }
    ],
    "pt-003": [
      { clinician: "Dr. James Okafor",   note: "Sleep improving — averaging 7 hrs. Work boundary review ongoing. Next session: discuss delegation strategy." },
      { clinician: "Nurse Practitioner", note: "BP and HR normal. No signs of physical deterioration. Stress markers reducing per weekly assessment." }
    ],
    "pt-004": [
      { clinician: "Dr. Sarah Clarke",   note: "IMPORTANT: Fatigue ceiling strictly enforced. Alert if overwhelm > 6 or energy < 3. Patient aware of limits." },
      { clinician: "Dr. Sarah Clarke",   note: "Week 2 post-op. Cardiac function stable. Mobility within prescribed range. Breathwork sessions helping." }
    ]
  };
  const base = sets[patientId] || [];
  return base.map((n, i) => ({
    id:         `note-${patientId}-${i}`,
    ...n,
    created_at: new Date(Date.now() - (base.length - i) * 86400000 * 2).toISOString()
  }));
}

// ─────────────────────────────────────────────
// INIT — always seeds if not present (v2 key = fresh)
// ─────────────────────────────────────────────

export function initPatients() {
  const existing = localStorage.getItem(PATIENTS_KEY);
  if (existing) {
    try { return JSON.parse(existing); } catch { /* fall through to reseed */ }
  }
  // Seed all patient data
  SEED_PATIENTS.forEach((p) => {
    localStorage.setItem(`rms_pt_${p.id}_state`,   JSON.stringify(_makeCurrentState(p.id)));
    localStorage.setItem(`rms_pt_${p.id}_history`, JSON.stringify(_makeHistory(p.id)));
    localStorage.setItem(`rms_pt_${p.id}_tasks`,   JSON.stringify(_makeTasks(p.id)));
    localStorage.setItem(`rms_pt_${p.id}_notes`,   JSON.stringify(_makeNotes(p.id)));
  });
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(SEED_PATIENTS));
  return SEED_PATIENTS;
}

// Force re-seed (used by settings reset)
export function reseedPatients() {
  localStorage.removeItem(PATIENTS_KEY);
  return initPatients();
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

export function getPatients() {
  try { return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]"); } catch { return []; }
}

export function getPatientById(id) {
  return getPatients().find(p => p.id === id) || null;
}

export function getPatientState(id) {
  try {
    const raw = localStorage.getItem(`rms_pt_${id}_state`);
    return raw ? JSON.parse(raw) : _makeCurrentState(id);
  } catch { return _makeCurrentState(id); }
}

export function getPatientHistory(id) {
  try {
    const raw = localStorage.getItem(`rms_pt_${id}_history`);
    return raw ? JSON.parse(raw) : _makeHistory(id);
  } catch { return _makeHistory(id); }
}

export function getPatientTasks(id) {
  try {
    const raw = localStorage.getItem(`rms_pt_${id}_tasks`);
    return raw ? JSON.parse(raw) : _makeTasks(id);
  } catch { return _makeTasks(id); }
}

export function getPatientNotes(id) {
  try {
    const raw = localStorage.getItem(`rms_pt_${id}_notes`);
    return raw ? JSON.parse(raw) : _makeNotes(id);
  } catch { return _makeNotes(id); }
}

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

export function updatePatientState(id, state) {
  const next = { ...state, last_updated: new Date().toISOString() };
  localStorage.setItem(`rms_pt_${id}_state`, JSON.stringify(next));
  // Append to history
  const history = getPatientHistory(id);
  history.push({ ...next, snapshot_id: crypto.randomUUID(), captured_at: new Date().toISOString() });
  if (history.length > 200) history.splice(0, history.length - 200);
  localStorage.setItem(`rms_pt_${id}_history`, JSON.stringify(history));
}

export function updatePatientTasks(id, tasks) {
  localStorage.setItem(`rms_pt_${id}_tasks`, JSON.stringify(tasks));
}

export function addClinicianNote(id, noteText, clinician) {
  const notes = getPatientNotes(id);
  notes.unshift({ id: crypto.randomUUID(), note: noteText, clinician: clinician || "Clinician", created_at: new Date().toISOString() });
  localStorage.setItem(`rms_pt_${id}_notes`, JSON.stringify(notes));
}

// Active patient selection
export function getActivePatientId() {
  return localStorage.getItem(ACTIVE_PT_KEY) || "pt-001";
}

export function setActivePatientId(id) {
  localStorage.setItem(ACTIVE_PT_KEY, id);
}
