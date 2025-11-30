import { StyleSheet, ScrollView, View, Alert, TextInput, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { HealthProfile } from '../services/api';
import { useAppFonts } from '@/utils/fonts';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const [fontsLoaded] = useAppFonts();

  // profile state
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newAllergyInput, setNewAllergyInput] = useState('');  // load profile
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('Profile load error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    // require all fields except allergies and diet pref.
    if (!profile.age || !profile.height || !profile.weight || !profile.gender) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (profile.age <= 0) {
      Alert.alert('Error', 'Age must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await api.updateMyProfile(profile);
      setIsEditing(false);
      setNewAllergyInput('');
      Alert.alert('Success', 'Profile updated!');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const addAllergy = () => {
    const trimmed = newAllergyInput.trim();
    if (trimmed && profile) {
      const current = profile.allergies || [];
      updateField('allergies', [...current, trimmed]);
      setNewAllergyInput('');
    }
  };

  const removeAllergy = (index: number) => {
    if (profile) {
      const updated = profile.allergies?.filter((_, i) => i !== index) || [];
      updateField('allergies', updated);
    }
  };

  const updateField = (field: keyof HealthProfile, value: any) => {
    if (profile) setProfile({ ...profile, [field]: value });
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            api.clearToken();
            setProfile(null);
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!fontsLoaded || (loading && !profile)) {
    return (
      <LinearGradient
        colors={['#e9ffedff', '#d8f3dcff', '#d8eff3ff']}
        start={{ x: -1, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#40916c" />
        </View>
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
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>Health Profile</Text>
            {!loading && !error && profile && (
              <TouchableOpacity
                onPress={isEditing ? saveProfile : () => setIsEditing(true)}
                style={isEditing ? styles.saveBtn : styles.editBtn}
              >
                <Text style={isEditing ? styles.saveBtnText : styles.editBtnText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#40916c" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && profile && (
            <>
              {/* Basic Profile Info Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <EditableItem icon="number" label="Age" value={profile.age?.toString() ?? ''}
                  isEditing={isEditing} onChange={(v: string) => {
                    const num = parseInt(v);
                    updateField('age', v === '' ? undefined : isNaN(num) ? undefined : num);
                  }} keyboardType="numeric" />
                <EditableItem icon="arrow.up.and.down" label="Height (cm)" value={profile.height?.toString() ?? ''}
                  isEditing={isEditing} onChange={(v: string) => {
                    const num = parseFloat(v);
                    updateField('height', v === '' ? undefined : isNaN(num) ? undefined : num);
                  }} keyboardType="numeric" />
                <EditableItem icon="scalemass" label="Weight (kg)" value={profile.weight?.toString() ?? ''}
                  isEditing={isEditing} onChange={(v: string) => {
                    const num = parseFloat(v);
                    updateField('weight', v === '' ? undefined : isNaN(num) ? undefined : num);
                  }} keyboardType="numeric" />
                <EditableItem icon="person" label="Gender" value={profile.gender ?? ''}
                  isEditing={isEditing} onChange={(v: string) => updateField('gender', v)} />
              </View>

              {/* Allergies Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Allergies</Text>

                {isEditing && (
                  <View style={styles.addItemContainer}>
                    <TextInput
                      style={styles.addInput}
                      placeholder="Type and press return to add"
                      placeholderTextColor="#95a99c"
                      value={newAllergyInput}
                      onChangeText={setNewAllergyInput}
                      onSubmitEditing={addAllergy}
                      returnKeyType="done"
                    />
                  </View>
                )}

                {profile.allergies && profile.allergies.length > 0 ? (
                  profile.allergies.map((allergy, index) => (
                    isEditing ? (
                      <TouchableOpacity
                        key={index}
                        style={styles.editListItem}
                        onPress={() => removeAllergy(index)}
                      >
                        <IconSymbol size={20} name="minus.circle.fill" color="#FF3B30" />
                        <Text style={styles.listText}>{allergy}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View key={index} style={styles.listItem}>
                        <IconSymbol size={20} name="exclamationmark.triangle.fill" color="#FF9500" />
                        <Text style={styles.listText}>{allergy}</Text>
                      </View>
                    )
                  ))
                ) : (
                  <Text style={styles.emptyText}>No allergies</Text>
                )}
              </View>

              {/* Dietary Preferences Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Dietary Preferences</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Vegetarian, Vegan, Keto"
                    placeholderTextColor="#95a99c"
                    value={profile.dietaryPreference ?? ''}
                    onChangeText={(t) => updateField('dietaryPreference', t)}
                  />
                ) : profile.dietaryPreference ? (
                  <Text style={styles.listText}>{profile.dietaryPreference}</Text>
                ) : (
                  <Text style={styles.emptyText}>No dietary preferences</Text>
                )}
              </View>
            </>
          )}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function EditableItem({
  icon,
  label,
  value,
  isEditing,
  onChange,
  keyboardType = 'default'
}: {
  icon: any;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.profileItem}>
      <View style={styles.itemLeft}>
        <IconSymbol size={24} name={icon as any} color="#40916c" />
        <Text style={styles.label}>{label}</Text>
      </View>
      {isEditing ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={label}
          placeholderTextColor="#95a99c"
        />
      ) : (
        <Text style={styles.value}>{value || 'Not set'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d6a4f',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    marginBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d8f3dcff',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginBottom: 2,
  },
  listText: {
    fontSize: 16,
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
  },
  emptyText: {
    fontSize: 16,
    color: '#95a99c',
    fontStyle: 'italic',
    fontFamily: 'Poppins-Regular',
  },
  editListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff0f0',
    borderRadius: 10,
    marginBottom: 8,
  },
  addItemContainer: {
    marginBottom: 15,
  },
  addInput: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#40916c',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
    borderStyle: 'dashed'
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#95d5a6',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f8fdf9',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
  },
  fieldInput: {
    minWidth: 100,
    height: 40,
    borderWidth: 1,
    borderColor: '#95d5a6',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f8fdf9',
    textAlign: 'right',
    color: '#2d6a4f',
    fontFamily: 'Poppins-Regular',
  },
  editBtn: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#40916c',
    borderRadius: 50,
    marginTop: 10,
  },
  saveBtn: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: '#40916c',
    borderWidth: 2,
    borderColor: '#40916c',
    borderRadius: 50,
    marginTop: 10,
  },
  editBtnText: {
    color: '#40916c',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutButton: {
    minWidth: '25%',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: '#5c7c69ff',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoutButtonText: {
    color: '5c7c69ff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    backgroundColor: '#ffffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#52796f',
    fontFamily: 'Poppins-Regular',
  },
  errorCard: {
    backgroundColor: '#ffffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#40916c',
    borderRadius: 50,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-Regular',
  },
});
