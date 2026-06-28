import { and, eq } from "drizzle-orm";
import { db, eventsTable, notificationSettingsTable } from "@workspace/db";
import { sendWhatsApp } from "./whatsapp";
import { sendCallMeBot } from "./callmebot";
import { logger } from "./logger";

export function startNotificationScheduler(): void {
  const INTERVAL_MS = 60 * 1000; // check every minute

  async function checkAndSendNotifications(): Promise<void> {
    try {
      const [settings] = await db.select().from(notificationSettingsTable).limit(1);

      const twilioConfigured = !!(
        settings?.twilioAccountSid &&
        settings?.twilioAuthToken &&
        settings?.twilioWhatsappFrom
      );
      const callmebotConfigured = !!(settings?.callmebotApiKey && settings?.callmebotPhone);

      if (!twilioConfigured && !callmebotConfigured) {
        return; // No provider configured, skip
      }

      const now = new Date();
      const windowStart = now;
      const windowEnd = new Date(now.getTime() + 2 * 60 * 1000);

      const events = await db
        .select()
        .from(eventsTable)
        .where(
          and(
            eq(eventsTable.whatsappNotify, true),
            eq(eventsTable.notificationSent, false),
          ),
        );

      for (const event of events) {
        const advanceMs = (event.notifyAdvanceMinutes ?? 30) * 60 * 1000;
        const notifyAt = new Date(event.startAt.getTime() - advanceMs);

        if (notifyAt >= windowStart && notifyAt <= windowEnd) {
          const message = buildMessage(event);

          let result = { success: false, message: "No provider configured" };

          // Use CallMeBot if configured (free, preferred)
          if (callmebotConfigured) {
            result = await sendCallMeBot({
              phone: settings!.callmebotPhone!,
              apiKey: settings!.callmebotApiKey!,
              message,
            });
          } else if (twilioConfigured) {
            const phone = event.notifyPhone || settings!.defaultPhone;
            if (!phone) continue;
            result = await sendWhatsApp({
              to: phone,
              message,
              accountSid: settings!.twilioAccountSid!,
              authToken: settings!.twilioAuthToken!,
              from: settings!.twilioWhatsappFrom!,
            });
          }

          if (result.success) {
            await db
              .update(eventsTable)
              .set({ notificationSent: true })
              .where(eq(eventsTable.id, event.id));
            logger.info({ eventId: event.id, title: event.title }, "WhatsApp notification sent");
          } else {
            logger.warn({ eventId: event.id, message: result.message }, "Failed to send WhatsApp notification");
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Error in notification scheduler");
    }
  }

  setInterval(() => {
    checkAndSendNotifications().catch((err) => {
      logger.error({ err }, "Unhandled error in notification scheduler");
    });
  }, INTERVAL_MS);

  logger.info("Notification scheduler started");
}

function buildMessage(event: typeof eventsTable.$inferSelect): string {
  const importanceLabel: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
  };

  const eventTime = event.startAt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  return [
    `📅 *Lembrete de Evento*`,
    ``,
    `*${event.title}*`,
    event.description ? event.description : null,
    ``,
    `🕐 ${eventTime}`,
    `⚡ Importância: ${importanceLabel[event.importance] ?? event.importance}`,
    event.notifyAdvanceMinutes
      ? `⏰ Este lembrete foi enviado com ${event.notifyAdvanceMinutes} minuto(s) de antecedência`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
