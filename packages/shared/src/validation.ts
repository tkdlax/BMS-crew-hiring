import type { ZodError } from "zod";

/** First validation issue as applicant-friendly copy (not raw Zod JSON). */
export function zodFirstErrorMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Please check your form and try again.";

  const field = issue.path[0];
  if (field === "email") return "Please enter a valid email address.";
  if (field === "phone") return "Please enter a valid phone number (at least 10 digits).";
  if (field === "firstName" || field === "lastName") return "Please enter your full name.";

  return issue.message;
}
