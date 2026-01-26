import { randomUUID } from "crypto";
import { getDatabase } from "./connection";
import type { Checklist, ChecklistCategory, ChecklistItem, ChecklistType } from "./schemas";
import Database from "better-sqlite3";
import { Pool } from "pg";

const usePostgres = !!process.env.DATABASE_URL;

// Helper to get current ISO timestamp
function now() {
  return new Date().toISOString();
}

// Get all checklists for a trip
export async function getAllChecklistsForTrip(tripId: string): Promise<Checklist[]> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, trip_id as "tripId", checklist_type as "checklistType",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM checklists WHERE trip_id = $1 ORDER BY checklist_type
    `, [tripId]);
    
    const checklists: Checklist[] = [];
    for (const checklist of result.rows) {
      checklists.push({
        ...checklist,
        categories: await getCategoriesByChecklistId(checklist.id),
      });
    }
    return checklists;
  } else {
    const sqlite = db as Database.Database;
    const checklists = sqlite.prepare("SELECT * FROM checklists WHERE tripId = ? ORDER BY checklistType").all(tripId) as any[];
    
    const result: Checklist[] = [];
    for (const checklist of checklists) {
      result.push({
        id: checklist.id,
        tripId: checklist.tripId,
        checklistType: checklist.checklistType as ChecklistType,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
        categories: await getCategoriesByChecklistId(checklist.id),
      });
    }
    return result;
  }
}

// Get checklist by type
export async function getChecklistByType(tripId: string, checklistType: ChecklistType): Promise<Checklist | null> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`
      SELECT id, trip_id as "tripId", checklist_type as "checklistType",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM checklists WHERE trip_id = $1 AND checklist_type = $2
    `, [tripId, checklistType]);
    
    if (result.rows.length === 0) return null;
    
    const checklist = result.rows[0];
    return {
      ...checklist,
      categories: await getCategoriesByChecklistId(checklist.id),
    };
  } else {
    const sqlite = db as Database.Database;
    const checklist = sqlite.prepare("SELECT * FROM checklists WHERE tripId = ? AND checklistType = ?").get(tripId, checklistType) as any;
    
    if (!checklist) return null;

    return {
      id: checklist.id,
      tripId: checklist.tripId,
      checklistType: checklist.checklistType as ChecklistType,
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
      categories: await getCategoriesByChecklistId(checklist.id),
    };
  }
}

// Create or replace checklist (from AI generation)
export async function saveChecklist(tripId: string, checklistType: ChecklistType, categories: any[]): Promise<Checklist> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    
    // Check if checklist exists
    let result = await pool.query(`
      SELECT id, trip_id as "tripId", checklist_type as "checklistType",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM checklists WHERE trip_id = $1 AND checklist_type = $2
    `, [tripId, checklistType]);
    
    let checklist: any;
    
    if (result.rows.length > 0) {
      checklist = result.rows[0];
      
      // Delete existing categories and items
      const catResult = await pool.query("SELECT id FROM checklist_categories WHERE checklist_id = $1", [checklist.id]);
      
      for (const cat of catResult.rows) {
        await pool.query("DELETE FROM checklist_items WHERE category_id = $1", [cat.id]);
      }
      await pool.query("DELETE FROM checklist_categories WHERE checklist_id = $1", [checklist.id]);
      
      // Update timestamp
      await pool.query("UPDATE checklists SET updated_at = $1 WHERE id = $2", [now(), checklist.id]);
    } else {
      // Create new checklist
      const id = randomUUID();
      const timestamp = now();
      
      await pool.query(`
        INSERT INTO checklists (id, trip_id, checklist_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, tripId, checklistType, timestamp, timestamp]);
      
      checklist = { id, tripId, checklistType, createdAt: timestamp, updatedAt: timestamp };
    }

    // Insert categories and items
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const category = categories[catIndex];
      const categoryId = randomUUID();
      
      await pool.query(`
        INSERT INTO checklist_categories (id, checklist_id, name, order_index)
        VALUES ($1, $2, $3, $4)
      `, [categoryId, checklist.id, category.name, catIndex]);

      for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
        const item = category.items[itemIndex];
        await pool.query(`
          INSERT INTO checklist_items (id, category_id, label, checked, assigned_to_age_group, deadline, order_index)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          randomUUID(),
          categoryId,
          item.label,
          false,
          item.assignedToAgeGroup || null,
          item.deadline || null,
          itemIndex
        ]);
      }
    }
    
    return await getChecklistByType(tripId, checklistType) as Checklist;
  } else {
    const sqlite = db as Database.Database;
    
    // Check if checklist exists
    let checklist = sqlite.prepare("SELECT * FROM checklists WHERE tripId = ? AND checklistType = ?").get(tripId, checklistType) as any;
    
    if (checklist) {
      // Delete existing categories and items
      const categoryIds = sqlite.prepare("SELECT id FROM checklist_categories WHERE checklistId = ?").all(checklist.id) as any[];
      
      for (const cat of categoryIds) {
        sqlite.prepare("DELETE FROM checklist_items WHERE categoryId = ?").run(cat.id);
      }
      sqlite.prepare("DELETE FROM checklist_categories WHERE checklistId = ?").run(checklist.id);
      
      // Update timestamp
      sqlite.prepare("UPDATE checklists SET updatedAt = ? WHERE id = ?").run(now(), checklist.id);
    } else {
      // Create new checklist
      const id = randomUUID();
      const timestamp = now();
      
      sqlite.prepare(`
        INSERT INTO checklists (id, tripId, checklistType, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, tripId, checklistType, timestamp, timestamp);
      
      checklist = { id, tripId, checklistType, createdAt: timestamp, updatedAt: timestamp };
    }

    // Insert categories and items
    const categoryStmt = sqlite.prepare(`
      INSERT INTO checklist_categories (id, checklistId, name, orderIndex)
      VALUES (?, ?, ?, ?)
    `);

    const itemStmt = sqlite.prepare(`
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

    return await getChecklistByType(tripId, checklistType) as Checklist;
  }
}

// Update checklist item (toggle checked, edit label, deadline, etc.)
export async function updateChecklistItem(
  itemId: string,
  updates: { label?: string; checked?: boolean; assignedToAgeGroup?: string | null; deadline?: string | null }
): Promise<ChecklistItem | null> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.label !== undefined) {
      fields.push(`label = $${paramCount++}`);
      values.push(updates.label);
    }
    if (updates.checked !== undefined) {
      fields.push(`checked = $${paramCount++}`);
      values.push(updates.checked);
    }
    if (updates.assignedToAgeGroup !== undefined) {
      fields.push(`assigned_to_age_group = $${paramCount++}`);
      values.push(updates.assignedToAgeGroup || null);
    }
    if (updates.deadline !== undefined) {
      fields.push(`deadline = $${paramCount++}`);
      values.push(updates.deadline || null);
    }

    if (fields.length === 0) return null;

    values.push(itemId);

    await pool.query(`
      UPDATE checklist_items
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
    `, values);

    const result = await pool.query(`
      SELECT id, label, checked, assigned_to_age_group as "assignedToAgeGroup",
             deadline, order_index as "orderIndex"
      FROM checklist_items WHERE id = $1
    `, [itemId]);
    
    if (result.rows.length === 0) return null;

    return result.rows[0];
  } else {
    const sqlite = db as Database.Database;
    
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

    const stmt = sqlite.prepare(`
      UPDATE checklist_items
      SET ${fields.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);

    const item = sqlite.prepare("SELECT * FROM checklist_items WHERE id = ?").get(itemId) as any;
    
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
}

