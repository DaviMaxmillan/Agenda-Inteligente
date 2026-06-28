import { google } from "googleapis";
import { db, googleTokensTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function createOAuthClient() {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const redirectUri = process.env["GOOGLE_REDIRECT_URI"];

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getStoredTokens() {
  const [row] = await db.select().from(googleTokensTable).limit(1);
  return row ?? null;
}

export async function getAuthenticatedClient() {
  const stored = await getStoredTokens();
  if (!stored) throw new Error("Google Calendar not connected");

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken ?? undefined,
    expiry_date: stored.tokenExpiry ? stored.tokenExpiry.getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (tokens.access_token) updates.accessToken = tokens.access_token;
    if (tokens.expiry_date) updates.tokenExpiry = new Date(tokens.expiry_date);
    await db.update(googleTokensTable).set(updates).where(eq(googleTokensTable.id, stored.id));
  });

  return { oauth2Client, calendarId: stored.calendarId };
}

export async function syncFromGoogle() {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const [stored] = await db.select().from(googleTokensTable).limit(1);
  const timeMin = stored?.lastSyncAt
    ? stored.lastSyncAt.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const googleEvents = response.data.items ?? [];
  let created = 0;
  let updated = 0;

  for (const ge of googleEvents) {
    if (!ge.id || !ge.summary) continue;
    if (ge.status === "cancelled") {
      await db.delete(eventsTable).where(eq(eventsTable.googleEventId, ge.id));
      continue;
    }

    const startAt = ge.start?.dateTime
      ? new Date(ge.start.dateTime)
      : ge.start?.date
        ? new Date(`${ge.start.date}T00:00:00`)
        : null;

    const endAt = ge.end?.dateTime
      ? new Date(ge.end.dateTime)
      : ge.end?.date
        ? new Date(`${ge.end.date}T23:59:59`)
        : null;

    if (!startAt) continue;

    const allDay = !ge.start?.dateTime;

    const [existing] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.googleEventId, ge.id));

    if (existing) {
      await db
        .update(eventsTable)
        .set({
          title: ge.summary,
          description: ge.description ?? null,
          startAt,
          endAt,
          allDay,
        })
        .where(eq(eventsTable.id, existing.id));
      updated++;
    } else {
      await db.insert(eventsTable).values({
        title: ge.summary,
        description: ge.description ?? null,
        startAt,
        endAt,
        allDay,
        importance: "medium",
        googleEventId: ge.id,
      });
      created++;
    }
  }

  await db
    .update(googleTokensTable)
    .set({ lastSyncAt: new Date() })
    .where(eq(googleTokensTable.id, stored!.id));

  return { created, updated, total: googleEvents.length };
}

export async function pushEventToGoogle(eventId: number) {
  const { oauth2Client, calendarId } = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) throw new Error("Event not found");

  const resource = {
    summary: event.title,
    description: event.description ?? undefined,
    start: event.allDay
      ? { date: event.startAt.toISOString().split("T")[0] }
      : { dateTime: event.startAt.toISOString() },
    end: event.endAt
      ? event.allDay
        ? { date: event.endAt.toISOString().split("T")[0] }
        : { dateTime: event.endAt.toISOString() }
      : event.allDay
        ? { date: event.startAt.toISOString().split("T")[0] }
        : { dateTime: new Date(event.startAt.getTime() + 60 * 60 * 1000).toISOString() },
  };

  if (event.googleEventId) {
    await calendar.events.update({ calendarId, eventId: event.googleEventId, requestBody: resource });
  } else {
    const created = await calendar.events.insert({ calendarId, requestBody: resource });
    if (created.data.id) {
      await db.update(eventsTable).set({ googleEventId: created.data.id }).where(eq(eventsTable.id, eventId));
    }
  }
}

export async function deleteEventFromGoogle(googleEventId: string) {
  try {
    const { oauth2Client, calendarId } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch {
    // Ignore if event doesn't exist on Google's side
  }
}
