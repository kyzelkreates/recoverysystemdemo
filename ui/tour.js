// Recovery Monitor System — ui/tour.js
// Recovery Guide AI — Intelligent Onboarding Tour System
// Calm, structured, step-by-step guided tour
// NOT a medical device. Monitoring and personal use only.

// ─────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────

const TOUR_KEYS = {
  COMPLETED: "recoverymonitor_tour_completed",
  STEP:      "recoverymonitor_tour_step",
  VERSION:   "recoverymonitor_tour_version"
};

const TOUR_VERSION = "1.0";

// ─────────────────────────────────────────────
// TOUR STEPS
// ─────────────────────────────────────────────

const TOUR_STEPS = [
  {
    id:       "welcome",
    target:   "[data-tour='topbar']",
    position: "bottom",
    title:    "Welcome to Recovery Monitor System",
    icon:     "🟢",
    message:  "I'm your Recovery Guide AI. I'll walk you through this monitoring system — clearly and calmly. This dashboard is your central control centre for tracking recovery, rest cycles, and reset sessions.",
    tip:      "You can revisit this tour anytime via the ? Guide button in the top bar, or through Settings."
  },
  {
    id:       "sidebar",
    target:   "[data-tour='sidebar']",
    position: "right",
    title:    "System Navigation",
    icon:     "📍",
    message:  "The sidebar gives you access to all four system modules: Recovery Dashboard, Monitoring Panels, Reset Sessions, and Settings. Each section serves a distinct role in your recovery monitoring cycle.",
    tip:      "Your current active view is highlighted. Navigation persists your state between views."
  },
  {
    id:       "metrics",
    target:   "[data-tour='metrics']",
    position: "bottom",
    title:    "Live Monitoring Metrics",
    icon:     "📈",
    message:  "These are your real-time monitoring inputs. Recovery Energy tracks your current capacity. Rest Quality reflects how recovered you feel. Fatigue Level monitors accumulated tiredness. Adjust these sliders to reflect your current state — the system responds to your inputs.",
    tip:      "Your status selector (Initialising / Stalled / In Recovery / Fatigued) helps the system recommend the right actions."
  },
  {
    id:       "monitoring-panels",
    target:   "[data-tour='topbar']",
    position: "bottom",
    title:    "Monitoring Panels — Recovery Cycles",
    icon:     "🔄",
    message:  "The Monitoring Panels section contains three structured recovery cycles: Morning Recovery (initialise your day), Midday Reset (mid-cycle recalibration), and Evening Wind-Down (close the cycle and prepare for rest). Each cycle is adaptive — steps adjust based on your current state.",
    tip:      "Navigate to Monitoring Panels using the sidebar to access and start a recovery cycle."
  },
  {
    id:       "reset-sessions",
    target:   "[data-tour='topbar']",
    position: "bottom",
    title:    "Reset Sessions",
    icon:     "⚡",
    message:  "Reset Sessions give you a structured sequence to follow when your recovery state needs a manual reset. Each step is timed and ordered — work through them at your own pace. Activation prompts help re-engage your system when you feel stalled or fatigued.",
    tip:      "Navigate to Reset Sessions in the sidebar. Use these whenever your metrics indicate a stalled or fatigued state."
  },
  {
    id:       "settings",
    target:   "[data-tour='topbar']",
    position: "bottom",
    title:    "Settings & Controls",
    icon:     "⚙️",
    message:  "Settings gives you control over session management and system preferences. You can clear completed recovery sessions, and access this guided tour again at any time. The system stores all data locally — nothing leaves your device.",
    tip:      "You can always relaunch this tour from the Settings panel or the ? Guide button in the top bar."
  }
];

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

let _tourActive   = false;
let _currentStep  = 0;
let _overlay      = null;
let _tooltipEl    = null;
let _spotlightEl  = null;

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

/**
 * initTour — called on app load.
 * Auto-triggers for first-time users (no completed flag in localStorage).
 * Shows a welcome prompt with Start / Skip options.
 */
export function initTour() {
  const completed = localStorage.getItem(TOUR_KEYS.COMPLETED);
  const version   = localStorage.getItem(TOUR_KEYS.VERSION);

  // Auto-trigger for new users or new version
  if (!completed || version !== TOUR_VERSION) {
    // Small delay so dashboard fully renders first
    setTimeout(() => _showWelcomePrompt(), 600);
  }
}

/**
 * startTour — manually trigger tour (from help button or settings).
 * @param {boolean} force — if true, always start from step 0
 */
export function startTour(force = false) {
  const savedStep = parseInt(localStorage.getItem(TOUR_KEYS.STEP) || "0", 10);
  _currentStep = force ? 0 : (savedStep || 0);
  _beginTour();
}

