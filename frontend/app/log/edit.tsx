// app/log/edit.tsx
// ====================================================
// Edit Log Screen
//
// Allows the user to edit an existing FoodLogEntry:
//   - change how much they ate (by servings OR by ml/g)
//   - change optional "notes"
//
// DB conventions (must match Add screen):
//   amount      = total ml / g eaten
//   servingSize = reference serving size (ml / g)
//   servingUnit = "ml" | "g"
//   calories/... = per reference serving (NOT total)
//
// Navigation to this screen:
//   router.push({
//     pathname: "/log/edit",
//     params: { data: JSON.stringify(entry) },
//   });
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
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import {
  type FoodLogEntry,
  updateFoodLogAmountAndNotes,
} from "../../db/logDb";

// Helper: format number cleanly for UI
function format1(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0+$/, "");
}

type Mode = "SERVINGS" | "UNIT";

export default function EditLogScreen() {
  // Receive the full FoodLogEntry object as JSON from navigation
  const params = useLocalSearchParams();
  const rawData = Array.isArray(params.data) ? params.data[0] : params.data;

  const [entry, setEntry] = useState<FoodLogEntry | null>(null);

  // amountMlOrG always stores the "true amount eaten" in ml/g
  const [amountMlOrG, setAmountMlOrG] = useState<number>(0);

  const [mode, setMode] = useState<Mode>("SERVINGS");
  const [amountInput, setAmountInput] = useState<string>("");

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

      const amt = Number(parsed.amount ?? "0");
      const safeAmt = Number.isFinite(amt) && amt > 0 ? amt : 0;
      setAmountMlOrG(safeAmt);

      // Prefer "servings" mode when servingSize is available
      const refSize = parsed.servingSize;
      if (refSize && refSize > 0) {
        setMode("SERVINGS");
        const serv = safeAmt > 0 ? safeAmt / refSize : 1;
        setAmountInput(format1(serv));
      } else {
        // No servingSize = fallback to editing in ml/g mode
        setMode("UNIT");
        setAmountInput(safeAmt > 0 ? format1(safeAmt) : "");
      }

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
  // Conversions between servings <-> ml/g
  // ============================================
  const servingsFromAmount = (amt: number): number => {
    if (!entry?.servingSize || entry.servingSize <= 0) return amt;
    return amt / entry.servingSize;
  };

  const amountFromServings = (serv: number): number => {
    if (!entry?.servingSize || entry.servingSize <= 0) return serv;
    return serv * entry.servingSize;
  };

  // ============================================
  // Switch UI mode (servings <-> ml/g)
  // Does NOT modify the underlying amountMlOrG value.
  // Only updates what is shown in the input box.
  // ============================================
  const switchMode = (newMode: Mode) => {
    if (!entry) return;
    if (newMode === mode) return;

    setMode(newMode);

    if (newMode === "SERVINGS") {
      const serv = servingsFromAmount(amountMlOrG);
      setAmountInput(format1(serv));
    } else {
      setAmountInput(format1(amountMlOrG));
    }
  };

  // ============================================
  // User edits the amount input box
  // Convert input -> internal ml/g based on mode
  // ============================================
  const handleAmountChange = (text: string) => {
    setAmountInput(text);

    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) {
      // Do not update internal amount if invalid input
      return;
    }

    if (mode === "SERVINGS") {
      setAmountMlOrG(amountFromServings(n));
    } else {
      setAmountMlOrG(n);
    }
  };

  // ============================================
  // Save changes to SQLite
  // ============================================
  const handleSave = () => {
    if (!entry || !entry.id) {
      Alert.alert("Error", "Log entry not loaded");
      return;
    }

    const n = Number(amountInput.trim());
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert(
        "Invalid amount",
        mode === "SERVINGS"
          ? "Servings must be a positive number."
          : "Amount must be a positive number."
      );
      return;
    }

    // Convert back to ml/g consistently
    const finalAmount =
      mode === "SERVINGS" ? amountFromServings(n) : n;

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      Alert.alert("Invalid amount", "Amount must be greater than 0.");
      return;
    }

    try {
      updateFoodLogAmountAndNotes(
        entry.id,
        String(finalAmount),
        notes.trim() || undefined
      );
      router.back(); // Today Log screen auto-refreshes on focus
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Failed to update log entry.");
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

  const refSize = entry.servingSize;
  const refUnit = entry.servingUnit;

  const refLine =
    refSize && refUnit
      ? `Reference: ${format1(refSize)} ${refUnit} ≈ 1 serving`
      : undefined;

  return (
    <View style={styles.container}>
      {/* Food name */}
      <Text style={styles.label}>Food</Text>
      <Text style={styles.value}>{entry.description}</Text>

      {/* Choice: edit by servings or by ml/g */}
      <Text style={[styles.label, { marginTop: 16 }]}>
        How much did you eat?
      </Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            mode === "SERVINGS" && styles.toggleButtonActive,
          ]}
          onPress={() => switchMode("SERVINGS")}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "SERVINGS" && styles.toggleTextActive,
            ]}
          >
            By servings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            mode === "UNIT" && styles.toggleButtonActive,
          ]}
          onPress={() => switchMode("UNIT")}
        >
          <Text
            style={[
              styles.toggleText,
              mode === "UNIT" && styles.toggleTextActive,
            ]}
          >
            {refUnit === "ml" ? "By ml" : "By g"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <Text style={styles.label}>
        {mode === "SERVINGS"
          ? "Servings"
          : refUnit === "ml"
          ? "ml"
          : "g"}
      </Text>
      <TextInput
        style={styles.input}
        value={amountInput}
        onChangeText={handleAmountChange}
        keyboardType="numeric"
        placeholder={mode === "SERVINGS" ? "e.g. 2" : "e.g. 250"}
      />
      {refLine && <Text style={styles.hint}>{refLine}</Text>}

      {/* Notes */}
      <Text style={[styles.label, { marginTop: 16 }]}>
        Notes (optional)
      </Text>
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

  toggleRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleText: { fontSize: 14, color: "#333" },
  toggleTextActive: { color: "white", fontWeight: "600" },

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

  hint: { fontSize: 12, color: "#777", marginTop: 4 },

  buttonWrapper: {
    marginTop: 24,
  },
});