// Delete checklist item
export async function deleteChecklistItem(itemId: string): Promise<boolean> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query("DELETE FROM checklist_items WHERE id = $1", [itemId]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare("DELETE FROM checklist_items WHERE id = ?").run(itemId);
    return result.changes > 0;
  }
}

// Delete entire checklist
export async function deleteChecklist(checklistId: string): Promise<boolean> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query("DELETE FROM checklists WHERE id = $1", [checklistId]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare("DELETE FROM checklists WHERE id = ?").run(checklistId);
    return result.changes > 0;
  }
}

// Helper: Get categories with items
async function getCategoriesByChecklistId(checklistId: string): Promise<ChecklistCategory[]> {
  const db = getDatabase();
  
  if (usePostgres) {
    const pool = db as Pool;
    
    const catResult = await pool.query(`
      SELECT id, name, order_index as "orderIndex"
      FROM checklist_categories
      WHERE checklist_id = $1
      ORDER BY order_index
    `, [checklistId]);

    const categories: ChecklistCategory[] = [];
    
    for (const cat of catResult.rows) {
      const itemResult = await pool.query(`
        SELECT id, label, checked, assigned_to_age_group as "assignedToAgeGroup",
               deadline, order_index as "orderIndex"
        FROM checklist_items
        WHERE category_id = $1
        ORDER BY order_index
      `, [cat.id]);

      categories.push({
        id: cat.id,
        name: cat.name,
        orderIndex: cat.orderIndex,
        items: itemResult.rows.map((item) => ({
          ...item,
          checked: Boolean(item.checked),
        })),
      });
    }
    
    return categories;
  } else {
    const sqlite = db as Database.Database;
    
    const categories = sqlite.prepare(`
      SELECT * FROM checklist_categories
      WHERE checklistId = ?
      ORDER BY orderIndex
    `).all(checklistId) as any[];

    return categories.map((cat) => {
      const items = sqlite.prepare(`
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
}
