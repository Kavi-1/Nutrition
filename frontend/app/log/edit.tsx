// app/log/edit.tsx
// ====================================================
// Edit Log Screen
//
// Allows the user to edit an existing FoodLogEntry:
//   - change how much they ate (by servings OR by ml/g)
//   - change optional "notes"
//
// DB conventions (must match Add screen):
//   amount      = total ml / g eaten OR servings count (legacy)
//   servingSize = reference serving size (ml / g) when known
//   servingUnit = "ml" | "g" when known
//   calories/... = per reference serving (NOT total)
//
// For legacy entries where servingSize is 1 g / 1 ml and the
// original data did not have real weight info, we treat them
// as "servings-only": no By-g editing.
// ====================================================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import {
  type FoodLogEntry,
  updateFoodLogAmountAndNotes,
} from "../../db/logDb";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppFonts } from "@/utils/fonts";

// Helper: format number cleanly for UI
function format1(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0+$/, "");
}

type Mode = "SERVINGS" | "UNIT";

export default function EditLogScreen() {
  const [fontsLoaded] = useAppFonts();

  const params = useLocalSearchParams();
  const rawData = Array.isArray(params.data) ? params.data[0] : params.data;

  const [entry, setEntry] = useState<FoodLogEntry | null>(null);

  // amountMlOrG: “真实的量”——要么是 ml/g，要么（旧记录）就是“份数”
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

      const refSize = parsed.servingSize;
      const refUnit = parsed.servingUnit;

      // ⚠️ 这里是关键：
      // 只有在“有真实克/毫升信息”时才按 weight 处理。
      // 经验规则：servingSize > 1 且有 unit（g/ml） 才视为有重量信息。
      const hasRealServingInfo =
        typeof refSize === "number" &&
        refSize > 1 &&
        typeof refUnit === "string" &&
        refUnit !== "serving";

      if (hasRealServingInfo) {
        const initialServings = safeAmt > 0 ? safeAmt / refSize! : 1;
        setMode("SERVINGS");
        setAmountInput(format1(initialServings));
      } else {
        // 旧记录：只知道“份数”
        setMode("SERVINGS");
        setAmountInput(format1(safeAmt || 1));
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
    if (!entry) return amt;
    const sz = entry.servingSize;
    const unit = entry.servingUnit;

    const hasRealServingInfo =
      typeof sz === "number" &&
      sz > 1 &&
      typeof unit === "string" &&
      unit !== "serving";

    if (!hasRealServingInfo) return amt; // legacy: amount 本身就是 servings
    return amt / sz!;
  };

  const amountFromServings = (serv: number): number => {
    if (!entry) return serv;
    const sz = entry.servingSize;
    const unit = entry.servingUnit;

    const hasRealServingInfo =
      typeof sz === "number" &&
      sz > 1 &&
      typeof unit === "string" &&
      unit !== "serving";

    if (!hasRealServingInfo) return serv; // legacy: amount = servings
    return serv * sz!;
  };

  // ============================================
  // Switch UI mode (servings <-> ml/g)
  // ============================================
  const switchMode = (newMode: Mode) => {
    if (!entry) return;

    const sz = entry.servingSize;
    const unit = entry.servingUnit;
    const hasRealServingInfo =
      typeof sz === "number" &&
      sz > 1 &&
      typeof unit === "string" &&
      unit !== "serving";

    if (newMode === "UNIT" && !hasRealServingInfo) {
      // 没有真实重量信息时，不允许切到 By g/ml
      return;
    }

    if (newMode === mode) return;
    setMode(newMode);

    if (newMode === "SERVINGS") {
      const s = servingsFromAmount(amountMlOrG);
      setAmountInput(format1(s || 1));
    } else {
      setAmountInput(format1(amountMlOrG || 1));
    }
  };

  // ============================================
  // User edits the amount input box
  // ============================================
  const handleAmountChange = (text: string) => {
    setAmountInput(text);

    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;

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

    const n = Number(amountInput.trim().replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    const newAmount = mode === "SERVINGS" ? amountFromServings(n) : n;
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      Alert.alert("Invalid amount", "Calculated amount is invalid.");
      return;
    }

    try {
      updateFoodLogAmountAndNotes(entry.id, String(newAmount), notes.trim());
      Alert.alert("Saved", "Log entry updated.", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Failed to update log entry.");
    }
  };

  // ============================================
  // Loading / fonts not ready states
  // ============================================
  if (!fontsLoaded || loading) {
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

  if (!entry) {
    return (
      <LinearGradient
        colors={["#e9ffedff", "#d8f3dcff", "#d8eff3ff"]}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.container}
      >
        <View style={styles.centerInner}>
          <Text style={styles.errorTitle}>Log entry not found</Text>
          <Text style={styles.errorText}>
            We couldn&apos;t load this food entry. Please go back and try again.
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

  const refSize = entry.servingSize;
  const refUnit = entry.servingUnit;

  const hasRealServingInfo =
    typeof refSize === "number" &&
    refSize > 1 &&
    typeof refUnit === "string" &&
    refUnit !== "serving";

  const refLine = hasRealServingInfo
    ? `Reference: ${format1(refSize!)} ${refUnit} ≈ 1 serving`
    : `Reference: 1 serving`;

  const currentServings = servingsFromAmount(amountMlOrG);

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
        <Text style={styles.title}>{entry.description}</Text>
        <Text style={styles.subtitle}>
          Edit how much you ate and optional notes.
        </Text>

        {/* Current summary card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current entry</Text>
          <Text style={styles.summaryText}>
            {format1(currentServings || 1)} serving
            {currentServings && currentServings !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.hint}>{refLine}</Text>
        </View>

        {/* Edit amount card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How much did you eat?</Text>

          {/* Toggle row */}
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
              disabled={!hasRealServingInfo}
              style={[
                styles.toggleButton,
                mode === "UNIT" && styles.toggleButtonActive,
                !hasRealServingInfo && styles.toggleButtonDisabled,
              ]}
              onPress={() => switchMode("UNIT")}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === "UNIT" && styles.toggleTextActive,
                  !hasRealServingInfo && styles.toggleTextDisabled,
                ]}
              >
                {refUnit === "ml" ? "By ml" : "By g"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount input */}
          <TextInput
            style={styles.input}
            value={amountInput}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder={
              mode === "SERVINGS"
                ? "e.g. 2"
                : refUnit === "ml"
                ? "e.g. 250"
                : "e.g. 100"
            }
            placeholderTextColor="#95a99c"
          />

          <Text style={[styles.hint, { marginTop: 4 }]}>{refLine}</Text>

          {!hasRealServingInfo && (
            <Text style={[styles.hint, { marginTop: 6 }]}>
              This entry doesn&apos;t include gram/ml info in the database, so you
              can only adjust it by servings.
            </Text>
          )}
        </View>

        {/* Notes */}
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

        {/* Save button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  inner: {
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 16,
  },

  centerInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 2,
  },

  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#52796f",
    marginBottom: 8,
  },

  card: {
    marginTop: 8,
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
    marginBottom: 4,
  },

  summaryText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#1b4332",
  },

  hint: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#52796f",
    marginTop: 4,
  },

  toggleRow: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 2,
    backgroundColor: "#f1faee",
    marginTop: 8,
    marginBottom: 10,
  },

  toggleButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleButtonActive: {
    backgroundColor: "#1b4332",
  },

  toggleButtonDisabled: {
    opacity: 0.4,
  },

  toggleText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#2d6a4f",
  },

  toggleTextActive: {
    color: "white",
    fontFamily: "Poppins-Bold",
  },

  toggleTextDisabled: {
    color: "#95a99c",
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
    marginTop: 6,
  },

  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  buttonWrapper: {
    marginTop: 20,
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