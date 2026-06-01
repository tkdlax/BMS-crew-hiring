import { app, type InvocationContext, type Timer } from "@azure/functions";
import { processDueReminders } from "../handlers/reminders.js";

async function processReminders(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  try {
    const count = await processDueReminders();
    context.log(`Processed ${count} reminder(s)`);
  } catch (e) {
    context.error(e);
    throw e;
  }
}

app.timer("processReminders", {
  schedule: "0 */5 * * * *",
  handler: processReminders,
});
