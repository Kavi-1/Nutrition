// app/(tabs)/log.tsx
// ======================================================
// LogScreen
//
// This screen allows the user to search for foods using
// the backend endpoint:
//
//    GET /api/nutrition/food?name=<query>
//
// The backend forwards the request to the USDA FDC API.
// The UI shows:
//   - A search bar
//   - Loading indicator
//   - API debug info (status + text snippet)
//   - A scrollable list of top 10 search results
//
// When the user taps a food item, the app navigates to:
//     /food/add
// passing the selected food JSON through route params.
// ======================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

/**
 * LogScreen Component
 */
export default function LogScreen() {
  // User-entered search text
  const [query, setQuery] = useState("");

  // Parsed API response (USDA FDC JSON)
  const [result, setResult] = useState<any | null>(null);

  // Loading indicator state
  const [loading, setLoading] = useState(false);

  // Error message from failed API call
  const [error, setError] = useState<string | null>(null);

  // Debug text showing HTTP status + first 200 characters of response
  const [debug, setDebug] = useState<string | null>(null);

  /**
   * handleSearch()
   *
   * Sends a request to our backend:
   *   GET http://localhost:8080/api/nutrition/food?name=<query>
   *
   * The backend then calls the USDA FDC API.
   *
   * This function:
   *   1. Resets local UI state
   *   2. Performs fetch()
   *   3. Captures debug text
   *   4. Parses JSON (with fallback)
   *   5. Stores parsed result for UI rendering
   */
  const handleSearch = async () => {
    const name = query.trim();
    if (!name) return;

    // Reset all UI states
    setLoading(true);
    setError(null);
    setResult(null);
    setDebug(null);

    try {
      // Build backend URL
      const url = `http://localhost:8080/api/nutrition/food?name=${encodeURIComponent(
        name
      )}`;

      // Send API request
      const res = await fetch(url);
      const text = await res.text();

      // Provide short debug info
      setDebug(`status=${res.status}, snippet=${text.slice(0, 200)}...`);

      // Non-200 response → throw
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Try to parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text; // Very rare fallback
      }

      setResult(parsed);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract USDA food list from API result.
   *
   * USDA returns JSON shaped like:
   *   {
   *     totalHits: number,
   *     foods: [ ... ]
   *   }
   */
  const foods: any[] =
    result && Array.isArray(result.foods) ? result.foods : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Food</Text>

      {/* Search input and button */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="e.g. banana"
          value={query}
          onChangeText={setQuery}
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

      {/* Loading state */}
      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

      {/* Error text (if API failed) */}
      {error && (
        <Text style={styles.error}>Failed to search food: {error}</Text>
      )}

      {/* Development debug info */}
      {debug && <Text style={styles.debug}>Debug: {debug}</Text>}

      {/* Food search result list (top 10 results) */}
      {foods.length > 0 && (
        <ScrollView style={styles.resultBox}>
          {foods.slice(0, 10).map((food) => (
            <TouchableOpacity
              key={food.fdcId ?? food.description}
              style={styles.item}
              onPress={() =>
                router.push({
                  pathname: "/food/add",
                  params: { data: JSON.stringify(food) }, // Pass full JSON object
                })
              }
            >
              {/* Food name */}
              <Text style={styles.itemName}>{food.description}</Text>

              {/* Optional brand name */}
              {food.brandName && (
                <Text style={styles.itemBrand}>{food.brandName}</Text>
              )}

              {/* Optional category */}
              {food.foodCategory && (
                <Text style={styles.itemMeta}>
                  Category: {food.foodCategory}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* If result exists but foods[] missing, show raw response JSON */}
      {result && foods.length === 0 && (
        <ScrollView style={styles.resultBox}>
          <Text selectable>{JSON.stringify(result, null, 2)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Basic screen styles
 */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  input: {
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    height: 44,
  },

  error: { color: "red", marginTop: 8 },
  debug: { color: "#555", marginTop: 4, fontSize: 12 },

  resultBox: { marginTop: 12, maxHeight: 400 },

  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },

  itemBrand: {
    fontSize: 14,
    color: "#666",
  },

  itemMeta: {
    fontSize: 12,
    color: "#888",
  },
});