import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { CreateTrip, UpdateTrip, Trip, Traveler } from "./schemas";

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Create a new trip
export function createTrip(data: CreateTrip): Trip {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = now();

  // Insert trip
  const stmt = db.prepare(`
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
    data.groupType || null,
    data.numberOfPeople || null,
    data.tripGoal || null,
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
    const travelerStmt = db.prepare(`
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

  return getTripById(id)!;
}

// Get all trips
export function getAllTrips(): Trip[] {
  const db = getDatabase();
  
  const trips = db.prepare("SELECT * FROM trips ORDER BY createdAt DESC").all() as any[];
  
  return trips.map((trip) => ({
    ...trip,
    travelers: getTravelersByTripId(trip.id),
  }));
}

// Get trip by ID
export function getTripById(id: string): Trip | null {
  const db = getDatabase();
  
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as any;
  
  if (!trip) return null;

  return {
    ...trip,
    travelers: getTravelersByTripId(id),
  };
}

// Update trip
export function updateTrip(id: string, data: UpdateTrip): Trip | null {
  const db = getDatabase();
  
  // Check if trip exists
  const existing = getTripById(id);
  if (!existing) return null;

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
    values.push(data.groupType || null);
  }
  if (data.numberOfPeople !== undefined) {
    fields.push("numberOfPeople = ?");
    values.push(data.numberOfPeople || null);
  }
  if (data.tripGoal !== undefined) {
    fields.push("tripGoal = ?");
    values.push(data.tripGoal || null);
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
    const stmt = db.prepare(`
      UPDATE trips
      SET ${fields.join(", ")}
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Update travelers if provided
  if (data.travelers !== undefined) {
    // Delete existing travelers
    db.prepare("DELETE FROM travelers WHERE tripId = ?").run(id);

    // Insert new travelers
    if (data.travelers.length > 0) {
      const travelerStmt = db.prepare(`
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

  return getTripById(id);
}

// Delete trip
export function deleteTrip(id: string): boolean {
  const db = getDatabase();
  
  const result = db.prepare("DELETE FROM trips WHERE id = ?").run(id);
  
  return result.changes > 0;
}

// Helper: Get travelers for a trip
function getTravelersByTripId(tripId: string): Traveler[] {
  const db = getDatabase();
  
  return db.prepare("SELECT id, name, ageGroup, notes FROM travelers WHERE tripId = ?").all(tripId) as Traveler[];
}
