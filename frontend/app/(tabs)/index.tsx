// app/(tabs)/index.tsx
// ====================================================
// "Today's Log" Screen (Home tab)
//
// Displays all food entries recorded *today*, pulled from
// local SQLite storage. Also computes a Daily Summary
// (total calories + macro totals).
//
// This screen refreshes automatically whenever the tab is
// focused — ensuring newly added foods (from /food/add)
// appear instantly without requiring manual reload.
//
// Additional features:
//   • Tap an entry → open Log Details / Edit screen
//   • Long-press an entry → delete it from today’s log
//
// IMPORTANT:
//   calories / macros in SQLite are stored as
//   **per-serving** values from USDA.
//   Here we compute totals as:
//      total = perServing * amount
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
  getTodayLogs,
  deleteLogById,
  type FoodLogEntry,
} from "../../db/logDb";

// Helper: format number with 1 decimal place
const format1 = (v: number) => v.toFixed(1);

// Shape of the aggregated daily macro summary
type DailySummary = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export default function TodayLogScreen() {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  // ====================================================
  // loadToday()
  //
  // Loads today's logs from SQLite and computes the
  // Daily Summary values in a single pass.
  // ====================================================
  const loadToday = useCallback(() => {
    const logs = getTodayLogs();
    setEntries(logs);

    const totals = logs.reduce<DailySummary>(
      (acc, entry) => {
        const amt = Number(entry.amount ?? "1");
        const safeAmt = Number.isFinite(amt) && amt > 0 ? amt : 1;

        const perCal = entry.calories ?? 0;
        const perP   = entry.protein  ?? 0;
        const perF   = entry.fat      ?? 0;
        const perC   = entry.carbs    ?? 0;

        acc.calories += perCal * safeAmt;
        acc.protein  += perP   * safeAmt;
        acc.fat      += perF   * safeAmt;
        acc.carbs    += perC   * safeAmt;

        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    setSummary(totals);
  }, []);

  // Auto-refresh on tab focus
  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

  // Delete on long-press
  const handleLongPress = (entry: FoodLogEntry) => {
    const id = entry.id;
    if (!id) return;

    Alert.alert(
      "Delete entry",
      `Delete "${entry.description}" from today’s log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLogById(id);
            loadToday();
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Screen title */}
      <ThemedText type="title" style={styles.title}>
        Today&apos;s Log
      </ThemedText>

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
          No entries logged today yet.
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

            // Pretty amount label: "10 g"
            const amountLabel = item.servingUnit
              ? `${amountNum} ${item.servingUnit}`
              : String(amountNum);

            // Compute totals from per-serving values
            const perCal = item.calories ?? 0;
            const perP   = item.protein  ?? 0;
            const perF   = item.fat      ?? 0;
            const perC   = item.carbs    ?? 0;

            const totalCal = perCal * amountNum;
            const totalP   = perP   * amountNum;
            const totalF   = perF   * amountNum;
            const totalC   = perC   * amountNum;

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

                  {/* Serving (pretty label) */}
                  <ThemedText style={styles.itemLine}>
                    Amount: {amountLabel}
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
  title: { marginBottom: 16 },

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