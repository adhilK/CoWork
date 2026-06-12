import { inngest } from "@/lib/inngest";
import { runMonthlyBilling } from "@/lib/jobs/billing";

/**
 * Monthly billing — runs at 06:00 on the 1st of each month, and can also be
 * triggered on demand via the `billing/monthly.run` event (Automations page).
 */
export const monthlyBilling = inngest.createFunction(
  {
    id: "monthly-billing",
    name: "Monthly billing",
    retries: 2,
    triggers: [{ cron: "0 6 1 * *" }, { event: "billing/monthly.run" }],
  },
  async ({ step }) => {
    return step.run("run-billing", () => runMonthlyBilling());
  }
);
