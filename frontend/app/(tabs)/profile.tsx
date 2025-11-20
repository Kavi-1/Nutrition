import { StyleSheet, ScrollView, View, Button, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { resetLogDb } from '../../db/logDb';

// test data
const test = {
  age: 21,
  height: '175',
  weight: '150',
  gender: 'Male',
  allergies: ["asjkdf", "sdjfshodf"],
  dietaryPreferences: "Vegetarian"
};

export default function ProfileScreen() {
  const [profile] = useState(test);

  const handleResetDb = () => {
    Alert.alert(
      "Reset Local Database",
      "This will DELETE ALL log entries permanently.\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            resetLogDb();
            Alert.alert("Done", "Local log database has been reset.");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>Health Profile</ThemedText>
        </ThemedView>

        {/* Basic Profile Info */}
        <ThemedView style={styles.section}>
          <ProfileItem icon="number" label="Age" value={profile.age.toString()} />
          <ProfileItem icon="arrow.up.and.down" label="Height" value={profile.height} />
          <ProfileItem icon="scalemass" label="Weight" value={profile.weight} />
          <ProfileItem icon="person" label="Gender" value={profile.gender} />
        </ThemedView>

        {/* Allergies */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Allergies</ThemedText>
          {profile.allergies.length > 0 ? (
            profile.allergies.map((allergy, index) => (
              <ThemedView key={index} style={styles.listItem}>
                <IconSymbol size={20} name="exclamationmark.triangle.fill" color="#FF3B30" />
                <ThemedText style={styles.listText}>{allergy}</ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>No allergies</ThemedText>
          )}
        </ThemedView>

        {/* Dietary Preferences */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Dietary Preferences</ThemedText>
          {profile.dietaryPreferences.length > 0 ? (
            <ThemedText style={styles.listText}>{profile.dietaryPreferences}</ThemedText>
          ) : (
            <ThemedText style={styles.emptyText}>No dietary preferences</ThemedText>
          )}
        </ThemedView>

        {/* Development Tools Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Developer Tools
          </ThemedText>

          <View style={styles.buttonWrapper}>
            <Button title="Reset Local DB" color="red" onPress={handleResetDb} />
          </View>
        </ThemedView>

      </ThemedView>
    </ScrollView>
  );
}

function ProfileItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <ThemedView style={styles.profileItem}>
      <ThemedView style={styles.itemLeft}>
        <IconSymbol size={24} name={icon as any} color="#007AFF" />
        <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText>
      </ThemedView>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  title: {
    fontSize: 28,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 20,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    color: '#8E8E93',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  listText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  buttonWrapper: {
    marginTop: 10,
  },
});