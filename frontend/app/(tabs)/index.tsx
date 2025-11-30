import React, { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, Text, ActivityIndicator } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LinearGradient } from "expo-linear-gradient";
import { useAppFonts } from "@/utils/fonts";
import { getLogsForDate, deleteLogById, type FoodLogEntry } from "../../db/logDb";

const format1 = (v: number) => v.toFixed(1);

const formatAmountUnit = (v: number): string => {
  if (!Number.isFinite(v)) return "";
  return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1);
};

const formatServings = (s: number): string => {
  if (!Number.isFinite(s)) return "";
  const rounded = s >= 10 ? Number(s.toFixed(0)) : Number(s.toFixed(1));
  return `${rounded} ${rounded === 1 ? "serving" : "servings"}`;
};

const shiftDate = (dateStr: string, deltaDays: number): string => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
};

const getTodayLocal = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type DailySummary = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const computeServings = (entry: FoodLogEntry): number => {
  const amountNum = Number(entry.amount ?? "0");
  const servingSizeNum = Number(entry.servingSize ?? 0);

  if (servingSizeNum > 0 && amountNum > 0) {
    return amountNum / servingSizeNum;
  }

  const amtAsServings = Number(entry.amount ?? "1");
  return Number.isFinite(amtAsServings) && amtAsServings > 0 ? amtAsServings : 1;
};

