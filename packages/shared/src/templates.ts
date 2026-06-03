import type { MessageContext } from "./types.js";

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/** SQL/migrations often store `\n` as two characters; normalize for email/SMS output. */
export function unescapeTemplateLineBreaks(text: string): string {
  return text.replace(/\\n/g, "\n");
}

export function renderTemplate(
  template: string,
  context: MessageContext
): string {
  return unescapeTemplateLineBreaks(
    template.replace(PLACEHOLDER_RE, (_, key: string) => {
      const value = context[key];
      return value ?? "";
    })
  );
}
