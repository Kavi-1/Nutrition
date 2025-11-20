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

    // Aggregate macro totals
    const totals = logs.reduce<DailySummary>(
      (acc, entry) => {
        acc.calories += Number(entry.calories ?? 0);
        acc.protein += Number(entry.protein ?? 0);
        acc.fat += Number(entry.fat ?? 0);
        acc.carbs += Number(entry.carbs ?? 0);
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    setSummary(totals);
  }, []);

  // ====================================================
  // Auto-refresh on tab focus
  //
  // useFocusEffect ensures that whenever the user:
  //   • returns from the Add Food screen
  //   • switches between bottom tabs
  //
  // the list & summary are updated instantly.
  // ====================================================
  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday])
  );

  // ====================================================
  // handleLongPress()
  //
  // Long-pressing an entry triggers a confirmation dialog.
  // If confirmed, the entry is deleted from SQLite and the
  // UI refreshes immediately.
  // ====================================================
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
            Protein: {summary.protein.toFixed(1)} g • Fat:{" "}
            {summary.fat.toFixed(1)} g • Carbs: {summary.carbs.toFixed(1)} g
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
            // Pretty amount label: "1 g" instead of "1 × g"
            const amountLabel = item.servingUnit
              ? `${item.amount} ${item.servingUnit}`
              : item.amount;

            return (
              <TouchableOpacity
                // Short press → open log details / edit screen
                onPress={() => {
                  if (!item.id) return;
                  router.push({
                    pathname: "/log/edit",
                    params: { id: item.id.toString() },
                  });
                }}
                // Long press → delete with confirmation dialog
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400} // adjust press duration if needed
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

                  {/* Calories */}
                  {item.calories != null && (
                    <ThemedText style={styles.itemLine}>
                      Calories: {item.calories} kcal
                    </ThemedText>
                  )}

                  {/* Macros */}
                  {(item.protein != null ||
                    item.fat != null ||
                    item.carbs != null) && (
                    <ThemedText style={styles.itemLine}>
                      Macros:
                      {item.protein != null && ` P ${item.protein}g`}
                      {item.fat != null && ` F ${item.fat}g`}
                      {item.carbs != null && ` C ${item.carbs}g`}
                    </ThemedText>
                  )}

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