// ─────────────────────────────────────────────
// WELCOME PROMPT
// ─────────────────────────────────────────────

function _showWelcomePrompt() {
  const backdrop = document.createElement("div");
  backdrop.id = "rms-tour-welcome";
  backdrop.className = "rms-tour-welcome-backdrop";

  const card = document.createElement("div");
  card.className = "rms-tour-welcome-card rms-tour-anim-in";
  card.innerHTML = `
    <div class="rms-tour-welcome-icon">🟢</div>
    <div class="rms-tour-welcome-title">Welcome to Recovery Monitor System</div>
    <div class="rms-tour-welcome-body">
      I'm your <strong>Recovery Guide AI</strong> — a calm, structured assistant that will walk you through this dashboard.
      <br><br>
      Would you like a brief guided tour of the monitoring system?
    </div>
    <div class="rms-tour-welcome-actions">
      <button class="rms-tour-btn rms-tour-btn--primary" id="rms-tour-start">Start guided tour</button>
      <button class="rms-tour-btn rms-tour-btn--ghost" id="rms-tour-skip">Skip for now</button>
    </div>
    <div class="rms-tour-welcome-note">You can relaunch the tour anytime via the <strong>? Guide</strong> button.</div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  card.querySelector("#rms-tour-start").addEventListener("click", () => {
    backdrop.remove();
    _currentStep = 0;
    _beginTour();
  });

  card.querySelector("#rms-tour-skip").addEventListener("click", () => {
    _markTourComplete();
    backdrop.classList.add("rms-tour-anim-out");
    setTimeout(() => backdrop.remove(), 300);
  });
}

// ─────────────────────────────────────────────
// TOUR ENGINE
// ─────────────────────────────────────────────

function _beginTour() {
  if (_tourActive) _destroyTour();
  _tourActive = true;

  // Build overlay
  _overlay = document.createElement("div");
  _overlay.id = "rms-tour-overlay";
  _overlay.className = "rms-tour-overlay";

  // Build spotlight
  _spotlightEl = document.createElement("div");
  _spotlightEl.id = "rms-tour-spotlight";
  _spotlightEl.className = "rms-tour-spotlight";

  // Build tooltip
  _tooltipEl = document.createElement("div");
  _tooltipEl.id = "rms-tour-tooltip";
  _tooltipEl.className = "rms-tour-tooltip";

  document.body.appendChild(_overlay);
  document.body.appendChild(_spotlightEl);
  document.body.appendChild(_tooltipEl);

  // ESC to exit
  document.addEventListener("keydown", _handleEsc);

  _renderStep(_currentStep);
}

function _renderStep(stepIndex) {
  if (stepIndex >= TOUR_STEPS.length) {
    _completeTour();
    return;
  }

  _currentStep = stepIndex;
  localStorage.setItem(TOUR_KEYS.STEP, stepIndex);

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === TOUR_STEPS.length - 1;

  // ── Spotlight target ─────────────────────
  const targetEl = step.target ? document.querySelector(step.target) : null;

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;
    _spotlightEl.style.cssText = `
      top:    ${rect.top    - pad + window.scrollY}px;
      left:   ${rect.left   - pad + window.scrollX}px;
      width:  ${rect.width  + pad * 2}px;
      height: ${rect.height + pad * 2}px;
      opacity: 1;
      border-radius: 12px;
    `;
  } else {
    _spotlightEl.style.cssText = "opacity: 0; width: 0; height: 0;";
  }

  // ── Tooltip content ──────────────────────
  _tooltipEl.innerHTML = `
    <div class="rms-tour-tooltip__header">
      <span class="rms-tour-tooltip__icon">${step.icon}</span>
      <span class="rms-tour-tooltip__title">${step.title}</span>
      <button class="rms-tour-tooltip__close" id="rms-tour-close" title="Exit tour">✕</button>
    </div>
    <div class="rms-tour-tooltip__body">
      <p class="rms-tour-tooltip__message">${step.message}</p>
      ${step.tip ? `<div class="rms-tour-tooltip__tip">💡 ${step.tip}</div>` : ""}
    </div>
    <div class="rms-tour-tooltip__footer">
      <div class="rms-tour-tooltip__progress">
        ${TOUR_STEPS.map((_, i) =>
          `<div class="rms-tour-tooltip__dot${i === stepIndex ? " active" : i < stepIndex ? " done" : ""}"></div>`
        ).join("")}
      </div>
      <div class="rms-tour-tooltip__controls">
        ${!isFirst ? `<button class="rms-tour-btn rms-tour-btn--ghost" id="rms-tour-back">← Back</button>` : ""}
        <button class="rms-tour-btn rms-tour-btn--primary" id="rms-tour-next">
          ${isLast ? "Finish tour" : "Next →"}
        </button>
      </div>
    </div>
  `;

  // ── Position tooltip ─────────────────────
  _positionTooltip(targetEl, step.position);

  // ── Bind controls ─────────────────────────
  _tooltipEl.querySelector("#rms-tour-close")?.addEventListener("click", () => {
    _destroyTour();
    _markTourComplete();
  });

  _tooltipEl.querySelector("#rms-tour-next")?.addEventListener("click", () => {
    _tooltipEl.classList.add("rms-tour-slide-out");
    setTimeout(() => {
      _tooltipEl.classList.remove("rms-tour-slide-out");
      if (isLast) { _completeTour(); }
      else { _renderStep(stepIndex + 1); }
    }, 180);
  });

  _tooltipEl.querySelector("#rms-tour-back")?.addEventListener("click", () => {
    _tooltipEl.classList.add("rms-tour-slide-out");
    setTimeout(() => {
      _tooltipEl.classList.remove("rms-tour-slide-out");
      _renderStep(stepIndex - 1);
    }, 180);
  });

  // Animate in
  _tooltipEl.classList.remove("rms-tour-anim-in");
  void _tooltipEl.offsetWidth; // force reflow
  _tooltipEl.classList.add("rms-tour-anim-in");
}

// ─────────────────────────────────────────────
// TOOLTIP POSITIONING
// ─────────────────────────────────────────────

function _positionTooltip(targetEl, preferredPosition) {
  const TOOLTIP_W = 380;
  const TOOLTIP_H = 260; // estimate
  const PAD       = 20;
  const vw        = window.innerWidth;
  const vh        = window.innerHeight;

  let top, left;

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();

    switch (preferredPosition) {
      case "bottom":
        top  = rect.bottom + PAD + window.scrollY;
        left = rect.left + window.scrollX;
        break;
      case "top":
        top  = rect.top - TOOLTIP_H - PAD + window.scrollY;
        left = rect.left + window.scrollX;
        break;
      case "right":
        top  = rect.top + window.scrollY;
        left = rect.right + PAD + window.scrollX;
        break;
      case "left":
        top  = rect.top + window.scrollY;
        left = rect.left - TOOLTIP_W - PAD + window.scrollX;
        break;
      default:
        top  = rect.bottom + PAD + window.scrollY;
        left = rect.left + window.scrollX;
    }
  } else {
    // Centre screen fallback
    top  = vh / 2 - TOOLTIP_H / 2;
    left = vw / 2 - TOOLTIP_W / 2;
  }

  // Clamp within viewport
  left = Math.max(PAD, Math.min(left, vw - TOOLTIP_W - PAD));
  top  = Math.max(PAD + window.scrollY, top);

  _tooltipEl.style.cssText = `
    position: absolute;
    top:  ${top}px;
    left: ${left}px;
    width: ${TOOLTIP_W}px;
    z-index: 10002;
  `;
}

// ─────────────────────────────────────────────
// TOUR COMPLETION
// ─────────────────────────────────────────────

function _completeTour() {
  _destroyTour();
  _markTourComplete();
  _showCompletionBadge();
}

function _showCompletionBadge() {
  const badge = document.createElement("div");
  badge.className = "rms-tour-complete-badge rms-tour-anim-in";
  badge.innerHTML = `
    <div class="rms-tour-complete-badge__icon">✅</div>
    <div class="rms-tour-complete-badge__text">
      <strong>Tour complete</strong>
      <span>You're ready to use Recovery Monitor System.</span>
    </div>
    <button class="rms-tour-complete-badge__close" id="rms-badge-close">✕</button>
  `;
  document.body.appendChild(badge);

  const dismiss = () => {
    badge.classList.add("rms-tour-anim-out");
    setTimeout(() => badge.remove(), 300);
  };

  badge.querySelector("#rms-badge-close").addEventListener("click", dismiss);
  setTimeout(dismiss, 4000);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function _destroyTour() {
  _tourActive = false;
  _overlay?.remove();    _overlay    = null;
  _spotlightEl?.remove(); _spotlightEl = null;
  _tooltipEl?.remove();  _tooltipEl  = null;
  document.removeEventListener("keydown", _handleEsc);
}

function _markTourComplete() {
  localStorage.setItem(TOUR_KEYS.COMPLETED, "true");
  localStorage.setItem(TOUR_KEYS.VERSION, TOUR_VERSION);
  localStorage.removeItem(TOUR_KEYS.STEP);
}

function _handleEsc(e) {
  if (e.key === "Escape") {
    _destroyTour();
    _markTourComplete();
  }
}
