import { nanoid } from "nanoid";
import { run } from "./db";

interface LogEventOptions {
  eventType: string;
  entityId?: string;
  entityType?: string;
  actorName?: string;
  actorId?: string;
  detail?: Record<string, unknown>;
}

export async function logEvent(opts: LogEventOptions): Promise<void> {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO event_log
       (id, eventType, entityId, entityType, actorName, actorId, detail, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nanoid(),
      opts.eventType,
      opts.entityId ?? null,
      opts.entityType ?? null,
      opts.actorName ?? null,
      opts.actorId ?? null,
      opts.detail ? JSON.stringify(opts.detail) : null,
      now,
      now,
    ]
  );
}
