import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { Checklist, ChecklistCategory, ChecklistItem, ChecklistType } from "./schemas";

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Get all checklists for a trip
export function getAllChecklistsForTrip(tripId: string): Checklist[] {
  const db = getDatabase();
  
  const checklists = db.prepare("SELECT * FROM checklists WHERE tripId = ? ORDER BY checklistType").all(tripId) as any[];
  
  return checklists.map((checklist) => ({
    id: checklist.id,
    tripId: checklist.tripId,
    checklistType: checklist.checklistType as ChecklistType,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    categories: getCategoriesByChecklistId(checklist.id),
  }));
}

// Get checklist by type
export function getChecklistByType(tripId: string, checklistType: ChecklistType): Checklist | null {
  const db = getDatabase();
  
  const checklist = db.prepare("SELECT * FROM checklists WHERE tripId = ? AND checklistType = ?").get(tripId, checklistType) as any;
  
  if (!checklist) return null;

  return {
    id: checklist.id,
    tripId: checklist.tripId,
    checklistType: checklist.checklistType as ChecklistType,
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    categories: getCategoriesByChecklistId(checklist.id),
  };
}

// Create or replace checklist (from AI generation)
export function saveChecklist(tripId: string, checklistType: ChecklistType, categories: any[]): Checklist {
  const db = getDatabase();
  
  // Check if checklist exists
  let checklist = db.prepare("SELECT * FROM checklists WHERE tripId = ? AND checklistType = ?").get(tripId, checklistType) as any;
  
  if (checklist) {
    // Delete existing categories and items
    const categoryIds = db.prepare("SELECT id FROM checklist_categories WHERE checklistId = ?").all(checklist.id) as any[];
    
    for (const cat of categoryIds) {
      db.prepare("DELETE FROM checklist_items WHERE categoryId = ?").run(cat.id);
    }
    db.prepare("DELETE FROM checklist_categories WHERE checklistId = ?").run(checklist.id);
    
    // Update timestamp
    db.prepare("UPDATE checklists SET updatedAt = ? WHERE id = ?").run(now(), checklist.id);
  } else {
    // Create new checklist
    const id = randomUUID();
    const timestamp = now();
    
    db.prepare(`
      INSERT INTO checklists (id, tripId, checklistType, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, tripId, checklistType, timestamp, timestamp);
    
    checklist = { id, tripId, checklistType, createdAt: timestamp, updatedAt: timestamp };
  }

  // Insert categories and items
  const categoryStmt = db.prepare(`
    INSERT INTO checklist_categories (id, checklistId, name, orderIndex)
    VALUES (?, ?, ?, ?)
  `);

  const itemStmt = db.prepare(`
    INSERT INTO checklist_items (id, categoryId, label, checked, assignedToAgeGroup, deadline, orderIndex)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  categories.forEach((category, catIndex) => {
    const categoryId = randomUUID();
    categoryStmt.run(categoryId, checklist.id, category.name, catIndex);

    category.items.forEach((item: any, itemIndex: number) => {
      itemStmt.run(
        randomUUID(),
        categoryId,
        item.label,
        0, // unchecked by default
        item.assignedToAgeGroup || null,
        item.deadline || null,
        itemIndex
      );
    });
  });

  return getChecklistByType(tripId, checklistType)!;
}

// Update checklist item (toggle checked, edit label, deadline, etc.)
export function updateChecklistItem(
  itemId: string,
  updates: { label?: string; checked?: boolean; assignedToAgeGroup?: string | null; deadline?: string | null }
): ChecklistItem | null {
  const db = getDatabase();
  
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.label !== undefined) {
    fields.push("label = ?");
    values.push(updates.label);
  }
  if (updates.checked !== undefined) {
    fields.push("checked = ?");
    values.push(updates.checked ? 1 : 0);
  }
  if (updates.assignedToAgeGroup !== undefined) {
    fields.push("assignedToAgeGroup = ?");
    values.push(updates.assignedToAgeGroup || null);
  }
  if (updates.deadline !== undefined) {
    fields.push("deadline = ?");
    values.push(updates.deadline || null);
  }

  if (fields.length === 0) return null;

  values.push(itemId);

  const stmt = db.prepare(`
    UPDATE checklist_items
    SET ${fields.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...values);

  const item = db.prepare("SELECT * FROM checklist_items WHERE id = ?").get(itemId) as any;
  
  if (!item) return null;

  return {
    id: item.id,
    label: item.label,
    checked: item.checked === 1,
    assignedToAgeGroup: item.assignedToAgeGroup,
    deadline: item.deadline,
    orderIndex: item.orderIndex,
  };
}

// Delete checklist item
export function deleteChecklistItem(itemId: string): boolean {
  const db = getDatabase();
  
  const result = db.prepare("DELETE FROM checklist_items WHERE id = ?").run(itemId);
  
  return result.changes > 0;
}

// Delete entire checklist
export function deleteChecklist(checklistId: string): boolean {
  const db = getDatabase();
  
  const result = db.prepare("DELETE FROM checklists WHERE id = ?").run(checklistId);
  
  return result.changes > 0;
}

// Helper: Get categories with items
function getCategoriesByChecklistId(checklistId: string): ChecklistCategory[] {
  const db = getDatabase();
  
  const categories = db.prepare(`
    SELECT * FROM checklist_categories
    WHERE checklistId = ?
    ORDER BY orderIndex
  `).all(checklistId) as any[];

  return categories.map((cat) => {
    const items = db.prepare(`
      SELECT * FROM checklist_items
      WHERE categoryId = ?
      ORDER BY orderIndex
    `).all(cat.id) as any[];

    return {
      id: cat.id,
      name: cat.name,
      orderIndex: cat.orderIndex,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        checked: item.checked === 1,
        assignedToAgeGroup: item.assignedToAgeGroup,
        deadline: item.deadline,
        orderIndex: item.orderIndex,
      })),
    };
  });
}
