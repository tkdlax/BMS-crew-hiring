/** Standard reCAPTCHA v2 checkbox — auto-renders elements with class g-recaptcha + data-sitekey. */
const RECAPTCHA_SCRIPT_SRC = "https://www.google.com/recaptcha/api.js";

declare global {
  interface GRecaptcha {
    ready(cb: () => void): void;
    render(container: HTMLElement, params: Record<string, unknown>): number;
    reset(widgetId?: number): void;
    getResponse(widgetId?: number): string;
  }
  // eslint-disable-next-line no-var
  var grecaptcha: GRecaptcha | undefined;
}

export function waitForGrecaptcha(timeoutMs = 20000): Promise<GRecaptcha> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (typeof grecaptcha !== "undefined") {
        grecaptcha.ready(() => resolve(grecaptcha));
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("reCAPTCHA failed to load"));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

export function ensureRecaptchaScript(): Promise<void> {
  const existing = document.querySelector('script[src*="recaptcha/api.js"]');
  if (existing) return waitForGrecaptcha().then(() => undefined);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RECAPTCHA_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      waitForGrecaptcha().then(() => resolve()).catch(reject);
    };
    script.onerror = () => reject(new Error("reCAPTCHA script failed to load"));
    document.head.appendChild(script);
  });
}

export type RecaptchaWidgetOptions = {
  mount: HTMLElement;
  sitekey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
};

/** Wait until Google injects the widget iframe, or render explicitly as fallback. */
export async function mountRecaptchaWidget(options: RecaptchaWidgetOptions): Promise<number | null> {
  const { mount, sitekey, onToken, onExpire, onError } = options;

  mount.classList.add("g-recaptcha");
  mount.dataset.sitekey = sitekey;

  await ensureRecaptchaScript();
  const grecaptcha = await waitForGrecaptcha();

  try {
    await waitForRecaptchaIframe(mount, 3000);
    return null;
  } catch {
    /* auto-render did not populate — render explicitly below */
  }

  if (mount.dataset.rendered === "true") {
    return null;
  }

  const widgetId = grecaptcha.render(mount, {
    sitekey,
    callback: onToken,
    "expired-callback": onExpire,
    "error-callback": onError,
  });
  mount.dataset.rendered = "true";
  return widgetId;
}

export function waitForRecaptchaIframe(mount: HTMLElement, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (mount.querySelector("iframe")) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("reCAPTCHA widget did not appear"));
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}
