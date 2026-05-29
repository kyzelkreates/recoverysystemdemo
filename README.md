# Recovery Monitor System

> A monitoring and visualisation system for recovery, rest, performance, and reset cycles.
> **NOT a medical device. NOT a diagnostic tool. Monitoring and personal use only.**

---

## What This Is

Recovery Monitor System is a structured recovery dashboard. It helps you:

- Track recovery energy, rest quality, and fatigue in real time
- Follow structured morning, midday, and evening recovery cycles
- Log and complete reset sessions with guided step-by-step sequences
- Monitor recovery trends and status across your day
- Receive intelligent next-action recommendations based on your current state

---

## What's New: Recovery Guide AI (Onboarding Tour)

An AI-guided onboarding tour is built into the system. It:

- **Auto-triggers** for first-time users
- **Offers Start / Skip** at launch
- **Highlights each UI section** with a spotlight and tooltip
- **Explains every area** in calm, structured language
- **Accessible anytime** via the `? Guide` button in the top bar or via Settings

### Tour Storage Keys
| Key | Purpose |
|-----|---------|
| `recoverymonitor_tour_completed` | Whether tour has been completed |
| `recoverymonitor_tour_step` | Last step index (for resume) |
| `recoverymonitor_tour_version` | Tour version (triggers re-show on update) |

---

## System Architecture

```
recovery-monitor/
├── index.html               ← App entry point (PWA-ready)
│
├── core/                    ← Data models and storage (unchanged)
│   ├── storage.js
│   ├── state.js
│   ├── tasks.js
│   └── routines.js
│
├── engine/                  ← Recovery engines (unchanged)
│   ├── cognitive-engine.js
│   └── routine-engine.js
│
├── ui/                      ← User interface
│   ├── ndos.css             ← Core design system (unchanged)
│   ├── tour.css             ← Tour overlay, spotlight, tooltip styles [NEW]
│   ├── dashboard.js         ← Rebranded Recovery Monitor dashboard [UPDATED]
│   └── tour.js              ← Recovery Guide AI tour engine [NEW]
│
└── pwa/                     ← PWA
    ├── manifest.json        ← Updated for Recovery Monitor System
    └── sw.js
```

---

## Recovery Dashboard Views

| View | Label | Description |
|------|-------|-------------|
| `focus` | Recovery Dashboard | Live metrics, recovery focus board, next-action recommendations |
| `routines` | Monitoring Panels | Morning Recovery, Midday Reset, Evening Wind-Down cycles |
| `reset` | Reset Sessions | Structured reset sequence + activation prompts |
| `settings` | Settings | Session management, tour access, system info |

---

## Monitoring Metrics

| Metric | Range | Description |
|--------|-------|-------------|
| Recovery Energy | 0–10 | Current energy and capacity level |
| Rest Quality | 0–10 | How recovered and rested you feel |
| Fatigue Level | 0–10 | Accumulated tiredness indicator |
| Status | Enum | Initialising / Stalled / In Recovery / Fatigued |

---

## Recovery Cycles (Monitoring Panels)

| Cycle | Time | Description |
|-------|------|-------------|
| Morning Recovery | AM | Initialise recovery cycle, set daily baseline |
| Midday Reset | Midday | Mid-cycle check-in and recalibration |
| Evening Wind-Down | PM | Close cycle, log progress, prepare for rest |

---

## Quick Start

```html
<link rel="stylesheet" href="recovery-monitor/ui/ndos.css" />
<link rel="stylesheet" href="recovery-monitor/ui/tour.css" />
<div id="ndos-root"></div>

<script type="module">
  import { mountDashboard } from "./recovery-monitor/ui/dashboard.js";
  import { initTour } from "./recovery-monitor/ui/tour.js";

  mountDashboard(document.getElementById("ndos-root"));
  initTour(); // Auto-triggers for first-time users
</script>
```

To manually launch the tour:
```js
import { startTour } from "./recovery-monitor/ui/tour.js";
startTour(true); // true = always start from step 0
```

---

## Important Disclaimer

Recovery Monitor System is a personal monitoring and self-organisation tool.

- It is **NOT** a medical device
- It does **NOT** diagnose any condition
- It does **NOT** provide clinical treatment or therapy
- It does **NOT** replace professional medical support

For clinical support, please speak to a qualified professional.

---

## Architecture Contract (Inherited + Extended)

1. **One global state store** — `storage.js` — unchanged
2. **Tour state is localStorage-only** — no server calls
3. **Tour layer is additive** — zero impact on core logic
4. **Rebrand is surface-only** — identifiers, class names, and core APIs preserved
5. **No LLM API calls** — tour content is fully static, embedded in tour.js
