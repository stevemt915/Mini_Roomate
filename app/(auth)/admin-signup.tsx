import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  hostelName: string;
}

interface Errors {
  email: string;
  password: string;
  confirmPassword: string;
  hostelName: string;
}

export default function AdminSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    hostelName: '',
  });
  const [errors, setErrors] = useState<Errors>({
    email: '',
    password: '',
    confirmPassword: '',
    hostelName: '',
  });
  const [loading, setLoading] = useState<boolean>(false);

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors: Errors = { ...errors };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with letters and numbers';
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formData.hostelName.trim()) {
      newErrors.hostelName = 'Hostel name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'admin',
            signup_date: new Date().toISOString(),
            hostel_name: formData.hostelName, // Store temporarily in user_metadata
          },
        },
      });

      if (error) throw error;

      // Store signup details temporarily (optional, if not using user_metadata)
      await AsyncStorage.setItem('pendingAdminProfile', JSON.stringify({
        email: formData.email,
        hostelName: formData.hostelName,
      }));

      Alert.alert(
        'Success',
        'Admin account created successfully. Please check your email and log in to complete your profile.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/admin') }]
      );
    } catch (error: any) {
      console.error('Signup Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Sign Up</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
        />
        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Hostel Name"
          value={formData.hostelName}
          onChangeText={(text) => setFormData({ ...formData, hostelName: text })}
        />
        {errors.hostelName ? <Text style={styles.errorText}>{errors.hostelName}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/admin')}>
          <Text style={styles.loginLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 30,
    color: '#4A7043',
  },
  inputContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 25,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontFamily: 'Aeonik-Regular',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    fontFamily: 'Aeonik-Regular',
    marginTop: -10,
  },
  button: {
    backgroundColor: '#4A7043',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginText: {
    color: '#666',
    fontFamily: 'Aeonik-Regular',
  },
  loginLink: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
  },
});
