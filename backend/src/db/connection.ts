import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(__dirname, "../../data/voyage-planner.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initializeTables();
  }
  return db;
}

function initializeTables() {
  if (!db) return;

  // Table: trips
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT,
      destination TEXT NOT NULL,
      startDate TEXT,
      endDate TEXT,
      numberOfDays INTEGER,
      groupType TEXT,
      numberOfPeople INTEGER,
      tripGoal TEXT,
      tripType TEXT,
      style TEXT,
      budgetRange TEXT,
      pace TEXT,
      hasChildren INTEGER DEFAULT 0,
      specialRequirements TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Table: travelers
  db.exec(`
    CREATE TABLE IF NOT EXISTS travelers (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      name TEXT NOT NULL,
      ageGroup TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Table: checklists (one per trip)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Table: checklist_categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_categories (
      id TEXT PRIMARY KEY,
      checklistId TEXT NOT NULL,
      name TEXT NOT NULL,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (checklistId) REFERENCES checklists(id) ON DELETE CASCADE
    )
  `);

  // Table: checklist_items
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      label TEXT NOT NULL,
      checked INTEGER DEFAULT 0,
      assignedToAgeGroup TEXT,
      orderIndex INTEGER NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES checklist_categories(id) ON DELETE CASCADE
    )
  `);

  // Table: destination_info (cached AI responses)
  db.exec(`
    CREATE TABLE IF NOT EXISTS destination_info (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ Database tables initialized");
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
