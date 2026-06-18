/** Shared availability + blackout UI for admin scheduling and office portal. */

export type AvailabilityEditorOptions = {
  mode: "admin" | "office";
  officeSelectId?: string;
  showBookingRules?: boolean;
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type Rule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h! * 60 + m!;
}

function endAfterStart(start: string, end: string): boolean {
  return timeToMinutes(end) > timeToMinutes(start);
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a0 = timeToMinutes(aStart);
  const a1 = timeToMinutes(aEnd);
  const b0 = timeToMinutes(bStart);
  const b1 = timeToMinutes(bEnd);
  return a0 < b1 && b0 < a1;
}

function formatTime12h(value: string): string {
  const mins = timeToMinutes(value);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initAvailabilityEditor(opts: AvailabilityEditorOptions): void {
  let officeTimezone = "America/Denver";
  let editingRuleId: number | null = null;
  let cachedRules: Rule[] = [];

  function $(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  function showFeedback(kind: "success" | "error", message: string): void {
    const el = $("avail-feedback");
    if (!el) return;
    el.hidden = false;
    el.className = `avail-feedback avail-feedback--${kind}`;
    el.textContent = message;
    window.clearTimeout((el as unknown as { _t?: number })._t);
    (el as unknown as { _t?: number })._t = window.setTimeout(() => {
      el.hidden = true;
    }, kind === "error" ? 8000 : 4000);
  }

  async function apiBase(): Promise<string> {
    if (opts.mode === "admin") {
      const { resolveAdminApiBaseUrl } = await import("./api.client.ts");
      return resolveAdminApiBaseUrl();
    }
    const { resolveOfficeApiBaseUrl } = await import("./api.client.ts");
    return resolveOfficeApiBaseUrl();
  }

  function officeId(): number {
    if (opts.mode === "office") {
      return (window as unknown as { __officeId?: number }).__officeId ?? 0;
    }
    const sel = document.getElementById(opts.officeSelectId || "office-select") as HTMLSelectElement;
    return parseInt(sel?.value || "0", 10);
  }

  async function apiJson(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Record<string, unknown>> {
    const api = await apiBase();
    const res = await fetch(`${api}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      const msg =
        (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function setButtonLoading(btn: HTMLButtonElement | null, loading: boolean): void {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    const label = btn.dataset.label || btn.textContent || "";
    if (loading) {
      btn.dataset.label = label;
      btn.textContent = "Saving…";
    } else {
      btn.textContent = btn.dataset.label || label;
    }
  }

  function resetRuleForm(): void {
    editingRuleId = null;
    const form = $("rule-form") as HTMLFormElement | null;
    if (!form) return;
    form.reset();
    (form.elements.namedItem("startTime") as HTMLInputElement).value = "10:00";
    (form.elements.namedItem("endTime") as HTMLInputElement).value = "16:00";
    (form.elements.namedItem("dayOfWeek") as HTMLSelectElement).value = "1";
    const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submit) {
      submit.textContent = "Add hours";
      submit.dataset.label = "Add hours";
    }
    $("rule-form-cancel")?.setAttribute("hidden", "");
  }

  function startEditRule(rule: Rule): void {
    editingRuleId = rule.id;
    const form = $("rule-form") as HTMLFormElement;
    (form.elements.namedItem("dayOfWeek") as HTMLSelectElement).value = String(rule.day_of_week);
    (form.elements.namedItem("startTime") as HTMLInputElement).value = rule.start_time.slice(0, 5);
    (form.elements.namedItem("endTime") as HTMLInputElement).value = rule.end_time.slice(0, 5);
    const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.textContent = "Save changes";
    submit.dataset.label = "Save changes";
    $("rule-form-cancel")?.removeAttribute("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    showFeedback("success", `Editing ${DAY_SHORT[rule.day_of_week]} ${formatTime12h(rule.start_time)}–${formatTime12h(rule.end_time)}`);
  }

  function clientRuleConflict(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: number | null
  ): Rule | null {
    for (const r of cachedRules) {
      if (excludeId && r.id === excludeId) continue;
      if (r.day_of_week !== dayOfWeek) continue;
      if (rangesOverlap(startTime, endTime, r.start_time, r.end_time)) return r;
    }
    return null;
  }

  function renderWeekOverview(rules: Rule[]): void {
    const overview = $("week-overview");
    if (!overview) return;

    const byDay = new Map<number, Rule[]>();
    for (const d of DAY_ORDER) byDay.set(d, []);
    for (const r of rules) {
      const list = byDay.get(r.day_of_week) ?? [];
      list.push(r);
      byDay.set(r.day_of_week, list);
    }
    for (const [, list] of byDay) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    overview.innerHTML = DAY_ORDER.map((dow) => {
      const slots = byDay.get(dow) ?? [];
      const chips =
        slots.length === 0
          ? '<span class="avail-day__empty">Closed</span>'
          : slots
              .map(
                (r) =>
                  `<div class="avail-slot" data-rule-id="${r.id}">
                    <span class="avail-slot__time">${formatTime12h(r.start_time)}–${formatTime12h(r.end_time)}</span>
                    <span class="avail-slot__actions">
                      <button type="button" class="btn btn-small btn-secondary" data-edit-rule="${r.id}" title="Edit">Edit</button>
                      <button type="button" class="btn btn-small btn-secondary" data-del-rule="${r.id}" title="Remove">×</button>
                    </span>
                  </div>`
              )
              .join("");
      return `<div class="avail-day">
        <div class="avail-day__name">${DAY_SHORT[dow]}</div>
        <div class="avail-day__slots">${chips}</div>
      </div>`;
    }).join("");

    overview.querySelectorAll("[data-edit-rule]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-edit-rule")!, 10);
        const rule = cachedRules.find((r) => r.id === id);
        if (rule) startEditRule(rule);
      });
    });
    overview.querySelectorAll("[data-del-rule]").forEach((btn) => {
      btn.addEventListener("click", () => void deleteRule(btn));
    });
  }

  async function deleteRule(btn: Element): Promise<void> {
    const id = btn.getAttribute("data-del-rule");
    if (!id) return;
    const rule = cachedRules.find((r) => String(r.id) === id);
    const label = rule
      ? `${DAY_SHORT[rule.day_of_week]} ${formatTime12h(rule.start_time)}–${formatTime12h(rule.end_time)}`
      : "these hours";
    if (!confirm(`Remove ${label}?`)) return;
    try {
      await apiJson("DELETE", `/availability/${id}`);
      if (editingRuleId === parseInt(id, 10)) resetRuleForm();
      showFeedback("success", "Weekly hours removed.");
      await loadAll();
    } catch (e) {
      showFeedback("error", e instanceof Error ? e.message : "Could not remove hours");
    }
  }

  async function loadRules(): Promise<void> {
    const id = officeId();
    const listEl = $("rules-list");
    if (!id) {
      if (listEl) listEl.innerHTML = "<p class=\"avail-muted\">Select an office to manage availability.</p>";
      cachedRules = [];
      renderWeekOverview([]);
      return;
    }
    try {
      const { rules } = (await apiJson("GET", `/availability?scope=office&scopeId=${id}`)) as {
        rules?: Rule[];
      };
      cachedRules = rules ?? [];
      renderWeekOverview(cachedRules);
      if (listEl) {
        if (!cachedRules.length) {
          listEl.innerHTML = "<p class=\"avail-muted\">No weekly hours yet — add your first block below.</p>";
        } else {
          listEl.innerHTML = `<p class="avail-muted">${cachedRules.length} recurring block${cachedRules.length === 1 ? "" : "s"} across the week.</p>`;
        }
      }
    } catch (e) {
      if (listEl) listEl.innerHTML = "";
      showFeedback("error", e instanceof Error ? e.message : "Could not load weekly hours");
    }
  }

  async function loadExceptions(): Promise<void> {
    const id = officeId();
    const el = $("exceptions-list");
    if (!id || !el) return;
    try {
      const { exceptions } = (await apiJson(
        "GET",
        `/availability/exceptions?scope=office&scopeId=${id}`
      )) as { exceptions?: { id: number; exceptionDate: string }[] };
      if (!exceptions?.length) {
        el.innerHTML = "<p class=\"avail-muted\">No closed dates.</p>";
        return;
      }
      el.innerHTML = `<ul class="avail-list">${exceptions
        .map(
          (ex) =>
            `<li class="avail-list__item">
              <span>${formatDateLong(ex.exceptionDate)}</span>
              <button type="button" class="btn btn-small btn-secondary" data-del-ex="${ex.id}">Remove</button>
            </li>`
        )
        .join("")}</ul>`;
      el.querySelectorAll("[data-del-ex]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const exId = btn.getAttribute("data-del-ex");
          if (!exId || !confirm("Remove this closed date?")) return;
          try {
            await apiJson("DELETE", `/availability/exceptions/${exId}`);
            showFeedback("success", "Closed date removed.");
            await loadExceptions();
          } catch (e) {
            showFeedback("error", e instanceof Error ? e.message : "Could not remove date");
          }
        });
      });
    } catch (e) {
      el.innerHTML = "";
      showFeedback("error", e instanceof Error ? e.message : "Could not load closed dates");
    }
  }

  async function loadBlocks(): Promise<void> {
    const id = officeId();
    const el = $("blocks-list");
    if (!id || !el) return;
    const tzOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZone: officeTimezone,
    };
    try {
      const { blocks } = (await apiJson(
        "GET",
        `/availability/blocks?scope=office&scopeId=${id}`
      )) as {
        blocks?: { id: number; startsAt: string; endsAt: string; note: string }[];
      };
      if (!blocks?.length) {
        el.innerHTML = "<p class=\"avail-muted\">No upcoming time blocks.</p>";
        return;
      }
      el.innerHTML = `<ul class="avail-list">${blocks
        .map((b) => {
          const start = new Date(b.startsAt);
          const end = new Date(b.endsAt);
          const dateStr = start.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: officeTimezone,
          });
          const startStr = start.toLocaleTimeString(undefined, tzOpts);
          const endStr = end.toLocaleTimeString(undefined, tzOpts);
          const note = b.note ? `<span class="avail-list__note">${b.note}</span>` : "";
          return `<li class="avail-list__item">
            <span><strong>${dateStr}</strong> ${startStr} – ${endStr}${note}</span>
            <button type="button" class="btn btn-small btn-secondary" data-del-block="${b.id}">Remove</button>
          </li>`;
        })
        .join("")}</ul>`;
      el.querySelectorAll("[data-del-block]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const blockId = btn.getAttribute("data-del-block");
          if (!blockId || !confirm("Remove this blocked time?")) return;
          try {
            await apiJson("DELETE", `/availability/blocks/${blockId}`);
            showFeedback("success", "Time block removed.");
            await loadBlocks();
          } catch (e) {
            showFeedback("error", e instanceof Error ? e.message : "Could not remove block");
          }
        });
      });
    } catch (e) {
      el.innerHTML = "";
      showFeedback("error", e instanceof Error ? e.message : "Could not load blocks");
    }
  }

  async function loadAll(): Promise<void> {
    await Promise.all([loadRules(), loadExceptions(), loadBlocks()]);
  }

  async function init(): Promise<void> {
    if (opts.mode === "admin") {
      await window.adminAuthCheck;
    } else {
      const sess = await window.officeAuthCheck;
      const office = (sess as { office?: { id?: number; timezone?: string } })?.office;
      (window as unknown as { __officeId?: number }).__officeId = office?.id;
      if (office?.timezone) officeTimezone = office.timezone;
    }
    const api = await apiBase();
    if (!api) return;

    if (opts.mode === "admin" && opts.officeSelectId) {
      const sel = document.getElementById(opts.officeSelectId) as HTMLSelectElement;
      sel.addEventListener("change", async () => {
        resetRuleForm();
        const opt = sel.selectedOptions[0];
        const tz = opt?.dataset.timezone;
        if (tz) officeTimezone = tz;
        await loadAll();
        if (opts.showBookingRules) await loadBookingRules();
      });
    }

    await loadAll();
    if (opts.showBookingRules) await loadBookingRules();

    if (opts.mode === "admin" && opts.officeSelectId) {
      const sel = document.getElementById(opts.officeSelectId) as HTMLSelectElement;
      const tz = sel?.selectedOptions[0]?.dataset.timezone;
      if (tz) officeTimezone = tz;
    }

    $("rule-form-cancel")?.addEventListener("click", () => {
      resetRuleForm();
      showFeedback("success", "Edit cancelled.");
    });

    $("rule-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const fd = new FormData(form);
      const dayOfWeek = parseInt(String(fd.get("dayOfWeek")), 10);
      const startTime = String(fd.get("startTime"));
      const endTime = String(fd.get("endTime"));

      if (!endAfterStart(startTime, endTime)) {
        showFeedback("error", "End time must be after start time.");
        return;
      }
      const localConflict = clientRuleConflict(dayOfWeek, startTime, endTime, editingRuleId);
      if (localConflict) {
        showFeedback(
          "error",
          `Overlaps existing hours on ${DAY_SHORT[dayOfWeek]} (${formatTime12h(localConflict.start_time)}–${formatTime12h(localConflict.end_time)}).`
        );
        return;
      }

      setButtonLoading(submit, true);
      try {
        const payload = {
          scope: "office",
          scopeId: officeId(),
          dayOfWeek,
          startTime,
          endTime,
        };
        if (editingRuleId) {
          await apiJson("PUT", `/availability/${editingRuleId}`, payload);
          showFeedback("success", "Weekly hours updated.");
        } else {
          await apiJson("POST", "/availability", payload);
          showFeedback("success", "Weekly hours added.");
        }
        resetRuleForm();
        await loadRules();
      } catch (err) {
        showFeedback("error", err instanceof Error ? err.message : "Could not save hours");
      } finally {
        setButtonLoading(submit, false);
      }
    });

    $("exception-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const fd = new FormData(form);
      setButtonLoading(submit, true);
      try {
        await apiJson("POST", "/availability/exceptions", {
          scope: "office",
          scopeId: officeId(),
          exceptionDate: fd.get("exceptionDate"),
        });
        form.reset();
        showFeedback("success", "Closed date added.");
        await loadExceptions();
      } catch (err) {
        showFeedback("error", err instanceof Error ? err.message : "Could not add closed date");
      } finally {
        setButtonLoading(submit, false);
      }
    });

    $("block-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const fd = new FormData(form);
      const startTime = String(fd.get("startTime"));
      const endTime = String(fd.get("endTime"));
      if (!endAfterStart(startTime, endTime)) {
        showFeedback("error", "End time must be after start time.");
        return;
      }
      setButtonLoading(submit, true);
      try {
        await apiJson("POST", "/availability/blocks", {
          scope: "office",
          scopeId: officeId(),
          localDate: fd.get("localDate"),
          startTime,
          endTime,
          note: fd.get("note") || undefined,
        });
        form.reset();
        (form.elements.namedItem("startTime") as HTMLInputElement).value = "14:00";
        (form.elements.namedItem("endTime") as HTMLInputElement).value = "16:00";
        showFeedback("success", "Time block added.");
        await loadBlocks();
      } catch (err) {
        showFeedback("error", err instanceof Error ? err.message : "Could not add block");
      } finally {
        setButtonLoading(submit, false);
      }
    });

    if (opts.showBookingRules) {
      document.getElementById("office-config-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const submit = (e.target as HTMLFormElement).querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement;
        setButtonLoading(submit, true);
        try {
          await apiJson("PUT", "/schedule-config", {
            scope: "office",
            scopeId: officeId(),
            bookingWindowDays: parseInt(String(fd.get("bookingWindowDays")), 10),
            minNoticeHours: parseInt(String(fd.get("minNoticeHours")), 10),
          });
          showFeedback("success", "Booking rules saved.");
        } catch (err) {
          showFeedback("error", err instanceof Error ? err.message : "Could not save booking rules");
        } finally {
          setButtonLoading(submit, false);
        }
      });
    }
  }

  async function loadBookingRules(): Promise<void> {
    const id = officeId();
    if (!id) return;
    try {
      const { config: c } = (await apiJson(
        "GET",
        `/schedule-config?scope=office&scopeId=${id}`
      )) as { config?: { booking_window_days?: number; min_notice_hours?: number } };
      const f = document.getElementById("office-config-form") as HTMLFormElement | null;
      if (f && c) {
        (f.elements.namedItem("bookingWindowDays") as HTMLInputElement).value = String(
          c.booking_window_days ?? 7
        );
        (f.elements.namedItem("minNoticeHours") as HTMLInputElement).value = String(
          c.min_notice_hours ?? 8
        );
      }
    } catch {
      /* non-fatal */
    }
  }

  void init();
}
