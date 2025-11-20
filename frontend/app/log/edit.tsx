// app/log/edit.tsx
// ====================================================
// Edit Log Screen
//
// Allows the user to edit an existing FoodLogEntry:
//   - change the "amount" (servings)
//   - change optional "notes"
//
// We navigate here from the Today Log screen with:
//   router.push({
//     pathname: "/log/edit",
//     params: { data: JSON.stringify(entry) },
//   });
//
// On save, we call `updateLogAmountAndNotes` which
// simply updates amount + notes. Calories / macros
// are stored as per-serving values and totals are
// computed in the UI.
// ====================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import {
  type FoodLogEntry,
  updateLogAmountAndNotes,
} from "../../db/logDb";

export default function EditLogScreen() {
  // We receive the whole log entry JSON via `data` param.
  const params = useLocalSearchParams();
  const rawData = Array.isArray(params.data) ? params.data[0] : params.data;

  const [entry, setEntry] = useState<FoodLogEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  // ============================================
  // Parse navigation param and initialize fields
  // ============================================
  useEffect(() => {
    try {
      if (!rawData) {
        Alert.alert("Error", "Missing log data");
        router.back();
        return;
      }

      const parsed: FoodLogEntry = JSON.parse(rawData);
      if (!parsed.id) {
        Alert.alert("Error", "Invalid log data (missing id)");
        router.back();
        return;
      }

      setEntry(parsed);
      setAmount(parsed.amount ?? "");
      setNotes(parsed.notes ?? "");
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Error",
        e?.message ?? "Failed to load log data from navigation params"
      );
      router.back();
      return;
    } finally {
      setLoading(false);
    }
  }, [rawData]);

  // ============================================
  // handleSave()
  //
  // Validates input and calls our DB helper:
  //   updateLogAmountAndNotes(id, newAmount, newNotes)
  // ============================================
  const handleSave = () => {
    if (!entry || !entry.id) {
      Alert.alert("Error", "Log entry not loaded");
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      Alert.alert("Missing amount", "Please enter a serving amount.");
      return;
    }

    const numericAmount = Number(trimmedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Amount must be a positive number.");
      return;
    }

    try {
      updateLogAmountAndNotes(entry.id, trimmedAmount, notes.trim() || undefined);
      router.back(); // go back to Today's Log; it will refresh on focus
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Error",
        e?.message ?? "Failed to update log entry."
      );
    }
  };

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text>Log entry not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Food description */}
      <Text style={styles.label}>Food</Text>
      <Text style={styles.value}>{entry.description}</Text>

      {/* Amount input */}
      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="e.g. 1"
      />

      {/* Notes input */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. breakfast, with milk"
        multiline
      />

      <View style={styles.buttonWrapper}>
        <Button title="Save" onPress={handleSave} />
      </View>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },

  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  buttonWrapper: {
    marginTop: 24,
  },
});