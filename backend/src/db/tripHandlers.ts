import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { CreateTrip, UpdateTrip, Trip, Traveler } from "./schemas";
import Database from "better-sqlite3";
import { Pool } from "pg";

const usePostgres = !!process.env.DATABASE_URL;

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Create a new trip
export async function createTrip(data: CreateTrip, userId: string): Promise<Trip> {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();

  if (usePostgres) {
    const pool = db as Pool;
    
    // Insert trip
    await pool.query(`
      INSERT INTO trips (
        id, user_id, name, destination, start_date, end_date, number_of_days,
        group_type, number_of_people, trip_goal, trip_type, style, budget_range,
        pace, has_children, special_requirements, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      id,
      userId,
      data.name || null,
      data.destination,
      data.startDate || null,
      data.endDate || null,
      data.numberOfDays || null,
      data.groupType ? JSON.stringify(data.groupType) : null,
      data.numberOfPeople || null,
      data.tripGoal ? JSON.stringify(data.tripGoal) : null,
      data.tripType || null,
      data.style || null,
      data.budgetRange || null,
      data.pace || null,
      data.hasChildren || false,
      data.specialRequirements || null,
      timestamp,
      timestamp
    ]);

    // Insert travelers if provided
    if (data.travelers && data.travelers.length > 0) {
      for (const traveler of data.travelers) {
        await pool.query(`
          INSERT INTO travelers (id, trip_id, name, age_group, notes)
          VALUES ($1, $2, $3, $4, $5)
        `, [randomUUID(), id, traveler.name, traveler.ageGroup, traveler.notes || null]);
      }
    }
  } else {
    const sqlite = db as Database.Database;
    
    // Insert trip
    const stmt = sqlite.prepare(`
      INSERT INTO trips (
        id, name, destination, startDate, endDate, numberOfDays,
        groupType, numberOfPeople, tripGoal, tripType, style, budgetRange,
        pace, hasChildren, specialRequirements, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name || null,
      data.destination,
      data.startDate || null,
      data.endDate || null,
      data.numberOfDays || null,
      data.groupType ? JSON.stringify(data.groupType) : null,
      data.numberOfPeople || null,
      data.tripGoal ? JSON.stringify(data.tripGoal) : null,
      data.tripType || null,
      data.style || null,
      data.budgetRange || null,
      data.pace || null,
      data.hasChildren ? 1 : 0,
      data.specialRequirements || null,
      timestamp,
      timestamp
    );

    // Insert travelers if provided
    if (data.travelers && data.travelers.length > 0) {
      const travelerStmt = sqlite.prepare(`
        INSERT INTO travelers (id, tripId, name, ageGroup, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const traveler of data.travelers) {
        travelerStmt.run(
          randomUUID(),
          id,
          traveler.name,
          traveler.ageGroup,
          traveler.notes || null
        );
      }
    }
  }

  return await getTripById(id) as Trip;
}

// Get all trips for a specific user
export async function getAllTripsForUser(userId: string): Promise<Trip[]> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, name, destination,
             start_date as "startDate",
             end_date as "endDate",
             number_of_days as "numberOfDays",
             group_type as "groupType",
             number_of_people as "numberOfPeople",
             trip_goal as "tripGoal",
             trip_type as "tripType",
             style, budget_range as "budgetRange",
             pace, has_children as "hasChildren",
             special_requirements as "specialRequirements",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM trips WHERE user_id = $1 ORDER BY created_at DESC
    `, [userId]);
    
    const trips: Trip[] = [];
    for (const trip of result.rows) {
      trips.push({
        ...trip,
        groupType: trip.groupType ? JSON.parse(trip.groupType) : null,
        tripGoal: trip.tripGoal ? JSON.parse(trip.tripGoal) : null,
        hasChildren: Boolean(trip.hasChildren),
        travelers: await getTravelersByTripId(trip.id),
      });
    }
    return trips;
  } else {
    const sqlite = db as Database.Database;
    const trips = sqlite.prepare("SELECT * FROM trips ORDER BY createdAt DESC").all() as any[];
    
    const result: Trip[] = [];
    for (const trip of trips) {
      result.push({
        ...trip,
        groupType: trip.groupType ? JSON.parse(trip.groupType) : null,
        tripGoal: trip.tripGoal ? JSON.parse(trip.tripGoal) : null,
        hasChildren: Boolean(trip.hasChildren),
        travelers: await getTravelersByTripId(trip.id),
      });
    }
    return result;
  }
}

// Get trip by ID
export async function getTripById(id: string): Promise<Trip | null> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, name, destination,
             start_date as "startDate",
             end_date as "endDate",
             number_of_days as "numberOfDays",
             group_type as "groupType",
             number_of_people as "numberOfPeople",
             trip_goal as "tripGoal",
             trip_type as "tripType",
             style, budget_range as "budgetRange",
             pace, has_children as "hasChildren",
             special_requirements as "specialRequirements",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM trips WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const trip = result.rows[0];
    return {
      ...trip,
      groupType: trip.groupType ? JSON.parse(trip.groupType) : null,
      tripGoal: trip.tripGoal ? JSON.parse(trip.tripGoal) : null,
      hasChildren: Boolean(trip.hasChildren),
      travelers: await getTravelersByTripId(id),
    };
  } else {
    const sqlite = db as Database.Database;
    const trip = sqlite.prepare("SELECT * FROM trips WHERE id = ?").get(id) as any;
    
    if (!trip) return null;

    return {
      ...trip,
      groupType: trip.groupType ? JSON.parse(trip.groupType) : null,
      tripGoal: trip.tripGoal ? JSON.parse(trip.tripGoal) : null,
      hasChildren: Boolean(trip.hasChildren),
      travelers: await getTravelersByTripId(id),
    };
  }
}

