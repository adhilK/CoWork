/**
 * Registry of all Inngest functions. Served from app/api/inngest/route.ts.
 */
import { monthlyBilling } from "./monthly-billing";
import { dailyReminders } from "./daily-reminders";
import { whatsappSend } from "./whatsapp-send";
import { whatsappBroadcast } from "./whatsapp-broadcast";
import { zatcaSubmit } from "./zatca-submit";
import { visitorCleanup } from "./visitor-cleanup";

export const functions = [
  monthlyBilling,
  dailyReminders,
  whatsappSend,
  whatsappBroadcast,
  zatcaSubmit,
  visitorCleanup,
];

export {
  monthlyBilling, dailyReminders, whatsappSend, whatsappBroadcast, zatcaSubmit, visitorCleanup,
};
