import { Router } from "express";
import { db, googleTokensTable } from "@workspace/db";
import { google } from "googleapis";
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getStoredTokens,
  syncFromGoogle,
  pushEventToGoogle,
  deleteEventFromGoogle,
  getAuthenticatedClient,
  createOAuthClient,
} from "../lib/googleCalendar";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/google-calendar/auth-url", async (_req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(503).json({ error: message });
  }
});

router.get("/google-calendar/status", async (_req, res) => {
  const stored = await getStoredTokens();
  if (!stored) {
    res.json({ connected: false, email: null, lastSyncAt: null, calendarId: null });
    return;
  }
  res.json({
    connected: true,
    email: stored.email,
    lastSyncAt: stored.lastSyncAt,
    calendarId: stored.calendarId,
  });
});

router.get("/google-calendar/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;
  if (!code) {
    res.status(400).send("Missing authorization code");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      res.status(400).send("Failed to get access token");
      return;
    }

    let email: string | null = null;
    try {
      const oauth2Client = createOAuthClient();
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email ?? null;
    } catch {
      // email is optional
    }

    const existing = await getStoredTokens();
    if (existing) {
      await db
        .update(googleTokensTable)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          email,
          updatedAt: new Date(),
        })
        .where(eq(googleTokensTable.id, existing.id));
    } else {
      await db.insert(googleTokensTable).values({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email,
        calendarId: "primary",
        syncEnabled: true,
      });
    }

    const frontendUrl = process.env["FRONTEND_URL"]
      ? `${process.env["FRONTEND_URL"].replace(/\/+$/, "")}/settings?google=connected`
      : process.env["REPLIT_DOMAINS"]
        ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]}/settings?google=connected`
        : "/settings?google=connected";

    res.redirect(frontendUrl);
  } catch (err) {
    req.log.error({ err }, "Google OAuth callback error");
    res.status(500).send("Authentication failed. Please try again.");
  }
});

router.post("/google-calendar/sync", async (req, res) => {
  const stored = await getStoredTokens();
  if (!stored) {
    res.status(400).json({ error: "Google Calendar not connected" });
    return;
  }
  try {
    const result = await syncFromGoogle();
    res.json({ success: true, ...result });
  } catch (err) {
    req.log.error({ err }, "Google Calendar sync error");
    res.status(500).json({ error: "Sync failed" });
  }
});

router.post("/google-calendar/push/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  try {
    await pushEventToGoogle(eventId);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Google Calendar push error");
    res.status(500).json({ error: "Push failed" });
  }
});

router.delete("/google-calendar/disconnect", async (_req, res) => {
  await db.delete(googleTokensTable);
  res.json({ success: true });
});

export default router;
