// db/logDb.ts
// ============================================
// Local SQLite helper module (native only)
// ============================================
//
// Stores:
//   1. Food log entries (FoodLogEntries table)
//   2. Single user profile (UserProfile table)
//
// IMPORTANT:
// This must **NOT** run on Web. Web workers cannot
// load SQLite WASM in your Expo version. Our project
// uses native-only database access.
//
// The database automatically initializes on import.
//

import * as SQLite from "expo-sqlite";

// ====================================================
// Types
// ====================================================

/**
 * FoodLogEntry
 *
 * Represents a single row inside the food log table.
 * Per-serving nutrition values come from USDA.
 * `amount` = number of servings the user ate.
 */
export type FoodLogEntry = {
  id?: number;
  fdcId?: number | string;
  description: string;
  brandName?: string;
  category?: string;
  servingSize?: number;
  servingUnit?: string;

  amount: string; // as text; user-entered servings (e.g. "1", "2.5")
  notes?: string;

  // Per-serving nutrition values
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;

  createdAt?: string;
};

/**
 * UserProfile
 *
 * Simple profile stored locally. Only one row exists (id = 1).
 */
export type UserProfile = {
  id?: number; // always 1
  age?: number;
  height?: string;
  weight?: string;
  gender?: string;
  allergies?: string; // comma-separated
  dietaryPreferences?: string;
};

// ====================================================
// Open SQLite Database
// ====================================================

const db = SQLite.openDatabaseSync("labeliq.db");

// ====================================================
// Initialize Tables
// ====================================================

export function initLogDb() {
  // Food Log table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS FoodLogEntries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fdcId TEXT,
      description TEXT NOT NULL,
      brandName TEXT,
      category TEXT,
      servingSize REAL,
      servingUnit TEXT,
      amount TEXT NOT NULL,
      notes TEXT,
      calories REAL,
      protein REAL,
      fat REAL,
      carbs REAL,
      createdAt TEXT NOT NULL
    );
  `);

  // User Profile (single row: id=1)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS UserProfile (
      id INTEGER PRIMARY KEY,
      age INTEGER,
      height TEXT,
      weight TEXT,
      gender TEXT,
      allergies TEXT,
      dietaryPreferences TEXT
    );
  `);
}

initLogDb(); // run on import

// ====================================================
// CRUD: Food Log
// ====================================================

/**
 * Insert a new food log entry.
 *
 * @returns number new row ID
 */
export function insertFoodLog(entry: FoodLogEntry): number {
  const stmt = db.prepareSync(`
    INSERT INTO FoodLogEntries
      (fdcId, description, brandName, category,
       servingSize, servingUnit,
       amount, notes,
       calories, protein, fat, carbs,
       createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createdAt = entry.createdAt ?? new Date().toISOString();

  const result = stmt.executeSync([
    entry.fdcId ?? null,
    entry.description,
    entry.brandName ?? null,
    entry.category ?? null,
    entry.servingSize ?? null,
    entry.servingUnit ?? null,
    entry.amount,
    entry.notes ?? null,
    entry.calories ?? null,
    entry.protein ?? null,
    entry.fat ?? null,
    entry.carbs ?? null,
    createdAt,
  ]);

  return result.lastInsertRowId!;
}

/** Delete by ID */
export function deleteLogById(id: number): void {
  const stmt = db.prepareSync(`
    DELETE FROM FoodLogEntries WHERE id = ?
  `);
  stmt.executeSync([id]);
}

/** Get a specific date's logs, YYYY-MM-DD */
export function getLogsForDate(date: string): FoodLogEntry[] {
  return db.getAllSync<FoodLogEntry>(
    `
    SELECT *
    FROM FoodLogEntries
    WHERE substr(createdAt, 1, 10) = ?
    ORDER BY datetime(createdAt) DESC
    `,
    [date]
  );
}

/** Get today's logs */
export function getTodayLogs(): FoodLogEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return getLogsForDate(today);
}

/** Fetch single log entry by ID */
export function getLogById(id: number): FoodLogEntry | null {
  const row = db.getFirstSync<FoodLogEntry>(
    `
    SELECT *
    FROM FoodLogEntries
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return row ?? null;
}

/**
 * Update amount + notes + derived totals.
 *
 * Since all nutrition values are **per serving**, and
 * amount = number of servings eaten,
 * we scale totals simply by multiplying.
 */
export function updateFoodLogAmountAndNotes(
  id: number,
  newAmount: string,
  newNotes?: string
): void {
  const existing = getLogById(id);
  if (!existing) throw new Error(`Food log with id=${id} not found`);

  const amountNum = Number(newAmount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("newAmount must be a positive number");
  }

  // Per-serving values remain unchanged.
  // We store per-serving nutrition in the DB,
  // and compute totals in the UI.

  const stmt = db.prepareSync(`
    UPDATE FoodLogEntries
    SET amount = ?, notes = ?
    WHERE id = ?
  `);

  stmt.executeSync([newAmount, newNotes ?? null, id]);
}

/** Reset log table — used in Profile debug button */
export function resetLogDb(): void {
  db.execSync(`DELETE FROM FoodLogEntries;`);
}

// ====================================================
// CRUD: User Profile
// ====================================================

/** Get the single profile row (id = 1) */
export function getUserProfile(): UserProfile | null {
  const row = db.getFirstSync<UserProfile>(
    `
    SELECT *
    FROM UserProfile
    WHERE id = 1
    `
  );
  return row ?? null;
}

/**
 * Insert/update the only user profile row.
 * If exists → UPDATE
 * If missing → INSERT id=1
 */
export function upsertUserProfile(profile: UserProfile): void {
  const existing = getUserProfile();

  const fields = {
    age: profile.age ?? null,
    height: profile.height ?? null,
    weight: profile.weight ?? null,
    gender: profile.gender ?? null,
    allergies: profile.allergies ?? null,
    dietaryPreferences: profile.dietaryPreferences ?? null,
  };

  if (existing) {
    const stmt = db.prepareSync(`
      UPDATE UserProfile
      SET age = ?, height = ?, weight = ?, gender = ?,
          allergies = ?, dietaryPreferences = ?
      WHERE id = 1
    `);

    stmt.executeSync([
      fields.age,
      fields.height,
      fields.weight,
      fields.gender,
      fields.allergies,
      fields.dietaryPreferences,
    ]);
  } else {
    const stmt = db.prepareSync(`
      INSERT INTO UserProfile
      (id, age, height, weight, gender, allergies, dietaryPreferences)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `);

    stmt.executeSync([
      fields.age,
      fields.height,
      fields.weight,
      fields.gender,
      fields.allergies,
      fields.dietaryPreferences,
    ]);
  }
}