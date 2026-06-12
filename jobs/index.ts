/**
 * Registry of all Inngest functions. Served from app/api/inngest/route.ts.
 */
import { monthlyBilling } from "./monthly-billing";
import { dailyReminders } from "./daily-reminders";
import { whatsappSend } from "./whatsapp-send";
import { whatsappBroadcast } from "./whatsapp-broadcast";
import { zatcaSubmit } from "./zatca-submit";

export const functions = [
  monthlyBilling,
  dailyReminders,
  whatsappSend,
  whatsappBroadcast,
  zatcaSubmit,
];

export {
  monthlyBilling, dailyReminders, whatsappSend, whatsappBroadcast, zatcaSubmit,
};
