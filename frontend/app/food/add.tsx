// app/food/add.tsx
// ====================================================
// Add Food → Log screen
//
// - Shows USDA food details and nutrition per *reference serving*.
// - Lets the user say "how much did you eat?":
//     • By servings  (e.g. 1.5 servings)
//     • By grams/ml  (e.g. 350 g, 250 ml)
// - We always store:
//     • servingSize / servingUnit  = USDA reference serving (e.g. 236 ml)
//     • amount                     = total ml / g eaten
//     • calories / macros          = per *reference serving* values
//
// Later, the Today Log screen computes:
//   servings = amount / servingSize
//   totals   = perServing × servings
// ====================================================

import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { insertFoodLog, type FoodLogEntry } from "../../db/logDb";

type Mode = "servings" | "unit";

/**
 * extractNutrients
 *
 * Normalizes USDA API responses into simple per-serving
 * numbers for calories / protein / fat / carbs.
 *
 * We first try the USDA v3 style:
 *   food.foodNutrients: [{ nutrientName, unitName, value }, ...]
 *
 * and fall back to the older v2-style:
 *   food.labelNutrients.calories.value, etc.
 */
function extractNutrients(food: any) {
  // ----- Preferred: USDA v3 format (foodNutrients array) -----
  if (Array.isArray(food.foodNutrients)) {
    const find = (needle: string) =>
      food.foodNutrients.find(
        (n: any) =>
          typeof n.nutrientName === "string" &&
          n.nutrientName.toLowerCase().includes(needle)
      )?.value ?? 0;

    const calories = find("energy"); // "Energy" (kcal)
    const protein = find("protein");
    const fat = find("fat");
    const carbs = find("carbohydrate");

    return { calories, protein, fat, carbs };
  }

  // ----- Fallback: labelNutrients (older structure or pre-processed) -----
  const calories =
    food.labelNutrients?.calories?.value ??
    food.calories ??
    0;

  const protein =
    food.labelNutrients?.protein?.value ??
    food.protein ??
    0;

  const fat =
    food.labelNutrients?.fat?.value ??
    food.fat ??
    0;

  const carbs =
    food.labelNutrients?.carbohydrates?.value ??
    food.labelNutrients?.carbs?.value ??
    food.carbs ??
    0;

  return { calories, protein, fat, carbs };
}