// Update trip
export async function updateTrip(id: string, data: UpdateTrip): Promise<Trip | null> {
  const db = getDatabase();
  
  // Check if trip exists
  const existing = await getTripById(id);
  if (!existing) return null;

  if (usePostgres) {
    const pool = db as Pool;
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name || null);
    }
    if (data.destination !== undefined) {
      fields.push(`destination = $${paramCount++}`);
      values.push(data.destination);
    }
    if (data.startDate !== undefined) {
      fields.push(`start_date = $${paramCount++}`);
      values.push(data.startDate || null);
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${paramCount++}`);
      values.push(data.endDate || null);
    }
    if (data.numberOfDays !== undefined) {
      fields.push(`number_of_days = $${paramCount++}`);
      values.push(data.numberOfDays || null);
    }
    if (data.groupType !== undefined) {
      fields.push(`group_type = $${paramCount++}`);
      values.push(data.groupType ? JSON.stringify(data.groupType) : null);
    }
    if (data.numberOfPeople !== undefined) {
      fields.push(`number_of_people = $${paramCount++}`);
      values.push(data.numberOfPeople || null);
    }
    if (data.tripGoal !== undefined) {
      fields.push(`trip_goal = $${paramCount++}`);
      values.push(data.tripGoal ? JSON.stringify(data.tripGoal) : null);
    }
    if (data.tripType !== undefined) {
      fields.push(`trip_type = $${paramCount++}`);
      values.push(data.tripType || null);
    }
    if (data.style !== undefined) {
      fields.push(`style = $${paramCount++}`);
      values.push(data.style || null);
    }
    if (data.budgetRange !== undefined) {
      fields.push(`budget_range = $${paramCount++}`);
      values.push(data.budgetRange || null);
    }
    if (data.pace !== undefined) {
      fields.push(`pace = $${paramCount++}`);
      values.push(data.pace || null);
    }
    if (data.hasChildren !== undefined) {
      fields.push(`has_children = $${paramCount++}`);
      values.push(data.hasChildren);
    }
    if (data.specialRequirements !== undefined) {
      fields.push(`special_requirements = $${paramCount++}`);
      values.push(data.specialRequirements || null);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(now());
    values.push(id);

    if (fields.length > 1) {
      await pool.query(`
        UPDATE trips
        SET ${fields.join(", ")}
        WHERE id = $${paramCount}
      `, values);
    }

    // Update travelers if provided
    if (data.travelers !== undefined) {
      await pool.query("DELETE FROM travelers WHERE trip_id = $1", [id]);

      if (data.travelers.length > 0) {
        for (const traveler of data.travelers) {
          await pool.query(`
            INSERT INTO travelers (id, trip_id, name, age_group, notes)
            VALUES ($1, $2, $3, $4, $5)
          `, [randomUUID(), id, traveler.name, traveler.ageGroup, traveler.notes || null]);
        }
      }
    }
  } else {
    const sqlite = db as Database.Database;
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      values.push(data.name || null);
    }
    if (data.destination !== undefined) {
      fields.push("destination = ?");
      values.push(data.destination);
    }
    if (data.startDate !== undefined) {
      fields.push("startDate = ?");
      values.push(data.startDate || null);
    }
    if (data.endDate !== undefined) {
      fields.push("endDate = ?");
      values.push(data.endDate || null);
    }
    if (data.numberOfDays !== undefined) {
      fields.push("numberOfDays = ?");
      values.push(data.numberOfDays || null);
    }
    if (data.groupType !== undefined) {
      fields.push("groupType = ?");
      values.push(data.groupType ? JSON.stringify(data.groupType) : null);
    }
    if (data.numberOfPeople !== undefined) {
      fields.push("numberOfPeople = ?");
      values.push(data.numberOfPeople || null);
    }
    if (data.tripGoal !== undefined) {
      fields.push("tripGoal = ?");
      values.push(data.tripGoal ? JSON.stringify(data.tripGoal) : null);
    }
    if (data.tripType !== undefined) {
      fields.push("tripType = ?");
      values.push(data.tripType || null);
    }
    if (data.style !== undefined) {
      fields.push("style = ?");
      values.push(data.style || null);
    }
    if (data.budgetRange !== undefined) {
      fields.push("budgetRange = ?");
      values.push(data.budgetRange || null);
    }
    if (data.pace !== undefined) {
      fields.push("pace = ?");
      values.push(data.pace || null);
    }
    if (data.hasChildren !== undefined) {
      fields.push("hasChildren = ?");
      values.push(data.hasChildren ? 1 : 0);
    }
    if (data.specialRequirements !== undefined) {
      fields.push("specialRequirements = ?");
      values.push(data.specialRequirements || null);
    }

    fields.push("updatedAt = ?");
    values.push(now());
    values.push(id);

    if (fields.length > 1) {
      const stmt = sqlite.prepare(`
        UPDATE trips
        SET ${fields.join(", ")}
        WHERE id = ?
      `);
      stmt.run(...values);
    }

    // Update travelers if provided
    if (data.travelers !== undefined) {
      sqlite.prepare("DELETE FROM travelers WHERE tripId = ?").run(id);

      if (data.travelers.length > 0) {
        const travelerStmt = sqlite.prepare(`
          INSERT INTO travelers (id, tripId, name, ageGroup, notes)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const traveler of data.travelers) {
          travelerStmt.run(
            randomUUID(),
            id,
            traveler.name,
            traveler.ageGroup,
            traveler.notes || null
          );
        }
      }
    }
  }

  return await getTripById(id);
}

// Delete trip
export async function deleteTrip(id: string): Promise<boolean> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query("DELETE FROM trips WHERE id = $1", [id]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare("DELETE FROM trips WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

// Helper: Get travelers for a trip
async function getTravelersByTripId(tripId: string): Promise<Traveler[]> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, name, age_group as "ageGroup", notes
      FROM travelers WHERE trip_id = $1
    `, [tripId]);
    return result.rows;
  } else {
    const sqlite = db as Database.Database;
    return sqlite.prepare("SELECT id, name, ageGroup, notes FROM travelers WHERE tripId = ?").all(tripId) as Traveler[];
  }
}
