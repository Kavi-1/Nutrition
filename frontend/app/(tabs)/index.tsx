// app/(tabs)/index.tsx
// ====================================================
// "Today's Log" Screen (Home tab)
//
// This screen displays all food log entries recorded
// *today*, pulled directly from the local SQLite database.
//
// It reuses the starter project's ThemedView and ThemedText
// components so that styling remains consistent with the
// rest of the UI scaffolding provided by Expo Router template.
// ====================================================

import React, { useEffect, useState } from "react";
import { StyleSheet, FlatList, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import {
  getTodayLogs,
  type FoodLogEntry,
} from "../../db/logDb";

/**
 * TodayLogScreen
 *
 * Loads local SQLite entries from today's date
 * and renders them as a vertically scrollable list.
 *
 * The list updates only once on initial mount.
 * (For real-time sync, refresh triggers could be added later.)
 */
export default function TodayLogScreen() {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);

  useEffect(() => {
    // Fetch all entries logged on the current date (YYYY-MM-DD)
    const logs = getTodayLogs();
    setEntries(logs);
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Screen title */}
      <ThemedText type="title" style={styles.title}>
        Today&apos;s Log
      </ThemedText>

      {/* If no logs exist for today */}
      {entries.length === 0 ? (
        <ThemedText style={styles.empty}>
          No entries logged today yet.
        </ThemedText>
      ) : (
        <FlatList
          data={entries}
          // Unique identifier (fallbacks included for safety)
          keyExtractor={(item) =>
            item.id?.toString() ??
            item.createdAt ??
            Math.random().toString()
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              {/* Food name */}
              <ThemedText
                type="defaultSemiBold"
                style={styles.itemTitle}
              >
                {item.description}
              </ThemedText>

              {/* Serving amount */}
              <ThemedText style={styles.itemLine}>
                Amount: {item.amount}
                {item.servingUnit ? ` × ${item.servingUnit}` : ""}
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
          )}
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

  empty: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  itemTitle: {
    fontSize: 16,
  },

  itemLine: {
    fontSize: 14,
  },

  time: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});