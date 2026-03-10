import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import Database from "better-sqlite3";
import { Pool } from "pg";

const usePostgres = !!process.env.DATABASE_URL;

function now() {
  return new Date().toISOString();
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  type: string; // "visit" | "food" | "transport" | "leisure" | "shopping" | "other"
  duration?: string;
  tips?: string;
}

export interface Itinerary {
  id: string;
  tripId: string;
  days: ItineraryDay[];
  updatedAt: string;
}

// Get itinerary for a trip
export async function getItinerary(tripId: string): Promise<Itinerary | null> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, trip_id as "tripId", content, updated_at as "updatedAt"
       FROM itineraries WHERE trip_id = $1`,
      [tripId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const content = JSON.parse(row.content);

    return {
      id: row.id,
      tripId: row.tripId,
      days: content.days || [],
      updatedAt: row.updatedAt,
    };
  } else {
    const sqlite = db as Database.Database;
    const row = sqlite
      .prepare("SELECT * FROM itineraries WHERE tripId = ?")
      .get(tripId) as any;

    if (!row) return null;

    const content = JSON.parse(row.content);

    return {
      id: row.id,
      tripId: row.tripId,
      days: content.days || [],
      updatedAt: row.updatedAt,
    };
  }
}

// Save or update itinerary
export async function saveItinerary(
  tripId: string,
  content: { days: ItineraryDay[] }
): Promise<Itinerary> {
  const db = getDatabase();

  // Add IDs to activities if missing
  const days = content.days.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => ({
      ...activity,
      id: activity.id || randomUUID(),
    })),
  }));

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id FROM itineraries WHERE trip_id = $1`,
      [tripId]
    );

    const timestamp = now();
    const contentStr = JSON.stringify({ days });

    if (result.rows.length > 0) {
      await pool.query(
        `UPDATE itineraries SET content = $1, updated_at = $2 WHERE trip_id = $3`,
        [contentStr, timestamp, tripId]
      );
    } else {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO itineraries (id, trip_id, content, updated_at)
         VALUES ($1, $2, $3, $4)`,
        [id, tripId, contentStr, timestamp]
      );
    }

    return (await getItinerary(tripId)) as Itinerary;
  } else {
    const sqlite = db as Database.Database;
    const existing = sqlite
      .prepare("SELECT * FROM itineraries WHERE tripId = ?")
      .get(tripId) as any;

    const timestamp = now();
    const contentStr = JSON.stringify({ days });

    if (existing) {
      sqlite
        .prepare(`UPDATE itineraries SET content = ?, updatedAt = ? WHERE tripId = ?`)
        .run(contentStr, timestamp, tripId);
    } else {
      const id = randomUUID();
      sqlite
        .prepare(
          `INSERT INTO itineraries (id, tripId, content, updatedAt)
           VALUES (?, ?, ?, ?)`
        )
        .run(id, tripId, contentStr, timestamp);
    }

    return (await getItinerary(tripId)) as Itinerary;
  }
}

// Update a single activity in the itinerary
export async function updateItineraryActivity(
  tripId: string,
  dayNumber: number,
  activityId: string,
  updates: Partial<ItineraryActivity>
): Promise<Itinerary | null> {
  const itinerary = await getItinerary(tripId);
  if (!itinerary) return null;

  const day = itinerary.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;

  const activityIndex = day.activities.findIndex((a) => a.id === activityId);
  if (activityIndex === -1) return null;

  const existing = day.activities[activityIndex]!;
  day.activities[activityIndex] = {
    id: existing.id,
    time: updates.time !== undefined ? updates.time : existing.time,
    title: updates.title !== undefined ? updates.title : existing.title,
    description: updates.description !== undefined ? updates.description : existing.description,
    type: updates.type !== undefined ? updates.type : existing.type,
    duration: updates.duration !== undefined ? updates.duration : existing.duration,
    tips: updates.tips !== undefined ? updates.tips : existing.tips,
  };

  return saveItinerary(tripId, { days: itinerary.days });
}

// Add an activity to a specific day
export async function addItineraryActivity(
  tripId: string,
  dayNumber: number,
  activity: Omit<ItineraryActivity, "id">
): Promise<Itinerary | null> {
  const itinerary = await getItinerary(tripId);
  if (!itinerary) return null;

  const day = itinerary.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;

  day.activities.push({
    ...activity,
    id: randomUUID(),
  });

  return saveItinerary(tripId, { days: itinerary.days });
}

// Delete an activity from a specific day
export async function deleteItineraryActivity(
  tripId: string,
  dayNumber: number,
  activityId: string
): Promise<Itinerary | null> {
  const itinerary = await getItinerary(tripId);
  if (!itinerary) return null;

  const day = itinerary.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return null;

  day.activities = day.activities.filter((a) => a.id !== activityId);

  return saveItinerary(tripId, { days: itinerary.days });
}

// Delete entire itinerary
export async function deleteItinerary(tripId: string): Promise<boolean> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      "DELETE FROM itineraries WHERE trip_id = $1",
      [tripId]
    );
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite
      .prepare("DELETE FROM itineraries WHERE tripId = ?")
      .run(tripId);
    return result.changes > 0;
  }
}
