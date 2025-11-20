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
 *
 * NOTE:
 *   calories / protein / fat / carbs are stored as
 *   **per-serving** values from USDA, NOT multiplied
 *   by `amount`. Total nutrients for a log are computed
 *   in the UI as: perServing * amount.
 */
export type FoodLogEntry = {
  id?: number;                     // Auto-increment primary key
  fdcId?: number | string;         // USDA Food Data Central ID
  description: string;             // Food name
  brandName?: string;              // Optional brand field
  category?: string;               // USDA category
  servingSize?: number;            // Reference serving size (optional)
  servingUnit?: string;            // Unit for serving size
  amount: string;                  // Servings eaten (e.g. "1", "2.5")
  notes?: string;                  // Optional free text
  calories?: number;               // per-serving calories (USDA value)
  protein?: number;                // per-serving protein grams
  fat?: number;                    // per-serving fat grams
  carbs?: number;                  // per-serving carbs grams
  createdAt?: string;              // ISO timestamp of log creation
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
 * Stores per-serving nutrition values from USDA.
 * `amount` is **not** applied here; totals are computed
 * later in the UI using amount × per-serving.
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
 * Query logs for a specific date (YYYY-MM-DD)
 * ================================================
 *
 * createdAt is ISO timestamp. We compare only the date
 * prefix (first 10 characters).
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
 *
 * Used by the Edit screen to load the record that
 * the user wants to modify.
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
 * We DO NOT touch calories / macros here anymore.
 * They always remain per-serving USDA values.
 */
export function updateLogAmountAndNotes(
  id: number,
  newAmount: string,
  newNotes?: string
): void {
  const stmt = db.prepareSync(`
    UPDATE FoodLogEntries
    SET amount = ?, notes = ?
    WHERE id = ?
  `);

  stmt.executeSync([newAmount, newNotes ?? null, id]);
}

/**
 * ================================================
 * Dev helper: reset / drop the table
 * ================================================
 */
export function resetLogDb(): void {
  db.execSync(`DROP TABLE IF EXISTS FoodLogEntries;`);
  initLogDb();
}