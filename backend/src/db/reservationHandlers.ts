import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import Database from "better-sqlite3";
import { Pool } from "pg";

const usePostgres = !!process.env.DATABASE_URL;

function now() {
  return new Date().toISOString();
}

export type ReservationType = "flight" | "hotel" | "car" | "activity" | "restaurant" | "transport" | "other";

export interface Reservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  confirmationNumber: string | null;
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservation {
  type: ReservationType;
  title: string;
  confirmationNumber?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateReservation extends Partial<CreateReservation> {}

// Get all reservations for a trip
export async function getReservationsForTrip(tripId: string): Promise<Reservation[]> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, trip_id as "tripId", type, title,
              confirmation_number as "confirmationNumber",
              provider, start_date as "startDate", end_date as "endDate",
              notes, created_at as "createdAt", updated_at as "updatedAt"
       FROM reservations WHERE trip_id = $1
       ORDER BY start_date ASC NULLS LAST, created_at ASC`,
      [tripId]
    );
    return result.rows;
  } else {
    const sqlite = db as Database.Database;
    return sqlite
      .prepare(
        `SELECT id, tripId, type, title, confirmationNumber, provider,
                startDate, endDate, notes, createdAt, updatedAt
         FROM reservations WHERE tripId = ?
         ORDER BY startDate ASC, createdAt ASC`
      )
      .all(tripId) as Reservation[];
  }
}

// Get a single reservation by ID
export async function getReservationById(id: string): Promise<Reservation | null> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, trip_id as "tripId", type, title,
              confirmation_number as "confirmationNumber",
              provider, start_date as "startDate", end_date as "endDate",
              notes, created_at as "createdAt", updated_at as "updatedAt"
       FROM reservations WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } else {
    const sqlite = db as Database.Database;
    const row = sqlite
      .prepare("SELECT * FROM reservations WHERE id = ?")
      .get(id) as any;
    return row || null;
  }
}

// Create a new reservation
export async function createReservation(
  tripId: string,
  data: CreateReservation
): Promise<Reservation> {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();

  if (usePostgres) {
    const pool = db as Pool;
    await pool.query(
      `INSERT INTO reservations (id, trip_id, type, title, confirmation_number, provider,
                                  start_date, end_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        tripId,
        data.type,
        data.title,
        data.confirmationNumber || null,
        data.provider || null,
        data.startDate || null,
        data.endDate || null,
        data.notes || null,
        timestamp,
        timestamp,
      ]
    );
  } else {
    const sqlite = db as Database.Database;
    sqlite
      .prepare(
        `INSERT INTO reservations (id, tripId, type, title, confirmationNumber, provider,
                                    startDate, endDate, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        tripId,
        data.type,
        data.title,
        data.confirmationNumber || null,
        data.provider || null,
        data.startDate || null,
        data.endDate || null,
        data.notes || null,
        timestamp,
        timestamp
      );
  }

  return (await getReservationById(id)) as Reservation;
}

// Update a reservation
export async function updateReservation(
  id: string,
  data: UpdateReservation
): Promise<Reservation | null> {
  const db = getDatabase();
  const existing = await getReservationById(id);
  if (!existing) return null;

  if (usePostgres) {
    const pool = db as Pool;
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.type !== undefined) {
      fields.push(`type = $${paramCount++}`);
      values.push(data.type);
    }
    if (data.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.confirmationNumber !== undefined) {
      fields.push(`confirmation_number = $${paramCount++}`);
      values.push(data.confirmationNumber || null);
    }
    if (data.provider !== undefined) {
      fields.push(`provider = $${paramCount++}`);
      values.push(data.provider || null);
    }
    if (data.startDate !== undefined) {
      fields.push(`start_date = $${paramCount++}`);
      values.push(data.startDate || null);
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${paramCount++}`);
      values.push(data.endDate || null);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(data.notes || null);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(now());
    values.push(id);

    if (fields.length > 1) {
      await pool.query(
        `UPDATE reservations SET ${fields.join(", ")} WHERE id = $${paramCount}`,
        values
      );
    }
  } else {
    const sqlite = db as Database.Database;
    const fields: string[] = [];
    const values: any[] = [];

    if (data.type !== undefined) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.confirmationNumber !== undefined) {
      fields.push("confirmationNumber = ?");
      values.push(data.confirmationNumber || null);
    }
    if (data.provider !== undefined) {
      fields.push("provider = ?");
      values.push(data.provider || null);
    }
    if (data.startDate !== undefined) {
      fields.push("startDate = ?");
      values.push(data.startDate || null);
    }
    if (data.endDate !== undefined) {
      fields.push("endDate = ?");
      values.push(data.endDate || null);
    }
    if (data.notes !== undefined) {
      fields.push("notes = ?");
      values.push(data.notes || null);
    }

    fields.push("updatedAt = ?");
    values.push(now());
    values.push(id);

    if (fields.length > 1) {
      sqlite
        .prepare(`UPDATE reservations SET ${fields.join(", ")} WHERE id = ?`)
        .run(...values);
    }
  }

  return getReservationById(id);
}

// Delete a reservation
export async function deleteReservation(id: string): Promise<boolean> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query("DELETE FROM reservations WHERE id = $1", [id]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare("DELETE FROM reservations WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
