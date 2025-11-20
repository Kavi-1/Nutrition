// app/(tabs)/profile.tsx
// ====================================================
// Profile Screen
//
// Displays and edits a simple health profile stored in
// local SQLite (UserProfile table).
//
// Fields:
//   - Age
//   - Height
//   - Weight
//   - Gender
//   - Allergies (comma-separated)
//   - Dietary Preferences
//
// Data flow:
//   • On mount → load profile via getUserProfile()
//   • User taps "Edit" → switch to editable TextInputs
//   • User taps "Save" → upsertUserProfile(...) in SQLite
//
// Also includes a "Reset DB" button at the bottom to
// clear all food log entries for debugging.
// ====================================================

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";

import {
  getUserProfile,
  upsertUserProfile,
  resetLogDb,
  type UserProfile,
} from "../../db/logDb";

type EditableProfile = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  allergies: string;
  dietaryPreferences: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<EditableProfile>({
    age: "",
    height: "",
    weight: "",
    gender: "",
    allergies: "",
    dietaryPreferences: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------
  // Load profile from SQLite on mount
  // --------------------------------------------
  useEffect(() => {
    try {
      const p = getUserProfile();
      if (p) {
        setProfile(p);
        setForm({
          age: p.age != null ? String(p.age) : "",
          height: p.height ?? "",
          weight: p.weight ?? "",
          gender: p.gender ?? "",
          allergies: p.allergies ?? "",
          dietaryPreferences: p.dietaryPreferences ?? "",
        });
      } else {
        // No profile yet; keep empty form
        setProfile(null);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load profile from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateField = (key: keyof EditableProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // --------------------------------------------
  // Save profile to SQLite
  // --------------------------------------------
  const handleSaveProfile = () => {
    try {
      const ageNum = form.age.trim()
        ? Number(form.age.trim())
        : undefined;

      if (form.age.trim() && (!Number.isFinite(ageNum!) || ageNum! <= 0)) {
        Alert.alert("Invalid age", "Age must be a positive number.");
        return;
      }

      const newProfile: UserProfile = {
        id: 1,
        age: ageNum,
        height: form.height.trim() || undefined,
        weight: form.weight.trim() || undefined,
        gender: form.gender.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        dietaryPreferences:
          form.dietaryPreferences.trim() || undefined,
      };

      upsertUserProfile(newProfile);
      setProfile(newProfile);
      setEditing(false);
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save profile.");
    }
  };

  // --------------------------------------------
  // Reset DB (food logs only, for debugging)
  // --------------------------------------------
  const handleResetDb = () => {
    Alert.alert(
      "Reset database",
      "This will delete all food log entries. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            try {
              resetLogDb();
              Alert.alert("Done", "Food log database has been reset.");
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Failed to reset database.");
            }
          },
        },
      ]
    );
  };

  const allergiesList =
    form.allergies
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0) || [];

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header with Edit / Save toggle */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Health Profile
          </ThemedText>

          {!loading && (
            <TouchableOpacity
              onPress={() =>
                editing ? handleSaveProfile() : setEditing(true)
              }
            >
              <ThemedText style={styles.editButtonText}>
                {editing ? "Save" : "Edit"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Basic info section */}
        <ThemedView style={styles.section}>
          {editing ? (
            <>
              <EditableItem
                icon="number"
                label="Age"
                value={form.age}
                onChangeText={(v) => updateField("age", v)}
                keyboardType="numeric"
              />
              <EditableItem
                icon="arrow.up.and.down"
                label="Height"
                value={form.height}
                onChangeText={(v) => updateField("height", v)}
                placeholder="e.g. 175"
              />
              <EditableItem
                icon="scalemass"
                label="Weight"
                value={form.weight}
                onChangeText={(v) => updateField("weight", v)}
                placeholder="e.g. 65"
              />
              <EditableItem
                icon="person"
                label="Gender"
                value={form.gender}
                onChangeText={(v) => updateField("gender", v)}
                placeholder="e.g. Male / Female"
              />
            </>
          ) : (
            <>
              <ProfileItem
                icon="number"
                label="Age"
                value={
                  profile?.age != null ? String(profile.age) : "Not set"
                }
              />
              <ProfileItem
                icon="arrow.up.and.down"
                label="Height"
                value={profile?.height ?? "Not set"}
              />
              <ProfileItem
                icon="scalemass"
                label="Weight"
                value={profile?.weight ?? "Not set"}
              />
              <ProfileItem
                icon="person"
                label="Gender"
                value={profile?.gender ?? "Not set"}
              />
            </>
          )}
        </ThemedView>

        {/* Allergies */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Allergies
          </ThemedText>

          {editing ? (
            <TextInput
              style={styles.textArea}
              value={form.allergies}
              onChangeText={(v) => updateField("allergies", v)}
              placeholder="e.g. peanut, dairy"
              multiline
            />
          ) : allergiesList.length > 0 ? (
            allergiesList.map((allergy, index) => (
              <ThemedView key={index} style={styles.listItem}>
                <IconSymbol
                  size={20}
                  name="exclamationmark.triangle.fill"
                  color="#FF3B30"
                />
                <ThemedText style={styles.listText}>
                  {allergy}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>
              No allergies
            </ThemedText>
          )}
        </ThemedView>

        {/* Dietary preferences */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Dietary Preferences
          </ThemedText>

          {editing ? (
            <TextInput
              style={styles.textArea}
              value={form.dietaryPreferences}
              onChangeText={(v) =>
                updateField("dietaryPreferences", v)
              }
              placeholder="e.g. Vegetarian, Halal"
              multiline
            />
          ) : form.dietaryPreferences.length > 0 ? (
            <ThemedText style={styles.listText}>
              {form.dietaryPreferences}
            </ThemedText>
          ) : (
            <ThemedText style={styles.emptyText}>
              No dietary preferences
            </ThemedText>
          )}
        </ThemedView>

        {/* Reset DB for debugging */}
        <View style={styles.resetSection}>
          <Button
            title="Reset Food Log DB"
            color="red"
            onPress={handleResetDb}
          />
        </View>
      </ThemedView>
    </ScrollView>
  );
}

// --------------------------------------------
// Presentational components
// --------------------------------------------
function ProfileItem({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <ThemedView style={styles.profileItem}>
      <ThemedView style={styles.itemLeft}>
        <IconSymbol size={24} name={icon as any} color="#007AFF" />
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </ThemedView>
  );
}

function EditableItem({
  icon,
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  icon: any;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) {
  return (
    <ThemedView style={styles.profileItem}>
      <ThemedView style={styles.itemLeft}>
        <IconSymbol size={24} name={icon as any} color="#007AFF" />
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      </ThemedView>
      <TextInput
        style={[styles.valueInput]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
      />
    </ThemedView>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
  },
  editButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 20,
  },
  profileItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    color: "#8E8E93",
  },
  valueInput: {
    minWidth: 80,
    textAlign: "right",
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 2,
    paddingHorizontal: 4,
    color: "#000",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  listText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  resetSection: {
    marginTop: 16,
  },
});