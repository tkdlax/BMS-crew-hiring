import type { MessageContext } from "./types.js";

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

export function renderTemplate(
  template: string,
  context: MessageContext
): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const value = context[key];
    return value ?? "";
  });
}
