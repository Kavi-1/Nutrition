// db/logDb.ts
// ============================================
// Local SQLite helper module (native only)
// ============================================
//
// This file provides a simple wrapper around Expo's
// `expo-sqlite` API to store food log entries locally
// on iOS and Android devices.
//
// IMPORTANT:
// This must **NOT** run on the Web. Web workers cannot
// load SQLite WASM in your Expo version. Our project
// uses native-only database access, so this file will be
// imported ONLY in native navigation paths.
//
// The database automatically initializes on import.
//

import * as SQLite from "expo-sqlite";

/**
 * FoodLogEntry
 *
 * Represents a single row inside the SQLite table.
 * Most fields are optional because USDA search data varies.
 */
export type FoodLogEntry = {
  id?: number;                     // Auto-increment primary key
  fdcId?: number | string;         // USDA Food Data Central ID
  description: string;             // Food name
  brandName?: string;              // Optional brand field
  category?: string;               // USDA category
  servingSize?: number;            // Reference serving size (optional)
  servingUnit?: string;            // Unit for serving size
  amount: string;                  // Amount user ate (e.g. "1", "2.5")
  notes?: string;                  // Optional free text
  calories?: number;               // Energy content
  protein?: number;                // Protein grams
  fat?: number;                    // Fat grams
  carbs?: number;                  // Carbs grams
  createdAt?: string;              // ISO timestamp of log creation
};

/**
 * ================================================
 * Open SQLite Database
 * ================================================
 *
 * Uses Expo’s new synchronous API:
 *     SQLite.openDatabaseSync()
 *
 * - Works on iOS and Android
 * - Will throw errors on Web (which is fine,
 *   because our project disables web DB usage)
 */
const db = SQLite.openDatabaseSync("labeliq.db");

/**
 * ================================================
 * Initialize database schema
 * ================================================
 *
 * Creates the `FoodLogEntries` table if it does not exist.
 * This function is idempotent — running it multiple times
 * has no side effects.
 */
export function initLogDb() {
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
}

// Run initialization immediately when this module loads
initLogDb();

/**
 * ================================================
 * Insert a new food log entry
 * ================================================
 *
 * @param entry  A structured FoodLogEntry object
 * @returns      The row ID of the newly inserted entry
 *
 * Fields not provided default to NULL (SQLite-compatible).
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

  // Use provided timestamp or generate a new one
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

/**
 * ================================================
 * Delete a food log entry by ID
 * ================================================
 *
 * Removes a single row from the database using the
 * primary key `id`.
 *
 * This is used by the “Today Log” screen when the user
 * long-presses a log entry.
 *
 * @param id  Primary key of the row to delete
 */
export function deleteLogById(id: number): void {
  const stmt = db.prepareSync(`
    DELETE FROM FoodLogEntries
    WHERE id = ?
  `);

  stmt.executeSync([id]);
}

/**
 * ================================================
 * Query logs for a specific date (YYYY-MM-DD)
 * ================================================
 *
 * This function filters entries by comparing the
 * first 10 characters of createdAt (ISO timestamp).
 *
 * Example:
 *   createdAt = "2025-11-20T03:40:34.123Z"
 *   substr(createdAt, 1, 10) = "2025-11-20"
 */
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

/**
 * ================================================
 * Convenience helper: get today's logs
 * ================================================
 *
 * Produces YYYY-MM-DD from current device time,
 * then reuses getLogsForDate().
 */
export function getTodayLogs(): FoodLogEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return getLogsForDate(today);
}

/**
 * ================================================
 * Load / Update a single log entry by ID
 * ================================================
 */

/**
 * getLogById
 *
 * Fetch a single FoodLogEntry row by its primary key.
 * Returns `null` if not found.
 */
export function getLogById(id: number): FoodLogEntry | null {
  const rows = db.getAllSync<FoodLogEntry>(
    `
    SELECT *
    FROM FoodLogEntries
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] ?? null;
}

/**
 * updateLogServingAndNotes
 *
 * Update only the serving `amount` and free-text `notes`
 * fields for an existing log entry.
 *
 * The rest of the nutrition data (calories / macros) is
 * kept as originally logged for that food.
 */
export function updateLogServingAndNotes(
  id: number,
  amount: string,
  notes?: string
): void {
  const stmt = db.prepareSync(`
    UPDATE FoodLogEntries
    SET amount = ?, notes = ?
    WHERE id = ?
  `);

  stmt.executeSync([amount, notes ?? null, id]);
}