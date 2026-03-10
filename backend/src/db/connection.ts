import Database from "better-sqlite3";
import path from "path";
import { Pool } from "pg";

let db: Database.Database | null = null;
let pgPool: Pool | null = null;

// Check if we should use PostgreSQL
const usePostgres = !!process.env.DATABASE_URL;

export function getDatabase(): Database.Database | Pool {
  if (usePostgres) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      });
      initializePostgresTables();
    }
    return pgPool;
  } else {
    if (!db) {
      const dbPath = path.join(__dirname, "../../data/voyage-planner.db");
      db = new Database(dbPath);
      db.pragma("journal_mode = WAL");
      initializeSQLiteTables();
    }
    return db;
  }
}

async function initializePostgresTables() {
  if (!pgPool) return;

  try {
    // Table: users
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Table: trips (with userId foreign key)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        destination TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        number_of_days INTEGER,
        group_type TEXT,
        number_of_people INTEGER,
        trip_goal TEXT,
        trip_type TEXT,
        style TEXT,
        budget_range TEXT,
        pace TEXT,
        has_children BOOLEAN DEFAULT FALSE,
        special_requirements TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Table: travelers
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS travelers (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age_group TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    // Table: checklists
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        checklist_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        UNIQUE(trip_id, checklist_type)
      )
    `);

    // Table: checklist_categories
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS checklist_categories (
        id TEXT PRIMARY KEY,
        checklist_id TEXT NOT NULL,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
      )
    `);

    // Table: checklist_items
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        label TEXT NOT NULL,
        checked BOOLEAN DEFAULT FALSE,
        assigned_to_age_group TEXT,
        deadline TEXT,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES checklist_categories(id) ON DELETE CASCADE
      )
    `);

    // Table: destination_info
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS destination_info (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    // Table: chat_messages (assistant conversations)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    // Table: itineraries (AI-generated day-by-day itineraries)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS itineraries (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    // Table: reservations (flights, hotels, car rentals, etc.)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        confirmation_number TEXT,
        provider TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ PostgreSQL tables initialized");
  } catch (error) {
    console.error("❌ Error initializing PostgreSQL tables:", error);
    throw error;
  }
}

function initializeSQLiteTables() {
  if (!db) return;

  // Table: users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Table: trips (with userId foreign key)
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

  // Table: checklists (multiple per trip, one per type)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      checklistType TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE,
      UNIQUE(tripId, checklistType)
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
      deadline TEXT,
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

  // Table: chat_messages (assistant conversations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Table: itineraries (AI-generated day-by-day itineraries)
  db.exec(`
    CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Table: reservations (flights, hotels, car rentals, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      confirmationNumber TEXT,
      provider TEXT,
      startDate TEXT,
      endDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
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
