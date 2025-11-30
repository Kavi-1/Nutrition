// app/(tabs)/log.tsx
// ======================================================
// LogScreen
//
// This screen allows the user to search for foods using
// the backend endpoint:
//
//    GET /api/nutrition/food?name=<query>
//
// The backend forwards the request to the USDA FDC API.
// The UI shows:
//   - A search bar
//   - Loading indicator
//   - API debug info (status + text snippet)
//   - A scrollable list of top 10 search results
//
// When the user taps a food item, the app navigates to:
//     /food/add
// passing the selected food JSON through route params.
// ======================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import api from "../services/api";
import BarcodeScanner from "../../components/BarcodeScanner";
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppFonts } from '@/utils/fonts';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * LogScreen Component
 */
export default function LogScreen() {
  const [fontsLoaded] = useAppFonts();

  // User-entered search text
  const [query, setQuery] = useState("");

  // Parsed API response (USDA FDC JSON)
  const [result, setResult] = useState<any | null>(null);

  // Loading indicator state
  const [loading, setLoading] = useState(false);

  // Error message from failed API call
  const [error, setError] = useState<string | null>(null);

  // Debug text showing HTTP status + first 200 characters of response
  const [debug, setDebug] = useState<string | null>(null);

  const [scannerVisible, setScannerVisible] = useState(false);

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={['#e9ffedff', '#d8f3dcff', '#d8eff3ff']}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#40916c" />
      </LinearGradient>
    );
  }

  // manual search
  const handleSearch = async () => {
    const name = query.trim();
    if (!name) return;

    // Reset all UI states
    setLoading(true);
    setError(null);
    setResult(null);
    setDebug(null);

    try {
      // use api service instead of raw fetch
      const data = await api.getFood(name);
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
      setDebug(`Error: ${e?.response?.status || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  // barcode scan with camera
  const handleBarcodeScan = async (barcode: string) => {
    setQuery(barcode);
    setLoading(true);
    setError(null);
    setResult(null);
    setDebug(null);

    try {
      const data = await api.getFoodByBarcode(barcode);

      if (data) {
        setResult({ foods: [data], totalHits: 1 });
      } else {
        setError("Barcode not found in database");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
      setDebug(`Error: ${e?.response?.status || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract USDA food list from API result.
   *
   * USDA returns JSON shaped like:
   *   {
   *     totalHits: number,
   *     foods: [ ... ]
   *   }
   */
  const foods: any[] =
    result && Array.isArray(result.foods) ? result.foods : [];

  return (
    <LinearGradient
      colors={['#e9ffedff', '#d8f3dcff', '#d8eff3ff']}
      start={{ x: -1, y: 0.2 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* search Card */}
      <View style={styles.searchCard}>
        <Text style={styles.title}>Search Food</Text>

        {/* search */}
        <View style={styles.searchInputContainer}>
          <IconSymbol size={20} name="magnifyingglass" color="#95a99c" />
          <TextInput
            style={styles.input}
            placeholder="Search by name..."
            placeholderTextColor="#95a99c"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <IconSymbol size={20} name="xmark.circle.fill" color="#95a99c" />
            </TouchableOpacity>
          )}
        </View>

        {/* buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <IconSymbol size={20} name="magnifyingglass" color="#ffffff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScannerVisible(true)}
          >
            <IconSymbol size={20} name="barcode.viewfinder" color="#ffffff" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#40916c" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Error text (if API failed) */}
      {error && (
        <View style={styles.errorCard}>
          <IconSymbol size={24} name="exclamationmark.triangle.fill" color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Food search result list (top 10 results) */}
      {foods.length > 0 && (
        <ScrollView style={styles.resultBox}>
          <Text style={styles.resultHeader}>
            Found {foods.length} results
          </Text>
          {foods.slice(0, 10).map((food) => (
            <TouchableOpacity
              key={food.fdcId ?? food.description}
              style={styles.foodCard}
              onPress={() =>
                router.push({
                  pathname: "/food/add",
                  params: { data: JSON.stringify(food) },
                })
              }
            >
              <View style={styles.foodCardHeader}>
                <View style={styles.foodCardContent}>
                  <Text style={styles.itemName}>{food.description}</Text>

                  {food.brandName && (
                    <Text style={styles.itemBrand}>{food.brandName}</Text>
                  )}

                  {food.foodCategory && (
                    <Text style={styles.itemMeta}>
                      {food.foodCategory}
                    </Text>
                  )}
                </View>
                <IconSymbol size={20} name="chevron.right" color="#95a99c" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* If result exists but foods[] missing, show raw response JSON */}
      {result && foods.length === 0 && (
        <ScrollView style={styles.resultBox}>
          <Text selectable>{JSON.stringify(result, null, 2)}</Text>
        </ScrollView>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleBarcodeScan}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#e9ffedff"
  },

  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    alignSelf: 'center',
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fdf9',
    borderWidth: 1,
    borderColor: '#95d5a6',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },

  searchButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#40916c',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },

  scanButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#52796f',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },

  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 15,
  },

  loadingText: {
    fontSize: 16,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
  },

  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },

  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },

  resultBox: {
    flex: 1,
  },

  resultHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d6a4f',
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },

  foodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  foodCardContent: {
    flex: 1,
  },

  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    marginBottom: 4,
  },

  itemBrand: {
    fontSize: 14,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },

  itemMeta: {
    fontSize: 12,
    color: '#95a99c',
    fontFamily: 'Poppins-Regular',
  },
});