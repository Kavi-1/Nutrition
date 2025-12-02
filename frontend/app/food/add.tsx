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
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { insertFoodLog, type FoodLogEntry } from "../../db/logDb";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppFonts } from "@/utils/fonts";

// ----------------------------------------------------
// Helper to extract nutrition info from a USDA "food"
// ----------------------------------------------------
/**
 * Extract per-serving nutrition from a USDA "food" object.
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

    const calories = find("energy"); // kcal
    const protein = find("protein");
    const fat = find("fat");
    const carbs = find("carbohydrate");

    return {
      calories,
      protein,
      fat,
      carbs,
    };
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

// edit-mode for "how much": by servings or by unit
type Mode = "servings" | "unit";

export default function AddFoodScreen() {
  const [fontsLoaded] = useAppFonts();

  const params = useLocalSearchParams();
  const raw = Array.isArray(params.data) ? params.data[0] : params.data;

  // loading state for initial parse
  const [parseError, setParseError] = useState<string | null>(null);

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={["#e9ffedff", "#d8f3dcff", "#d8eff3ff"]}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#40916c" />
        </View>
      </LinearGradient>
    );
  }

  if (!raw) {
    return (
      <LinearGradient
        colors={["#e9ffedff", "#d8f3dcff", "#d8eff3ff"]}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerInner}>
          <Text style={styles.errorTitle}>Missing food data</Text>
          <Text style={styles.errorText}>
            We couldn&apos;t open this food item. Please go back and try again.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  let food: any;
  try {
    food = JSON.parse(raw);
  } catch (e: any) {
    if (!parseError) setParseError(e?.message ?? "Failed to parse food JSON.");
  }

  if (!food) {
    return (
      <LinearGradient
        colors={["#e9ffedff", "#d8f3dcff", "#d8eff3ff"]}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerInner}>
          <Text style={styles.errorTitle}>Invalid food data</Text>
          <Text style={styles.errorText}>
            {parseError ?? "We couldn&apos;t parse this food."}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

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
      servings = totalAmount / refSize;
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
        e?.message ?? "Failed to insert food log. Please try again."
      );
    }
  };

  return (
    <LinearGradient
      colors={["#e9ffedff", "#d8f3dcff", "#d8eff3ff"]}
      start={{ x: -1, y: 0.2 }}
      end={{ x: 0.2, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back row */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.back()}
        >
          <IconSymbol
            name="chevron.left"
            size={20}
            color="#1b4332"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.backText}>Back to log</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>{description}</Text>

        {brandName && (
          <Text style={styles.meta}>
            Brand: <Text style={styles.metaStrong}>{brandName}</Text>
          </Text>
        )}
        {category && (
          <Text style={styles.meta}>
            Category: <Text style={styles.metaStrong}>{category}</Text>
          </Text>
        )}
        <Text style={styles.meta}>
          FDC ID: <Text style={styles.metaStrong}>{String(fdcId)}</Text>
        </Text>

        {/* Nutrition card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrition (per reference serving)</Text>
          <Text style={styles.servingLine}>
            USDA reference serving:{" "}
            <Text style={styles.servingStrong}>
              {refSize} {refUnit}
            </Text>
          </Text>

          <View style={styles.macrosRow}>
            <MacroBox label="Calories" value={perCal} unit="kcal" />
            <MacroBox label="Protein" value={perProtein} unit="g" />
          </View>
          <View style={styles.macrosRow}>
            <MacroBox label="Fat" value={perFat} unit="g" />
            <MacroBox label="Carbs" value={perCarbs} unit="g" />
          </View>
        </View>

        {/* Amount card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How much did you eat?</Text>

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
                placeholder="1"
                placeholderTextColor="#95a99c"
              />
              <Text style={styles.helper}>
                1 serving = {refSize} {refUnit}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>{refUnit.toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={unitInput}
                onChangeText={setUnitInput}
                keyboardType="numeric"
                placeholder={String(refSize)}
                placeholderTextColor="#95a99c"
              />
              <Text style={styles.helper}>
                We&apos;ll convert this to servings based on the USDA reference
                serving.
              </Text>
            </>
          )}
        </View>

        {/* Notes card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. breakfast, with milk"
            placeholderTextColor="#95a99c"
            multiline
          />
        </View>

        {/* Add button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddToLog}>
            <Text style={styles.primaryButtonText}>Add to today&apos;s log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// Simple macro display box
function MacroBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  const formatted =
    Number.isFinite(value) && value !== 0
      ? value >= 10
        ? value.toFixed(0)
        : value.toFixed(1)
      : "0";

  return (
    <View style={styles.macroBox}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {formatted} <Text style={styles.macroUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centerInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  inner: {
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 16,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  backText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#1b4332",
  },

  title: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1b4332",
    marginBottom: 4,
  },

  meta: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "#52796f",
  },

  metaStrong: {
    fontFamily: "Poppins-Bold",
    color: "#1b4332",
  },

  card: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 14,
    borderWidth: 1,
    borderColor: "#b7e4c7",
  },

  sectionTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 16,
    color: "#1b4332",
    marginBottom: 6,
  },

  servingLine: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "#52796f",
    marginBottom: 8,
  },

  servingStrong: {
    fontFamily: "Poppins-Bold",
    color: "#1b4332",
  },

  macrosRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  macroBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f8fdf9",
  },

  macroLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#52796f",
    marginBottom: 4,
  },

  macroValue: {
    fontFamily: "Poppins-Bold",
    fontSize: 16,
    color: "#1b4332",
  },

  macroUnit: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#52796f",
  },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#b7e4c7",
    backgroundColor: "#f1faee",
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleButtonActive: {
    backgroundColor: "#1b4332",
  },

  toggleLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#2d6a4f",
  },

  toggleLabelActive: {
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },

  label: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#1b4332",
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#b7e4c7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1b4332",
    backgroundColor: "#ffffff",
  },

  helper: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#52796f",
    marginTop: 4,
  },

  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 4,
  },

  buttonWrapper: {
    marginTop: 24,
  },

  primaryButton: {
    backgroundColor: "#1b4332",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "white",
    fontFamily: "Poppins-Bold",
    fontSize: 16,
  },

  errorTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 18,
    color: "#c1121f",
    marginBottom: 4,
  },

  errorText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#7f1d1d",
    textAlign: "center",
    marginBottom: 12,
  },
});