import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDatabase } from "./connection";
import { Pool } from "pg";
import Database from "better-sqlite3";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  password: string;
}

const usePostgres = !!process.env.DATABASE_URL;

/**
 * Create a new user
 */
export function createUser(email: string, password: string, name: string): User {
  const id = randomUUID();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    pool.query(
      `INSERT INTO users (id, email, password, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, email, hashedPassword, name, now, now]
    );
  } else {
    const sqlite = db as Database.Database;
    sqlite
      .prepare(
        `INSERT INTO users (id, email, password, name, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, email, hashedPassword, name, now, now);
  }

  return {
    id,
    email,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Find user by email (including password for authentication)
 */
export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, email, password, name, 
              created_at as "createdAt", 
              updated_at as "updatedAt"
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  } else {
    const sqlite = db as Database.Database;
    const row = sqlite
      .prepare(
        `SELECT id, email, password, name, createdAt, updatedAt
         FROM users WHERE email = ?`
      )
      .get(email) as UserWithPassword | undefined;
    return row || null;
  }
}

/**
 * Find user by ID (without password)
 */
export async function findUserById(id: string): Promise<User | null> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(
      `SELECT id, email, name,
              created_at as "createdAt",
              updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } else {
    const sqlite = db as Database.Database;
    const row = sqlite
      .prepare(
        `SELECT id, email, name, createdAt, updatedAt
         FROM users WHERE id = ?`
      )
      .get(id) as User | undefined;
    return row || null;
  }
}

/**
 * Update user profile
 */
export async function updateUser(
  id: string,
  updates: { name?: string; email?: string }
): Promise<User | null> {
  const now = new Date().toISOString();
  const db = getDatabase();

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push(usePostgres ? `name = $${values.length + 1}` : "name = ?");
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    setClauses.push(usePostgres ? `email = $${values.length + 1}` : "email = ?");
    values.push(updates.email);
  }

  if (setClauses.length === 0) {
    return findUserById(id);
  }

  setClauses.push(usePostgres ? `updated_at = $${values.length + 1}` : "updatedAt = ?");
  values.push(now);

  if (usePostgres) {
    const pool = db as Pool;
    values.push(id); // Add id as last parameter
    await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${values.length}`,
      values
    );
  } else {
    const sqlite = db as Database.Database;
    values.push(id); // Add id as last parameter
    sqlite.prepare(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  }

  return findUserById(id);
}

/**
 * Verify password
 */
export function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

/**
 * Change password
 */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString();
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    await pool.query(
      `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`,
      [hashedPassword, now, userId]
    );
  } else {
    const sqlite = db as Database.Database;
    sqlite
      .prepare(`UPDATE users SET password = ?, updatedAt = ? WHERE id = ?`)
      .run(hashedPassword, now, userId);
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const db = getDatabase();

  if (usePostgres) {
    const pool = db as Pool;
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    return (result.rowCount || 0) > 0;
  } else {
    const sqlite = db as Database.Database;
    const result = sqlite.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
    return result.changes > 0;
  }
}
