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
//   - This must **NOT** run on the Web.
//   - We treat DB fields as:
//
//       calories/protein/fat/carbs  = per reference serving
//       servingSize + servingUnit   = size of 1 serving (ml / g)
//       amount                      = total ml / g actually eaten
//
//   All totals are computed in the UI as:
//
//       servingsEaten = amount / servingSize
//       total         = perServing * servingsEaten
//
// The database automatically initializes on import.
//

import * as SQLite from "expo-sqlite";

/**
 * FoodLogEntry
 *
 * Represents a single row inside the SQLite table.
 */
export type FoodLogEntry = {
  id?: number;               // Auto-increment primary key
  fdcId?: number | string;   // USDA Food Data Central ID
  description: string;       // Food name
  brandName?: string;        // Optional brand field
  category?: string;         // USDA category
  servingSize?: number;      // Reference serving size (e.g. 236, 140)
  servingUnit?: string;      // Unit for serving size ("ml", "g", etc.)
  amount: string;            // Total amount eaten (same unit as servingSize)
  notes?: string;            // Optional free text
  calories?: number;         // per-serving calories
  protein?: number;          // per-serving grams
  fat?: number;
  carbs?: number;
  createdAt?: string;        // ISO timestamp of log creation
};

/**
 * ================================================
 * Open SQLite Database
 * ================================================
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
 * We expect callers to pass:
 *   - amount      = total ml / g eaten
 *   - servingSize = reference serving (ml / g)
 *   - calories    = per-serving values (NOT scaled)
 *
 * @param entry  A structured FoodLogEntry object
 * @returns      The row ID of the newly inserted entry
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

  // use local timestamp 
  const getLocalTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const createdAt = entry.createdAt ?? getLocalTimestamp();

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
 * Reset the log DB (dev / debugging helper)
 * ================================================
 *
 * Drops all rows from FoodLogEntries.  Schema is kept.
 */
export function resetLogDb(): void {
  db.execSync(`DELETE FROM FoodLogEntries;`);
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
 */
export function getTodayLogs(): FoodLogEntry[] {
  const today = new Date().toISOString().slice(0, 10);
  return getLogsForDate(today);
}

/**
 * ================================================
 * Fetch a single log entry by ID
 * ================================================
 */
export function getLogById(id: number): FoodLogEntry | null {
  const row = db.getFirstSync<FoodLogEntry>(
    `
    SELECT *
    FROM FoodLogEntries
    WHERE id = ?
    `,
    [id]
  );
  return row ?? null;
}

/**
 * ================================================
 * Update a log entry's amount + notes
 * ================================================
 *
 * IMPORTANT:
 *   - We DO NOT touch calories / macros here, because
 *     they are stored as per-serving values.
 *   - Totals are always computed in the UI using:
 *
 *       servings = amount / servingSize
 *       total    = perServing * servings
 */
export function updateFoodLogAmountAndNotes(
  id: number,
  amount: string,
  notes?: string
): void {
  const stmt = db.prepareSync(`
    UPDATE FoodLogEntries
    SET amount = ?, notes = ?
    WHERE id = ?
  `);

  stmt.executeSync([
    amount,
    notes ?? null,
    id,
  ]);
}