import { Router } from "express";
import { db } from "@workspace/db";
import { eventAttachmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createAttachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  objectPath: z.string().min(1),
});

router.get("/events/:id/attachments", async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const attachments = await db
    .select()
    .from(eventAttachmentsTable)
    .where(eq(eventAttachmentsTable.eventId, eventId));
  res.json(attachments);
});

router.post("/events/:id/attachments", async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const parsed = createAttachmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const [attachment] = await db
    .insert(eventAttachmentsTable)
    .values({ eventId, ...parsed.data })
    .returning();
  res.status(201).json(attachment);
});

router.delete("/events/:id/attachments/:attachmentId", async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const attachmentId = parseInt(req.params.attachmentId, 10);
  if (isNaN(eventId) || isNaN(attachmentId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const deleted = await db
    .delete(eventAttachmentsTable)
    .where(eq(eventAttachmentsTable.id, attachmentId))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  res.status(204).send();
});

export default router;
