import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const eventAttachmentsTable = pgTable("event_attachments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventAttachment = typeof eventAttachmentsTable.$inferSelect;
