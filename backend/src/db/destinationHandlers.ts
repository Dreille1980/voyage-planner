import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { DestinationInfo } from "./schemas";
import Database from "better-sqlite3";
import { Pool } from "pg";

const usePostgres = !!process.env.DATABASE_URL;

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Get destination info for a trip
export async function getDestinationInfo(tripId: string): Promise<DestinationInfo | null> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, trip_id as "tripId", content, updated_at as "updatedAt"
      FROM destination_info WHERE trip_id = $1
    `, [tripId]);
    
    if (result.rows.length === 0) return null;
    
    const info = result.rows[0];
    const content = JSON.parse(info.content);

    return {
      id: info.id,
      tripId: info.tripId,
      sections: content.sections || [],
      updatedAt: info.updatedAt,
    };
  } else {
    const sqlite = db as Database.Database;
    const info = sqlite.prepare("SELECT * FROM destination_info WHERE tripId = ?").get(tripId) as any;
    
    if (!info) return null;

    const content = JSON.parse(info.content);

    return {
      id: info.id,
      tripId: info.tripId,
      sections: content.sections || [],
      updatedAt: info.updatedAt,
    };
  }
}

// Save or update destination info
export async function saveDestinationInfo(tripId: string, content: { sections: any[] }): Promise<DestinationInfo> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    
    // Check if info exists
    const result = await pool.query(`
      SELECT id FROM destination_info WHERE trip_id = $1
    `, [tripId]);
    
    const timestamp = now();
    const contentStr = JSON.stringify(content);

    if (result.rows.length > 0) {
      // Update existing
      await pool.query(`
        UPDATE destination_info
        SET content = $1, updated_at = $2
        WHERE trip_id = $3
      `, [contentStr, timestamp, tripId]);
    } else {
      // Create new
      const id = randomUUID();
      
      await pool.query(`
        INSERT INTO destination_info (id, trip_id, content, updated_at)
        VALUES ($1, $2, $3, $4)
      `, [id, tripId, contentStr, timestamp]);
    }
    
    return await getDestinationInfo(tripId) as DestinationInfo;
  } else {
    const sqlite = db as Database.Database;
    
    // Check if info exists
    const existing = sqlite.prepare("SELECT * FROM destination_info WHERE tripId = ?").get(tripId) as any;
    
    const timestamp = now();
    const contentStr = JSON.stringify(content);

    if (existing) {
      // Update existing
      sqlite.prepare(`
        UPDATE destination_info
        SET content = ?, updatedAt = ?
        WHERE tripId = ?
      `).run(contentStr, timestamp, tripId);
    } else {
      // Create new
      const id = randomUUID();
      
      sqlite.prepare(`
        INSERT INTO destination_info (id, tripId, content, updatedAt)
        VALUES (?, ?, ?, ?)
      `).run(id, tripId, contentStr, timestamp);
    }
    
    return await getDestinationInfo(tripId) as DestinationInfo;
  }
}

// Delete destination info
export async function deleteDestinationInfo(tripId: string): Promise<boolean> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query("DELETE FROM destination_info WHERE trip_id = $1", [tripId]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare("DELETE FROM destination_info WHERE tripId = ?").run(tripId);
    return result.changes > 0;
  }
}
