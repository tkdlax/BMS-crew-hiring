export type ScheduleSlot = {
  startsAt: string;
  labelLocal?: string;
  labelTime?: string;
  localDate?: string;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function slotDayKey(slot: ScheduleSlot): string {
  return slot.localDate ?? slot.startsAt.slice(0, 10);
}

export function slotTimeLabel(slot: ScheduleSlot): string {
  if (slot.labelTime) return slot.labelTime;
  if (slot.labelLocal) {
    const parts = slot.labelLocal.split(", ");
    return parts[parts.length - 1] ?? slot.labelLocal;
  }
  return slot.startsAt;
}

export function groupSlotsByDay(slots: ScheduleSlot[]): Map<string, ScheduleSlot[]> {
  const map = new Map<string, ScheduleSlot[]>();
  for (const s of slots) {
    const day = slotDayKey(s);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(s);
  }
  return map;
}

/** Format an office-local YYYY-MM-DD for display (weekday is stable at UTC noon). */
export function formatDayLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function parseDay(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m! - 1, d: d! };
}

function isoFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function firstAvailableMonth(available: Set<string>): { year: number; month: number } {
  if (!available.size) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  const sorted = [...available].sort();
  const { y, m } = parseDay(sorted[0]!);
  return { year: y, month: m };
}

export type CalendlyPickerOptions = {
  slots: ScheduleSlot[];
  calendarEl: HTMLElement;
  timeStepEl: HTMLElement;
  dateStepEl: HTMLElement;
  selectedDayEl: HTMLElement;
  timeListEl: HTMLElement;
  backBtn: HTMLButtonElement;
  onTimeSelect?: (startsAt: string) => void;
  readOnly?: boolean;
  dateHeading?: string;
  timeHeading?: string;
};

export function initCalendlyPicker(opts: CalendlyPickerOptions): void {
  const byDay = groupSlotsByDay(opts.slots);
  const available = new Set(byDay.keys());
  let { year: viewYear, month: viewMonth } = firstAvailableMonth(available);
  let selectedDay: string | null = null;
  let selectedStart: string | null = null;

  const dateHeading = opts.dateHeading ?? "Select a date for your interview";
  const timeHeading = opts.timeHeading ?? "Select a time for your interview";

  function showDateStep() {
    opts.dateStepEl.hidden = false;
    opts.timeStepEl.hidden = true;
  }

  function showTimeStep(day: string) {
    selectedDay = day;
    opts.selectedDayEl.textContent = formatDayLong(day);
    opts.timeListEl.innerHTML = "";
    for (const s of byDay.get(day) ?? []) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-btn";
      btn.textContent = slotTimeLabel(s);
      btn.dataset.start = s.startsAt;
      if (opts.readOnly) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => {
          opts.timeListEl.querySelectorAll(".slot-btn.selected").forEach((el) => el.classList.remove("selected"));
          btn.classList.add("selected");
          selectedStart = s.startsAt;
          opts.onTimeSelect?.(s.startsAt);
        });
        if (selectedStart === s.startsAt) btn.classList.add("selected");
      }
      opts.timeListEl.appendChild(btn);
    }
    opts.dateStepEl.hidden = true;
    opts.timeStepEl.hidden = false;
  }

  function renderCalendar() {
    opts.calendarEl.innerHTML = "";
    const nav = document.createElement("div");
    nav.className = "cal-nav";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "cal-nav__btn";
    prev.setAttribute("aria-label", "Previous month");
    prev.textContent = "‹";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "cal-nav__btn";
    next.setAttribute("aria-label", "Next month");
    next.textContent = "›";
    const label = document.createElement("span");
    label.className = "cal-nav__label";
    label.textContent = formatMonthYear(viewYear, viewMonth);
    nav.append(prev, label, next);
    opts.calendarEl.appendChild(nav);

    const canPrev = [...available].some((d) => {
      const { y, m } = parseDay(d);
      return y < viewYear || (y === viewYear && m < viewMonth);
    });
    const canNext = [...available].some((d) => {
      const { y, m } = parseDay(d);
      return y > viewYear || (y === viewYear && m > viewMonth);
    });
    prev.disabled = !canPrev;
    next.disabled = !canNext;

    prev.addEventListener("click", () => {
      if (viewMonth === 0) {
        viewMonth = 11;
        viewYear -= 1;
      } else {
        viewMonth -= 1;
      }
      renderCalendar();
    });
    next.addEventListener("click", () => {
      if (viewMonth === 11) {
        viewMonth = 0;
        viewYear += 1;
      } else {
        viewMonth += 1;
      }
      renderCalendar();
    });

    const heading = document.createElement("p");
    heading.className = "schedule-picker__heading";
    heading.textContent = dateHeading;
    opts.calendarEl.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "cal-grid";
    for (const name of DOW) {
      const h = document.createElement("div");
      h.className = "cal-grid__dow";
      h.textContent = name;
      grid.appendChild(h);
    }

    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < startPad; i++) {
      const empty = document.createElement("span");
      empty.className = "cal-day cal-day--empty";
      empty.setAttribute("aria-hidden", "true");
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoFromParts(viewYear, viewMonth, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      cell.textContent = String(d);
      if (available.has(iso)) {
        cell.classList.add("cal-day--available");
        cell.addEventListener("click", () => showTimeStep(iso));
        if (selectedDay === iso) cell.classList.add("cal-day--selected");
      }
      grid.appendChild(cell);
    }
    opts.calendarEl.appendChild(grid);
  }

  const timeHeadingEl = opts.timeStepEl.querySelector(".schedule-picker__heading");
  if (timeHeadingEl) timeHeadingEl.textContent = timeHeading;

  opts.backBtn.addEventListener("click", showDateStep);
  renderCalendar();
}

export function formatTimezoneLabel(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "long",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}
