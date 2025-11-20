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
 * Shows details for a selected food item, a short nutrition summary,
 * and lets the user enter serving amount + notes before adding to log.
 *
 * IMPORTANT:
 *   calories / protein / fat / carbs that we save to SQLite are
 *   **per-serving** values from USDA (NOT multiplied by amount).
 *   The Today Log screen will compute totals as:
 *
 *      total = perServing * amount
 */
export default function AddFoodScreen() {
  const { data } = useLocalSearchParams();
  const food = data ? JSON.parse(data as string) : null;

  const [amount, setAmount] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (!food) {
    return (
      <View style={styles.container}>
        <Text>No food item received.</Text>
      </View>
    );
  }

  // Nutrition parsing: try to read macros from USDA search JSON
  const nutrients: any[] = Array.isArray(food.foodNutrients)
    ? food.foodNutrients
    : [];

  const pickByName = (pattern: RegExp) =>
    nutrients.find(
      (n) =>
        typeof n.nutrientName === "string" && pattern.test(n.nutrientName)
    );

  const energy = pickByName(/energy/i); // "Energy"
  const protein = pickByName(/protein/i);
  const fat = pickByName(/total lipid\s*\(fat\)/i); // "Total lipid (fat)"
  const carbs = pickByName(/carbohydrate, by difference/i);

  const hasMacros = !!(energy || protein || fat || carbs);

  /** Add to local SQLite log */
  const handleAddToLog = () => {
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      Alert.alert("Missing amount", "Please enter a serving amount.");
      return;
    }

    const amountNum = Number(trimmedAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid amount", "Amount must be a positive number.");
      return;
    }

    // Key point:
    // We save *per-serving* nutrients from USDA here.
    // `amount` is stored as a string, and totals are computed later
    // on the Today Log screen.
    const entry: FoodLogEntry = {
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName,
      category: food.foodCategory,
      servingSize: food.servingSize,
      servingUnit: food.servingSizeUnit,
      amount: trimmedAmount,
      notes: notes.trim() || undefined,
      calories: energy ? Number(energy.value) : undefined,
      protein: protein ? Number(protein.value) : undefined,
      fat: fat ? Number(fat.value) : undefined,
      carbs: carbs ? Number(carbs.value) : undefined,
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
      {/* Basic food info */}
      <Text style={styles.title}>{food.description}</Text>

      {food.brandName && (
        <Text style={styles.line}>Brand: {food.brandName}</Text>
      )}

      {food.foodCategory && (
        <Text style={styles.line}>Category: {food.foodCategory}</Text>
      )}

      {food.fdcId && <Text style={styles.line}>FDC ID: {food.fdcId}</Text>}

      {/* Nutrition summary */}
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

        {food.servingSize && food.servingSizeUnit && (
          <Text style={styles.helper}>
            * USDA reference serving: {food.servingSize} {food.servingSizeUnit}
          </Text>
        )}
      </View>

      {/* Serving input */}
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
          Enter how many servings you ate (totals are calculated later).
        </Text>
      </View>

      {/* Notes */}
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

      <View style={styles.buttonWrapper}>
        <Button title="Add to Log" onPress={handleAddToLog} />
      </View>

      {confirmation && (
        <Text style={styles.confirmation}>{confirmation}</Text>
      )}
    </View>
  );
}

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