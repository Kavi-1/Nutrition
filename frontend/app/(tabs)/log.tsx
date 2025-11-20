import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";

/**
 * LogScreen
 *
 * This screen allows the user to search for foods using the backend’s
 * `/api/nutrition/food` endpoint. The results come from the USDA FDC API.
 * The screen displays:
 *   - A search input
 *   - Loading status
 *   - Debug information about the API call
 *   - A clean list of top 10 food results
 */
export default function LogScreen() {
  // User-entered search text
  const [query, setQuery] = useState("");

  // Parsed API response (USDA FDC JSON)
  const [result, setResult] = useState<any | null>(null);

  // Loading state for API calls
  const [loading, setLoading] = useState(false);

  // Error message displayed to the user
  const [error, setError] = useState<string | null>(null);

  // Debug info to help development (status code + snippet)
  const [debug, setDebug] = useState<string | null>(null);

  /**
   * handleSearch()
   *
   * Sends a request to our backend:
   *   GET http://localhost:8080/api/nutrition/food?name=<query>
   *
   * The backend forwards the query to USDA FDC API.
   * This function:
   *   - Resets UI states
   *   - Calls backend
   *   - Parses JSON
   *   - Stores the result for rendering
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
      // Construct backend endpoint
      const url = `http://localhost:8080/api/nutrition/food?name=${encodeURIComponent(
        name
      )}`;

      // Make API request
      const res = await fetch(url);
      const text = await res.text();

      // Debug info (only first 200 characters)
      setDebug(`status=${res.status}, snippet=${text.slice(0, 200)}...`);

      // If backend returned an error status code
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Attempt to parse JSON response
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text; // Fallback if JSON parsing fails
      }

      setResult(parsed); // Save parsed data
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract USDA food list from result JSON.
   * USDA returns: { totalHits, foods: [...] }
   */
  const foods: any[] =
    result && Array.isArray(result.foods) ? result.foods : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Food</Text>

      {/* Search input row */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="e.g. banana"
          value={query}
          onChangeText={setQuery}
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

      {/* Loading indicator */}
      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

      {/* Error display */}
      {error && (
        <Text style={styles.error}>Failed to search food: {error}</Text>
      )}

      {/* Development debug information */}
      {debug && <Text style={styles.debug}>Debug: {debug}</Text>}

      {/* Food search result list (top 10 items) */}
      {foods.length > 0 && (
        <ScrollView style={styles.resultBox}>
          {foods.slice(0, 10).map((food) => (
            <View key={food.fdcId ?? food.description} style={styles.item}>
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
            </View>
          ))}
        </ScrollView>
      )}

      {/* If result exists but foods[] is missing, show raw JSON for debugging */}
      {result && foods.length === 0 && (
        <ScrollView style={styles.resultBox}>
          <Text selectable>{JSON.stringify(result, null, 2)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Basic styles for layout and list appearance
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