export default function AddFoodScreen() {
  const params = useLocalSearchParams();
  const raw = Array.isArray(params.data) ? params.data[0] : params.data;

  if (!raw) {
    return (
      <View style={styles.container}>
        <Text>Missing food data.</Text>
      </View>
    );
  }

  const food = JSON.parse(raw);

  // ----------------------------------------------------
  // Pull basic info from USDA result
  // ----------------------------------------------------
  const description: string = food.description ?? "Unknown food";
  const brandName: string | undefined = food.brandName ?? undefined;
  const category: string | undefined = food.foodCategory ?? undefined;
  const fdcId: number | string = food.fdcId ?? "N/A";

  // Nutrition per *reference serving* (as shown on the card)
  const {
    calories: perCal,
    protein: perProtein,
    fat: perFat,
    carbs: perCarbs,
  } = extractNutrients(food);

  // USDA reference serving (e.g. 236 ml, 140 g)
  const refSize: number = food.servingSize ?? 1;
  const refUnitRaw: string = food.servingSizeUnit ?? "g";
  const refUnit = refUnitRaw.toLowerCase(); // "g" or "ml" in most cases

  // ----------------------------------------------------
  // Local UI state: how much did the user eat?
  // ----------------------------------------------------
  const [mode, setMode] = useState<Mode>("servings");
  const [servingsInput, setServingsInput] = useState("1");
  const [unitInput, setUnitInput] = useState(String(refSize));
  const [notes, setNotes] = useState("");

  // Helper: parse positive number or NaN
  const parsePositive = (s: string): number => {
    const n = Number(s.trim());
    return Number.isFinite(n) && n > 0 ? n : NaN;
  };

  // ----------------------------------------------------
  // handleAddToLog()
  //
  // Computes:
  //   totalAmount = total ml / g the user ate
  //   servings    = totalAmount / refSize
  //
  // and stores *per-serving* nutrition (perCal / perProtein / …)
  // together with the total amount.
  // ----------------------------------------------------
  const handleAddToLog = () => {
    let totalAmount: number; // total ml/g
    let servings: number;

    if (mode === "servings") {
      const s = parsePositive(servingsInput);
      if (!Number.isFinite(s)) {
        Alert.alert("Invalid servings", "Please enter a positive number.");
        return;
      }
      servings = s;
      totalAmount = servings * refSize;
    } else {
      // By ml / g
      const amt = parsePositive(unitInput);
      if (!Number.isFinite(amt)) {
        Alert.alert(
          "Invalid amount",
          `Please enter a positive amount in ${refUnit}.`
        );
        return;
      }
      totalAmount = amt;
      servings = refSize > 0 ? totalAmount / refSize : 1;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      Alert.alert("Invalid amount", "Amount must be greater than zero.");
      return;
    }

    // Build FoodLogEntry.  IMPORTANT:
    //   • amount      = total ml / g eaten
    //   • calories    = per-serving calories (NOT divided by refSize)
    //   • protein ... = per-serving macros
    const entry: FoodLogEntry = {
      fdcId,
      description,
      brandName,
      category,
      servingSize: refSize,
      servingUnit: refUnit,
      amount: String(totalAmount),
      notes: notes.trim() || undefined,
      calories: perCal,
      protein: perProtein,
      fat: perFat,
      carbs: perCarbs,
    };

    try {
      const id = insertFoodLog(entry);
      console.log("Food log inserted with id:", id, "entry:", entry);
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Error",
        e?.message ?? "Failed to insert log entry into SQLite."
      );
    }
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Basic food header */}
        <Text style={styles.title}>{description}</Text>
        {brandName && <Text style={styles.meta}>Brand: {brandName}</Text>}
        {category && <Text style={styles.meta}>Category: {category}</Text>}
        <Text style={styles.meta}>FDC ID: {fdcId}</Text>

        {/* Nutrition per reference serving */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Nutrition (per reference serving*)
          </Text>
          <Text style={styles.nutLine}>Calories: {perCal} KCAL</Text>
          <Text style={styles.nutLine}>Protein: {perProtein} G</Text>
          <Text style={styles.nutLine}>Fat: {perFat} G</Text>
          <Text style={styles.nutLine}>Carbs: {perCarbs} G</Text>
          <Text style={styles.reference}>
            * USDA reference serving: {refSize} {refUnit}
          </Text>
        </View>

        {/* How much did you eat? toggle + inputs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How much did you eat?</Text>

          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === "servings" && styles.toggleButtonActive,
              ]}
              onPress={() => setMode("servings")}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  mode === "servings" && styles.toggleLabelActive,
                ]}
              >
                By servings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === "unit" && styles.toggleButtonActive,
              ]}
              onPress={() => setMode("unit")}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  mode === "unit" && styles.toggleLabelActive,
                ]}
              >
                By {refUnit}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "servings" ? (
            <>
              <Text style={styles.label}>Servings</Text>
              <TextInput
                style={styles.input}
                value={servingsInput}
                onChangeText={setServingsInput}
                keyboardType="numeric"
                placeholder="e.g. 1.5"
              />
              <Text style={styles.reference}>
                1 serving = {refSize} {refUnit}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{refUnit}</Text>
              <TextInput
                style={styles.input}
                value={unitInput}
                onChangeText={setUnitInput}
                keyboardType="numeric"
                placeholder={`e.g. ${refSize}`}
              />
              <Text style={styles.reference}>
                Reference: {refSize} {refUnit} ≈ 1 serving
              </Text>
            </>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. breakfast, with milk"
            multiline
          />
        </View>

        <View style={styles.buttonWrapper}>
          <Button title="Add to Log" onPress={handleAddToLog} />
        </View>
      </View>
    </ScrollView>
  );
}

// ====================================================
// Styles
// ====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: "#555",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  nutLine: {
    fontSize: 14,
    marginBottom: 2,
  },
  reference: {
    marginTop: 6,
    fontSize: 12,
    color: "#777",
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  toggleLabelActive: {
    color: "white",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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