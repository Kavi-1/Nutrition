import { StyleSheet, ScrollView, View, Button, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { resetLogDb } from '../../db/logDb';
import api, { HealthProfile } from '../services/api';

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
  // auth state
  const [token, setToken] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // profile state
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // load profile whenever token changes
  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [token]);

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
    if (profile.age == null || profile.height == null || profile.weight == null || !profile.gender ||
      !profile.allergies) {
      Alert.alert('All fields are required!');
      return;
    }

    // age must be greater than 0
    if (profile.age <= 0) {
      Alert.alert('Age must be greater than 0!');
      return;
    }

    setLoading(true);
    try {
      await api.updateMyProfile(profile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof HealthProfile, value: any) => {
    if (profile) setProfile({ ...profile, [field]: value });
  };

  const handleAuth = async () => {
    if (!username || !password) {
      setAuthError('Please enter username and password');
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const response = isLogin
        ? await api.login({ username, password })
        : await api.register({ username, password });

      const { token: newToken } = response;
      api.setToken(newToken);
      setToken(newToken);
      setUsername('');
      setPassword('');

      // If registering, give backend time to create profile
      if (!isLogin) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.response?.data?.message || err.message || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
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
          onPress: () => {
            api.clearToken();
            setToken(null);
            setProfile(null);
          },
        },
      ]
    );
  };

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

  // if not authenticated, show login/register form
  if (!token) {
    return (
      <ScrollView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.authContainer}>
            <ThemedText type="title" style={styles.authTitle}>
              {isLogin ? 'Login' : 'Register'}
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#8E8E93"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {authError && (
              <ThemedText style={styles.errorText}>{authError}</ThemedText>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.authButtonText}>
                  {isLogin ? 'Login' : 'Register'}
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAuthButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setAuthError(null);
              }}
            >
              <ThemedText style={styles.switchAuthText}>
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    );
  }

  // else, show profile 
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>Health Profile</ThemedText>
          {!loading && !error && profile && (
            <TouchableOpacity
              onPress={isEditing ? saveProfile : () => setIsEditing(true)}
              style={isEditing ? styles.saveBtn : styles.editBtn}
            >
              <ThemedText style={isEditing ? styles.saveBtnText : styles.editBtnText}>
                {isEditing ? 'Save' : 'Edit'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {loading && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
          </ThemedView>
        )}

        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Button title="Retry" onPress={loadProfile} />
          </ThemedView>
        )}

        {!loading && !error && profile && (
          <>
            {/* Basic Profile Info */}
            <ThemedView style={styles.section}>
              <EditableItem icon="number" label="Age" value={profile.age?.toString() ?? ''}
                isEditing={isEditing} onChange={(v: string) => {
                  const num = parseInt(v);
                  updateField('age', v === '' ? undefined : isNaN(num) ? undefined : num);
                }} keyboardType="numeric" />
              <EditableItem icon="arrow.up.and.down" label="Height" value={profile.height?.toString() ?? ''}
                isEditing={isEditing} onChange={(v: string) => {
                  const num = parseFloat(v);
                  updateField('height', v === '' ? undefined : isNaN(num) ? undefined : num);
                }} keyboardType="numeric" />
              <EditableItem icon="scalemass" label="Weight" value={profile.weight?.toString() ?? ''}
                isEditing={isEditing} onChange={(v: string) => {
                  const num = parseFloat(v);
                  updateField('weight', v === '' ? undefined : isNaN(num) ? undefined : num);
                }} keyboardType="numeric" />
              <EditableItem icon="person" label="Gender" value={profile.gender ?? ''}
                isEditing={isEditing} onChange={(v: string) => updateField('gender', v)} />
            </ThemedView>

            {/* Allergies */}
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Allergies</ThemedText>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  placeholder="Comma separated"
                  placeholderTextColor="#8E8E93"
                  value={profile.allergies?.join(', ') ?? ''}
                  onChangeText={(t) => updateField('allergies', t.split(',').map(s => s.trim()).filter(Boolean))}
                />
              ) : profile.allergies && profile.allergies.length > 0 ? (
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
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Vegetarian"
                  placeholderTextColor="#8E8E93"
                  value={profile.dietaryPreference ?? ''}
                  onChangeText={(t) => updateField('dietaryPreference', t)}
                />
              ) : profile.dietaryPreference ? (
                <ThemedText style={styles.listText}>{profile.dietaryPreference}</ThemedText>
              ) : (
                <ThemedText style={styles.emptyText}>No dietary preferences</ThemedText>
              )}
            </ThemedView>
          </>
        )}

        {/* Development Tools Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Developer Tools
          </ThemedText>

          <View style={styles.buttonWrapper}>
            <Button title="Reset Local DB" color="red" onPress={handleResetDb} />
          </View>
        </ThemedView>

        {/* Logout Button */}
        <ThemedView style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
          </TouchableOpacity>
        </ThemedView>

      </ThemedView>
    </ScrollView>
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
    <ThemedView style={styles.profileItem}>
      <ThemedView style={styles.itemLeft}>
        <IconSymbol size={24} name={icon as any} color="#007AFF" />
        <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText>
      </ThemedView>
      {isEditing ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={label}
          placeholderTextColor="#8E8E93"
        />
      ) : (
        <ThemedText style={styles.value}>{value || 'Not set'}</ThemedText>
      )}
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

  // auth styles
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  authTitle: {
    fontSize: 32,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  authButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#00bb70ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  authButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchAuthButton: {
    marginTop: 20,
  },
  switchAuthText: {
    color: '#005f21ff',
    fontSize: 16,
  },
  logoutButton: {
    minWidth: '30%',
    height: 44,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  editBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000ff',
    borderRadius: 50,
    marginTop: 10,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#00bb70ff',
    borderWidth: 1,
    borderColor: '#00bb70ff',
    borderRadius: 50,
    marginTop: 10,
  },
  editBtnText: {
    color: '#0b0b0bff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fieldInput: {
    minWidth: 100,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    textAlign: 'right',
  },
});