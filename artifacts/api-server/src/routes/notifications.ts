import { Router, type IRouter } from "express";
import { db, notificationSettingsTable } from "@workspace/db";
import {
  UpdateNotificationSettingsBody,
  GetNotificationSettingsResponse,
  UpdateNotificationSettingsResponse,
  SendTestNotificationResponse,
} from "@workspace/api-zod";
import { sendWhatsApp } from "../lib/whatsapp";
import { sendCallMeBot } from "../lib/callmebot";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function ensureSettings() {
  const [existing] = await db.select().from(notificationSettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(notificationSettingsTable).values({}).returning();
  return created;
}

function computeFlags(s: typeof notificationSettingsTable.$inferSelect) {
  const twilioConfigured = !!(s.twilioAccountSid && s.twilioAuthToken && s.twilioWhatsappFrom);
  const callmebotConfigured = !!(s.callmebotApiKey && s.callmebotPhone);
  const isConfigured = twilioConfigured || callmebotConfigured;
  return { twilioConfigured, callmebotConfigured, isConfigured };
}

router.get("/notifications/settings", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetNotificationSettingsResponse.parse({ ...settings, ...computeFlags(settings) }));
});

router.patch("/notifications/settings", async (req, res): Promise<void> => {
  const parsed = UpdateNotificationSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await ensureSettings();
  const [updated] = await db
    .update(notificationSettingsTable)
    .set(parsed.data)
    .where(eq(notificationSettingsTable.id, existing.id))
    .returning();

  res.json(UpdateNotificationSettingsResponse.parse({ ...updated, ...computeFlags(updated) }));
});

router.post("/notifications/test", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  const { twilioConfigured, callmebotConfigured } = computeFlags(settings);

  if (!twilioConfigured && !callmebotConfigured) {
    res.json(
      SendTestNotificationResponse.parse({
        success: false,
        message: "Nenhum provedor configurado. Configure o CallMeBot ou o Twilio nas configurações.",
      }),
    );
    return;
  }

  const testMessage = "✅ Agenda: Notificação de teste enviada com sucesso!";

  // Prefer CallMeBot for test (it's free)
  if (callmebotConfigured) {
    const result = await sendCallMeBot({
      phone: settings.callmebotPhone!,
      apiKey: settings.callmebotApiKey!,
      message: testMessage,
    });
    res.json(SendTestNotificationResponse.parse(result));
    return;
  }

  // Fallback to Twilio
  const phone = settings.defaultPhone;
  if (!phone) {
    res.json(
      SendTestNotificationResponse.parse({
        success: false,
        message: "Nenhum número de telefone padrão configurado.",
      }),
    );
    return;
  }

  const result = await sendWhatsApp({
    to: phone,
    message: testMessage,
    accountSid: settings.twilioAccountSid!,
    authToken: settings.twilioAuthToken!,
    from: settings.twilioWhatsappFrom!,
  });

  res.json(SendTestNotificationResponse.parse(result));
});

export default router;
