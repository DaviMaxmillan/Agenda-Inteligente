import { Router, type IRouter } from "express";
import { and, eq, gte, lt, lte, sql, count } from "drizzle-orm";
import { db, eventsTable, categoriesTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  GetEventResponse,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
  ListEventsResponse,
  GetTodayEventsResponse,
  GetUpcomingEventsResponse,
  GetEventsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const eventWithCategory = {
  id: eventsTable.id,
  title: eventsTable.title,
  description: eventsTable.description,
  startAt: eventsTable.startAt,
  endAt: eventsTable.endAt,
  allDay: eventsTable.allDay,
  importance: eventsTable.importance,
  categoryId: eventsTable.categoryId,
  categoryName: categoriesTable.name,
  categoryColor: categoriesTable.color,
  whatsappNotify: eventsTable.whatsappNotify,
  notifyPhone: eventsTable.notifyPhone,
  notifyAdvanceMinutes: eventsTable.notifyAdvanceMinutes,
  notificationSent: eventsTable.notificationSent,
  createdAt: eventsTable.createdAt,
};

router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.categoryId != null) {
    conditions.push(eq(eventsTable.categoryId, params.data.categoryId));
  }
  if (params.data.importance != null) {
    conditions.push(eq(eventsTable.importance, params.data.importance));
  }
  if (params.data.from != null) {
    conditions.push(gte(eventsTable.startAt, new Date(params.data.from)));
  }
  if (params.data.to != null) {
    conditions.push(lte(eventsTable.startAt, new Date(params.data.to)));
  }

  const events = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(eventsTable.startAt);

  res.json(ListEventsResponse.parse(events));
});

router.get("/events/today", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const events = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(and(gte(eventsTable.startAt, startOfDay), lte(eventsTable.startAt, endOfDay)))
    .orderBy(eventsTable.startAt);

  res.json(GetTodayEventsResponse.parse(events));
});

router.get("/events/upcoming", async (_req, res): Promise<void> => {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(and(gte(eventsTable.startAt, now), lte(eventsTable.startAt, weekFromNow)))
    .orderBy(eventsTable.startAt);

  res.json(GetUpcomingEventsResponse.parse(events));
});

router.get("/events/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalRow] = await db.select({ count: count() }).from(eventsTable);
  const [todayRow] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(and(gte(eventsTable.startAt, startOfDay), lte(eventsTable.startAt, endOfDay)));
  const [weekRow] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(and(gte(eventsTable.startAt, now), lte(eventsTable.startAt, weekFromNow)));
  const [notifyRow] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(eq(eventsTable.whatsappNotify, true));

  const importanceRows = await db
    .select({ importance: eventsTable.importance, count: count() })
    .from(eventsTable)
    .groupBy(eventsTable.importance);

  const byImportance = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const row of importanceRows) {
    if (row.importance in byImportance) {
      byImportance[row.importance as keyof typeof byImportance] = row.count;
    }
  }

  res.json(
    GetEventsSummaryResponse.parse({
      total: totalRow?.count ?? 0,
      today: todayRow?.count ?? 0,
      thisWeek: weekRow?.count ?? 0,
      byImportance,
      withNotification: notifyRow?.count ?? 0,
    }),
  );
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(eq(eventsTable.id, params.data.id));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(GetEventResponse.parse(event));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [inserted] = await db
    .insert(eventsTable)
    .values({
      ...data,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
    })
    .returning();

  const [event] = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(eq(eventsTable.id, inserted.id));

  res.status(201).json(GetEventResponse.parse(event));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = { ...data };
  if (data.startAt) updateData.startAt = new Date(data.startAt);
  if (data.endAt) updateData.endAt = new Date(data.endAt);

  const [updated] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [event] = await db
    .select(eventWithCategory)
    .from(eventsTable)
    .leftJoin(categoriesTable, eq(eventsTable.categoryId, categoriesTable.id))
    .where(eq(eventsTable.id, updated.id));

  res.json(UpdateEventResponse.parse(event));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id)).returning();

  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
