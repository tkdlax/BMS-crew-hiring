const RECAPTCHA_SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

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

export async function renderRecaptchaWidget(options: RecaptchaWidgetOptions): Promise<number> {
  await ensureRecaptchaScript();
  const grecaptcha = await waitForGrecaptcha();
  return grecaptcha.render(options.mount, {
    sitekey: options.sitekey,
    callback: options.onToken,
    "expired-callback": options.onExpire,
    "error-callback": options.onError,
  });
}
