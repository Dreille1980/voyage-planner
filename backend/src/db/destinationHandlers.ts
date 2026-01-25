import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { DestinationInfo } from "./schemas";

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Get destination info for a trip
export function getDestinationInfo(tripId: string): DestinationInfo | null {
  const db = getDatabase();
  
  const info = db.prepare("SELECT * FROM destination_info WHERE tripId = ?").get(tripId) as any;
  
  if (!info) return null;

  const content = JSON.parse(info.content);

  return {
    id: info.id,
    tripId: info.tripId,
    sections: content.sections || [],
    updatedAt: info.updatedAt,
  };
}

// Save or update destination info
export function saveDestinationInfo(tripId: string, content: { sections: any[] }): DestinationInfo {
  const db = getDatabase();
  
  // Check if info exists
  const existing = db.prepare("SELECT * FROM destination_info WHERE tripId = ?").get(tripId) as any;
  
  const timestamp = now();
  const contentStr = JSON.stringify(content);

  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE destination_info
      SET content = ?, updatedAt = ?
      WHERE tripId = ?
    `).run(contentStr, timestamp, tripId);
    
    return getDestinationInfo(tripId)!;
  } else {
    // Create new
    const id = randomUUID();
    
    db.prepare(`
      INSERT INTO destination_info (id, tripId, content, updatedAt)
      VALUES (?, ?, ?, ?)
    `).run(id, tripId, contentStr, timestamp);
    
    return getDestinationInfo(tripId)!;
  }
}

// Delete destination info
export function deleteDestinationInfo(tripId: string): boolean {
  const db = getDatabase();
  
  const result = db.prepare("DELETE FROM destination_info WHERE tripId = ?").run(tripId);
  
  return result.changes > 0;
}
