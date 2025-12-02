// ======================================================
// LogScreen
//
// Users can search for food items based on name, barcode, or AI photo analysis.
// ======================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import api, { FoodAnalysisResult } from "../services/api";
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

  const [scannerVisible, setScannerVisible] = useState(false);

  // Photo analysis states
  const [imageUrl, setImageUrl] = useState("");
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<FoodAnalysisResult | null>(null);

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
    setPhotoAnalysisResult(null);

    try {
      const data = await api.getFood(name);
      setResult(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // barcode scan with camera
  const handleBarcodeScan = async (barcode: string) => {
    setScannerVisible(false);
    setQuery(barcode);
    setLoading(true);
    setError(null);
    setResult(null);
    setPhotoAnalysisResult(null);

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
    } finally {
      setLoading(false);
    }
  };

  // photo analysis with AI
  const handlePhotoAnalysis = async () => {
    setResult(null);
    const url = imageUrl.trim();

    if (!url) {
      setError('Please enter an image URL');
      return;
    }

    // make sure URL is valid 
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (start with http:// or https://)');
      return;
    }

    setAnalyzingPhoto(true);
    setError(null);
    setPhotoAnalysisResult(null);

    try {
      const analysis = await api.analyzeFood(url);
      setPhotoAnalysisResult(analysis);
    } catch (e: any) {
      console.error('Photo analysis error:', e);
      setError(e?.message ?? 'Failed to analyze photo.');
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // function to convert AI respponse to USDA food format
  const convertAIToUSDA = (ai: FoodAnalysisResult) => ({
    fdcId: `ai-${Date.now()}`,
    description: ai.foodName,
    brandName: 'AI Estimated',
    servingSize: 1,
    servingSizeUnit: 'serving',
    foodNutrients: [
      { nutrientName: 'Energy', value: ai.calories, unitName: 'KCAL' },
      { nutrientName: 'Protein', value: ai.proteinGrams, unitName: 'G' },
      { nutrientName: 'Carbohydrate, by difference', value: ai.carbGrams, unitName: 'G' },
      { nutrientName: 'Total lipid (fat)', value: ai.fatGrams, unitName: 'G' },
      { nutrientName: 'Fiber, total dietary', value: ai.fiberGrams, unitName: 'G' }
    ]
  });

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
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* AI Photo Analysis Section */}
        <View style={styles.aiAnalysisCard}>
          <View style={styles.aiAnalysisHeader}>
            <IconSymbol size={24} name="sparkles" color="#66eab7ff" />
            <Text style={styles.aiAnalysisTitle}>AI Photo Analysis</Text>
          </View>

          <View style={styles.searchInputContainer}>
            <IconSymbol size={20} name="photo" color="#95a99c" />
            <TextInput
              style={styles.input}
              placeholder="Paste image URL..."
              placeholderTextColor="#95a99c"
              value={imageUrl}
              onChangeText={setImageUrl}
              onSubmitEditing={handlePhotoAnalysis}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {imageUrl.length > 0 && (
              <TouchableOpacity onPress={() => setImageUrl('')}>
                <IconSymbol size={20} name="xmark.circle.fill" color="#95a99c" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handlePhotoAnalysis}
            disabled={analyzingPhoto}
            style={styles.analyzeButtonWrapper}
          >
            <LinearGradient
              colors={['#a8fe8bff', '#59c89eff', '#55a5b3ff', '#9d93fbff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.analyzeButton}
            >
              <IconSymbol size={20} name="wand.and.stars" color="#ffffff" />
              <Text style={styles.analyzeButtonText}>
                {analyzingPhoto ? 'Analyzing...' : 'Analyze Food'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Loading state for food search */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#40916c" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Loading for AI analysis */}
        {analyzingPhoto && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#ffd60a" />
            <Text style={styles.loadingText}>Analyzing with AI...</Text>
          </View>
        )}

        {/* Error text (if API failed) */}
        {error && (
          <View style={styles.errorCard}>
            <IconSymbol size={24} name="exclamationmark.triangle.fill" color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Photo Analysis Result */}
        {photoAnalysisResult && (
          <View style={styles.photoResultCard}>
            <View style={styles.photoResultHeader}>
              <IconSymbol size={24} name="sparkles" color="#ffd60a" />
              <Text style={styles.photoResultTitle}>AI Analysis Result</Text>
            </View>
            <TouchableOpacity
              style={styles.photoResultContent}
              onPress={() => {
                const usdaData = convertAIToUSDA(photoAnalysisResult);
                router.push({
                  pathname: "/food/add",
                  params: { data: JSON.stringify(usdaData) },
                });
              }}
            >
              <Text style={styles.photoFoodName}>{photoAnalysisResult.foodName}</Text>
              <Text style={styles.photoServing}>{photoAnalysisResult.servingDescription}</Text>
              <View style={styles.photoNutrients}>
                <Text style={styles.photoNutrientText}>{photoAnalysisResult.calories} cal</Text>
                <Text style={styles.photoNutrientText}>{photoAnalysisResult.proteinGrams}g protein</Text>
                <Text style={styles.photoNutrientText}>{photoAnalysisResult.carbGrams}g carbs</Text>
                <Text style={styles.photoNutrientText}>{photoAnalysisResult.fatGrams}g fat</Text>
                <Text style={styles.photoNutrientText}>{photoAnalysisResult.fiberGrams}g fiber</Text>
              </View>
              <Text style={styles.photoConfidence}>
                Confidence: {(photoAnalysisResult.confidence) * 100}%
              </Text>
              <Text style={styles.photoReasoning}>{photoAnalysisResult.reasoning}</Text>
              <Text style={styles.photoTapHint}>add to food log</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Food search result list (top 10 results) */}
        {foods.length > 0 && (
          <View style={styles.resultBox}>
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
          </View>
        )}

        {/* If result exists but foods[] missing, show raw response JSON */}
        {result && foods.length === 0 && (
          <View style={styles.resultBox}>
            <Text selectable>{JSON.stringify(result, null, 2)}</Text>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: "#e9ffedff"
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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

  aiAnalysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  aiAnalysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-SemiBold',
  },

  analyzeButtonWrapper: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },

  analyzeButton: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins-SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    fontSize: 12,
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

  // ai photo analysis result styles
  photoResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ffd60a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  photoResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  photoResultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d6a4f',
    fontFamily: 'Poppins-SemiBold',
  },

  photoResultContent: {
    gap: 10,
  },

  photoFoodName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d6a4f',
    fontFamily: 'Poppins-SemiBold',
  },

  photoServing: {
    fontSize: 16,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
    marginBottom: 5,
  },

  photoNutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 10,
  },

  photoNutrientText: {
    fontSize: 14,
    color: '#40916c',
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },

  photoConfidence: {
    fontSize: 14,
    color: '#95a99c',
    fontFamily: 'Poppins-Regular',
    marginTop: 5,
  },

  photoReasoning: {
    fontSize: 13,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 20,
  },

  photoTapHint: {
    fontSize: 14,
    color: '#40916c',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ffed',
  },
});