export default function TodayLogScreen() {
  const [fontsLoaded] = useAppFonts();
  const todayStr = getTodayLocal();
  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const loadForDate = useCallback((date: string) => {
    const logs = getLogsForDate(date);
    setEntries(logs);

    const totals = logs.reduce<DailySummary>(
      (acc, entry) => {
        const servings = computeServings(entry);
        acc.calories += (entry.calories ?? 0) * servings;
        acc.protein += (entry.protein ?? 0) * servings;
        acc.fat += (entry.fat ?? 0) * servings;
        acc.carbs += (entry.carbs ?? 0) * servings;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    setSummary(totals);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadForDate(currentDate);
    }, [currentDate, loadForDate])
  );

  const handleLongPress = (entry: FoodLogEntry) => {
    if (!entry.id) return;

    Alert.alert(
      "Delete entry",
      `Delete "${entry.description}" from ${currentDate}'s log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLogById(entry.id!);
            loadForDate(currentDate);
          },
        },
      ]
    );
  };

  const goPrevDay = () => setCurrentDate((prev) => shiftDate(prev, -1));
  const goNextDay = () => setCurrentDate((prev) => prev >= todayStr ? prev : shiftDate(prev, 1));

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={['#e9ffedff', '#d8f3dcff', '#c7f0d1ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#40916c" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#e9ffedff', '#d8f3dcff', '#d8eff3ff']}
      start={{ x: -1, y: 0.2 }}
      end={{ x: 0.2, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Daily Log</Text>

          {/* Date navigation row */}
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={goPrevDay} style={styles.dateButton}>
              <IconSymbol name="chevron.left" size={20} color="#40916c" />
            </TouchableOpacity>

            <Text style={styles.dateLabel}>
              {currentDate} {currentDate === todayStr && "(Today)"}
            </Text>

            <TouchableOpacity
              onPress={goNextDay}
              style={styles.dateButton}
              disabled={currentDate >= todayStr}
            >
              <IconSymbol
                name="chevron.right"
                size={20}
                color={currentDate >= todayStr ? "#95a99c" : "#40916c"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Summary (only shown when entries exist) */}
        {entries.length > 0 && summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <IconSymbol name="chart.bar.fill" size={20} color="#40916c" />
              <Text style={styles.summaryTitle}>Daily Summary</Text>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(summary.calories)}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{format1(summary.protein)}</Text>
                <Text style={styles.macroLabel}>Protein (g)</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{format1(summary.fat)}</Text>
                <Text style={styles.macroLabel}>Fat (g)</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{format1(summary.carbs)}</Text>
                <Text style={styles.macroLabel}>Carbs (g)</Text>
              </View>
            </View>
          </View>
        )}

        {/* No entries case */}
        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <IconSymbol name="tray" size={48} color="#95a99c" />
            <Text style={styles.emptyText}>
              No entries logged for this date yet.
            </Text>
          </View>
        ) : (
          <>
            {/* Food Log Section Header */}
            <View style={styles.sectionHeader}>
              <IconSymbol name="list.bullet" size={20} color="#40916c" />
              <Text style={styles.sectionTitle}>Food Log</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{entries.length}</Text>
              </View>
            </View>

            {/* Food Log Items */}
            <View style={styles.listContent}>
              {entries.map((item) => {
                const amountNum = Number(item.amount ?? "0");
                const servingSizeNum = Number(item.servingSize ?? 0);
                const servings = computeServings(item);

                // Amount line: always show as ml / g
                const unit = item.servingUnit || "";
                const amountLabel =
                  amountNum > 0 && unit
                    ? `${formatAmountUnit(amountNum)} ${unit}`
                    : formatAmountUnit(amountNum);

                // Totals for this row (per-serving × servings)
                const perCal = item.calories ?? 0;
                const perP = item.protein ?? 0;
                const perF = item.fat ?? 0;
                const perC = item.carbs ?? 0;

                const totalCal = perCal * servings;
                const totalP = perP * servings;
                const totalF = perF * servings;
                const totalC = perC * servings;

                return (
                  <TouchableOpacity
                    key={item.id?.toString() ?? item.createdAt ?? Math.random().toString()}
                    // Short press → open log details / edit screen
                    onPress={() => {
                      router.push({
                        pathname: "/log/edit",
                        params: { data: JSON.stringify(item) },
                      });
                    }}
                    // Long press → delete
                    onLongPress={() => handleLongPress(item)}
                    delayLongPress={400}
                    activeOpacity={0.7}
                  >
                    <View style={styles.foodCard}>
                      <View style={styles.foodHeader}>
                        <Text style={styles.foodTitle}>{item.description}</Text>
                        <IconSymbol name="chevron.right" size={16} color="#95a99c" />
                      </View>

                      {/* Amount and servings */}
                      <View style={styles.foodRow}>
                        <View style={styles.foodDetail}>
                          <IconSymbol name="scalemass" size={16} color="#52796f" />
                          <Text style={styles.foodDetailText}>{amountLabel}</Text>
                        </View>
                        {servings > 0 && servingSizeNum > 0 && (
                          <Text style={styles.servingsText}>
                            ({formatServings(servings)})
                          </Text>
                        )}
                      </View>

                      {/* Nutrition info */}
                      <View style={styles.nutritionRow}>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{format1(totalCal)}</Text>
                          <Text style={styles.nutritionUnit}>kcal</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{format1(totalP)}</Text>
                          <Text style={styles.nutritionUnit}>P</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{format1(totalF)}</Text>
                          <Text style={styles.nutritionUnit}>F</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{format1(totalC)}</Text>
                          <Text style={styles.nutritionUnit}>C</Text>
                        </View>
                      </View>

                      {/* Timestamp */}
                      {item.createdAt && (
                        <View style={styles.timeRow}>
                          <IconSymbol name="clock" size={12} color="#95a99c" />
                          <Text style={styles.timeText}>
                            {new Date(item.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ====================================================
// Styles
// ====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Header Card
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Date navigation
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  dateButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    flex: 1,
    textAlign: 'center',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d6a4f',
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#52796f',
    marginTop: 2,
  },

  // Empty state
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: "#95a99c",
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },

  // Section Header (Food Log)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#40916c',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },

  // List
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },

  // Food Cards
  foodCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  foodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  foodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  foodDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodDetailText: {
    fontSize: 14,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
  },
  servingsText: {
    fontSize: 13,
    color: "#95a99c",
    fontStyle: 'italic',
  },

  // Nutrition row
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ffed',
    gap: 8,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d6a4f',
    marginTop: 2,
  },
  nutritionUnit: {
    fontSize: 11,
    color: '#95a99c',
    marginTop: 2,
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#95a99c",
    fontFamily: 'Poppins-Regular',
  },
});