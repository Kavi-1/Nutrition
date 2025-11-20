// app/log/edit.tsx
// ================================================
// Log Details / Edit Screen
//
// This screen lets the user modify an existing
// log entry's serving amount and notes.
// Nutrition values (calories/macros) are kept as-is.
// ================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import {
  getLogById,
  updateLogServingAndNotes,
  type FoodLogEntry,
} from "../../db/logDb";

export default function EditLogScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [entry, setEntry] = useState<FoodLogEntry | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the log entry on mount
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setLoading(false);
      return;
    }

    const row = getLogById(numericId);
    if (!row) {
      setLoading(false);
      return;
    }

    setEntry(row);
    setAmount(row.amount ?? "");
    setNotes(row.notes ?? "");
    setLoading(false);
  }, [id]);

  // If loading or entry not found
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

  /**
   * handleSave()
   *
   * Persist the updated amount + notes back to SQLite,
   * then navigate back to the Today Log screen.
   */
  const handleSave = () => {
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      Alert.alert("Missing amount", "Please enter a serving amount.");
      return;
    }

    if (!entry.id) {
      Alert.alert("Error", "Log entry ID is missing.");
      return;
    }

    try {
      setSaving(true);
      updateLogServingAndNotes(entry.id, trimmedAmount, notes.trim() || undefined);
      setSaving(false);
      router.back(); // Today Log will refresh via useFocusEffect
    } catch (e: any) {
      console.error(e);
      setSaving(false);
      Alert.alert("Error", e?.message ?? "Failed to save changes.");
    }
  };

  // Pretty label for the original serving unit, if present
  const servingUnitLabel = entry.servingUnit ? ` ${entry.servingUnit}` : "";

  return (
    <View style={styles.container}>
      {/* Basic info header */}
      <Text style={styles.title}>{entry.description}</Text>

      {entry.brandName && (
        <Text style={styles.line}>Brand: {entry.brandName}</Text>
      )}
      {entry.category && (
        <Text style={styles.line}>Category: {entry.category}</Text>
      )}
      {entry.fdcId && <Text style={styles.line}>FDC ID: {entry.fdcId}</Text>}

      {/* Current nutrition snapshot (read-only) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logged nutrition (per serving)</Text>
        {entry.calories != null && (
          <Text style={styles.line}>Calories: {entry.calories} kcal</Text>
        )}
        {(entry.protein != null ||
          entry.fat != null ||
          entry.carbs != null) && (
          <Text style={styles.line}>
            Macros:
            {entry.protein != null && ` P ${entry.protein}g`}
            {entry.fat != null && ` F ${entry.fat}g`}
            {entry.carbs != null && ` C ${entry.carbs}g`}
          </Text>
        )}
      </View>

      {/* Editable serving amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serving</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 1"
        />
        <Text style={styles.helper}>
          Logged unit:
          {servingUnitLabel || " (no unit stored)"}
        </Text>
      </View>

      {/* Editable notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. lunch, with salad"
          multiline
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          title={saving ? "Saving..." : "Save changes"}
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  line: { fontSize: 16, marginBottom: 4 },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  notesInput: { minHeight: 60, textAlignVertical: "top" },

  helper: { fontSize: 12, color: "#777", marginTop: 4 },

  buttonWrapper: { marginTop: 24 },
});