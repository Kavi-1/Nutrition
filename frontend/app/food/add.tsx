// app/food/add.tsx
import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from "react-native";
import { insertFoodLog, type FoodLogEntry } from "../../db/logDb";

/**
 * AddFoodScreen
 *
 * This screen displays detailed nutrition information for a selected food item
 * (passed from the search page), allows the user to input serving amount
 * and optional notes, and then saves the entry into the local SQLite log.
 *
 * Workflow:
 *    - Food item received via navigation params
 *    - Extract macros from USDA search JSON
 *    - User enters servings + notes
 *    - Insert formatted entry into SQLite
 */
export default function AddFoodScreen() {
  const { data } = useLocalSearchParams();
  const food = data ? JSON.parse(data as string) : null;

  // User input states
  const [amount, setAmount] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Handle missing food param safely
  if (!food) {
    return (
      <View style={styles.container}>
        <Text>No food item received.</Text>
      </View>
    );
  }

  /**
   * ===============================
   *  Parse Nutrition Information
   * ===============================
   *
   * USDA's /foods/search endpoint does NOT always include full nutrition data.
   * When available, nutrients appear in `food.foodNutrients`.
   *
   * We match nutrients by name using regex because:
   *   - Different datasets may not include nutrientNumber
   *   - USDA uses slightly different naming conventions
   */
  const nutrients: any[] = Array.isArray(food.foodNutrients)
    ? food.foodNutrients
    : [];

  /** Helper to match nutrient by name text */
  const pickByName = (pattern: RegExp) =>
    nutrients.find(
      (n) =>
        typeof n.nutrientName === "string" && pattern.test(n.nutrientName)
    );

  // Extract macros when available
  const energy = pickByName(/energy/i); // kcal
  const protein = pickByName(/protein/i);
  const fat = pickByName(/total lipid\s*\(fat\)/i); // USDA naming
  const carbs = pickByName(/carbohydrate, by difference/i);

  // Used to determine whether to show nutrition summary
  const hasMacros = !!(energy || protein || fat || carbs);

  /**
   * ====================================
   *  Add Entry to Local SQLite Database
   * ====================================
   */
  const handleAddToLog = () => {
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      Alert.alert("Missing amount", "Please enter a serving amount.");
      return;
    }

    /** Construct entry object that matches SQLite table format */
    const entry: FoodLogEntry = {
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName,
      category: food.foodCategory,
      servingSize: food.servingSize,
      servingUnit: food.servingSizeUnit,
      amount: trimmedAmount,
      notes: notes.trim() || undefined,
      calories: energy?.value,
      protein: protein?.value,
      fat: fat?.value,
      carbs: carbs?.value,
    };

    try {
      const id = insertFoodLog(entry);
      console.log("Food log inserted with id:", id, "entry:", entry);
      setConfirmation(`Food added to local log (id: ${id}).`);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Failed to insert log.");
    }
  };

  return (
    <View style={styles.container}>
      {/* ==================== */}
      {/*  Basic Food Metadata */}
      {/* ==================== */}
      <Text style={styles.title}>{food.description}</Text>

      {food.brandName && (
        <Text style={styles.line}>Brand: {food.brandName}</Text>
      )}

      {food.foodCategory && (
        <Text style={styles.line}>Category: {food.foodCategory}</Text>
      )}

      {food.fdcId && <Text style={styles.line}>FDC ID: {food.fdcId}</Text>}

      {/* ======================= */}
      {/*  Nutrition Summary Box  */}
      {/* ======================= */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition (per serving*)</Text>

        {hasMacros ? (
          <View style={{ marginBottom: 8 }}>
            {energy && (
              <Text style={styles.nutrientLine}>
                Calories: {energy.value} {energy.unitName}
              </Text>
            )}
            {protein && (
              <Text style={styles.nutrientLine}>
                Protein: {protein.value} {protein.unitName}
              </Text>
            )}
            {fat && (
              <Text style={styles.nutrientLine}>
                Fat: {fat.value} {fat.unitName}
              </Text>
            )}
            {carbs && (
              <Text style={styles.nutrientLine}>
                Carbs: {carbs.value} {carbs.unitName}
              </Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.helper}>
              No detailed nutrient information available in the search result.
            </Text>
            <Text style={styles.helper}>
              Some USDA items only expose macros on the detail endpoint.
            </Text>
          </>
        )}

        {/* USDA reference serving when provided */}
        {food.servingSize && food.servingSizeUnit && (
          <Text style={styles.helper}>
            * USDA reference serving: {food.servingSize} {food.servingSizeUnit}
          </Text>
        )}
      </View>

      {/* ==================== */}
      {/*  Serving Input Field */}
      {/* ==================== */}
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
          Enter how many servings you ate (we will wire this to backend later).
        </Text>
      </View>

      {/* ==================== */}
      {/*  Notes Input Field  */}
      {/* ==================== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. breakfast, with milk"
          multiline
        />
      </View>

      {/* Save button */}
      <View style={styles.buttonWrapper}>
        <Button title="Add to Log" onPress={handleAddToLog} />
      </View>

      {/* Confirmation message */}
      {confirmation && (
        <Text style={styles.confirmation}>{confirmation}</Text>
      )}
    </View>
  );
}

/** Styles for layout, spacing, and typography */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
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
  nutrientLine: { fontSize: 14, marginBottom: 2 },
  buttonWrapper: { marginTop: 24 },
  confirmation: { marginTop: 12, fontSize: 14, color: "green" },
});