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

// Helper: format "YYYY-MM-DD" into a nicer label
function formatDateLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  // Very simple formatting: keep YYYY-MM-DD
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

  // ====================================================
  // loadForDate()
  //
  // Loads logs from SQLite for the given YYYY-MM-DD date
  // and computes the Daily Summary values in a single pass.
  // ====================================================
  const loadForDate = useCallback((date: string) => {
    const logs = getLogsForDate(date);
    setEntries(logs);

    const totals = logs.reduce<DailySummary>(
      (acc, entry) => {
        // amount = how many servings the user ate
        const amt = Number(entry.amount ?? "1");
        const safeAmt = Number.isFinite(amt) && amt > 0 ? amt : 1;

        // Per-serving nutrition values from USDA
        const perCal = entry.calories ?? 0;
        const perP = entry.protein ?? 0;
        const perF = entry.fat ?? 0;
        const perC = entry.carbs ?? 0;

        // Total contribution for this log row
        acc.calories += perCal * safeAmt;
        acc.protein += perP * safeAmt;
        acc.fat += perF * safeAmt;
        acc.carbs += perC * safeAmt;

        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    setSummary(totals);
  }, []);

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
            const amtRaw = Number(item.amount ?? "1");
            const amountNum =
              Number.isFinite(amtRaw) && amtRaw > 0 ? amtRaw : 1;

            // We interpret "amount" as **number of servings**,
            // not as grams / ml. So we show e.g. "2 servings".
            const servingsLabel =
              amountNum === 1 ? "1 serving" : `${amountNum} servings`;

            // Per-serving values
            const perCal = item.calories ?? 0;
            const perP = item.protein ?? 0;
            const perF = item.fat ?? 0;
            const perC = item.carbs ?? 0;

            // Totals for this row
            const totalCal = perCal * amountNum;
            const totalP = perP * amountNum;
            const totalF = perF * amountNum;
            const totalC = perC * amountNum;

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

                  {/* Servings label */}
                  <ThemedText style={styles.itemLine}>
                    Amount: {servingsLabel}
                  </ThemedText>

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
  time: { fontSize: 12, color: "#999", marginTop: 4 },
});