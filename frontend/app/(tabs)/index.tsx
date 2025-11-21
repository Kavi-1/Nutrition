// app/(tabs)/index.tsx
// ====================================================
// "Today's Log" Screen (Home tab)
//
// Displays food entries recorded on a given date,
// pulled from local SQLite storage. Also computes a
// Daily Summary (total calories + macro totals).
//
// Default date is "today", but the user can move
// backward / forward by one day using the ⟨ ⟩ buttons.
//
// This screen refreshes automatically whenever the tab is
// focused — ensuring newly added foods (from /food/add)
// appear instantly without requiring manual reload.
//
// Additional features:
//   • Tap an entry → open Log Details / Edit screen
//   • Long-press an entry → delete it from the log
//
// IMPORTANT:
//   We now treat DB fields as:
//     - calories/protein/fat/carbs  = **per serving**
//     - servingSize + servingUnit   = size of 1 serving (ml / g)
//     - amount                      = what the user actually ate
//                                    in the same unit as servingSize
//
//   All totals are computed as:
//
//     servingsEaten = amount / servingSize
//     total         = perServing * servingsEaten
// ====================================================

import React, { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import {
  getLogsForDate,
  deleteLogById,
  type FoodLogEntry,
} from "../../db/logDb";

// Helper: format number with 1 decimal place
const format1 = (v: number) => v.toFixed(1);

// Helper: format amount in ml/g: 2360 → "2360", 12.345 → "12.3"
function formatAmountUnit(v: number): string {
  if (!Number.isFinite(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 10) return v.toFixed(0); // use integer for larger amounts
  return v.toFixed(1); // keep 1 decimal place for smaller amounts
}

// Helper: format servings: 4.23 → "4.2 servings", 1 → "1 serving"
function formatServings(s: number): string {
  if (!Number.isFinite(s)) return "";
  const rounded = s >= 10 ? Number(s.toFixed(0)) : Number(s.toFixed(1));
  const label = rounded === 1 ? "serving" : "servings";
  return `${rounded} ${label}`;
}

// Helper: format "YYYY-MM-DD" into a nicer label
function formatDateLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  // For non-today dates we just show YYYY-MM-DD
  return dateStr;
}

// Helper: shift "YYYY-MM-DD" by deltaDays
function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// Shape of the aggregated daily macro summary
type DailySummary = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export default function TodayLogScreen() {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Current date being viewed (defaults to "today")
  const [currentDate, setCurrentDate] = useState<string>(todayStr);

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  // Compute how many servings this entry represents
  const computeServings = (entry: FoodLogEntry): number => {
    const amountNum = Number(entry.amount ?? "0");
    const servingSizeNum = Number(entry.servingSize ?? 0);

    if (servingSizeNum > 0 && amountNum > 0) {
      return amountNum / servingSizeNum;
    }

    // Fallback: for legacy rows without servingSize, treat `amount`
    // as "number of servings"
    const amtAsServings = Number(entry.amount ?? "1");
    if (Number.isFinite(amtAsServings) && amtAsServings > 0) {
      return amtAsServings;
    }

    return 1;
  };

  // ====================================================
  // loadForDate()
  //
  // Loads logs from SQLite for the given YYYY-MM-DD date
  // and computes the Daily Summary values in a single pass.
  // ====================================================
  const loadForDate = useCallback(
    (date: string) => {
      const logs = getLogsForDate(date);
      setEntries(logs);

      const totals = logs.reduce<DailySummary>(
        (acc, entry) => {
          const servings = computeServings(entry);

          const perCal = entry.calories ?? 0;
          const perP = entry.protein ?? 0;
          const perF = entry.fat ?? 0;
          const perC = entry.carbs ?? 0;

          acc.calories += perCal * servings;
          acc.protein += perP * servings;
          acc.fat += perF * servings;
          acc.carbs += perC * servings;

          return acc;
        },
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      setSummary(totals);
    },
    [] // computeServings is stable, no need to add it to deps
  );

  // ====================================================
  // Auto-refresh on tab focus
  //
  // Whenever the tab becomes active OR currentDate changes,
  // we reload logs for that date.
  // ====================================================
  useFocusEffect(
    useCallback(() => {
      loadForDate(currentDate);
    }, [currentDate, loadForDate])
  );

  // ====================================================
  // handleLongPress()
  //
  // Long-pressing an entry triggers a confirmation dialog.
  // If confirmed, the entry is deleted from SQLite and the
  // UI refreshes immediately for the same date.
  // ====================================================
  const handleLongPress = (entry: FoodLogEntry) => {
    const id = entry.id;
    if (!id) return;

    Alert.alert(
      "Delete entry",
      `Delete "${entry.description}" from ${currentDate}'s log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLogById(id);
            loadForDate(currentDate);
          },
        },
      ]
    );
  };

  // Move to previous / next day
  const goPrevDay = () => {
    setCurrentDate((prev) => shiftDate(prev, -1));
  };

  const goNextDay = () => {
    setCurrentDate((prev) => {
      // Don't go beyond "today"
      if (prev >= todayStr) return prev;
      return shiftDate(prev, 1);
    });
  };

  const dateLabel = formatDateLabel(currentDate, todayStr);

  return (
    <ThemedView style={styles.container}>
      {/* Screen title */}
      <ThemedText type="title" style={styles.title}>
        Today&apos;s Log
      </ThemedText>

      {/* Date navigation row */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={goPrevDay} style={styles.dateButton}>
          <ThemedText style={styles.dateButtonText}>⟨</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.dateLabel}>
          {dateLabel} ({currentDate})
        </ThemedText>

        <TouchableOpacity
          onPress={goNextDay}
          style={styles.dateButton}
          disabled={currentDate >= todayStr}
        >
          <ThemedText
            style={[
              styles.dateButtonText,
              currentDate >= todayStr && styles.dateButtonDisabled,
            ]}
          >
            ⟩
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Daily Summary (only shown when entries exist) */}
      {entries.length > 0 && summary && (
        <View style={styles.summaryCard}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            Daily Summary
          </ThemedText>

          <ThemedText style={styles.summaryLine}>
            Total calories: {Math.round(summary.calories)} kcal
          </ThemedText>

          <ThemedText style={styles.summaryLine}>
            Protein: {format1(summary.protein)} g • Fat:{" "}
            {format1(summary.fat)} g • Carbs: {format1(summary.carbs)} g
          </ThemedText>
        </View>
      )}

      {/* No entries case */}
      {entries.length === 0 ? (
        <ThemedText style={styles.empty}>
          No entries logged for this date yet.
        </ThemedText>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) =>
            item.id?.toString() ??
            item.createdAt ??
            Math.random().toString()
          }
          renderItem={({ item }) => {
            const amountNum = Number(item.amount ?? "0");
            const servingSizeNum = Number(item.servingSize ?? 0);
            const servings = computeServings(item);

            // Amount line: always show as ml / g
            const unit = item.servingUnit || "";
            const amountLabel =
              amountNum > 0 && unit
                ? `${formatAmountUnit(amountNum)} ${unit}`
                : formatAmountUnit(amountNum);

            // Totals for this row (per-serving × servings)
            const perCal = item.calories ?? 0;
            const perP = item.protein ?? 0;
            const perF = item.fat ?? 0;
            const perC = item.carbs ?? 0;

            const totalCal = perCal * servings;
            const totalP = perP * servings;
            const totalF = perF * servings;
            const totalC = perC * servings;

            return (
              <TouchableOpacity
                // Short press → open log details / edit screen
                onPress={() => {
                  router.push({
                    pathname: "/log/edit",
                    params: { data: JSON.stringify(item) },
                  });
                }}
                // Long press → delete
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <View style={styles.item}>
                  {/* Food name */}
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.itemTitle}
                  >
                    {item.description}
                  </ThemedText>

                  {/* Amount in ml/g */}
                  <ThemedText style={styles.itemLine}>
                    Amount: {amountLabel}
                  </ThemedText>

                  {/* Servings line (hint) */}
                  {servings > 0 && servingSizeNum > 0 && (
                    <ThemedText style={styles.servingsHint}>
                      {formatServings(servings)}
                    </ThemedText>
                  )}

                  {/* Calories (total) */}
                  <ThemedText style={styles.itemLine}>
                    Calories: {format1(totalCal)} kcal
                  </ThemedText>

                  {/* Macros (totals) */}
                  <ThemedText style={styles.itemLine}>
                    Macros:
                    {` P ${format1(totalP)}g`}
                    {` F ${format1(totalF)}g`}
                    {` C ${format1(totalC)}g`}
                  </ThemedText>

                  {/* Timestamp */}
                  {item.createdAt && (
                    <ThemedText style={styles.time}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ThemedView>
  );
}

// ====================================================
// Styles
// ====================================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  title: { marginBottom: 8 },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 16,
  },
  dateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateButtonText: {
    fontSize: 20,
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  summaryCard: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "#f3f7ff",
    borderWidth: 1,
    borderColor: "#dde6ff",
  },
  summaryTitle: { marginBottom: 4 },
  summaryLine: { fontSize: 14 },

  empty: { fontSize: 14, color: "#666", marginTop: 8 },

  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemTitle: { fontSize: 16 },
  itemLine: { fontSize: 14 },
  servingsHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  time: { fontSize: 12, color: "#999", marginTop: 4 },
});