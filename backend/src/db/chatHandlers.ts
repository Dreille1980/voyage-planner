import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import { Pool } from "pg";

export interface ChatMessage {
  id: string;
  tripId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const usePostgres = !!process.env.DATABASE_URL;

/**
 * Get all chat messages for a trip
 */
export async function getChatMessages(tripId: string): Promise<ChatMessage[]> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, trip_id as "tripId", role, content, created_at as "createdAt"
       FROM chat_messages
       WHERE trip_id = $1
       ORDER BY created_at ASC`,
      [tripId]
    );
    return result.rows.map(row => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));
  } else {
    const sqlite = db as any;
    const rows = sqlite
      .prepare(
        `SELECT id, tripId, role, content, createdAt
         FROM chat_messages
         WHERE tripId = ?
         ORDER BY createdAt ASC`
      )
      .all(tripId);
    return rows;
  }
}

/**
 * Save a new chat message
 */
export async function saveChatMessage(
  tripId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const db = getDatabase();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (usePostgres) {
    const pool = db as Pool;
    await pool.query(
      `INSERT INTO chat_messages (id, trip_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, tripId, role, content, createdAt]
    );
  } else {
    const sqlite = db as any;
    sqlite
      .prepare(
        `INSERT INTO chat_messages (id, tripId, role, content, createdAt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, tripId, role, content, createdAt);
  }

  return { id, tripId, role, content, createdAt };
}

/**
 * Get count of user messages sent today for a specific trip
 */
export async function getTodayMessageCount(tripId: string): Promise<number> {
  const db = getDatabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM chat_messages
       WHERE trip_id = $1 AND role = 'user' AND created_at >= $2`,
      [tripId, todayStartISO]
    );
    return parseInt(result.rows[0].count, 10);
  } else {
    const sqlite = db as any;
    const row = sqlite
      .prepare(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE tripId = ? AND role = 'user' AND createdAt >= ?`
      )
      .get(tripId, todayStartISO);
    return row.count;
  }
}

/**
 * Delete all chat messages for a trip (for cleanup/reset)
 */
export async function deleteChatMessages(tripId: string): Promise<void> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    await pool.query(`DELETE FROM chat_messages WHERE trip_id = $1`, [tripId]);
  } else {
    const sqlite = db as any;
    sqlite.prepare(`DELETE FROM chat_messages WHERE tripId = ?`).run(tripId);
  }
}
