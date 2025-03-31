import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  roomNumber: string;
  batch: string;
  hostelName: string;
  phoneNumber: string;
  dateOfBirth: Date;
  address: string;
}

interface Errors {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  roomNumber: string;
  batch: string;
  hostelName: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
}

export default function StudentSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    roomNumber: '',
    batch: '',
    hostelName: '',
    phoneNumber: '',
    dateOfBirth: new Date(),
    address: '',
  });
  const [errors, setErrors] = useState<Errors>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    roomNumber: '',
    batch: '',
    hostelName: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors: Errors = { ...errors };

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with letters and numbers';
      isValid = false;
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }

    // Room number
    if (!formData.roomNumber.trim()) {
      newErrors.roomNumber = 'Room number is required';
      isValid = false;
    }

    // Batch
    if (!formData.batch.trim()) {
      newErrors.batch = 'Batch is required';
      isValid = false;
    }

    // Hostel name
    if (!formData.hostelName.trim()) {
      newErrors.hostelName = 'Hostel name is required';
      isValid = false;
    }

    // Phone number (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit Indian phone number';
      isValid = false;
    }

    // Date of birth (must be at least 16 years old)
    const today = new Date();
    const minBirthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    if (formData.dateOfBirth > minBirthDate) {
      newErrors.dateOfBirth = 'You must be at least 16 years old';
      isValid = false;
    }

    // Address
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      isValid = false;
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, dateOfBirth: selectedDate });
    }
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
            role: 'student',
            signup_date: new Date().toISOString(),
            full_name: formData.fullName,
            phone_number: `+91${formData.phoneNumber}`,
          },
        },
      });

      if (error) throw error;

      // Store all signup details temporarily
      await AsyncStorage.setItem('pendingStudentProfile', JSON.stringify({
        email: formData.email,
        fullName: formData.fullName,
        roomNumber: formData.roomNumber,
        batch: formData.batch,
        hostelName: formData.hostelName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth.toISOString(),
        address: formData.address,
      }));

      Alert.alert(
        'Success',
        'Account created successfully. Please check your email and log in to complete your profile.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/student') }]
      );
    } catch (error: any) {
      console.error('Signup Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Student Sign Up</Text>

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
            placeholder="Full Name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          />
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Room Number"
            value={formData.roomNumber}
            onChangeText={(text) => setFormData({ ...formData, roomNumber: text })}
          />
          {errors.roomNumber ? <Text style={styles.errorText}>{errors.roomNumber}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Batch (e.g., 2023-2027)"
            value={formData.batch}
            onChangeText={(text) => setFormData({ ...formData, batch: text })}
          />
          {errors.batch ? <Text style={styles.errorText}>{errors.batch}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Hostel Name"
            value={formData.hostelName}
            onChangeText={(text) => setFormData({ ...formData, hostelName: text })}
          />
          {errors.hostelName ? <Text style={styles.errorText}>{errors.hostelName}</Text> : null}

          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text.replace(/[^0-9]/g, '') })}
              maxLength={10}
            />
          </View>
          {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

          <TouchableOpacity 
            style={styles.input} 
            onPress={() => setShowDatePicker(true)}
          >
            <Text>
              Date of Birth: {formData.dateOfBirth.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}

          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Full Address"
            multiline
            numberOfLines={4}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
          />
          {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

          {showDatePicker && (
            <DateTimePicker
              value={formData.dateOfBirth}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
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
          <TouchableOpacity onPress={() => router.push('/(auth)/student')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
    justifyContent: 'center',
  },
  addressInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  countryCodeText: {
    fontFamily: 'Aeonik-Regular',
  },
  phoneInput: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0,
    flex: 1,
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