import { StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { useAppFonts } from '../utils/fonts';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import { router } from 'expo-router';
import api from './services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const [fontsLoaded] = useAppFonts();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!fontsLoaded) {
        return <ActivityIndicator size="large" color="#40916c" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
    }

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

            const { token } = response;

            // Save token to AsyncStorage and API client
            await AsyncStorage.setItem('authToken', token);
            api.setToken(token);

            // Navigate to tabs
            router.replace('/(tabs)');
        } catch (err: any) {
            console.error('Auth error:', err);
            setAuthError(err.response?.data?.message || err.message || `${isLogin ? 'Login' : 'Registration'} failed`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <ThemedView style={styles.content}>
                <ThemedText type="title" style={styles.authTitle}>
                    LabelIQ
                </ThemedText>
                <ThemedView style={styles.authContainer}>
                    <ThemedText type="subtitle" style={styles.subtitle}>
                        {isLogin ? 'Welcome Back!' : 'Create Account'}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d8f3dcff',
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#d8f3dcff',
    },
    authContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        backgroundColor: '#ffffffff',
        borderRadius: 25,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    authTitle: {
        fontSize: 50,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2d6a4f',
        fontFamily: 'Poppins-Regular',
        marginBottom: 450,
        padding: 25,
        lineHeight: 60,
        alignSelf: 'center',
        position: 'absolute'
    },
    subtitle: {
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 30,
        color: '#52796f',
        fontFamily: 'Poppins-Regular',
    },
    input: {
        borderWidth: 1,
        borderColor: '#95d5b2',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fff',
        fontFamily: 'Poppins-Regular',
    },
    errorText: {
        color: '#d62828',
        marginBottom: 10,
        textAlign: 'center',
    },
    authButton: {
        backgroundColor: '#55b174ff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    authButtonDisabled: {
        backgroundColor: '#95d5b2',
    },
    authButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins-Regular',
    },
    switchAuthButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    switchAuthText: {
        color: '#2d6a4f',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        marginHorizontal: 10
    },
});
