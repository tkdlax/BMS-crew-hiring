/** Shared availability + blackout UI for admin scheduling and office portal. */

export type AvailabilityEditorOptions = {
  mode: "admin" | "office";
  officeSelectId?: string;
  showBookingRules?: boolean;
};

export function initAvailabilityEditor(opts: AvailabilityEditorOptions): void {
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  async function loadRules(api: string) {
    const id = officeId();
    if (!id) return;
    const res = await fetch(`${api}/availability?scope=office&scopeId=${id}`, {
      credentials: "include",
    });
    const { rules } = await res.json();
    const el = document.getElementById("rules-list")!;
    if (!rules?.length) {
      el.innerHTML = "<p>No weekly hours yet — add below.</p>";
      return;
    }
    el.innerHTML = `<table class="data"><thead><tr><th>Day</th><th>Start</th><th>End</th><th></th></tr></thead><tbody>${rules
      .map(
        (r: { id: number; day_of_week: number; start_time: string; end_time: string }) =>
          `<tr><td>${DAY[r.day_of_week]}</td><td>${r.start_time}</td><td>${r.end_time}</td><td><button type="button" class="btn btn-small btn-secondary" data-del-rule="${r.id}">Remove</button></td></tr>`
      )
      .join("")}</tbody></table>`;
    el.querySelectorAll("[data-del-rule]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`${api}/availability/${btn.getAttribute("data-del-rule")}`, {
          method: "DELETE",
          credentials: "include",
        });
        loadAll(api);
      });
    });
  }

  async function loadExceptions(api: string) {
    const id = officeId();
    const res = await fetch(`${api}/availability/exceptions?scope=office&scopeId=${id}`, {
      credentials: "include",
    });
    const { exceptions } = await res.json();
    const el = document.getElementById("exceptions-list")!;
    if (!exceptions?.length) {
      el.innerHTML = "<p>No closed dates.</p>";
      return;
    }
    el.innerHTML = `<ul class="admin-simple-list">${exceptions
      .map(
        (ex: { id: number; exceptionDate: string }) =>
          `<li>${ex.exceptionDate} <button type="button" class="btn btn-small btn-secondary" data-del-ex="${ex.id}">Remove</button></li>`
      )
      .join("")}</ul>`;
    el.querySelectorAll("[data-del-ex]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`${api}/availability/exceptions/${btn.getAttribute("data-del-ex")}`, {
          method: "DELETE",
          credentials: "include",
        });
        loadAll(api);
      });
    });
  }

  async function loadBlocks(api: string) {
    const id = officeId();
    const res = await fetch(`${api}/availability/blocks?scope=office&scopeId=${id}`, {
      credentials: "include",
    });
    const { blocks } = await res.json();
    const el = document.getElementById("blocks-list")!;
    if (!blocks?.length) {
      el.innerHTML = "<p>No time blocks.</p>";
      return;
    }
    el.innerHTML = `<ul class="admin-simple-list">${blocks
      .map((b: { id: number; startsAt: string; endsAt: string; note: string }) => {
        const start = new Date(b.startsAt).toLocaleString();
        const end = new Date(b.endsAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
        const note = b.note ? ` — ${b.note}` : "";
        return `<li>${start} – ${end}${note} <button type="button" class="btn btn-small btn-secondary" data-del-block="${b.id}">Remove</button></li>`;
      })
      .join("")}</ul>`;
    el.querySelectorAll("[data-del-block]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`${api}/availability/blocks/${btn.getAttribute("data-del-block")}`, {
          method: "DELETE",
          credentials: "include",
        });
        loadAll(api);
      });
    });
  }

  async function loadAll(api: string) {
    await Promise.all([loadRules(api), loadExceptions(api), loadBlocks(api)]);
  }

  async function init() {
    if (opts.mode === "admin") {
      await window.adminAuthCheck;
    } else {
      const sess = await window.officeAuthCheck;
      (window as unknown as { __officeId?: number }).__officeId = (
        sess as { office?: { id?: number } }
      )?.office?.id;
    }
    const api = await apiBase();
    if (!api) return;

    if (opts.mode === "admin" && opts.officeSelectId) {
      const sel = document.getElementById(opts.officeSelectId) as HTMLSelectElement;
      const oRes = await fetch(`${api}/offices`, { credentials: "include" });
      const { offices } = await oRes.json();
      sel.innerHTML = offices
        .map((o: { id: number; name: string }) => `<option value="${o.id}">${o.name}</option>`)
        .join("");
      sel.addEventListener("change", async () => {
        await loadAll(api);
        if (opts.showBookingRules) await loadBookingRules(api);
      });
    }

    await loadAll(api);
    if (opts.showBookingRules) await loadBookingRules(api);

    document.getElementById("rule-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      await fetch(`${api}/availability`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "office",
          scopeId: officeId(),
          dayOfWeek: parseInt(String(fd.get("dayOfWeek")), 10),
          startTime: fd.get("startTime"),
          endTime: fd.get("endTime"),
        }),
      });
      loadAll(api);
    });

    document.getElementById("exception-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      await fetch(`${api}/availability/exceptions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "office",
          scopeId: officeId(),
          exceptionDate: fd.get("exceptionDate"),
        }),
      });
      (e.target as HTMLFormElement).reset();
      loadAll(api);
    });

    document.getElementById("block-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      await fetch(`${api}/availability/blocks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "office",
          scopeId: officeId(),
          localDate: fd.get("localDate"),
          startTime: fd.get("startTime"),
          endTime: fd.get("endTime"),
          note: fd.get("note") || undefined,
        }),
      });
      (e.target as HTMLFormElement).reset();
      loadAll(api);
    });

    if (opts.showBookingRules) {
      document.getElementById("office-config-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        await fetch(`${api}/schedule-config`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "office",
            scopeId: officeId(),
            bookingWindowDays: parseInt(String(fd.get("bookingWindowDays")), 10),
            minNoticeHours: parseInt(String(fd.get("minNoticeHours")), 10),
          }),
        });
        const msg = document.getElementById("sched-msg");
        if (msg) msg.textContent = "Booking rules saved.";
      });
    }
  }

  async function loadBookingRules(api: string) {
    const id = officeId();
    if (!id) return;
    const cfgRes = await fetch(`${api}/schedule-config?scope=office&scopeId=${id}`, {
      credentials: "include",
    });
    const { config: c } = await cfgRes.json();
    const f = document.getElementById("office-config-form") as HTMLFormElement | null;
    if (f && c) {
      (f.elements.namedItem("bookingWindowDays") as HTMLInputElement).value = String(
        c.booking_window_days ?? 7
      );
      (f.elements.namedItem("minNoticeHours") as HTMLInputElement).value = String(
        c.min_notice_hours ?? 8
      );
    }
  }

  init();
}
