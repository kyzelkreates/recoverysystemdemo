// Recovery Monitor System — core/patients.js
// Multi-patient data layer for Clinician Dashboard
// Each patient stores their own keyed state in localStorage
// NOT a medical device. Monitoring only.

import { storage, rawLog } from "./storage.js";

// ─────────────────────────────────────────────
// PATIENT REGISTRY KEY
// ─────────────────────────────────────────────

const PATIENTS_KEY  = "rms_patients";
const ACTIVE_PT_KEY = "rms_active_patient";

// ─────────────────────────────────────────────
// SEED PATIENTS (demo data)
// ─────────────────────────────────────────────

const SEED_PATIENTS = [
  {
    id: "pt-001",
    name: "Alex Johnson",
    dob: "1989-03-14",
    ref: "RMS-2024-001",
    clinician: "Dr. Sarah Clarke",
    programme: "Post-Surgical Recovery",
    enrolled: "2026-04-01",
    notes: "Recovering from ACL reconstruction. Focus on gradual load increase."
  },
  {
    id: "pt-002",
    name: "Maria Santos",
    dob: "1995-07-22",
    ref: "RMS-2024-002",
    clinician: "Dr. Sarah Clarke",
    programme: "Fatigue Management",
    enrolled: "2026-04-10",
    notes: "Chronic fatigue syndrome management programme. Monitor rest cycle compliance."
  },
  {
    id: "pt-003",
    name: "David Chen",
    dob: "1978-11-05",
    ref: "RMS-2024-003",
    clinician: "Dr. James Okafor",
    programme: "Stress & Recovery",
    enrolled: "2026-05-01",
    notes: "Occupational burnout recovery. Prioritise sleep and energy monitoring."
  },
  {
    id: "pt-004",
    name: "Priya Nair",
    dob: "2001-02-18",
    ref: "RMS-2024-004",
    clinician: "Dr. Sarah Clarke",
    programme: "Post-Surgical Recovery",
    enrolled: "2026-05-15",
    notes: "Post-operative cardiac monitoring. Strict fatigue ceiling in place."
  }
];

// ─────────────────────────────────────────────
// SEED STATE HISTORY (simulated multi-day)
// ─────────────────────────────────────────────

function _generateHistory(patientId) {
  const profiles = {
    "pt-001": { energy: [4,5,5,6,6,7,7], focus: [5,5,6,6,7,7,8], overwhelm: [5,4,4,3,3,2,2] },
    "pt-002": { energy: [3,3,4,3,4,4,5], focus: [4,4,4,5,4,5,5], overwhelm: [6,6,5,6,5,5,4] },
    "pt-003": { energy: [5,6,6,7,6,7,8], focus: [6,6,7,7,7,8,8], overwhelm: [4,4,3,3,3,2,2] },
    "pt-004": { energy: [2,2,3,3,3,4,4], focus: [3,4,4,4,5,4,5], overwhelm: [7,7,6,6,6,5,5] }
  };

  const p = profiles[patientId] || profiles["pt-001"];
  const statuses = ["Initialising","Stalled","In Recovery","In Recovery","Stalled","In Recovery","Flowing"];
  const now = Date.now();

  return p.energy.map((e, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return {
      snapshot_id:      `snap-${patientId}-${i}`,
      captured_at:      d.toISOString(),
      energy_level:     e,
      focus_level:      p.focus[i],
      overwhelm_level:  p.overwhelm[i],
      motivation_state: statuses[i],
      task_load:        i < 3 ? "medium" : "low"
    };
  });
}

function _generateTasks(patientId) {
  const sets = {
    "pt-001": [
      { task_name: "Morning mobility session", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Ice & elevation protocol", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Physiotherapy exercises", status: "in_progress", estimated_effort: "medium", cognitive_load: "medium" },
      { task_name: "Log pain levels", status: "not_started", estimated_effort: "small", cognitive_load: "low" }
    ],
    "pt-002": [
      { task_name: "Pacing activity log", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Rest cycle — 90 min block", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Gentle walk (10 min)", status: "in_progress", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Evening wind-down routine", status: "not_started", estimated_effort: "small", cognitive_load: "low" }
    ],
    "pt-003": [
      { task_name: "Mindfulness session (15 min)", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Work boundary review", status: "in_progress", estimated_effort: "medium", cognitive_load: "high" },
      { task_name: "Sleep hygiene checklist", status: "not_started", estimated_effort: "small", cognitive_load: "low" }
    ],
    "pt-004": [
      { task_name: "Cardiac monitoring log", status: "completed", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Low-impact movement (5 min)", status: "in_progress", estimated_effort: "small", cognitive_load: "low" },
      { task_name: "Medication log", status: "not_started", estimated_effort: "small", cognitive_load: "low" }
    ]
  };

  return (sets[patientId] || sets["pt-001"]).map((t, i) => ({
    task_id:          `task-${patientId}-${i}`,
    task_name:        t.task_name,
    status:           t.status,
    estimated_effort: t.estimated_effort,
    cognitive_load:   t.cognitive_load,
    priority:         i + 1,
    created_at:       new Date(Date.now() - i * 3600000).toISOString(),
    updated_at:       new Date().toISOString()
  }));
}

// ─────────────────────────────────────────────
// INIT / SEED
// ─────────────────────────────────────────────

export function initPatients() {
  const existing = localStorage.getItem(PATIENTS_KEY);
  if (existing) return JSON.parse(existing);

  // Seed patients + their data
  SEED_PATIENTS.forEach((p) => {
    localStorage.setItem(`rms_pt_${p.id}_state`, JSON.stringify({
      energy_level:     5,
      focus_level:      5,
      overwhelm_level:  3,
      motivation_state: "Initialising",
      task_load:        "medium",
      last_updated:     new Date().toISOString()
    }));
    localStorage.setItem(`rms_pt_${p.id}_history`, JSON.stringify(_generateHistory(p.id)));
    localStorage.setItem(`rms_pt_${p.id}_tasks`,   JSON.stringify(_generateTasks(p.id)));
    localStorage.setItem(`rms_pt_${p.id}_events`,  JSON.stringify([]));
    localStorage.setItem(`rms_pt_${p.id}_notes`,   JSON.stringify([]));
  });

  localStorage.setItem(PATIENTS_KEY, JSON.stringify(SEED_PATIENTS));
  return SEED_PATIENTS;
}

// ─────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────

export function getPatients() {
  return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]");
}

export function getPatientById(id) {
  return getPatients().find((p) => p.id === id) || null;
}

export function getPatientState(id) {
  return JSON.parse(localStorage.getItem(`rms_pt_${id}_state`) || "null") || {
    energy_level: 5, focus_level: 5, overwhelm_level: 3,
    motivation_state: "Initialising", task_load: "medium", last_updated: null
  };
}

export function getPatientHistory(id) {
  return JSON.parse(localStorage.getItem(`rms_pt_${id}_history`) || "[]");
}

export function getPatientTasks(id) {
  return JSON.parse(localStorage.getItem(`rms_pt_${id}_tasks`) || "[]");
}

export function getPatientNotes(id) {
  return JSON.parse(localStorage.getItem(`rms_pt_${id}_notes`) || "[]");
}

// ─────────────────────────────────────────────
// WRITE (for live patient PWA sync)
// ─────────────────────────────────────────────

export function updatePatientState(id, state) {
  localStorage.setItem(`rms_pt_${id}_state`, JSON.stringify({
    ...state,
    last_updated: new Date().toISOString()
  }));
  // Append to history
  const history = getPatientHistory(id);
  history.push({ ...state, snapshot_id: crypto.randomUUID(), captured_at: new Date().toISOString() });
  if (history.length > 200) history.splice(0, history.length - 200);
  localStorage.setItem(`rms_pt_${id}_history`, JSON.stringify(history));
}

export function updatePatientTasks(id, tasks) {
  localStorage.setItem(`rms_pt_${id}_tasks`, JSON.stringify(tasks));
}

export function addClinicianNote(id, noteText, clinician) {
  const notes = getPatientNotes(id);
  notes.unshift({
    id:        crypto.randomUUID(),
    note:      noteText,
    clinician: clinician || "Clinician",
    created_at: new Date().toISOString()
  });
  localStorage.setItem(`rms_pt_${id}_notes`, JSON.stringify(notes));
}

// Active patient selection (for patient PWA)
export function getActivePatientId() {
  return localStorage.getItem(ACTIVE_PT_KEY) || "pt-001";
}

export function setActivePatientId(id) {
  localStorage.setItem(ACTIVE_PT_KEY, id);
}
